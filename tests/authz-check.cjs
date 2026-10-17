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
  // admin
  const admin = await call("/api/auth/login", null).catch(() => null);
  const adminLogin = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cherifmed1200@gmail.com", password: "medmedmed88" }),
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
