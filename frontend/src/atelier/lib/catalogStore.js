/*
 * Live catalogue overlay.
 *
 * `virtual:catalogue` is a 550 KB array inlined at build time. Editing a
 * perfume in the admin panel cannot rewrite the committed bundle, so the
 * server stores a small overlay (created / updated / deleted) and this module
 * merges it over the static array on boot.
 *
 * This file deliberately does NOT import virtual:catalogue or catalog.js.
 * main.jsx starts the sync from here on the critical path, so pulling in the
 * heavy module would defeat years of careful code-splitting. The overlay may
 * arrive before the Collection chunk is ever loaded; it is buffered until
 * catalog.js calls seedCatalogue().
 *
 * Two views of the same data:
 *   - `products` (returned by seedCatalogue) is ONE stable array, mutated with
 *     splice. Old `import { products as ALL }` consumers keep a valid handle.
 *   - `snapshot` is a fresh array per change, so useSyncExternalStore can see
 *     an identity change and re-render. Mutating only the stable array would
 *     leave React convinced nothing had happened.
 */
import { useSyncExternalStore } from "react";
import { apiUrl } from "../../api/client.js";

const EMPTY = { success: true, revision: "", created: [], updated: [], deleted: [] };

let base = [];
let seeded = false;
let overlay = null;
let productsRef = null;
let snapshot = [];
let status = { stale: false, lastSync: 0, revision: "", pending: false };
let inFlight = null;
let started = false;

const listeners = new Set();
const notify = () => {
  for (const fn of Array.from(listeners)) fn();
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => snapshot;
const getStatus = () => status;

function setStatus(patch) {
  status = { ...status, ...patch };
  notify();
}

/* Uploaded images are served by the API, which lives on a different origin on
   static hosts. Anything else (a shipped /bottle.png, an fimgs.net URL) stays
   exactly as the build emitted it. */
function withImage(record) {
  const out = { ...record };
  if (Object.prototype.hasOwnProperty.call(out, "imagePath")) {
    const p = out.imagePath;
    out.image = p ? (String(p).startsWith("/api/") ? apiUrl(p) : p) : null;
  }
  return out;
}

function recompute() {
  if (!seeded) return; // buffer: catalog.js has not been imported yet
  const o = overlay || EMPTY;
  const patches = new Map((o.updated || []).map((p) => [String(p.id), p]));
  const deleted = new Set((o.deleted || []).map(String));
  const next = [];

  for (const p of base) {
    const id = String(p.id);
    if (deleted.has(id)) continue;
    const patch = patches.get(id);
    next.push(patch ? withImage({ ...p, ...patch }) : p);
  }
  const seen = new Set(next.map((p) => String(p.id)));
  for (const raw of o.created || []) {
    const p = withImage(raw);
    if (deleted.has(String(p.id)) || seen.has(String(p.id))) continue;
    next.push(p);
    seen.add(String(p.id));
  }

  snapshot = next;
  if (productsRef) productsRef.splice(0, productsRef.length, ...next);
  status = { ...status, revision: o.revision || "" };
  notify();
}

/** Called once, by catalog.js, after virtual:catalogue has been resolved. */
export function seedCatalogue(rows) {
  if (seeded) return productsRef;
  base = Array.isArray(rows) ? rows.slice() : [];
  productsRef = base.slice();
  seeded = true;
  recompute();
  return productsRef;
}

/** Apply an overlay payload directly (also used by the browser harness). */
export function applyOverlay(payload) {
  overlay = payload && payload.success ? payload : EMPTY;
  recompute();
  return snapshot;
}

export function isSeeded() {
  return seeded;
}

export function getCatalogue() {
  return snapshot;
}

export function useCatalogue() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCatalogueSync() {
  return useSyncExternalStore(subscribe, getStatus, getStatus);
}

/* A plain GET with no custom headers avoids a CORS preflight on every poll.
   Single-flighted: the 60 s timer, a focus event and an admin save can all
   land on the same tick without issuing three requests. */
export function refreshCatalogue() {
  if (inFlight) return inFlight;
  setStatus({ pending: true });
  inFlight = fetch(apiUrl("/api/catalog/overlay"), { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Catalogue sync failed (${res.status})`);
      return res.json();
    })
    .then((payload) => {
      overlay = payload && payload.success ? payload : EMPTY;
      recompute();
      status = { ...status, stale: false, lastSync: Date.now(), pending: false };
      notify();
      return overlay;
    })
    .catch((err) => {
      status = { ...status, stale: true, pending: false };
      notify();
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** After an admin write: pull the new overlay immediately, then tell any other
    listener (the polling loop, another tab's focus handler) to do the same. */
export function catalogueChanged() {
  const p = refreshCatalogue().catch(() => {});
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("charme:catalogue-changed"));
    }
  } catch {
    /* older browsers without CustomEvent: the direct refresh above still ran */
  }
  return p;
}

/** Called once from main.jsx. Lives for the whole page; no teardown. */
export function startCatalogueSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const tick = () => {
    refreshCatalogue().catch(() => {});
  };
  tick();
  window.setInterval(tick, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  window.addEventListener("focus", tick);
  window.addEventListener("charme:catalogue-changed", tick);
}
