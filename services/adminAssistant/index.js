/*
 * Parfumerie Charme - back-office assistant: agent loop + HTTP surface.
 *
 * This mounts four admin-only routes:
 *
 *   GET  /api/admin/assistant/status   - is it configured, which model, how many tools
 *   POST /api/admin/assistant/chat     - { message, conversationId } -> SSE stream
 *   POST /api/admin/assistant/actions  - { conversationId, actionId, decision } -> SSE stream
 *   POST /api/admin/assistant/reset    - drop a conversation
 *
 * The loop is a normal tool-calling agent: ask the model, run the tools it chose,
 * feed the results back, repeat until it answers in prose. Read tools run inline;
 * write tools pause the run and emit `action_required`, so the signed-in
 * administrator approves each mutation before it touches the database. That
 * pause is why conversations live server-side: resuming needs the transcript and
 * the exact pending tool call.
 *
 * Everything is streamed as Server-Sent Events over a POST body, so the client
 * reads the response body with fetch() rather than EventSource (EventSource
 * cannot send an Authorization header or a request body).
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const provider = require("./provider");
const { buildSystemPrompt } = require("./prompt");
const { createTools, introspect, cleanToolName, currentSchedule } = require("./tools");
const { pickLang } = require("./i18n");
const assistantSettings = require("./settings");

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 60;
const MAX_HISTORY_MESSAGES = 60;
/* Tool results can each be 12k characters, so a message count alone says
   nothing about the context the model will be asked to read. The transcript is
   therefore also kept under a character budget: about 24k characters of
   history, which is comfortably inside every model's window once the system
   prompt and the current turn are added. */
const MAX_HISTORY_CHARS = 24000;
const MAX_TOOL_RESULT_CHARS = 12000;
const MAX_MESSAGE_CHARS = 8000;

const sessions = new Map();

/* ---------------------------------------------------------------- caches --- */

let catalogueCache = { key: "", value: null };

/* Reloaded when the file changes, so "which references have no photo?" reflects
   the catalogue as it is now rather than as it was at boot. */
function loadCatalogue(projectRoot) {
  const file = path.join(projectRoot, "public", "data", "fragrances.json");
  let stat;
  try {
    stat = fs.statSync(file);
  } catch (e) {
    return { items: [], total: 0, withImage: 0, missing: [] };
  }
  const key = `${stat.mtimeMs}:${stat.size}`;
  if (catalogueCache.key === key) return catalogueCache.value;

  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    items = [];
  }
  if (!Array.isArray(items)) items = [];
  const value = {
    items,
    total: items.length,
    withImage: items.filter((i) => i && i.image).length,
    missing: items.filter((i) => i && !i.image).map((i) => `${i.brand} | ${i.name}`),
  };
  catalogueCache = { key, value };
  return value;
}

const schemaCache = { at: 0, text: "" };

async function schemaFor(db) {
  if (schemaCache.text && Date.now() - schemaCache.at < 5 * 60 * 1000) return schemaCache.text;
  try {
    schemaCache.text = await introspect(db);
    schemaCache.at = Date.now();
  } catch (e) {
    /* keep the previous schema rather than failing the whole request */
  }
  return schemaCache.text || "(schema unavailable)";
}

/* -------------------------------------------------------------- sessions --- */

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.size <= MAX_SESSIONS) return;
  const oldest = [...sessions.values()].sort((a, b) => a.updatedAt - b.updatedAt);
  for (const session of oldest.slice(0, sessions.size - MAX_SESSIONS)) sessions.delete(session.id);
}

