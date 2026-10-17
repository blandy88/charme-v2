/* Regression checks from the 2026-10-17 audit.
 *
 * Run:  node tests/<name>.cjs      exit 0 = pass, 1 = fail
 *
 * Each one either proves a fixed bug stays fixed, or measures something an
 * earlier report claimed without checking. See docs/audit-2026-10-17-deep.md.
 */

/* placeholder-live and price-check touch the live database and the real source
 * tree, so they resolve the repo from their own location rather than the cwd. */

placeholder-proof  unit test of db.js replacePlaceholders, lifted from the source
placeholder-live  the same, against the live database (creates and drops its
                   own probe table)
price-check       one price formatter everywhere, plus a grep for the shapes
                   that used to bypass it
dup-css           verbatim-duplicated CSS rules - a byte-identical repeat
dup-selectors     the same selectors declared twice, which is the case that
                   actually bites because the later copy silently wins
*/