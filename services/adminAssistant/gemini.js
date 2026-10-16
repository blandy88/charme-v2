/*
 * Parfumerie Charme - back-office assistant: Google Gemini protocol.
 *
 * generateContent has its own shape:
 *
 *   out  system message    -> top-level "systemInstruction" { parts: [{ text }] }
 *        user / model      -> "contents": [{ role, parts: [{ text }] }]
 *        assistant tools   -> [{ functionCall: { name, args } }]
 *        tool results      -> [{ functionResponse: { name, response } }]
 *        tools             -> [{ functionDeclarations: [{ name, description, parameters }] }]
 *
 *   back  candidates[0].content.parts[] carries text and functionCall parts;
 *        they arrive as one JSON object per SSE frame, several parts per frame.
 *
 * The awkward part is tool results: functionResponse must name the function
 * that was called, but the OpenAI-shaped transcript only knows the tool call
 * id, so the id -> name mapping is rebuilt from the assistant turns.
 */
"use strict";

const { readSse, httpError, unreachableError } = require("./sse");

const MAX_TOOL_TEXT = 20000;

function textOf(content) {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : part && part.text) || "").filter(Boolean).join("\n");
  }
  return String(content);
}

/* OpenAI-shaped transcript -> Gemini body. */
function toGemini(messages) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => textOf(m.content))
    .filter(Boolean)
    .join("\n\n");

  /* tool_call_id -> function name, needed for functionResponse blocks. */
  const names = new Map();
  for (const m of messages) {
    for (const call of m.tool_calls || []) {
      if (call && call.function && call.function.name) names.set(call.id, call.function.name);
    }
  }

  const contents = [];
  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: textOf(m.content) }] });
      continue;
    }

    if (m.role === "assistant") {
      const parts = [];
      const text = textOf(m.content);
      if (text) parts.push({ text });
      for (const call of m.tool_calls || []) {
        if (!call.function || !call.function.name) continue;
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch (e) {
          /* leave the arguments empty rather than failing the whole turn */
        }
        if (!args || typeof args !== "object") args = {};
        parts.push({ functionCall: { name: call.function.name, args } });
      }
      if (!parts.length) parts.push({ text: "(no content)" });
      contents.push({ role: "model", parts });
      continue;
    }

    /* role === "tool": one user turn per batch of results. */
    const part = {
      functionResponse: {
        name: names.get(m.tool_call_id) || String(m.tool_call_id || "tool"),
        response: { result: textOf(m.content).slice(0, MAX_TOOL_TEXT) || "(empty)" },
      },
    };
    const last = contents[contents.length - 1];
    if (last && last.role === "user" && last.__toolBatch) last.parts.push(part);
    else contents.push({ role: "user", parts: [part], __toolBatch: true });
  }
  for (const turn of contents) delete turn.__toolBatch;
  return { system, contents };
}

function url(cfg) {
  const base = String(cfg.baseUrl || "").replace(/\/+$/, "");
  const model = encodeURIComponent(cfg.model);
  const params = new URLSearchParams({ alt: "sse" });
  return `${base}/models/${model}:streamGenerateContent?${params.toString()}`;
}

function headers(cfg) {
  const h = { "Content-Type": "application/json" };
  if (cfg.apiKey) h["x-goog-api-key"] = cfg.apiKey;
  return h;
}

let seq = 0;
function newCallId(name) {
  seq += 1;
  return `gemini_${name}_${Date.now().toString(36)}_${seq}`;
}

async function* streamTurn({ cfg, messages, tools, signal }) {
  const { system, contents } = toGemini(messages);
  const body = { contents, generationConfig: { temperature: 0.2 } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const list = Array.isArray(tools) ? tools : [];
  if (list.length) {
    body.tools = [
      {
        functionDeclarations: list.map((t) => ({
          name: t.function.name,
          description: t.function.description || "",
          parameters: t.function.parameters || { type: "object", properties: {} },
        })),
      },
    ];
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    let res;
    try {
      res = await fetch(url(cfg), {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(`The model did not answer within ${Math.round(cfg.timeoutMs / 1000)}s.`);
      }
      throw unreachableError(cfg, e);
    }
    if (!res.ok) throw await httpError(res, cfg.providerLabel || cfg.provider);

    let text = "";
    const calls = [];
    let finish = null;
    let blocked = null;

    const collect = (json) => {
      if (json.promptFeedback && json.promptFeedback.blockReason) {
        blocked = String(json.promptFeedback.blockReason);
        return;
      }
      if (json.error && json.error.message) {
        throw new Error(`${json.error.status || "error"}: ${json.error.message}`);
      }
      const candidates = Array.isArray(json.candidates) ? json.candidates : [];
      const candidate = candidates[0];
      if (!candidate) return;
      if (candidate.finishReason) finish = String(candidate.finishReason);
      const content = candidate.content || {};
      for (const part of content.parts || []) {
        if (typeof part.text === "string" && part.text) {
          text += part.text;
        }
        if (part.functionCall && part.functionCall.name) {
          let args = {};
          try {
            args = JSON.stringify(part.functionCall.args || {});
          } catch (e) {
            args = "{}";
          }
          calls.push({
            id: newCallId(part.functionCall.name),
            type: "function",
            function: { name: part.functionCall.name, arguments: args },
          });
        }
      }
    };

    const streaming = String(res.headers.get("content-type") || "").includes("event-stream");
    if (!streaming || !res.body) {
      /* Gemini answers a single JSON array when alt=sse is not honoured. */
      let json;
      try {
        json = JSON.parse(await res.text());
      } catch (e) {
        throw new Error(`Could not read the reply from ${cfg.baseUrl}.`);
      }
      for (const item of Array.isArray(json) ? json : [json]) collect(item);
    } else {
      let flushed = 0;
      for await (const payload of readSse(res.body)) {
        try {
          collect(JSON.parse(payload));
        } catch (e) {
          if (e && e.message && !/unparsable/i.test(e.message) && !/JSON/i.test(e.message)) throw e;
          /* unparsable frame: ignore */
        }
        /* yield every new prose piece as it arrives */
        if (text.length > flushed) {
          const piece = text.slice(flushed);
          flushed = text.length;
          yield { type: "text", text: piece };
        }
      }
    }

    if (blocked && !text && !calls.length) {
      throw new Error(`The model refused to answer (${blocked}).`);
    }

    const toolCalls = calls.filter((c) => c && c.function && c.function.name);
    /* Gemini reports "STOP" even when it called a function, so the presence of
       a functionCall is what marks the turn as a tool turn. */
    yield { type: "finish", reason: toolCalls.length ? "tool_calls" : "stop" };
    yield {
      type: "message",
      message: {
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      },
    };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", abort);
  }
}

module.exports = { streamTurn, toGemini, url, headers, textOf };
