/* Trailer-only extra data: a handful of believable reviews on the product the
   trailer opens. Fictional people, like the rest of the demo database. */
const path = require("path");
const sqlite3 = require(path.resolve(__dirname, "..", "..", "node_modules", "sqlite3"));
const db = new sqlite3.Database(path.join(__dirname, "demo", "demo.db"));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));

const REVIEWS = [
  ["yasmine.benali@exemple.fr", 5, "Une tenue incroyable. Je le porte le soir, il reste jusqu'au lendemain sur l'écharpe.", 12],
  ["omar.trabelsi@exemple.fr", 5, "Le mélange pomme-vanille est addictif. Ma femme me l'emprunte tout le temps.", 8],
  ["camille.laurent@exemple.fr", 4, "Très beau sillage, un peu sucré à mon goût. Le 75 ml est parfait pour découvrir.", 5],
];

(async () => {
  await run("DELETE FROM reviews WHERE fragrance = 'layton'");
  for (const [email, rating, text, likes] of REVIEWS) {
    const u = await all("SELECT id, first_name, last_name FROM users WHERE email = ?", [email]);
    if (!u.length) throw new Error("missing demo user " + email);
    const name = u[0].first_name + " " + u[0].last_name;
    const days = 6 + REVIEWS.findIndex((r) => r[0] === email) * 9;
    await run(
      `INSERT INTO reviews (user_id, user_name, user_email, fragrance, rating, review_text, likes, created_at, updated_at)
       VALUES (?, ?, ?, 'layton', ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
      [u[0].id, name, email, rating, text, likes, `-${days} days`, `-${days} days`],
    );
  }

  /* Léa's saved shelf. Layton is deliberately absent: the trailer's "favori"
     beat clicks that heart on camera, so the click has to be an add, not a
     toggle-off. Re-running this file keeps that true. */
  const lea = await all("SELECT id FROM users WHERE email = 'lea.moreau@exemple.fr'");
  if (!lea.length) throw new Error("missing demo user lea.moreau@exemple.fr");
  await run("DELETE FROM user_favorites WHERE user_id = ?", [lea[0].id]);
  for (const [pid, name, days] of [
    ["haltane-1", "Haltane", 24],
    ["carlisle-7", "Carlisle", 11],
  ]) {
    await run(
      `INSERT INTO user_favorites (user_id, product_id, product_name, created_at)
       VALUES (?, ?, ?, datetime('now', ?))`,
      [lea[0].id, pid, name, `-${days} days`],
    );
  }

  const rows = await all("SELECT fragrance, user_name, rating FROM reviews ORDER BY id");
  console.log(rows);
  console.log("favorites:", await all("SELECT product_id FROM user_favorites WHERE user_id = ?", [lea[0].id]));
  db.close();
})();
