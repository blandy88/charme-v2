/*
 * Parfumerie Charme - back-office assistant: shared stream plumbing.
 *
 * All three wire protocols speak Server-Sent Events, so the frame reader lives
 * here once instead of three times in provider.js / anthropic.js / gemini.js.
 *
 * `readSse` is an async generator: the callers consume frames as they arrive
 * (`for await (const payload of readSse(res.body))`), which is what lets the
 * agent stream the model's words to the administrator while the model is still
 * writing them. A callback could not do that - a generator cannot yield from
 * inside someone else's callback, so the buffering used to happen here.
 */
"use strict";

/*
 * Reads a `text/event-stream` body and yields the payload of every `data:`
 * frame (without the "data:" prefix, without the trailing newline).
 * Comment frames (": keep-alive") and unparsable lines are skipped.
 */
async function* readSse(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      yield payload;
    }
  }
}

/* Turn an upstream error response into one readable sentence. */
async function errorDetail(res) {
  let text = "";
  try {
    text = await res.text();
  } catch (e) {
    return "";
  }
  try {
    const json = JSON.parse(text);
    /* OpenAI  { error: { message } }
       Gemini  { error: { message } }
       Anthropic{ type: "error", error: { type, message } } */
    const message =
      (json.error && (json.error.message || json.error.code)) ||
      json.message ||
      (Array.isArray(json.error) && json.error[0] && json.error[0].message);
    if (message) return String(message).slice(0, 400);
  } catch (e) {
    /* not JSON - fall through to the raw body */
  }
  return String(text || "").slice(0, 400);
}

async function httpError(res, endpoint) {
  const detail = await errorDetail(res);
  const auth = res.status === 401 || res.status === 403;
  return new Error(
    `The model endpoint returned HTTP ${res.status}` +
      (detail ? `: ${detail}` : "") +
      (auth ? ` (check the API key for ${endpoint})` : ""),
  );
}

/* A fetch() that could not connect reports "fetch failed", which tells the
   administrator nothing. Every caller that shows errors to a human goes
   through here first. */
function unreachableError(cfg, e) {
  return new Error(
    `Could not reach the model endpoint ${cfg.baseUrl} (${e.code || e.message}). ` +
      "Check the endpoint URL and the server's network access.",
  );
}

module.exports = { readSse, errorDetail, httpError, unreachableError };
