/*
 * Charme API client — single fetch wrapper for the whole React app.
 * Mirrors the legacy script.js session contract:
 *  - JWT in localStorage ("charme-token"), sent as Bearer.
 *  - 401/403 signs out exactly once and redirects to /auth.
 */

const TOKEN_KEY = "charme-token";

/*
 * API origin shim.
 *
 * The legacy root site patches window.fetch with CHARME_API_ORIGIN so that the
 * custom domain (GitHub Pages, pure static, no /api route) talks to the Render
 * backend. /app does NOT load public/script.js, so it never got that patch:
 * on charmeperfume.me every relative /api/... call 404s. Render and Vercel
 * both serve /api themselves, and localhost has the Express dev server, so
 * only "other" hosts are redirected. CORS on the backend already allows this
 * origin with credentials.
 */
export const API_ORIGIN = (() => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  const sameOrigin =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".onrender.com") ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".localhost");
  return sameOrigin ? "" : "https://parfumerie-charme.onrender.com";
})();

export function apiUrl(path) {
  const p = String(path || "");
  if (!API_ORIGIN || /^(?:https?:)?\/\//i.test(p) || !p.startsWith("/")) return p;
  return API_ORIGIN + p;
}

let expiredHandled = false;

/*
 * The token lives in localStorage when "remember me" is on (survives a
 * restart) and in sessionStorage when it is off (dies with the tab). Two
 * stores, one reader — the legacy site had the same checkbox and simply
 * always persisted, which made the choice decorative.
 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token, persist = true) {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }
    if (persist) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
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
  const res = await fetch(apiUrl(path), {
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

/*
 * Multipart variant, for endpoints that take a file: avatar upload and the
 * perfume admin's transparent PNG. `api()` always sends JSON, so it cannot be
 * reused here — there is no way to make fetch set the multipart boundary
 * itself if we pre-set Content-Type. `method` exists because editing a perfume
 * with a replacement image is a PUT, not a POST.
 */
export async function apiUpload(path, formData, { method = "POST" } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: formData,
    credentials: "same-origin",
  });
  if (res.status === 401 || res.status === 403) {
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
    const err = new Error((data && data.error) || `Upload failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function resetSessionFlag() {
  expiredHandled = false;
}

/*
 * Streaming endpoints (the admin AI assistant) cannot use api(): they need the
 * raw response body to read Server-Sent Events, and api() always buffers the
 * response. They still need the same bearer token, so the header is exposed
 * here rather than re-reading localStorage at the call site.
 */
export function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
