/*
 * Verify the authz fix on /api/search/loyalty-profiles and /api/search/users.
 *
 * Three cases that must hold:
 *   - anonymous          -> refused
 *   - signed-in customer -> refused   (the leak that was reported)
 *   - administrator      -> allowed   (the fix must not break the console)
 *
 * Creates a throwaway non-admin account to test with.
 */
"use strict";

const BASE = "http://localhost:3000";
const EMAIL = `probe-nonadmin-${Date.now()}@example.test`;
const PASS = "Pr0be!pass123";

/* Admin credentials are NOT stored in this file. They were, and that put a real
 * password into the git history. Supply them through the environment instead:
 *
 *   CHARME_ADMIN_EMAIL=... CHARME_ADMIN_PASSWORD=... node tests/authz-check.cjs
 *
 * Without them the test skips rather than failing, so a normal `run-all` on a
 * machine with no server and no credentials stays green.
 */
const ADMIN_EMAIL = process.env.CHARME_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.CHARME_ADMIN_PASSWORD || "";

let failures = 0;
const ok = (l) => console.log("  PASS  " + l);
const bad = (l, e) => { failures++; console.log("  FAIL  " + l + (e ? " -> " + e : "")); };

const call = async (path, token) => {
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body };
};

const ROUTES = ["/api/search/loyalty-profiles?q=ch", "/api/search/users?q=ch"];

(async () => {
  /* The test needs a running server and an administrator account. Say so and
   * leave, instead of throwing ECONNREFUSED into the suite. */
  try {
    const ping = await fetch(BASE + "/api/news", { signal: AbortSignal.timeout(3000) });
    if (!ping.ok) throw new Error("status " + ping.status);
  } catch {
    console.log("  SKIP  no server on " + BASE + " — start it, then re-run this test");
    process.exit(0);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("  SKIP  set CHARME_ADMIN_EMAIL and CHARME_ADMIN_PASSWORD to run this test");
    process.exit(0);
  }

  // admin
  const admin = await call("/api/auth/login", null).catch(() => null);
  const adminLogin = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  }).then((r) => r.json());

  // non-admin customer
  const reg = await fetch(BASE + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS, name: "Probe Nonadmin" }),
  });
  const regBody = await reg.json().catch(() => ({}));
  let customerToken = regBody.token;
  if (!customerToken) {
    const login = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASS }),
    }).then((r) => r.json());
    customerToken = login.token;
  }

  for (const route of ROUTES) {
    const anon = await call(route, null);
    anon.status >= 400 ? ok(`${route} refuses anonymous (${anon.status})`) : bad(`${route} leaked to anonymous`, anon.status);

    const cust = await call(route, customerToken);
    cust.status >= 400
      ? ok(`${route} refuses a signed-in customer (${cust.status})`)
      : bad(`${route} leaked PII to a customer`, `200, body=${JSON.stringify(cust.body).slice(0, 120)}`);

    const adm = await call(route, adminLogin.token);
    adm.status === 200
      ? ok(`${route} still works for an administrator (200)`)
      : bad(`${route} broke the admin console`, `status=${adm.status} body=${JSON.stringify(adm.body).slice(0, 120)}`);
  }

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "all checks passed"));
  process.exit(failures ? 1 : 0);
})();
