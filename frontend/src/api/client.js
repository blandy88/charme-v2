/*
 * Charme API client — single fetch wrapper for the whole React app.
 * Mirrors the legacy script.js session contract:
 *  - JWT in localStorage ("charme-token"), sent as Bearer.
 *  - 401/403 signs out exactly once and redirects to /auth.
 */

const TOKEN_KEY = "charme-token";

let expiredHandled = false;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — requests just go unauthenticated */
  }
}

function handleSessionExpired() {
  if (expiredHandled) return;
  expiredHandled = true;
  setToken("");
  try {
    window.dispatchEvent(new CustomEvent("charme:session-expired"));
  } catch {
    /* ignore */
  }
  if (window.location.pathname !== "/app/auth" && window.location.pathname !== "/auth") {
    window.location.assign("/app/auth?expired=1");
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  if ((res.status === 401 || res.status === 403) && auth) {
    handleSessionExpired();
    const err = new Error("Session expired");
    err.code = "SESSION_EXPIRED";
    throw err;
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function resetSessionFlag() {
  expiredHandled = false;
}
