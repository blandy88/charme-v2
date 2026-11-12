/* Renders one guide video, frame by frame, deterministically.
 *
 * Why not film it. The previous pipeline recorded the page with Playwright's
 * built-in recorder, which is VP8 at a fixed ~600 kbit/s: at 2560x1440 that is
 * 0.16 bits per pixel, and it showed. It also filmed in real time, so the
 * camera could only ever be as smooth as the encoder's frame timing.
 *
 * This renders instead. Nothing here is captured - every frame is composed on
 * purpose:
 *
 *   - The camera is a CSS transform on #root. Chromium re-rasterises text at
 *     the zoomed size, so a 2x push-in is genuinely sharp rather than a
 *     2x upscale of a soft source.
 *   - Every value (camera, cursor, spotlight, click ripple) is a closed-form
 *     function of the frame number, so the motion is exactly as smooth as the
 *     maths and cannot drift or jitter.
 *   - The spotlight is a box-shadow scrim cut around the element being talked
 *     about, so the rest of the page falls away and the eye is led.
 *
 * Tutorials change the page as they go - a click opens a form, a field gets
 * typed into. So the target of each beat is measured at the start of that
 * beat, not once up front, and the camera plan follows the page.
 *
 * Run: node render.cjs <guideId> [script.json] [--check]
 *
 * `--check` walks the whole shot list against the live server without voice or
 * captured frames: every action runs, every selector is resolved, every click
 * lands. It turns a missing selector into a five-second failure rather than a
 * five-minute render.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
require("dotenv").config({ path: path.join(ROOT, ".env") });
const jwt = require("jsonwebtoken");

const { chromium } = require("C:/Users/cheri/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright");
const CHROME =
  "C:/Users/cheri/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";

const HERE = __dirname;
const ORIGIN = process.env.CHARME_ORIGIN || "http://localhost:3000";
const VW = 1920;
const VH = 1080;

const FPS = 30;
const LEAD = 0.25;          // silence before a line
const TAIL = 0.30;          // silence after it
const MOVE = 1.45;          // seconds the camera takes to travel
const BREATHE = 1.04;       // extra creep mid-hold, so nothing sits dead
const CURSOR_DELAY = 0.30;
const CURSOR_GLIDE = 0.85;
const RIPPLE = 0.62;
const SPOT_FADE = 0.55;     // only where a neighbouring beat has no spotlight
const TYPE_DUR = 1.5;       // seconds to type a whole field, unless overridden

const log = (m) => fs.writeSync(1, m + "\n");
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (x) => {
  const p = clamp(x, 0, 1);
  return p * p * (3 - 2 * p);
};
const lerp = (a, b, t) => a + (b - a) * t;

/* --------------------------------------------------------------- overlay */
const CURSOR_SVG =
  '<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">' +
  '<path d="M3 2 L3 24.5 L9.6 18.6 L13.7 27.2 L17.9 25.2 L13.8 16.7 L22.3 16.4 Z" ' +
  'fill="#ffffff" stroke="#101010" stroke-width="1.7" stroke-linejoin="round"/></svg>';

const OVERLAY_CSS = `
#__film { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
#__spot { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0;
  border-radius: 13px; border: 1.5px solid rgba(255,231,192,.62);
  box-shadow: 0 0 0 9999px rgba(8,5,5,.72), 0 0 22px 2px rgba(255,203,138,.22); }
#__cur { position: absolute; left: 0; top: 0; width: 26px; height: 30px; margin: -3px 0 0 -3px;
  filter: drop-shadow(0 2px 5px rgba(0,0,0,.55)); }
#__ring { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px;
  border-radius: 50%; border: 3px solid rgba(255,255,255,.95); background: rgba(255,255,255,.22);
  opacity: 0; }
#__fade { position: absolute; inset: 0; background: #0a0807; opacity: 0; }
`;

