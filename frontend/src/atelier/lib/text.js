/*
 * Text helpers with no data dependency.
 *
 * `initials` used to live in catalog.js, but that module imports the whole
 * `virtual:catalogue` (553 KB). Anything on the critical path that only needs
 * initials must not pull the catalogue in with it — the collection shelves and
 * the homepage piece run were both in that position, so the helper is standalone.
 */

export function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
