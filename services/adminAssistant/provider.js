/*
 * Parfumerie Charme - back-office assistant: model provider.
 *
 * The assistant is a real LLM agent (it reasons, chooses tools and acts), so it
 * needs a model with tool calling, and it needs one model call per agent step
 * streamed back so the admin can watch it work.
 *
 * Three wire protocols live behind one interface (see ./providers.js):
 *
 *   openai    OpenAI Chat Completions - the lingua franca of OpenAI, Azure
 *             OpenAI / AI Foundry, OpenRouter, Groq, Together, vLLM, LM Studio,
 *             Ollama and everything else that copied the schema.
 *   anthropic Anthropic Messages API (./anthropic.js).
 *   gemini    Google Gemini generateContent (./gemini.js).
 *
 * Every protocol yields the same three event shapes, so the agent loop in
 * ./index.js never learns which one it is talking to.
 *
 * Configuration used to be env-only; it now comes from ./settings.js (admin
 * panel) with .env as the fallback:
 *   AI_BASE_URL   AI_API_KEY   AI_MODEL   [AI_TIMEOUT_MS] [AI_MAX_STEPS]
 * OPENAI_BASE_URL / OPENAI_API_KEY / AIPILOT_OPENAI_BASE_URL /
 * AZURE_OPENAI_API_KEY are still accepted as fallbacks so an existing gateway
 * already present in the environment keeps working with no configuration.
 */
"use strict";

const { readSse, httpError, unreachableError } = require("./sse");
const { endpointUrl } = require("./providers");
const { cleanToolName, cleanArguments } = require("./tools");
const anthropic = require("./anthropic");
const gemini = require("./gemini");

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

/* .env-only view. The live config is the one ./settings.js resolves, which
   merges these values with whatever the admin saved in the panel. */
