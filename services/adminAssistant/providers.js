/*
 * Parfumerie Charme - back-office assistant: provider catalogue.
 *
 * Three wire protocols are supported, chosen per provider:
 *
 *   protocol "openai"    OpenAI Chat Completions. This is the lingua franca:
 *                        OpenAI, Azure OpenAI / Azure AI Foundry, OpenRouter,
 *                        Groq, Together, Fireworks, Mistral, DeepSeek, xAI,
 *                        Perplexity, Ollama, LM Studio, vLLM and anything else
 *                        that copied the schema.
 *   protocol "anthropic" Anthropic Messages API - different request and
 *                        response shapes (see ./anthropic.js).
 *   protocol "gemini"    Google Gemini generateContent - again its own (see
 *                        ./gemini.js).
 *
 * Model lists are a convenience for the <datalist>; they rot as vendors ship
 * new ones, so the field is free text and an unknown model is simply sent to
 * the provider and answered by it.
 */
"use strict";

const OPENAI = "openai";
const ANTHROPIC = "anthropic";
const GEMINI = "gemini";

const PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    protocol: OPENAI,
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o", "o4-mini", "gpt-5.1"],
    keyHint: "sk-...",
    docs: "https://platform.openai.com/api-keys",
    group: "cloud",
  },
  {
    id: "azure",
    label: "Azure OpenAI / AI Foundry",
    protocol: OPENAI,
    baseUrl: "https://YOUR-RESOURCE.services.ai.azure.com/openai/v1",
    query: "api-version=2024-10-21",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini", "o4-mini"],
    keyHint: "32-character resource key",
    docs: "https://learn.microsoft.com/azure/ai-foundry",
    group: "cloud",
    /* On Azure the model name is the deployment name. */
    deployment: true,
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    protocol: ANTHROPIC,
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      "claude-sonnet-4-5",
      "claude-opus-4-1",
      "claude-haiku-4-5",
      "claude-3-7-sonnet-latest",
    ],
    keyHint: "sk-ant-...",
    docs: "https://console.anthropic.com/settings/keys",
    group: "cloud",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    protocol: GEMINI,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
    keyHint: "AI... (AI Studio key)",
    docs: "https://aistudio.google.com/apikey",
    group: "cloud",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    protocol: OPENAI,
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4.1-mini",
      "anthropic/claude-sonnet-4.5",
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat-v3-0324",
    ],
    keyHint: "sk-or-...",
    docs: "https://openrouter.ai/keys",
    group: "cloud",
  },
  {
    id: "groq",
    label: "Groq",
    protocol: OPENAI,
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "openai/gpt-oss-20b", "qwen/qwen3-32b", "moonshotai/kimi-k2-instruct"],
    keyHint: "gsk_...",
    docs: "https://console.groq.com/keys",
    group: "cloud",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    protocol: OPENAI,
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyHint: "sk-...",
    docs: "https://platform.deepseek.com/api_keys",
    group: "cloud",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    protocol: OPENAI,
    baseUrl: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "magistral-medium-latest", "ministral-8b-latest", "open-mistral-nemo"],
    keyHint: "...",
    docs: "https://console.mistral.ai/api-keys",
    group: "cloud",
  },
  {
    id: "xai",
    label: "xAI Grok",
    protocol: OPENAI,
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-4-fast", "grok-4", "grok-3", "grok-3-mini"],
    keyHint: "xai-...",
    docs: "https://console.x.ai",
    group: "cloud",
  },
  {
    id: "together",
    label: "Together AI",
    protocol: OPENAI,
    baseUrl: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
      "deepseek-ai/DeepSeek-V3",
    ],
    keyHint: "tgp_...",
    docs: "https://api.together.xyz/settings/api-keys",
    group: "cloud",
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    protocol: OPENAI,
    baseUrl: "https://api.fireworks.ai/inference/v1",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen3-235b-a22b",
    ],
    keyHint: "fw_...",
    docs: "https://fireworks.ai/account/api-keys",
    group: "cloud",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    protocol: OPENAI,
    baseUrl: "https://api.perplexity.ai",
    models: ["sonar", "sonar-pro", "sonar-reasoning"],
    keyHint: "pplx-...",
    docs: "https://www.perplexity.ai/settings/api",
    group: "cloud",
  },
  {
    id: "pollinations",
    label: "Pollinations (free, no key)",
    protocol: OPENAI,
    baseUrl: "https://text.pollinations.ai/openai",
    models: ["openai", "openai-fast"],
    needsKey: false,
    docs: "https://pollinations.ai",
    group: "free",
  },
  {
    id: "ollama",
    label: "Ollama (this machine)",
    protocol: OPENAI,
    baseUrl: "http://127.0.0.1:11434/v1",
    models: ["qwen3", "llama3.2", "gemma3", "mistral-small3.2"],
    needsKey: false,
    docs: "https://ollama.com",
    group: "local",
  },
  {
    id: "lmstudio",
    label: "LM Studio (this machine)",
    protocol: OPENAI,
    baseUrl: "http://127.0.0.1:1234/v1",
    models: [],
    needsKey: false,
    docs: "https://lmstudio.ai",
    group: "local",
  },
  {
    id: "custom",
    label: "Custom endpoint",
    protocol: OPENAI,
    baseUrl: "",
    models: [],
    keyHint: "Bearer token, if any",
    group: "custom",
  },
];

const GROUPS = [
  { id: "cloud", label: "Hosted API" },
  { id: "free", label: "Free, no key" },
  { id: "local", label: "Running on this machine" },
  { id: "custom", label: "Custom" },
];

function presetById(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

/* Which catalogue entry matches a base URL, so the panel can show "OpenAI"
   even for a saved config that predates the setting. */
function presetForBaseUrl(baseUrl) {
  const value = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!value) return null;
  return (
    PRESETS.find((p) => p.baseUrl && p.baseUrl.replace(/\/+$/, "") === value) || null
  );
}

/* Full URL for a chat/ generation call, including any provider query string. */
function endpointUrl(cfg, path) {
  const base = String(cfg.baseUrl || "").replace(/\/+$/, "");
  const query = cfg.query ? `?${cfg.query}` : "";
  return `${base}${path}${query}`;
}

module.exports = { PRESETS, GROUPS, presetById, presetForBaseUrl, endpointUrl, OPENAI, ANTHROPIC, GEMINI };
