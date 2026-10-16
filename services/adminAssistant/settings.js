/*
 * Parfumerie Charme - back-office assistant: settings.
 *
 * The provider choice used to be env-only, which meant only someone with shell
 * access could point the assistant at another model. It now lives in the shop's
 * own settings table (store_settings, the same key/value store that holds the
 * opening hours), so an administrator can pick a provider, paste a key and test
 * it from the panel.
 *
 * The API key is encrypted at rest (AES-256-GCM, key derived from the server's
 * JWT_SECRET). That matters here because the repository ships a copy of the
 * local database file - a plaintext key would eventually end up in git.
 *
 * .env stays the fallback: anything not set in the panel falls back to
 * AI_BASE_URL / AI_API_KEY / AI_MODEL / AI_TIMEOUT_MS / AI_MAX_STEPS, so
 * serverless and CLI deployments keep working untouched.
 */
"use strict";

const crypto = require("crypto");
const { presetById, presetForBaseUrl, PRESETS } = require("./providers");

const SETTING_KEY = "assistant_provider";
const ENC_PREFIX = "enc:v1:";

const DEFAULTS = {
  provider: "openai",
  baseUrl: "",
  model: "",
  apiKey: "",
  timeoutMs: 120000,
  maxSteps: 8,
};

/* ------------------------------------------------------------ encrypt at rest */

