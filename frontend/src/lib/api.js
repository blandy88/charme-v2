/**
 * Thin client for the existing Express API.
 *
 * Auth uses the same storage keys as the legacy site (`authToken` in
 * localStorage or sessionStorage) so a logged-in user stays logged in when
 * the React root takes over.
 */
const TOKEN_KEY = "authToken";
const USER_KEY = "user";

export function getToken() {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      ""
    );
  } catch {
    return "";
  }
}

export function setToken(token, remember = true) {
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    /* private mode — auth just won't persist */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error — is the server reachable?");
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = new Error(
      (data && (data.message || data.error)) || `Request failed (${res.status})`,
    );
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  register: (payload) =>
    request("/auth/register", { method: "POST", body: payload }),
  verifyEmail: (payload) =>
    request("/auth/verify-email", { method: "POST", body: payload }),
  resendVerification: (payload) =>
    request("/auth/resend-verification", { method: "POST", body: payload }),

  me: () => request("/user/profile", { auth: true }),
  updateProfile: (payload) =>
    request("/user/profile", { method: "PUT", body: payload, auth: true }),

  favourites: () => request("/user/favorites", { auth: true }),
  toggleFavourite: (productId) =>
    request("/user/favorites/toggle", {
      method: "POST",
      body: { productId },
      auth: true,
    }),

  reviews: (fragrance) => request(`/reviews/${encodeURIComponent(fragrance)}`),
  addReview: (payload) =>
    request("/reviews", { method: "POST", body: payload, auth: true }),

  news: () => request("/news"),
  storeHours: () => request("/store-hours"),
  leaveNote: (payload) =>
    request("/notes", { method: "POST", body: payload }),
};
