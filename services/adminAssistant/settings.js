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
const fs = require("fs");
const path = require("path");
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

/* --------------------------------------------------------- endpoint hygiene -- */

/*
 * Presets that are *meant* to run on this machine. Ollama and LM Studio are
 * local inference servers; blocking loopback for them would break the feature.
 * They still get the "no credentials to private ranges" half of the check
 * below, so they still cannot be pointed at the rest of the network.
 */
const LOCAL_HOST_PRESETS = new Set(["ollama", "lmstudio"]);

/*
 * Refuse an endpoint that would make the server fetch its own network.
 *
 * `baseUrl` is administrator-supplied and the assistant POSTs to it from the
 * server, so without this the panel is an SSRF primitive: point it at
 * http://127.0.0.1:5432 or a cloud metadata address and POST /api/admin/
 * assistant/test will happily do it - and httpError() puts the first 400
 * characters of the response body into the error the panel displays, so the
 * internal answer comes straight back to the browser. Because http:// is
 * allowed, the stored provider API key would also be sent to that host in
 * cleartext.
 *
 * This checks the literal host only. It is a real block on the obvious
 * targets (loopback, link-local metadata, RFC1918, bare IPs) and it is not a
 * DNS-rebinding-proof SSRF defence - that needs resolution-time pinning at the
 * fetch. Failing closed on the named ranges is still far better than nothing,
 * and it is enforced at save time so a bad host never reaches a fetch.
 */
function checkEndpointHost(baseUrl, preset) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    return "The endpoint URL could not be parsed.";
  }
  const host = String(url.hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  const isLocalPreset = preset && LOCAL_HOST_PRESETS.has(preset.id);
  const schemeOk = isLocalPreset ? true : url.protocol === "https:";

  if (!schemeOk) {
    return isLocalPreset
      ? null
      : "The endpoint must use https. Only a local provider (Ollama, LM Studio) may use http.";
  }

  const loopback =
    host === "localhost" ||
    host === "ip6-localhost" ||
    /^127\./.test(host) ||
    host === "::1" ||
    /^0\.0\.0\.0$/.test(host);
  const linkLocal =
    host === "metadata.google.internal" ||
    host.endsWith(".internal") ||
    /^169\.254\./.test(host) ||
    /^fe80:/.test(host);
  const privateV4 = /^(10\.|192\.168\.|169\.254\.|127\.)/.test(host);
  const privateV6 = /^(fc|fd)[0-9a-f]{2}:/.test(host) || /^::ffff:(10\.|192\.168\.|127\.)/.test(host);

  if (!isLocalPreset && (loopback || linkLocal || privateV4 || privateV6)) {
    return "The endpoint must be a public internet address (loopback, private and metadata addresses are not allowed).";
  }
  return null;
}

/* ------------------------------------------------------------ encrypt at rest */
let cachedKey = null;

/*
 * The encryption key is derived from the same secret the server signs sessions
 * with, resolved in the same order server.js uses: environment first, then the
 * .jwt-secret file it persists.
 *
 * The previous version read only the environment variables and fell back to
 * the literal "charme-assistant-key". server.js does not behave that way: with
 * JWT_SECRET unset it loads (or creates) .jwt-secret and signs with that. The
 * two therefore disagreed - the shop would be running on a real secret while
 * the assistant encrypted the provider API key under a string published in the
 * repository, so the ciphertext in store_settings would decrypt with a
 * three-line script. Matching the resolution removes that whole failure mode.
 */
function activeSecret() {
  const fromEnv = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (fromEnv) {
    console.warn(
      "[adminAssistant] JWT_SECRET is set but shorter than 32 characters; " +
        "it is still used for key derivation so existing keys keep working.",
    );
  }
  try {
    /* server.js keeps this file next to the project root. */
    const file = path.join(__dirname, "..", "..", ".jwt-secret");
    const value = fs.readFileSync(file, "utf8").trim();
    if (value) return value;
  } catch {
    /* no file - fall through to the ephemeral case below */
  }
  /* Ephemeral. Keys stored now cannot be read after a restart, which is the
     correct failure: better an unreadable key than a readable one. The server
     already logs a warning about the missing persistent secret. */
  cachedKey = null;
  const ephemeral = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[adminAssistant] No persistent JWT_SECRET found - the stored provider key " +
      "will not survive a restart. Set JWT_SECRET in the environment.",
  );
  return ephemeral;
}

function encKey() {
  if (cachedKey) return cachedKey;
  cachedKey = crypto.scryptSync(activeSecret(), "charme:assistant:keys", 32);
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
   assistant from working with the .env fallback. The reason is logged, though
   - a rotated or missing secret used to be completely silent, and surfaced to
   the administrator as the misleading "not configured yet, add a provider and
   an API key", which sent them to the panel when the real cause was the
   server no longer being able to read its own store. */
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
    console.error(
      "[adminAssistant] cannot decrypt the stored provider key (" +
        e.message +
        "). The JWT_SECRET changed, or the value was written under a different " +
        "secret - re-enter the key in the assistant settings.",
    );
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
  const hostCheck = checkEndpointHost(next.baseUrl, preset);
  if (hostCheck) return { error: hostCheck };

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
    /*
     * A fingerprint, not a mask. The old value was the key's first four and
     * last four characters, which removes eight characters from the keyspace
     * on every response and is the *whole* value for any short key - and it
     * travelled through the browser, the panel's state and any screenshot an
     * administrator took of it. `hasKey` already says whether a key is stored;
     * this only lets the panel notice when the stored key has been replaced.
     */
    keyFingerprint: cfg.apiKey
      ? crypto.createHash("sha256").update(cfg.apiKey).digest("hex").slice(0, 8)
      : "",
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
