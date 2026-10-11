/*
 * Charme API client — single fetch wrapper for the whole React app.
 * Mirrors the legacy script.js session contract:
 *  - JWT in localStorage ("charme-token"), sent as Bearer.
 *  - 401/403 signs out exactly once and redirects to /auth.
 */

const TOKEN_KEY = "charme-token";

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

/*
 * Multipart variant, for the one endpoint that takes a file: avatar upload.
 * `api()` always sends JSON, so it cannot be reused here — there is no way to
 * make fetch set the multipart boundary itself if we pre-set Content-Type.
 */
export async function apiUpload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: "POST",
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
