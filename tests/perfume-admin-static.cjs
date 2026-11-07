#!/usr/bin/env node
// @db-scope: no-database — pure validation, no server and no database at all.
/*
 * Unit tests for services/perfumeAdmin.js's pure surface: PNG parsing / alpha
 * inspection and field validation. Run: node tests/perfume-admin-static.cjs
 */
"use strict";

const path = require("path");
const REPO = path.resolve(__dirname, "..");
const P = require("./perfume-png.cjs");
const admin = require(path.join(REPO, "services", "perfumeAdmin.js"));

let sharp = null;
try {
  sharp = require(path.join(REPO, "node_modules", "sharp"));
} catch {
  /* the service degrades gracefully without sharp; tests assert that too */
}
admin.init({
  db: null,
  sharp,
  staticCataloguePath: path.join(REPO, "public", "data", "fragrances.json"),
});

let failures = 0;
const check = (label, cond, extra) => {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label}${extra ? `  -> ${extra}` : ""}`);
  }
};

async function main() {
  console.log("\n--- PNG validation ---");
  const cases = [
    ["a real transparent RGBA PNG", P.transparent(), true],
    ["a palette PNG using tRNS", P.paletteTransparency(), true],
    ["an opaque RGBA PNG", P.opaque(), false],
    ["a completely transparent PNG", P.blank(), false],
    ["an RGB PNG with no alpha channel", P.rgbNoAlpha(), false],
    ["an animated PNG (acTL)", P.animated(), false],
    ["a JPEG-ish payload", Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(100)]), false],
    ["PNG magic followed by garbage", Buffer.concat([P.SIG, Buffer.alloc(80)]), false],
    ["a truncated PNG", P.transparent().subarray(0, 45), false],
    ["a truncated chunk length", P.transparent().subarray(0, 100), false],
    ["an empty buffer", Buffer.alloc(0), false],
    ["a 32px PNG", P.transparent({ width: 32, height: 128 }), false],
    ["a 5000px PNG", P.transparent({ width: 5000, height: 80 }), false],
    ["an impossible aspect ratio", P.transparent({ width: 4096, height: 64, alpha: (x, y) => ((x + y) % 2 ? 0 : 255) }), false],
    ["over the 5 MB limit", Buffer.concat([P.SIG, Buffer.alloc(admin.MAX_PNG_BYTES)]), false],
  ];
  for (const [label, buf, expected] of cases) {
    const r = await admin.validatePng(buf);
    check(label, r.ok === expected, `ok=${r.ok} error=${r.error || "-"}`);
  }

  const normalized = await admin.normalizePng(P.transparent(), { width: 128, height: 128 });
  check("normalisation keeps PNG magic bytes", normalized.data.subarray(0, 8).equals(P.SIG));
  check("normalisation produces content-hash revision", /^[a-f0-9]{24}$/.test(normalized.rev));

  console.log("\n--- Field validation ---");
  const base = { name: "Nuit d'Orient", brand: "Charme", price: "149.9" };
  check("create requires a name", !!admin.validateFields({ ...base, name: "" }).error);
  check("create requires a brand", !!admin.validateFields({ ...base, brand: " " }).error);
  check("happy path create", !admin.validateFields(base).error);
  const priced = admin.validateFields(base).value;
  check("price becomes a size + from_price", priced.from_price === 149.9 && JSON.parse(priced.sizes)[0].size === "Standard");
  check("available defaults to in stock", priced.available === 1);
  check("out of stock string is accepted", admin.validateFields({ ...base, available: "0" }).value.available === 0);
  check("boolean out of stock is accepted", admin.validateFields({ ...base, available: false }).value.available === 0);
  check("invalid stock is rejected", !!admin.validateFields({ ...base, available: "maybe" }).error);
  check("negative price rejected", !!admin.validateFields({ ...base, price: "-5" }).error);
  check("NaN price rejected", !!admin.validateFields({ ...base, price: "abc" }).error);
  check("price above 1e6 rejected", !!admin.validateFields({ ...base, price: "99999999" }).error);
  check("bad year rejected", !!admin.validateFields({ ...base, year: "1300" }).error);
  check("future year rejected", !!admin.validateFields({ ...base, year: String(new Date().getFullYear() + 9) }).error);
  check("valid year accepted", admin.validateFields({ ...base, year: "2024" }).value.year === 2024);
  check("empty year becomes null", admin.validateFields({ ...base, year: "" }).value.year === null);
  check("bad ingredients JSON rejected", !!admin.validateFields({ ...base, ingredients: "{oops" }).error);
  check("non-list ingredients rejected", !!admin.validateFields({ ...base, ingredients: "not a list" }).error);
  check("too many sizes rejected", !!admin.validateFields({ ...base, sizes: Array.from({ length: 13 }, () => ({ size: "50ml", price: 10 })) }).error);
  check("sizes with missing price rejected", !!admin.validateFields({ ...base, sizes: [{ size: "50ml" }] }).error);
  check("sizes JSON string accepted", JSON.parse(admin.validateFields({ ...base, sizes: '[{"size":"50ml","price":120}]' }).value.sizes)[0].price === 120);
  check("control characters are stripped", admin.validateFields({ ...base, name: "Nuit\u0007 d'Orient" }).value.name === "Nuit  d'Orient");
  check("name is capped at 120 chars", admin.validateFields({ ...base, name: "x".repeat(400) }).value.name.length === 120);
  check("HTML payload is kept as inert text", admin.validateFields({ ...base, name: "<script>alert(1)</script>" }).value.name.includes("<script>"));
  const poisoned = admin.validateFields({ ...base, constructor: "x", extraKey: 1, polluted: 1 }).value;
  check("unknown keys are dropped (no prototype pollution)",
    !("polluted" in poisoned) && !("extraKey" in poisoned) && Object.getPrototypeOf(poisoned) === Object.prototype);
  check("a __proto__ form field cannot pollute the value",
    !("polluted" in admin.validateFields(JSON.parse('{"name":"X","brand":"Y","__proto__":{"polluted":1}}')).value));
  check("partial patch needs no name or brand", !admin.validateFields({ available: 0 }, { partial: true }).error);
  const partial = admin.validateFields({ available: 0 }, { partial: true }).value;
  check("partial patch emits only the changed key", Object.keys(partial).join(",") === "available", JSON.stringify(partial));
  check("partial patch with an empty name is rejected", !!admin.validateFields({ name: "" }, { partial: true }).error);
  check("partial patch with an invalid deleted flag is rejected", !!admin.validateFields({ deleted: "yes" }, { partial: true }).error);

  console.log("\n--- Slug / id rules ---");
  check("slug strips diacritics", admin.slugify("Nuit d'Orient Éclat") === "nuit-d-orient-eclat");
  check("slug has a safe fallback", admin.slugify("!!!") === "parfum");
  check("valid ids accepted", ["layton-0", "abc_1.X-2", "A"].every((id) => admin.ID_RE.test(id)));
  check("path traversal ids rejected", ["../etc/passwd", "/abs", "a/b", "", "a b", "a?b"].every((id) => !admin.ID_RE.test(id)));
  check("bulk cap is 200", admin.MAX_BULK === 200);

  console.log(`\n${failures ? `FAILED (${failures})` : "ALL STATIC CHECKS PASSED"}`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
