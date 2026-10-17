/*
 * Prove the provider-key encryption is no longer recoverable from a constant
 * that ships in the repository.
 *
 * The old code derived the AES key from the literal "charme-assistant-key"
 * whenever JWT_SECRET was unset. This encrypts with the CURRENT resolution
 * and then tries to decrypt the result the way an attacker holding only the
 * published constant would. That attempt must fail.
 */
"use strict";

const path = require("path");
const crypto = require("crypto");
const REPO = path.resolve(__dirname, "..");
process.chdir(REPO);
require(path.join(REPO, "node_modules", "dotenv")).config({ path: path.join(REPO, ".env") });

const settings = require(path.join(REPO, "services/adminAssistant/settings.js"));

const SECRET = "sk-test-FAKE-KEY-material-do-not-use-000000";
let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const attack = (ciphertext, secret) => {
  const [iv, tag, body] = String(ciphertext).slice("enc:v1:".length).split(":");
  const key = crypto.scryptSync(secret, "charme:assistant:keys", 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(body, "base64")), d.final()]).toString("utf8");
};

console.log("\n[round trip through the real module]");
const written = settings.encrypt(SECRET);
written.startsWith("enc:v1:")
  ? ok("the stored value is tagged as encrypted")
  : bad("no encryption prefix on the stored value", written.slice(0, 24));

const readBack = settings.decrypt(written);
readBack === SECRET
  ? ok("the module round-trips its own ciphertext")
  : bad("round trip failed", readBack);

console.log("\n[the published constant must not decrypt it]");
for (const leaked of ["charme-assistant-key", "CHANGE_ME_TO_RANDOM_SECRET", ""]) {
  try {
    const out = attack(written, leaked);
    out === SECRET
      ? bad(`ATTACK SUCCEEDED with the guess "${leaked}"`, out)
      : ok(`guess "${leaked || "(empty)"}" did not recover the key`);
  } catch {
    ok(`guess "${leaked || "(empty)"}" failed to authenticate (as it must)`);
  }
}

console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
process.exit(failures ? 1 : 0);
