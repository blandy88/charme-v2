/*
 * Prove the endpoint-host check blocks SSRF while leaving the local-inference
 * providers usable.
 */
"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const { sanitise, presetList } = require(path.join(REPO, "services/adminAssistant/settings.js"));

let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const trySave = (patch) => sanitise({}, patch);

const BLOCKED = [
  ["loopback by name", { provider: "custom", baseUrl: "http://127.0.0.1:5432/x", model: "m" }],
  ["loopback by alias", { provider: "custom", baseUrl: "https://localhost:8080/v1", model: "m" }],
  ["metadata (gcp)", { provider: "custom", baseUrl: "http://metadata.google.internal/computeMetadata/v1", model: "m" }],
  ["metadata (aws ip)", { provider: "custom", baseUrl: "https://169.254.169.254/latest/meta-data", model: "m" }],
  ["rfc1918 10.x", { provider: "custom", baseUrl: "http://10.0.0.5:3000/v1", model: "m" }],
  ["rfc1918 192.168.x", { provider: "custom", baseUrl: "http://192.168.1.10/api", model: "m" }],
  ["rfc1918 over https", { provider: "custom", baseUrl: "https://192.168.0.1/v1", model: "m" }],
  ["ipv6 loopback", { provider: "custom", baseUrl: "https://[::1]:8080/v1", model: "m" }],
  ["cleartext http to a public host", { provider: "custom", baseUrl: "http://example.com/v1", model: "m" }],
];

const ALLOWED = [
  ["public https endpoint", { provider: "custom", baseUrl: "https://api.example.com/v1", model: "m" }],
  ["ollama on loopback", { provider: "ollama", model: "llama3" }],
  ["lm studio on loopback", { provider: "lmstudio", model: "local-model" }],
];

console.log("\n[internal targets must be refused]");
for (const [name, patch] of BLOCKED) {
  const r = trySave(patch);
  r && r.error ? ok(`${name} refused`) : bad(`${name} was ACCEPTED`, JSON.stringify(r).slice(0, 90));
}

console.log("\n[legitimate endpoints must still save]");
for (const [name, patch] of ALLOWED) {
  const r = trySave(patch);
  !r || !r.error ? ok(`${name} accepted`) : bad(`${name} was refused`, r.error);
}

console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
process.exit(failures ? 1 : 0);