const OVERLAY_INIT = `(() => {
  if (window.__film) return;
  const mount = () => {
    if (document.getElementById("__film")) return;
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(OVERLAY_CSS)};
    document.head.appendChild(style);
    const film = document.createElement("div");
    film.id = "__film";
    film.innerHTML = '<div id="__spot"></div><div id="__cur">' +
      ${JSON.stringify(CURSOR_SVG)} + '</div><div id="__ring"></div>' +
      '<div id="__fade"></div>';
    document.body.appendChild(film);
    window.__film = {
      root: document.getElementById("root"),
      host: film,
      spot: document.getElementById("__spot"),
      cur: document.getElementById("__cur"),
      ring: document.getElementById("__ring"),
      fade: document.getElementById("__fade"),
    };
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();`;

/* ------------------------------------------------------------- the maths */
/* Framing: the box the camera should show for a given highlight, kept 16:9 so
   the push-in never stretches, then clamped to the document so the frame never
   runs off the edge into empty space. */
function frameFor(rect, opts, doc) {
  const pad = opts.pad == null ? 0.2 : opts.pad;
  const zmax = opts.zmax == null ? 2.0 : opts.zmax;
  let w = rect.w * (1 + 2 * pad);
  let h = rect.h * (1 + 2 * pad);
  if (opts.minFrame) {
    w = Math.max(w, opts.minFrame[0]);
    h = Math.max(h, opts.minFrame[1]);
  }
  const ar = VW / VH;
  if (w / h < ar) w = h * ar; else h = w / ar;
  const z = clamp(Math.min(VW / w, VH / h), 1.0, zmax);
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, z };
}

function clampCam(cam, doc) {
  const hw = VW / 2 / cam.z;
  const hh = VH / 2 / cam.z;
  return {
    z: cam.z,
    cx: clamp(cam.cx, Math.min(hw, doc.w / 2), Math.max(doc.w - hw, doc.w / 2)),
    cy: clamp(cam.cy, Math.min(hh, doc.h / 2), Math.max(doc.h - hh, doc.h / 2)),
  };
}

/* The camera transform lives on #root while a beat is being shot, and
   getBoundingClientRect() reports the *transformed* box - so anything measured
   mid-film would be measured through the lens. Drop the transform for the
   measurement, then let the next frame put it back. */
async function untransform(page) {
  await page.evaluate(() => {
    const r = window.__film && window.__film.root;
    if (r) r.style.transform = "none";
  });
}

async function measure(page, beat) {
  await untransform(page);
  return page.evaluate((sels) => {
    const doc = {
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    };
    if (!sels) return { doc, rect: null, fixed: false };
    /* A fixed element is anchored to the viewport - until an ancestor is
       transformed, at which point that ancestor becomes its containing block.
       #root carries the camera transform, so a modal (`.admin-modal` is
       position:fixed) would stretch to the height of the whole page and centre
       itself there instead of in the window. Beats that target one are shot
       with no transform at all, and their rects are screen coordinates. */
    const isFixed = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).position === "fixed") return true;
      }
      return false;
    };
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height, fixed: isFixed(el) };
    };
    let u = null;
    let fixed = false;
    for (const sel of sels) {
      const r = rectOf(sel);
      if (!r) throw new Error("missing selector " + sel);
      if (r.fixed) fixed = true;
      u = u
        ? {
            x: Math.min(u.x, r.x),
            y: Math.min(u.y, r.y),
            w: Math.max(u.x + u.w, r.x + r.w) - Math.min(u.x, r.x),
            h: Math.max(u.y + u.h, r.y + r.h) - Math.min(u.y, r.y),
          }
        : r;
    }
    return { doc, rect: u, fixed };
  }, beat.spotFrom || beat.frameFrom || null);
}

/* Where a `clickOn` element actually is. Returns document coordinates for a
   normal element and screen coordinates for one inside a fixed ancestor, which
   is the same convention `measure` uses for its rect. */
