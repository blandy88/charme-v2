/*
 * Parfumerie Charme - back-office assistant: Anthropic Messages protocol.
 *
 * Claude does not speak Chat Completions, so the transcript has to be
 * translated in both directions:
 *
 *   out  system message      -> top-level "system" string (not a message)
 *        assistant + tools   -> content blocks: text, then tool_use
 *        tool results        -> one user turn holding every tool_result block
 *        tools               -> { name, description, input_schema }
 *
 *   back  text_delta         -> { type: "text" }
 *        tool_use +          -> tool_calls, with the JSON arguments streamed in
 *        input_json_delta       input_json_delta pieces and reassembled here
 *        message_delta/
 *        stop_reason=end     -> finish "stop"
 *        stop_reason=tool_use-> finish "tool_calls"
 *
 * Everything is emitted in the same shape as ./provider.js so the agent loop
 * never learns which protocol it is talking to.
 */
"use strict";

const { readSse, httpError, unreachableError } = require("./sse");

const API_VERSION = "2023-06-01";
/* The tool results this agent feeds back can be long, and the answers it writes
   are full sentences in French. 1024 tokens cut answers mid-word; 4096 leaves
   room for the tool transcript *and* a complete reply. */
const MAX_TOKENS = 4096;
const MAX_TOOL_TEXT = 20000;

function textOf(content) {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part && part.text) || "")
      .filter(Boolean)
      .join("\n");
  }
  return String(content);
}

function parseJson(text) {
  try {
    const value = JSON.parse(text || "{}");
    return value && typeof value === "object" ? value : {};
  } catch (e) {
    return {};
  }
}

/* OpenAI-shaped transcript -> Anthropic body. */
function toAnthropic(messages) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => textOf(m.content))
    .filter(Boolean)
    .join("\n\n");

  const contents = [];
  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      contents.push({ role: "user", content: [{ type: "text", text: textOf(m.content) }] });
      continue;
    }

    if (m.role === "assistant") {
      const parts = [];
      const text = textOf(m.content);
      if (text) parts.push({ type: "text", text });
      for (const call of m.tool_calls || []) {
        parts.push({
          type: "tool_use",
          id: call.id,
          name: call.function && call.function.name,
          input: parseJson(call.function && call.function.arguments),
        });
      }
      /* An empty assistant turn is rejected by the API. */
      if (!parts.length) parts.push({ type: "text", text: "(no content)" });
      contents.push({ role: "assistant", content: parts });
      continue;
    }

    /* role === "tool": every result of one parallel call batch has to sit in a
       single user turn, otherwise the API rejects the request. */
    const block = {
      type: "tool_result",
      tool_use_id: m.tool_call_id,
      content: textOf(m.content).slice(0, MAX_TOOL_TEXT) || "(empty result)",
    };
    const last = contents[contents.length - 1];
    if (last && last.role === "user" && last.__toolBatch) last.content.push(block);
    else contents.push({ role: "user", content: [block], __toolBatch: true });
  }
  for (const turn of contents) delete turn.__toolBatch;
  return { system, contents };
}

function headers(cfg) {
  const h = {
    "Content-Type": "application/json",
    "anthropic-version": API_VERSION,
  };
  if (cfg.apiKey) h["x-api-key"] = cfg.apiKey;
  return h;
}

async function* streamTurn({ cfg, messages, tools, signal }) {
  const { system, contents } = toAnthropic(messages);
  const body = {
    model: cfg.model,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: contents,
  };
  if (system) body.system = system;
  const list = Array.isArray(tools) ? tools : [];
  if (list.length) {
    body.tools = list.map((t) => ({
      name: t.function.name,
      description: t.function.description || "",
      input_schema: t.function.parameters || { type: "object", properties: {} },
    }));
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    let res;
    try {
      res = await fetch(`${cfg.baseUrl}/messages`, {
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

    const streaming = String(res.headers.get("content-type") || "").includes("event-stream");
    if (!streaming || !res.body) {
      /* Non-streaming reply: same shape, so read it as one object. */
      const json = JSON.parse(await res.text());
      let text = "";
      const calls = [];
      for (const part of (json.content || [])) {
        if (part.type === "text" && part.text) text += part.text;
        if (part.type === "tool_use") {
          calls.push({
            id: part.id,
            type: "function",
            function: { name: part.name, arguments: JSON.stringify(part.input || {}) },
          });
        }
      }
      if (text) yield { type: "text", text };
      const reason = json.stop_reason === "tool_use" || calls.length ? "tool_calls" : "stop";
      yield { type: "finish", reason };
      yield {
        type: "message",
        message: { role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) },
      };
      return;
    }

    let text = "";
    const calls = new Map(); // block index -> call
    let stopReason = null;

    /* Frames are consumed as they arrive and each prose delta is yielded
       immediately, so the administrator sees the answer being written. */
    for await (const payload of readSse(res.body)) {
      let json;
      try {
        json = JSON.parse(payload);
      } catch (e) {
        continue;
      }
      if (json.type === "error") {
        const err = json.error || {};
        throw new Error(`${err.type || "error"}: ${err.message || "the model failed"}`);
      }
      if (json.type === "content_block_start") {
        const block = json.content_block || {};
        if (block.type === "tool_use") {
          calls.set(json.index, {
            id: block.id,
            type: "function",
            function: { name: block.name || "", arguments: "" },
          });
        }
        continue;
      }
      if (json.type === "content_block_delta") {
        const delta = json.delta || {};
        if (delta.type === "text_delta" && delta.text) {
          text += delta.text;
          yield { type: "text", text: delta.text };
        }
        if (delta.type === "input_json_delta") {
          const call = calls.get(json.index);
          if (call) call.function.arguments += delta.partial_json || "";
        }
        continue;
      }
      if (json.type === "message_delta") {
        const delta = json.delta || {};
        if (delta.stop_reason) stopReason = delta.stop_reason;
      }
    }

    const toolCalls = [...calls.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, call]) => call)
      .filter((call) => call && call.function && call.function.name)
      .map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.function.name, arguments: call.function.arguments || "{}" },
      }));

    /* A reply cut off by max_tokens must say so rather than pass for a
       complete answer. */
    if (stopReason === "max_tokens") {
      text += "\n\n_(The answer was cut short - ask me to continue.)_";
    }

    yield {
      type: "finish",
      reason: stopReason === "tool_use" || toolCalls.length ? "tool_calls" : "stop",
    };
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

module.exports = { streamTurn, toAnthropic, headers, textOf, parseJson };