function getConfig() {
  const baseUrl = (
    firstEnv("AI_BASE_URL", "OPENAI_BASE_URL", "AIPILOT_OPENAI_BASE_URL") ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  /*
   * The Azure key is only a sensible fallback for an Azure endpoint. Without
   * this gate, a machine that happens to have AZURE_OPENAI_API_KEY in its
   * environment would send it to api.openai.com and get a 401 that looks like
   * a broken assistant rather than a mismatched gateway.
   */
  const azureEndpoint = /azure/i.test(baseUrl);
  const apiKey = azureEndpoint
    ? firstEnv("AI_API_KEY", "OPENAI_API_KEY", "AZURE_OPENAI_API_KEY")
    : firstEnv("AI_API_KEY", "OPENAI_API_KEY");
  const model = firstEnv("AI_MODEL", "OPENAI_MODEL") || DEFAULT_MODEL;
  const timeoutMs = Number(firstEnv("AI_TIMEOUT_MS")) || 120000;
  const maxSteps = Number(firstEnv("AI_MAX_STEPS")) || 8;
  return {
    provider: "openai",
    providerLabel: "OpenAI",
    protocol: "openai",
    baseUrl,
    apiKey,
    model,
    timeoutMs,
    maxSteps,
    query: "",
    needsKey: true,
    source: "env",
    configured: Boolean(apiKey),
  };
}

function requestHeaders(cfg) {
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`;
    // Azure AI / API Management gateways authenticate with this header rather
    // than a bearer token. Sending both is harmless and keeps the setup to one
    // variable on every host.
    headers["api-key"] = cfg.apiKey;
  }
  return headers;
}

function newCall(index) {
  return { index, id: "", type: "function", function: { name: "", arguments: "" } };
}

/* -------------------------------------------------------- OpenAI-compatible -- */

async function* streamOpenAI({ cfg, messages, tools, signal }) {
  const body = { model: cfg.model, messages, stream: true };
  if (Array.isArray(tools) && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    let res;
    try {
      res = await fetch(endpointUrl(cfg, "/chat/completions"), {
        method: "POST",
        headers: requestHeaders(cfg),
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

    const streaming =
      String(res.headers.get("content-type") || "").includes("text/event-stream") && res.body;

    let content = "";
    const calls = new Map(); // index -> tool_call
    let finishReason = null;

    const onFrame = (payload) => {
      if (payload === "[DONE]") return;
      let json;
      try {
        json = JSON.parse(payload);
      } catch (e) {
        return; // keep-alive comments and partial frames
      }
      const choice = json.choices && json.choices[0];
      if (!choice) return;
      const delta = choice.delta || {};

      /* Only `content` is prose. Models such as gpt-oss also stream a
         `reasoning` field, which must not be shown as the answer. */
      if (typeof delta.content === "string" && delta.content) {
        content += delta.content;
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const part of delta.tool_calls) {
          const index = part.index === null || part.index === undefined ? 0 : part.index;
          const current = calls.get(index) || newCall(index);
          if (part.id) current.id = part.id;
          const name = part.function && part.function.name;
          if (name) {
            /* Real gateways send the whole name once, some stream it in pieces,
               and some append channel markers to it. */
            const clean = cleanToolName(name);
            if (!current.function.name || clean.startsWith(current.function.name)) {
              current.function.name = clean;
            }
          }
          if (part.function && typeof part.function.arguments === "string") {
            current.function.arguments += part.function.arguments;
          }
          calls.set(index, current);
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason;
    };

    if (streaming) {
      /* Yield each prose delta as it arrives: the administrator watches the
         answer being written instead of waiting for the whole turn. */
      for await (const payload of readSse(res.body)) {
        const before = content.length;
        onFrame(payload);
        if (content.length > before) {
          yield { type: "text", text: content.slice(before) };
        }
      }
    } else {
      // Some gateways ignore stream:true and answer with a single JSON body.
      const json = JSON.parse(await res.text());
      const choice = (json.choices && json.choices[0]) || {};
      const message = choice.message || {};
      content = typeof message.content === "string" ? message.content : "";
      (message.tool_calls || []).forEach((call, index) => calls.set(index, call));
      finishReason = choice.finish_reason || null;
    }

    const toolCalls = [...calls.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, call]) => call)
      .filter((call) => call && call.function && call.function.name)
      .map((call) => ({
        id: call.id || `call_${Math.random().toString(36).slice(2, 10)}`,
        type: "function",
        function: { name: call.function.name, arguments: cleanArguments(call.function.arguments) },
      }));

    yield {
      type: "finish",
      reason: finishReason || (toolCalls.length ? "tool_calls" : "stop"),
    };
    const message = { role: "assistant", content: content || null };
    if (toolCalls.length) message.tool_calls = toolCalls;
    yield { type: "message", message };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", abort);
  }
}

/* -------------------------------------------------------------- dispatcher -- */

/*
 * Stream one assistant turn.
 *
 * Yields, in order:
 *   { type: "text", text }        - a content delta (zero or more)
 *   { type: "message", message }  - the assembled assistant message, ready to
 *                                   append to the transcript:
 *                                   { role, content, tool_calls? }
 */
async function* streamTurn({ cfg, messages, tools, signal }) {
  const config = cfg || getConfig();
  if (config.protocol === "anthropic") {
    yield* anthropic.streamTurn({ cfg: config, messages, tools, signal });
    return;
  }
  if (config.protocol === "gemini") {
    yield* gemini.streamTurn({ cfg: config, messages, tools, signal });
    return;
  }
  yield* streamOpenAI({ cfg: config, messages, tools, signal });
}

/* ------------------------------------------------------ connection testing -- */

const PING = "Reply with the single word: OK";

/*
 * A real, tiny call used by the panel's "Test" button, so an administrator can
 * verify a key before trusting the assistant with the shop's data. Returns the
 * model's own words, never a canned success.
 */
async function testConnection(cfg) {
  const started = Date.now();
  const latencyMs = () => Date.now() - started;
  if (cfg.needsKey && !cfg.apiKey) {
    return { ok: false, error: "No API key provided for this provider." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(cfg.timeoutMs, 45000));

  const finish = (ok, reply, error, extra) => ({
    ok,
    model: cfg.model,
    latencyMs: latencyMs(),
    reply: ok ? String(reply || "").trim().slice(0, 400) : "",
    error: ok ? "" : String(error || "").slice(0, 500),
    ...(extra || {}),
  });

  try {
    let url = "";
    let body = {};
    let headers = { "Content-Type": "application/json" };

    if (cfg.protocol === "anthropic") {
      url = endpointUrl({ baseUrl: cfg.baseUrl }, "/messages");
      headers = anthropic.headers(cfg);
      body = { model: cfg.model, max_tokens: 16, messages: [{ role: "user", content: PING }] };
    } else if (cfg.protocol === "gemini") {
      url = gemini.url(cfg).replace(":streamGenerateContent?", ":generateContent?");
      headers = gemini.headers(cfg);
      body = {
        contents: [{ role: "user", parts: [{ text: PING }] }],
        generationConfig: { maxOutputTokens: 32, temperature: 0 },
      };
    } else {
      url = endpointUrl(cfg, "/chat/completions");
      headers = requestHeaders(cfg);
      body = { model: cfg.model, messages: [{ role: "user", content: PING }], max_tokens: 32 };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw await httpError(res, cfg.providerLabel || cfg.provider);

    const json = await res.json();
    const text = [
      ...(json.choices || []).map((c) => (c.message && c.message.content) || ""),
      ...(json.content || []).map((p) => p.text || ""),
      ...(json.candidates || [])
        .flatMap((c) => (c.content && c.content.parts) || [])
        .map((p) => p.text || ""),
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      return finish(false, "", "The endpoint accepted the request but returned no text.", {
        canStream: true,
      });
    }
    return finish(true, text);
  } catch (e) {
    const aborted = e && (e.name === "AbortError" || controller.signal.aborted);
    return finish(
      false,
      "",
      aborted
        ? "The endpoint did not answer in time."
        : e.code === "ECONNREFUSED" || /fetch failed/i.test(e.message || "")
          ? unreachableError(cfg, e).message
          : e.message || String(e),
    );
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getConfig, streamTurn, streamOpenAI, testConnection };