async function measurePoint(page, selector) {
  await untransform(page);
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("missing clickOn " + sel);
    const r = el.getBoundingClientRect();
    let fixed = false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === "fixed") { fixed = true; break; }
    }
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, fixed };
  }, selector);
}

/* A guide often has to put the page somewhere before it can talk about it:
   open a sub-tab, filter a table down to one customer, pick a value. Those are
   plain actions, run either once up front (`setup`) or at the head of a beat
   (`beat.do`) so a tutorial can change the page part-way through and then talk
   about what it changed. */
async function runActions(page, steps, label) {
  for (const step of steps || []) {
    if (step.action === "click") {
      await page.click(step.selector, { timeout: 15000 });
    } else if (step.action === "goto") {
      await page.goto(`${ORIGIN}${step.url}`, { waitUntil: "load", timeout: 60000 });
    } else if (step.action === "press") {
      await page.keyboard.press(step.key || "Escape");
    } else if (step.action === "fill") {
      await page.fill(step.selector, step.text, { timeout: 15000 });
    } else if (step.action === "select") {
      await page.selectOption(step.selector, step.value, { timeout: 15000 });
    } else if (step.action === "check") {
      await page.setChecked(step.selector, step.value !== false, { timeout: 15000 });
    } else if (step.action === "wait") {
      await page.waitForTimeout(step.ms || 500);
    } else if (step.action === "waitFor") {
      await page.waitForSelector(step.selector, { timeout: step.timeout || 20000 });
    } else {
      throw new Error("unknown action " + step.action);
    }
    log(`  ${label} ${step.action} ${step.selector || step.url || step.ms || ""}`);
    await page.waitForTimeout(step.settle == null ? 350 : step.settle);
  }
}

