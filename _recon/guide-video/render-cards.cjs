/* Renders the trailer's title cards as 2x PNGs.
 *
 * The cards live outside the site on purpose: they are the film's punctuation,
 * not a page of the store. Same palette and same two typefaces as the Atelier,
 * so the cut from card to page feels like one object.
 *
 * Run: node render-cards.cjs
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright");

const CHROME = "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";
const OUT = path.resolve(__dirname, "work", "trailer-cards");
fs.mkdirSync(OUT, { recursive: true });

// Text lives in trailer.json so the cards, the build and the film agree.
const SPEC = JSON.parse(fs.readFileSync(path.join(__dirname, "trailer.json"), "utf8"));
const CARDS = ["intro", "chapter", "outro"].map((id) => ({
  id,
  theme: id === "chapter" ? "dark" : "light",
  url: "",
  size: 196,
  ...SPEC.cards[id],
}));

function html(c) {
  const dark = c.theme === "dark";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: ${dark ? "oklch(17% 0.018 42)" : "oklch(95.5% 0.012 62)"};
    --bg2: ${dark ? "oklch(21% 0.022 42)" : "oklch(98% 0.008 62)"};
    --text: ${dark ? "oklch(96% 0.008 42)" : "oklch(24% 0.02 42)"};
    --muted: ${dark ? "oklch(72% 0.014 42)" : "oklch(46% 0.018 42)"};
    --accent: ${dark ? "oklch(78% 0.13 42)" : "oklch(45% 0.12 42)"};
    --hair: ${dark ? "oklch(96% 0.008 42 / 0.14)" : "oklch(24% 0.02 42 / 0.16)"};
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { inline-size: 1920px; block-size: 1080px; overflow: hidden; }
  body {
    background:
      radial-gradient(120% 90% at 50% 42%, var(--bg2) 0%, var(--bg) 58%, ${dark ? "oklch(13% 0.016 42)" : "oklch(91% 0.014 58)"} 100%);
    color: var(--text);
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
    display: grid;
    place-items: center;
    position: relative;
  }
  /* Fine paper grain: two offset repeating gradients, barely there. */
  body::after {
    content: "";
    position: absolute; inset: 0;
    background-image: repeating-linear-gradient(0deg, oklch(0% 0 0 / 0.014) 0 1px, transparent 1px 3px),
                      repeating-linear-gradient(90deg, oklch(100% 0 0 / 0.012) 0 1px, transparent 1px 4px);
    opacity: .5;
    pointer-events: none;
  }
  .frame {
    position: absolute; inset: 52px;
    border: 1px solid var(--hair);
    pointer-events: none;
  }
  .frame::before, .frame::after {
    content: ""; position: absolute; background: var(--accent); opacity: .55;
  }
  .frame::before { inline-size: 46px; block-size: 1px; inset-block-start: -1px; inset-inline-start: -1px; }
  .frame::after  { inline-size: 1px; block-size: 46px; inset-block-end: -1px; inset-inline-end: -1px; }
  .watermark {
    position: absolute; inset-block-start: 50%; inset-inline-start: 50%;
    transform: translate(-50%, -51%);
    font-family: "Fraunces", Georgia, serif;
    font-weight: 300;
    font-size: 900px;
    line-height: .8;
    letter-spacing: -.06em;
    color: var(--accent);
    opacity: .045;
    user-select: none;
  }
  .stack {
    position: relative;
    display: grid;
    justify-items: center;
    text-align: center;
    padding-block-end: 8px;
  }
  .eyebrow {
    font-size: 19px;
    font-weight: 500;
    letter-spacing: .36em;
    text-transform: uppercase;
    color: var(--accent);
    padding-inline-start: .36em; /* balance the trailing tracking */
  }
  h1 {
    font-family: "Fraunces", Georgia, serif;
    font-weight: 400;
    font-size: ${c.size}px;
    line-height: .98;
    letter-spacing: -.025em;
    font-variation-settings: "opsz" 144;
    margin-block-start: ${c.size > 200 ? 26 : 30}px;
  }
  .rule {
    inline-size: 72px; block-size: 1px;
    background: var(--accent); opacity: .6;
    margin-block: 34px 30px;
  }
  .sub {
    font-size: 28px;
    font-weight: 400;
    letter-spacing: .015em;
    color: var(--muted);
    max-inline-size: 1000px;
  }
  .url {
    margin-block-start: 26px;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: .28em;
    text-transform: uppercase;
    color: var(--accent);
    padding-inline-start: .28em;
  }
</style></head>
<body>
  <div class="frame"></div>
  ${c.title.length > 3 ? `<div class="watermark">${c.title.slice(0, 1)}</div>` : `<div class="watermark">C</div>`}
  <div class="stack">
    <p class="eyebrow">${c.eyebrow}</p>
    <h1>${c.title}</h1>
    <div class="rule"></div>
    <p class="sub">${c.sub}</p>
    ${c.url ? `<p class="url">${c.url}</p>` : ""}
  </div>
</body></html>`;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  for (const c of CARDS) {
    const file = path.join(OUT, c.id + ".html");
    fs.writeFileSync(file, html(c), "utf8");
    await page.goto("file:///" + file.replace(/\\/g, "/"), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => document.fonts.check('16px "Fraunces"') && document.fonts.check('16px "Inter"'));
    if (!ok) console.warn("  ! web fonts did not load for", c.id);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, c.id + ".png") });
    console.log("card", c.id, "->", path.join(OUT, c.id + ".png"));
  }
  await browser.close();
})();