let cachedKey = null;
function encKey() {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.JWT_SECRET || process.env.SESSION_SECRET || "charme-assistant-key";
  cachedKey = crypto.scryptSync(secret, "charme:assistant:keys", 32);
  return cachedKey;
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const body = Buffer.from(String(text), "utf8");
  const enc = Buffer.concat([cipher.update(body), cipher.final()]);
  return `${ENC_PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

/* Returns "" rather than throwing: a key that cannot be read must not stop the
   assistant from working with the .env fallback. */
function decrypt(payload) {
  try {
    const [iv, tag, body] = String(payload || "")
      .slice(ENC_PREFIX.length)
      .split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encKey(),
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  } catch (e) {
    return "";
  }
}

const isEncrypted = (v) => String(v || "").startsWith(ENC_PREFIX);
const readValue = (v) => (isEncrypted(v) ? decrypt(v) : String(v || ""));

/* ------------------------------------------------------------------ storage -- */

let cache = { at: 0, value: null };
const CACHE_MS = 10_000;

function invalidate() {
  cache = { at: 0, value: null };
}

function get(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function (err) {
      if (err) return reject(err);
      resolve(this && this.lastID);
    });
  });
}

/* The stored, normalised settings ({} when nothing was ever saved). */
async function readStored(db) {
  if (cache.value && Date.now() - cache.at < CACHE_MS) return cache.value;
  let row = null;
  try {
    row = await get(db, "SELECT value FROM store_settings WHERE key = ?", [SETTING_KEY]);
  } catch (e) {
    console.error("Assistant settings: cannot read store_settings:", e.message);
  }
  let value = {};
  if (row && row.value) {
    try {
      value = JSON.parse(row.value) || {};
    } catch (e) {
      value = {};
    }
  }
  cache = { at: Date.now(), value };
  return value;
}

async function writeStored(db, next) {
  const payload = JSON.stringify({
    provider: next.provider,
    baseUrl: next.baseUrl,
    model: next.model,
    timeoutMs: next.timeoutMs,
    maxSteps: next.maxSteps,
    ...(next.apiKey ? { apiKey: encrypt(next.apiKey) } : {}),
  });
  await run(
    db,
    "INSERT OR REPLACE INTO store_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
    [SETTING_KEY, payload],
  );
  cache = { at: Date.now(), value: next };
  return next;
}

/* ------------------------------------------------------------- validation -- */

const LIMITS = {
  baseUrl: { min: 8, max: 200 },
  model: { min: 1, max: 100 },
  apiKey: { min: 0, max: 400 },
};

function sanitise(body, stored) {
  const next = {
    provider: String(body.provider || stored.provider || DEFAULTS.provider).trim(),
    baseUrl: String(
      body.baseUrl === undefined || body.baseUrl === null ? stored.baseUrl || "" : body.baseUrl,
    ).trim(),
    model: String(
      body.model === undefined || body.model === null ? stored.model || "" : body.model,
    ).trim(),
    timeoutMs: Number(body.timeoutMs === undefined ? stored.timeoutMs : body.timeoutMs),
    maxSteps: Number(body.maxSteps === undefined ? stored.maxSteps : body.maxSteps),
    apiKey: "",
  };

  const preset = presetById(next.provider);
  if (!preset) return { error: `Unknown provider "${next.provider}".` };

  /* A preset carries its own endpoint: it is filled in when the admin picks a
     provider and only ever changed deliberately (custom endpoints, gateways). */
  if (!next.baseUrl) next.baseUrl = preset.baseUrl || "";
  next.baseUrl = next.baseUrl.replace(/\/+$/, "");
  if (next.baseUrl.length < LIMITS.baseUrl.min || next.baseUrl.length > LIMITS.baseUrl.max) {
    return { error: `The endpoint URL must be ${LIMITS.baseUrl.min}-${LIMITS.baseUrl.max} characters.` };
  }
  if (!/^https?:\/\//i.test(next.baseUrl)) {
    return { error: "The endpoint URL must start with http:// or https://." };
  }

  if (!next.model) next.model = preset.models && preset.models.length ? preset.models[0] : "";
  if (next.model.length < LIMITS.model.min || next.model.length > LIMITS.model.max) {
    return { error: "Enter the model name to use." };
  }

  if (!Number.isFinite(next.timeoutMs)) next.timeoutMs = DEFAULTS.timeoutMs;
  next.timeoutMs = Math.min(Math.max(Math.round(next.timeoutMs), 5_000), 600_000);

  if (!Number.isFinite(next.maxSteps)) next.maxSteps = DEFAULTS.maxSteps;
  next.maxSteps = Math.min(Math.max(Math.round(next.maxSteps), 1), 30);

  return { settings: next };
}

/* ------------------------------------------------------------- resolution -- */

function resolve(stored, envConfig) {
  const preset = presetById(stored.provider) || presetById(DEFAULTS.provider);
  const fromDb = Boolean(stored.provider || stored.baseUrl || stored.model);
  const baseUrl = (stored.baseUrl || envConfig.baseUrl || preset.baseUrl || "").replace(/\/+$/, "");
  const model = stored.model || envConfig.model || (preset.models && preset.models[0]) || "";
  const apiKey = stored.apiKey || envConfig.apiKey || "";
  const needsKey = preset.needsKey !== false;

  return {
    provider: preset.id,
    providerLabel: preset.label,
    protocol: preset.protocol,
    baseUrl,
    model,
    apiKey,
    timeoutMs: stored.timeoutMs || envConfig.timeoutMs,
    maxSteps: stored.maxSteps || envConfig.maxSteps,
    query: preset.query || "",
    needsKey,
    source: fromDb ? "panel" : "env",
    /* Keyless providers (Ollama, LM Studio, Pollinations) are ready without a
       key; anything else needs one before the agent can run. */
    configured: needsKey ? Boolean(apiKey) : true,
  };
}

async function readConfig(db, envConfig) {
  const stored = await readStored(db);
  return resolve(
    {
      provider: stored.provider,
      baseUrl: stored.baseUrl,
      model: stored.model,
      timeoutMs: stored.timeoutMs,
      maxSteps: stored.maxSteps,
      apiKey: stored.apiKey ? readValue(stored.apiKey) : "",
    },
    envConfig,
  );
}

/* What the panel is allowed to see. The key is never sent back. */
function publicView(cfg) {
  return {
    provider: cfg.provider,
    providerLabel: cfg.providerLabel,
    protocol: cfg.protocol,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    timeoutMs: cfg.timeoutMs,
    maxSteps: cfg.maxSteps,
    needsKey: cfg.needsKey,
    configured: cfg.configured,
    source: cfg.source,
    hasKey: Boolean(cfg.apiKey),
    keyMasked: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}${"•".repeat(8)}${cfg.apiKey.slice(-4)}` : "",
    rewardThreshold: 5,
  };
}

function presetList() {
  return PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    protocol: p.protocol,
    baseUrl: p.baseUrl,
    models: p.models.slice(),
    needsKey: p.needsKey !== false,
    keyHint: p.keyHint || "",
    docs: p.docs || "",
    group: p.group,
    deployment: Boolean(p.deployment),
  }));
}

/* Provider errors are plain English, like the rest of the module's messages. */
module.exports = {
  SETTING_KEY,
  DEFAULTS,
  readStored,
  writeStored,
  readConfig,
  sanitise,
  resolve,
  publicView,
  presetList,
  invalidate,
  presetForBaseUrl,
  encrypt,
  decrypt,
  readValue,
  isEncrypted,
};