function getSession(conversationId, adminId) {
  pruneSessions();
  const existing = conversationId ? sessions.get(String(conversationId)) : null;
  if (existing && existing.adminId === adminId) {
    existing.updatedAt = Date.now();
    return existing;
  }
  const session = {
    id: crypto.randomUUID(),
    adminId,
    messages: [],
    queue: [],
    approved: new Set(),
    autoApprove: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

/*
 * Trim from the front, never orphaning a tool message: a `tool` message must
 * follow the assistant message that requested it or the provider rejects the
 * entire request. Two budgets are enforced - a message count and a character
 * count - because the second is the one that actually protects the model's
 * context window.
 */
function messageChars(message) {
  let chars = 0;
  try {
    chars = JSON.stringify(message).length;
  } catch (e) {
    chars = String(message && message.content || "").length;
  }
  return chars;
}

function trimHistory(session) {
  let chars = session.messages.reduce((sum, m) => sum + messageChars(m), 0);
  while (session.messages.length && (session.messages.length > MAX_HISTORY_MESSAGES || chars > MAX_HISTORY_CHARS)) {
    const dropped = session.messages.shift();
    chars -= messageChars(dropped);
    while (session.messages.length && session.messages[0].role === "tool") {
      const orphan = session.messages.shift();
      chars -= messageChars(orphan);
    }
    /* Never trim away the turn the administrator is waiting on. */
    if (session.messages.length <= 2) break;
  }
}

/* --------------------------------------------- simple per-admin throttle --- */

const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_MAX = 30;
const throttle = new Map(); // adminId -> { count, resetAt }

function throttled(adminId) {
  const now = Date.now();
  /* Drop entries whose window closed long ago, so the map cannot grow one
     entry per administrator for the life of the process. */
  for (const [id, entry] of throttle) {
    if (now > entry.resetAt + THROTTLE_WINDOW_MS) throttle.delete(id);
  }
  const entry = throttle.get(adminId);
  if (!entry || now > entry.resetAt) {
    throttle.set(adminId, { count: 1, resetAt: now + THROTTLE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > THROTTLE_MAX;
}

/* --------------------------------------------------------------- helpers --- */

function parseArgs(call) {
  const raw = call && call.function && call.function.arguments;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function toolMessage(id, result) {
  let content;
  try {
    content = JSON.stringify(result);
  } catch (e) {
    content = JSON.stringify({ ok: false, error: "Unserialisable tool result" });
  }
  content = String(content);
  /* A plain slice would cut the JSON in half and hand the model a payload it
     cannot parse. Oversized results become a short, valid note instead - the
     tool that produced them already caps its own output, this is the backstop
     for the ones that do not. */
  if (content.length > MAX_TOOL_RESULT_CHARS) {
    content = JSON.stringify({
      ok: result && result.ok !== false,
      note: "The result was too large to send back in full. Narrow the query or select fewer columns.",
    });
  }
  return { role: "tool", tool_call_id: id, content: content.slice(0, MAX_TOOL_RESULT_CHARS) };
}

function summariseResult(result) {
  try {
    const text = JSON.stringify(result);
    if (text.length <= 4000) return result;
    return { ok: result && result.ok !== false, note: "result truncated for display" };
  } catch (e) {
    return { ok: true, note: "result too large to display" };
  }
}

function sseInit(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
}

function sseSend(res, payload) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/* ------------------------------------------------------------- agent loop -- */

async function executeTool(def, call) {
  const args = parseArgs(call);
  try {
    const result = await def.handler(args);
    return result === undefined ? { ok: true } : result;
  } catch (e) {
    return { ok: false, error: `Tool failed: ${e.message}` };
  }
}

/*
 * Runs until the model answers in prose, a write needs approval, or the step
 * budget runs out. Returns "done" | "paused" | "limit".
 */
async function runAgent({ session, registry, send, signal, cfg }) {
  const maxSteps = cfg.maxSteps;

  for (let step = 0; step < maxSteps; step += 1) {
    /* 1. Carry out whatever tool calls the model has already asked for. */
    while (session.queue.length) {
      const call = session.queue[0];
      const name = cleanToolName(call.function && call.function.name);
      const def = name ? registry.toolFor(name) : null;
      const label = def ? def.label : undefined;

      if (!def) {
        session.queue.shift();
        const result = { ok: false, error: `Unknown tool "${name}".` };
        send({ type: "tool_result", id: call.id, name, ok: false, result });
        session.messages.push(toolMessage(call.id, result));
        continue;
      }

      /* `def.name` is the canonical name: a gateway that spelled the call with
         channel markers still has to report the tool it matched. */
      const canonical = def.name;
      const args = parseArgs(call);
      if (def.risk === "write" && !session.approved.has(call.id)) {
        let preview = def.name;
        try {
          preview = def.preview ? def.preview(args) : def.name;
        } catch (e) {
          preview = def.name;
        }
        send({
          type: "action_required",
          action: { id: call.id, name: canonical, label: def.label, args, preview },
        });
        return "paused";
      }

      session.approved.delete(call.id);
      session.queue.shift();
      send({ type: "tool_start", id: call.id, name: canonical, label: def.label, args, risk: def.risk });

      const result = await executeTool(def, call);
      send({
        type: "tool_result",
        id: call.id,
        name: canonical,
        label: def.label,
        ok: result && result.ok !== false,
        risk: def.risk,
        result: summariseResult(result),
      });
      session.messages.push(toolMessage(call.id, result));
    }

    /* 2. Ask the model for its next step. */
    send({ type: "thinking" });
    let message = null;
    /* The system prompt is rebuilt per run (schema and catalogue stats move), so
       it is kept beside the transcript rather than inside it. */
    const messages = session.system
      ? [{ role: "system", content: session.system }, ...session.messages]
      : session.messages;
    for await (const event of provider.streamTurn({
      cfg,
      messages,
      tools: registry.spec(),
      signal,
    })) {
      if (event.type === "text") send({ type: "text", text: event.text });
      else if (event.type === "message") message = event.message;
    }

    if (!message) throw new Error("The model returned no message.");
    session.messages.push(message);

    if (!message.tool_calls || !message.tool_calls.length) {
      send({ type: "done" });
      return "done";
    }
    session.queue = message.tool_calls.slice();
    session.updatedAt = Date.now();
  }

  send({
    type: "error",
    error: `Stopped after ${maxSteps} model steps without reaching an answer.`,
  });
  return "limit";
}

/* --------------------------------------------------------------- mounting -- */

module.exports = function mountAdminAssistant(app, deps) {
  const { db, authenticateToken, requireAdmin, root } = deps;
  if (!app || !db || !authenticateToken || !requireAdmin) {
    throw new Error(
      "mountAdminAssistant: app, db, authenticateToken and requireAdmin are required",
    );
  }
  const projectRoot = root || process.cwd();
  const guards = [authenticateToken, requireAdmin];

  const registryFor = (adminId, lang) =>
    createTools({
      db,
      adminId,
      lang,
      catalogue: () => Promise.resolve(loadCatalogue(projectRoot)),
    });

  const adminOf = (req) => {
    const row = (req.user && req.user.dbUser) || {};
    return {
      id: row.id ?? (req.user && req.user.userId),
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
      email: row.email || "",
    };
  };

  /* The effective configuration: whatever the admin saved in the panel, with
     .env as the fallback for anything not set there. */
  const config = () => assistantSettings.readConfig(db, provider.getConfig());

  function streamRun(req, res, session, before) {
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    const send = (payload) => sseSend(res, payload);
    sseInit(res);
    send({ type: "conversation", conversationId: session.id });

    (async () => {
      if (before) await before();
      const admin = adminOf(req);
      const registry = registryFor(admin.id, session.lang);
      const cfg = await config();
      const [schema, hours] = await Promise.all([schemaFor(db), currentSchedule(db).catch(() => null)]);
      const catalogue = loadCatalogue(projectRoot);

      /* No key and no panel settings: say so instead of aiming a keyless
         request at the default provider. The dock hides the composer in this
         state; a direct API caller must not slip through it. */
      if (!cfg.configured) {
        send({
          type: "error",
          error:
            "The assistant is not configured yet. Add a provider and an API key in the assistant settings (the gear icon).",
        });
        return;
      }

      session.system = buildSystemPrompt({ admin, schema, catalogue, hours, model: cfg.model });
      trimHistory(session);
      await runAgent({ session, registry, send, signal: controller.signal, cfg });
    })()
      .catch((e) => {
        console.error("Admin assistant error:", e);
        send({ type: "error", error: e.message || String(e) });
      })
      .finally(() => {
        if (!res.writableEnded) res.end();
      });
  }

  const jsonError = (res, e) => {
    console.error("Admin assistant error:", e);
    return res.status(500).json({ error: e.message || String(e) });
  };

  /* What the dock shows in its header, and whether it can answer yet. */
  app.get("/api/admin/assistant/status", ...guards, async (req, res) => {
    const cfg = await config();
    const registry = registryFor(adminOf(req).id);
    return res.json({
      success: true,
      configured: cfg.configured,
      provider: cfg.provider,
      providerLabel: cfg.providerLabel,
      protocol: cfg.protocol,
      source: cfg.source,
      hasKey: Boolean(cfg.apiKey),
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      needsKey: cfg.needsKey,
      tools: registry.spec().length,
      maxSteps: cfg.maxSteps,
      rewardThreshold: 5,
    });
  });

  /* ------------------------------------------ provider settings (panel UI) -- */

  const settingsView = async () => {
    const cfg = await config();
    return { settings: assistantSettings.publicView(cfg), presets: assistantSettings.presetList() };
  };

  app.get("/api/admin/assistant/settings", ...guards, async (req, res) => {
    try {
      const view = await settingsView();
      return res.json({ success: true, ...view });
    } catch (e) {
      return jsonError(res, e);
    }
  });

  app.put("/api/admin/assistant/settings", ...guards, async (req, res) => {
    try {
      const stored = await assistantSettings.readStored(db);
      const currentKey = stored.apiKey ? assistantSettings.readValue(stored.apiKey) : "";
      const check = assistantSettings.sanitise(req.body || {}, {
        provider: stored.provider,
        baseUrl: stored.baseUrl,
        model: stored.model,
        timeoutMs: stored.timeoutMs,
        maxSteps: stored.maxSteps,
      });
      if (check.error) return res.status(400).json({ error: check.error });

      /* An empty key field means "keep the one already stored". */
      const typedKey = String((req.body && req.body.apiKey) || "").trim().slice(0, 400);
      await assistantSettings.writeStored(db, { ...check.settings, apiKey: typedKey || currentKey });
      /* Drop the cache and re-read, so a row that failed to persist cannot be
         reported as saved. */
      assistantSettings.invalidate();
      const view = await settingsView();
      return res.json({ success: true, ...view });
    } catch (e) {
      return jsonError(res, e);
    }
  });

  /*
   * Test a configuration with one real call. The submitted fields win over the
   * saved ones, so an administrator can check a key before saving it; the model
   * answering is the only way this returns success.
   */
  app.post("/api/admin/assistant/test", ...guards, async (req, res) => {
    const admin = adminOf(req);
    if (throttled(admin.id)) {
      return res.status(429).json({ error: "Too many requests - give me a moment." });
    }
    try {
      const body = req.body || {};
      const stored = await assistantSettings.readStored(db);
      const cfg = await config();
      const check = assistantSettings.sanitise(body, {
        provider: stored.provider || cfg.provider,
        baseUrl: stored.baseUrl || cfg.baseUrl,
        model: stored.model || cfg.model,
        timeoutMs: stored.timeoutMs,
        maxSteps: stored.maxSteps,
      });
      if (check.error) return res.status(400).json({ error: check.error });
      const candidate = assistantSettings.resolve(
        {
          ...check.settings,
          apiKey: String(body.apiKey || "").trim() || cfg.apiKey,
        },
        provider.getConfig(),
      );
      const result = await provider.testConnection(candidate);
      return res.json({ success: true, result });
    } catch (e) {
      return jsonError(res, e);
    }
  });

  /* Forget the saved provider settings and fall back to .env. */
  app.post("/api/admin/assistant/settings/reset", ...guards, async (req, res) => {
    try {
      if (db && db.run) {
        await new Promise((resolve, reject) => {
          db.run(
            "DELETE FROM store_settings WHERE key = ?",
            [assistantSettings.SETTING_KEY],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }
      assistantSettings.invalidate();
      const view = await settingsView();
      return res.json({ success: true, ...view });
    } catch (e) {
      return jsonError(res, e);
    }
  });

  app.post("/api/admin/assistant/reset", ...guards, (req, res) => {
    const session = sessions.get(String((req.body && req.body.conversationId) || ""));
    if (session && session.adminId === adminOf(req).id) sessions.delete(session.id);
    return res.json({ success: true });
  });

  app.post("/api/admin/assistant/chat", ...guards, (req, res) => {
    const body = req.body || {};
    const text = String(body.message || "").trim();
    if (!text) return res.status(400).json({ error: "message is required" });
    if (text.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: "That message is too long." });
    }
    const admin = adminOf(req);
    if (throttled(admin.id)) {
      return res.status(429).json({ error: "Too many requests - give me a moment." });
    }

    const session = getSession(body.conversationId, admin.id);
    /* Approval is mandatory for every write tool - the client cannot opt out.
       autoApprove is not exposed to the client; keeping it server-side only
       preserves the human-in-the-loop safety gate. */
    if (body.lang) session.lang = pickLang(body.lang);
    session.messages.push({ role: "user", content: text.slice(0, MAX_MESSAGE_CHARS) });

    return streamRun(req, res, session, null);
  });

  app.post("/api/admin/assistant/actions", ...guards, (req, res) => {
    const body = req.body || {};
    const session = sessions.get(String(body.conversationId || ""));
    if (!session || session.adminId !== adminOf(req).id) {
      return res.status(404).json({ error: "This conversation expired - start a new one." });
    }

    const actionId = String(body.actionId || "");
    if (body.lang) session.lang = pickLang(body.lang);
    const front = session.queue[0];
    if (!front || front.id !== actionId) {
      return res.status(409).json({ error: "That action is no longer pending." });
    }

    if (String(body.decision) === "approve") {
      session.approved.add(actionId);
    } else {
      session.queue.shift();
      session.messages.push(
        toolMessage(actionId, {
          ok: false,
          declined: true,
          note: "The administrator declined this action. Do not retry it; adapt or ask what they want.",
        }),
      );
    }

    return streamRun(req, res, session, null);
  });

  return { mount: "/api/admin/assistant" };
};