/* ---------------------------------------------------------------- render */
(async () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const CHECK = process.argv.includes("--check") || process.env.CHARME_CHECK === "1";
  const STILLS = process.argv.includes("--stills");
  const guideId = args[0] || "loyalty";
  const scriptFile = path.resolve(HERE, args[1] || process.env.CHARME_SCRIPT || "script.json");
  const all = JSON.parse(fs.readFileSync(scriptFile, "utf8")).guides;
  const spec = all[guideId];
  if (!spec) throw new Error(`no guide "${guideId}" in ${scriptFile} (have: ${Object.keys(all).join(", ")})`);

  // Everything this guide produces lives under its own directory, so shooting
  // a second guide can never pick up the first one's frames or voice files.
  const WORK = path.join(HERE, "work", guideId);
  const voiceFile = path.join(WORK, "voice.json");
  if (!fs.existsSync(voiceFile) && !CHECK) throw new Error(`voice missing: ${voiceFile} (run narrate.py ${guideId} first)`);
  const voice = fs.existsSync(voiceFile)
    ? Object.fromEntries(JSON.parse(fs.readFileSync(voiceFile, "utf8")).map((r) => [r.id, r]))
    : {};

  /* The admin demo carries the same secret as the repo's dev server. For a
     non-admin guide we may authenticate a fictional seeded customer instead -
     when shooting from demo/, its .env is the authority and it has no sibling
     .jwt-secret file. Keep the old fallback for ordinary runs. */
  let secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    const candidate = path.join(ROOT, ".jwt-secret");
    if (fs.existsSync(candidate)) secret = fs.readFileSync(candidate, "utf8").trim();
    else throw new Error("JWT_SECRET is missing (and no repo .jwt-secret fallback exists)");
  }
  /* SQLite AUTOINCREMENT kept the ids from the original database, so the
     fictional seeded customers are not IDs 2–9 (the shop admin is still 1).
     Resolve a requested customer by email against the DEMO API after every
     seed, then sign the film token with the id the database actually assigned. */
  let authUserId = spec.authUserId || 1;
  let authEmail = spec.authEmail || "cherifmed1200@gmail.com";
  /* The sign-in guide is the one journey that has to be filmed signed out -
     Auth.jsx bounces a signed-in visitor straight off /app/auth, so a token
     here would show the home page instead of the form. */
  const signedOut = spec.authState === "signed-out";
  if (spec.authEmail && !signedOut) {
    const res = await fetch(`${ORIGIN}/api/admin/users`, {
      headers: { Authorization: `Bearer ${jwt.sign(
        { userId: 1, email: "cherifmed1200@gmail.com" }, secret,
        { algorithm: "HS256", expiresIn: "7d" },
      )}` },
    });
    if (!res.ok) throw new Error(`could not resolve demo user for ${spec.authEmail}: HTTP ${res.status}`);
    const payload = await res.json();
    const users = payload.users || payload.data || [];
    const target = users.find((u) => u.email === spec.authEmail);
    if (!target) throw new Error(`demo user not found in admin users list: ${spec.authEmail}`);
    authUserId = target.id;
  }
  const token = signedOut
    ? null
    : jwt.sign(
        { userId: authUserId, email: authEmail },
        secret,
        { algorithm: "HS256", expiresIn: "7d" },
      );

  // Each run gets its own directory. Clearing the previous one means deleting
  // >1000 files in a single turn, which the sandbox refuses; a fresh path also
  // means a shorter re-render can never leave stale frames behind for the
  // encoder to pick up.
  const FRAMES = STILLS ? path.join(WORK, "stills") : path.join(WORK, "frames", String(Date.now()));
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-color-profile=srgb"],
  });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  await ctx.addInitScript(([t, init, extra, once]) => {
    if (t) localStorage.setItem("charme-token", t);
    else localStorage.removeItem("charme-token");
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
    /* An init script runs on every document, so a basket seeded here would be
       re-seeded on each route change and would quietly undo the on-camera
       "add to cart". `storageOnce` is written on the first document of the
       session and left alone afterwards. */
    if (once && sessionStorage.getItem("__film_seeded") !== "1") {
      for (const [k, v] of Object.entries(once)) localStorage.setItem(k, v);
      sessionStorage.setItem("__film_seeded", "1");
    }
    new Function(init)();
  }, [token, OVERLAY_INIT, spec.storage || null, spec.storageOnce || null]);

  const page = await ctx.newPage();
  page.on("download", (d) => d.cancel().catch(() => {}));
  // Deleting a card, redeeming a reward and banning a user all go through
  // window.confirm(). A native dialog is browser chrome, not page content, so
  // it cannot be filmed either way - accept it, and let the film show the
  // consequence instead.
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${ORIGIN}${spec.url}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector(spec.ready, { timeout: 30000 });
  // Measure the box, not `.width`: that property only exists on a canvas, and
  // the admin guides wait on ordinary elements, where it is undefined and the
  // wait never satisfies.
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      return !!el && el.getBoundingClientRect().width > 0;
    },
    spec.ready,
    { timeout: 20000 },
  );
  await page.waitForTimeout(1200);

  /* ---- setup: put the page in the state this guide is about ----
     A guide that is about the "new card" form should start with that form
     open, and a guide that acts on one customer's row should start filtered to
     that customer. Done before the camera rolls, so the film opens in place. */
  await runActions(page, spec.setup, "setup");

  /* ---- the shot list, built one beat at a time ---- */
  const timeline = [];
  let frameNo = 0;
  let t0 = 0;
  let doc = { w: VW, h: VH };
  let cam = clampCam({ cx: VW / 2, cy: VH / 2, z: 1.0 }, doc);
  let cursor = {
    x: spec.beats[0].cursor ? spec.beats[0].cursor[0] : VW / 2,
    y: spec.beats[0].cursor ? spec.beats[0].cursor[1] : VH / 2,
  };
  let spot = null;
  let prevScreen = false;

  for (let i = 0; i < spec.beats.length; i++) {
    const beat = spec.beats[i];
    const line = voice[beat.id] || (CHECK ? { seconds: 0.8, text: "" } : null);
    if (!line) throw new Error(`no voice line for beat "${beat.id}"`);
    const dur = CHECK ? 0.01 : line.seconds + LEAD + TAIL + (beat.hold || 0);

    /* When the click lands. `clickAt` is an absolute second inside the beat,
       which is only knowable once the line has been synthesised - so a beat
       that says "click here" and then clicks has to be hand-tuned whenever the
       wording changes by a word. `clickAtEnd` instead counts back from the end
       of the beat, which is what the narration actually means: say the line,
       then click. Used by every navigation step in the tutorials. */
    const clickAt =
      beat.clickAt != null
        ? beat.clickAt
        : beat.clickAtEnd != null
          ? Math.max(0.35, dur - beat.clickAtEnd)
          : null;

    // Anything this beat needs to have happened first, before we look at it.
    await runActions(page, beat.do, `  [${beat.id}]`);
    // A dialog moves focus to its panel, and Chrome scrolls a focused box into
    // view - through the transformed #root that means the whole document, so
    // opening the finder left the page parked on its footer. The film never
    // scrolls the window itself (the camera does the travelling), so pin it.
    await page.evaluate(() => window.scrollTo(0, 0));

    const { doc: d, rect, fixed } = await measure(page, beat);
    if (d) doc = d;
    /* `clickOn` is how a beat spotlights a whole card but clicks its button.
       Without it, the cursor can only land on the centre of the spotlight -
       which is right for a nav link and wrong for a form. */
    const clickPoint = beat.clickOn ? await measurePoint(page, beat.clickOn) : null;

    // A fixed target lives in screen space: the camera has to stay out of it
    // entirely, or the modal re-parents to the transformed #root.
    const screenSpace = !!fixed || !!(clickPoint && clickPoint.fixed);
    const sameSpace = screenSpace === prevScreen;
    /* A pageFade pair marks a real route/page change. The old route's camera,
       spotlight rect and cursor coordinates do not describe the new page. The
       fade makes the hand-off invisible; snap all three to the new beat's
       measured target so the first visible frame is already correctly framed,
       not a slow pan from the old page through the new one. */
    const pageReset = i > 0 && !!spec.beats[i - 1].pageFadeOut && !!beat.pageFadeIn;

    const toCam = screenSpace
      ? { cx: VW / 2, cy: VH / 2, z: 1.0 }
      : rect
        ? clampCam(frameFor(rect, beat, doc), doc)
        : clampCam({ cx: VW / 2, cy: VH / 2, z: 1.0 }, doc);
    const toSpot = rect && beat.spotFrom
      ? {
          x: rect.x - (beat.spotPad || 10),
          y: rect.y - (beat.spotPad || 10),
          w: rect.w + 2 * (beat.spotPad || 10),
          h: rect.h + 2 * (beat.spotPad || 10),
        }
      : null;
    const toCursor = clickPoint
      ? { x: clickPoint.x, y: clickPoint.y }
      : beat.cursor
        ? { x: beat.cursor[0], y: beat.cursor[1] }
        : rect
          ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
          : pageReset
            ? { x: VW / 2, y: VH / 2 }
            : cursor;

    // A spotlight that fades out at the end of one beat and back in at the
    // start of the next leaves the page undimmed for a frame or two - a visible
    // flash. It should only fade where the scrim genuinely has to go away.
    // Whether the neighbour has a spotlight is a property of the script, so it
    // is known without measuring ahead.
    //
    // This governs the scrim, not the camera, so it holds across a
    // screen/document boundary too. Forcing it to 0 there cut the scrim dead:
    // on admin-users the page stepped brighter on a single frame between
    // `banned` and `outro` (luma 9.65 -> 17.71), which the audit caught.
    const fadeIn = i > 0 && spec.beats[i - 1].spotFrom ? 0 : SPOT_FADE;
    const fadeOut = i + 1 < spec.beats.length && spec.beats[i + 1].spotFrom ? 0 : SPOT_FADE;

    const spot0 = sameSpace && !pageReset ? spot : toSpot;
    /* Crossing between the document and the screen changes what the camera's
       numbers mean. A screen-space beat renders #root untransformed, so there
       the camera exists only to place the spotlight - and sweeping it up from
       the previous beat's 2.5x draws the hole at 2.5x its size and slides it
       onto the element over MOVE seconds. Snap instead; the page cuts anyway. */
    const cam0 = sameSpace && !pageReset ? cam : toCam;
    const cur0 = pageReset ? toCursor : cursor;

    const s = { beat, i, dur, cam0, cam1: toCam, spot0, spot1: toSpot, cur0, cur1: toCursor, fadeIn, fadeOut, screenSpace };
    log(
      `  ${beat.id.padEnd(14)} ${dur.toFixed(2)}s  cam z ${cam.z.toFixed(2)}->${toCam.z.toFixed(2)} ` +
        `(${Math.round(toCam.cx)},${Math.round(toCam.cy)})  spot ${toSpot ? `${Math.round(toSpot.w)}x${Math.round(toSpot.h)}` : "none"}`,
    );

    const total = Math.round(s.dur * FPS);
    timeline.push({ id: beat.id, dur: s.dur, tStart: t0, frames: total });

    if (CHECK) {
      /* Dry run: run the beat's click the way a person would, then move on.
         No frames, no typing, no camera - this is only here to prove that
         every selector in the shot list resolves on the live page. */
      if (beat.typeInto) {
        await page.waitForSelector(beat.typeInto, { timeout: 12000 });
        // Type it for real, in one go: a form that refuses an empty name would
        // otherwise fail here and look like a broken selector.
        if (beat.typeText) await page.fill(beat.typeInto, beat.typeText);
      }
      if (clickAt != null) {
        const target = beat.clickOn || (beat.spotFrom && beat.spotFrom[0]);
        if (!target) throw new Error(`check: beat "${beat.id}" clicks but names no target`);
        await page.locator(target).first().click({ timeout: 12000 });
        await page.waitForTimeout(beat.settle == null ? 700 : beat.settle);
      }
      cam = toCam; cursor = toCursor; spot = toSpot; prevScreen = screenSpace;
      t0 += s.dur;
      continue;
    }

    /* ---- typing, so a form visibly fills in ---- */
    const typeText = beat.typeText || "";
    const typeDur = beat.typeDur || TYPE_DUR;
    let typed = 0;
    if (typeText && beat.typeInto) {
      // A field that already holds a value would get the new text appended to
      // it - "4" typed over "4" reads "44". Clear it first when asked.
      if (beat.typeClear) await page.fill(beat.typeInto, "");
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error("missing typeInto " + sel);
        // preventScroll: the camera already frames the field, and a scroll
        // here would move the whole page under a fixed modal.
        el.focus({ preventScroll: true });
      }, beat.typeInto);
    }

    let lastCur = null;
    /* --stills renders one frame per beat, at the settled end of its camera
       move, so a 35-shot film can be proof-read in two minutes instead of
       forty. Every click still fires, so the next shot is set up correctly. */
    const stillAt = STILLS ? Math.max(0, Math.round((s.dur - Math.max(beat.pageFadeOut || 0, 0) - 0.15) * FPS)) : -1;
    for (let f = 0; f < total; f++) {
      const t = f / FPS;
      const p = smooth(t / MOVE);
      // The creep has to be a bump, not a ramp: it must be 1 at both ends of the
      // beat. As a ramp it left the last frame 4% tighter than the next beat's
      // starting camera, so every cut snapped back.
      const hold = Math.max(0.001, s.dur - MOVE);
      const breathe =
        1 + (BREATHE - 1) * smooth((t - MOVE) / hold) * smooth((s.dur - t) / Math.min(0.9, hold));
      const camNow = clampCam(
        {
          z: lerp(s.cam0.z, s.cam1.z, p) * breathe,
          cx: lerp(s.cam0.cx, s.cam1.cx, p),
          cy: lerp(s.cam0.cy, s.cam1.cy, p),
        },
        doc,
      );

      /* Route and tab changes land after the click beat has finished and while
         the shot is between frames. Without a short dip, the last home-page
         frame is followed by the first frame of a different route at the old
         camera position - a literal jump cut. A closed-form dip to/from black
         lets the click happen in the gap, while keeping every captured frame
         deterministic. Only navigation beats opt into it. */
      const fadeOutPage = beat.pageFadeOut || 0;
      const fadeInPage = beat.pageFadeIn || 0;
      const pageOpacity = Math.min(
        fadeOutPage ? 1 - smooth((t - (s.dur - fadeOutPage)) / fadeOutPage) : 1,
        fadeInPage ? smooth(t / fadeInPage) : 1,
      );

      // The cursor glides to its target and stays there. It used to creep a few
      // pixels afterwards, which left it 11 px past the target at the beat's end
      // and snapped it back on the next one.
      const cp = smooth((t - CURSOR_DELAY) / CURSOR_GLIDE);
      const curDoc = {
        x: lerp(s.cur0.x, s.cur1.x, cp),
        y: lerp(s.cur0.y, s.cur1.y, cp),
      };

      // spotlight follows the camera, so the hole stays over its element
      let spotScreen = null;
      if (s.spot1) {
        const a = s.spot0 || s.spot1;
        const r = {
          x: lerp(a.x, s.spot1.x, p), y: lerp(a.y, s.spot1.y, p),
          w: lerp(a.w, s.spot1.w, p), h: lerp(a.h, s.spot1.h, p),
        };
        const fade = Math.min(
          s.fadeIn ? smooth(t / s.fadeIn) : 1,
          s.fadeOut ? smooth((s.dur - t) / s.fadeOut) : 1,
        );
        spotScreen = {
          x: (r.x - camNow.cx) * camNow.z + VW / 2,
          y: (r.y - camNow.cy) * camNow.z + VH / 2,
          w: r.w * camNow.z,
          h: r.h * camNow.z,
          o: (beat.scrim == null ? 1 : beat.scrim) * fade,
        };
      }

      const curScreen = {
        x: (curDoc.x - camNow.cx) * camNow.z + VW / 2,
        y: (curDoc.y - camNow.cy) * camNow.z + VH / 2,
      };
      lastCur = curScreen;

      let ring = null;
      if (clickAt != null && t >= clickAt) {
        const rp = clamp((t - clickAt) / RIPPLE, 0, 1);
        if (rp < 1) {
          ring = {
            x: (s.cur1.x - camNow.cx) * camNow.z + VW / 2,
            y: (s.cur1.y - camNow.cy) * camNow.z + VH / 2,
            s: 0.35 + 1.15 * rp,
            o: 0.95 * (1 - rp),
          };
        }
      }

      if (!STILLS || f === stillAt) {
        await page.evaluate(
          ([cam, spot, cur, ring, flat, opacity]) => {
            const F = window.__film;
            // Fades go through a full-viewport overlay rather than by dimming
            // #root: a portalled modal (`.admin-modal`) is a child of <body>, not
            // of #root, so fading #root alone left it burning on a black page.
            F.root.style.opacity = "1";
            F.host.style.opacity = "1";
            F.fade.style.opacity = String(1 - opacity);
            if (flat) {
              // No transform at all, not even scale(1): a transformed ancestor
              // captures position:fixed descendants, and the modal must stay
              // anchored to the window.
              F.root.style.transform = "none";
            } else {
              F.root.style.transformOrigin = "0 0";
              F.root.style.transform =
                `translate(${960 - cam.cx * cam.z}px, ${540 - cam.cy * cam.z}px) scale(${cam.z})`;
            }
            if (spot) {
              F.spot.style.opacity = String(spot.o);
              F.spot.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
              F.spot.style.width = `${spot.w}px`;
              F.spot.style.height = `${spot.h}px`;
            } else {
              F.spot.style.opacity = "0";
            }
            F.cur.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
            if (ring) {
              F.ring.style.opacity = String(ring.o);
              F.ring.style.transform = `translate(${ring.x}px, ${ring.y}px) scale(${ring.s})`;
            } else {
              F.ring.style.opacity = "0";
            }
          },
          [camNow, spotScreen, curScreen, ring, s.screenSpace, pageOpacity],
        );
      }

      // Type the characters this frame is due. Driven off the frame clock, so
      // the reveal is as steady as everything else in the film.
      if (typeText) {
        const want = Math.min(
          typeText.length,
          Math.floor((clamp((t - (beat.typeAt || 0)) / typeDur, 0, 1)) * typeText.length),
        );
        while (typed < want) {
          await page.keyboard.type(typeText[typed]);
          typed++;
        }
      }

      // Two rAFs: one for the style to land, one for the paint to commit.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      if (!STILLS || f === stillAt) {
        await page.screenshot({
          path: path.join(
            FRAMES,
            STILLS ? `${String(i).padStart(2, "0")}-${beat.id}.jpg` : String(frameNo).padStart(5, "0") + ".jpg",
          ),
          type: "jpeg",
          quality: 96,
        });
      }
      frameNo++;
      if (frameNo % 150 === 0) log(`  ... ${frameNo} frames`);
    }

    /* The click lands at the end of the beat, once the narration has said
       "here". It has to be a real mouse event for React to hear it, and it has
       to use the *screen* position: #root is under the camera transform, so the
       element is nowhere near its document coordinates by this point. */
    if (clickAt != null && lastCur) {
      await page.mouse.click(Math.round(lastCur.x), Math.round(lastCur.y));
      await page.waitForTimeout(beat.settle == null ? 700 : beat.settle);

      /* A route/tab click is the one meaningful DOM action that runs between
         beats, while the page is faded. The visible pointer click is still the
         primary action; verify that it landed before continuing. If it missed
         (for example, the user menu animated under the camera), use the real
         locator click as a recovery while the fade is down. This is safer than
         shooting 50 minutes before discovering one navigation click missed. */
      if (beat.pageFadeOut && spec.beats[i + 1] && !(spec.beats[i + 1].do || []).length) {
        const next = spec.beats[i + 1];
        const expected =
          (next.spotFrom && next.spotFrom[0]) ||
          ((next.do || []).find((a) => a.action === "waitFor") || {}).selector;
        if (expected) {
          let landed = false;
          try {
            await page.waitForSelector(expected, { timeout: 3500 });
            landed = true;
          } catch {
            const target = beat.spotFrom && beat.spotFrom[0];
            if (!target) throw new Error(`navigation ${beat.id} missed; no target selector to recover`);
            log(`  [${beat.id}] route not ready; retrying ${target} while faded`);
            await page.locator(target).click({ timeout: 5000 });
            await page.waitForSelector(expected, { timeout: 20000 });
            landed = true;
          }
          if (landed) log(`  [${beat.id}] navigation landed: ${expected}`);
        }
      }
    }

    cam = toCam;
    cursor = toCursor;
    spot = toSpot;
    prevScreen = screenSpace;
    t0 += s.dur;
  }

  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(
    path.join(WORK, "timeline.json"),
    JSON.stringify(
      { guideId, doc, fps: FPS, total: t0, frames: frameNo, framesDir: FRAMES, timeline, errors },
      null,
      2,
    ),
  );
  log(`\n${frameNo} frames -> ${FRAMES}`);
  log(`body total ${t0.toFixed(2)}s   errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await browser.close();
})().catch((e) => {
  log("FAILED: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
