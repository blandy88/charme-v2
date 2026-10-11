import { useEffect, useRef, useState } from "react";

/*
 * STAGE 1 of the React migration: React owns the document root and renders
 * the EXACT legacy document — same bytes the parity pipeline verifies
 * (scripts/build-legacy-page.mjs: byte-for-byte PASS). No restyle, no
 * restructure, no guessing.
 *
 * Data: /data/document-shell.json + /data/legacy-sections.json, extracted
 * from public/index.html by scripts/extract-legacy-sections.cjs.
 * Interactions stay with the legacy scripts (loaded in document order),
 * exactly as the live site runs them today. Typed React replacements for
 * subtrees (auth, cart, loyalty, …) land in stage 2, one component at a
 * time, each gated on visual parity before the legacy markup goes away.
 */

const SHELL_URL = "/data/document-shell.json";
const SECTIONS_URL = "/data/legacy-sections.json";

// Site-root assets. Under /app a relative "js/x.js" would resolve to
// /app/js/x.js (404) — the files live at the root on every host.
const toRoot = (url) => {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return url;
  return `/${url.replace(/^\.\//, "")}`;
};

function headAssets(headHtml) {
  const doc = new DOMParser().parseFromString(`<head>${headHtml}</head>`, "text/html");
  return [...doc.head.children].filter((el) =>
    ["LINK", "STYLE"].includes(el.tagName),
  );
}

function bodyInner(chunk0) {
  const idx = chunk0.search(/<body\b/i);
  if (idx < 0) return chunk0;
  const tagEnd = chunk0.indexOf(">", idx);
  return chunk0.slice(tagEnd + 1);
}

/*
 * The source document uses site-relative asset URLs ("assets/x.png",
 * "whatsapp-icon.jpg"). Under /app those would resolve against /app/ and
 * 404, so prefix them to the site root. Absolute, protocol, data, blob
 * and fragment references are untouched.
 */
function fixRelativeUrls(html) {
  const fixed = html.replace(
    /\b(src|href)="(?!(?:[a-z][a-z0-9+.-]*:|#|\/))/gi,
    '$1="/',
  );
  return fixed.replace(/(\bsrcset="[^"]*)/gi, (m) =>
    m.replace(/,\s*(?!(?:[a-z][a-z0-9+.-]*:|#|\/))/gi, ", /"),
  );
}

export default function FaithfulSite() {
  const [doc, setDoc] = useState(null);
  const [failed, setFailed] = useState(false);
  const hostRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Match the source document root before anything else runs: the legacy
    // i18n and theme scripts read these at load (<html lang="fr"> + the
    // charme-theme localStorage default in the head inline script).
    document.documentElement.lang = "fr";
    let alive = true;
    (async () => {
      try {
        const [shellRes, secRes] = await Promise.all([
          fetch(SHELL_URL),
          fetch(SECTIONS_URL),
        ]);
        if (!shellRes.ok || !secRes.ok) throw new Error("data fetch failed");
        const shell = await shellRes.json();
        const fixture = await secRes.json();
        if (alive) setDoc({ shell, fixture });
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!doc || doneRef.current) return;
    const { shell, fixture } = doc;
    const sections = fixture.sections;

    // 1. Assemble the exact body HTML: shell chunks interleaved with the
    //    real section markup, in source order. Relative asset URLs are
    //    rooted (see fixRelativeUrls) so images resolve under /app/.
    let html = bodyInner(shell.chunks[0]);
    for (let i = 0; i < sections.length; i++) {
      html += sections[i].rawHtml + (shell.chunks[i + 1] || "");
    }
    if (hostRef.current) hostRef.current.innerHTML = fixRelativeUrls(html);

    // 2. Inject the legacy <head> assets (fonts, stylesheets) once.
    const headHtml = shell.chunks[0].slice(0, shell.chunks[0].search(/<body\b/i));
    const injected = [];
    for (const el of headAssets(headHtml)) {
      if (el.tagName === "LINK") {
        const rel = (el.getAttribute("rel") || "").toLowerCase();
        if (rel === "icon" || rel === "apple-touch-icon") continue;
        if (el.href && document.querySelector(`link[href="${toRoot(el.getAttribute("href"))}"]`)) continue;
        const link = document.createElement("link");
        for (const attr of el.attributes) {
          if (attr.name === "href") link.setAttribute("href", toRoot(attr.value));
          else if (attr.name === "onload") continue;
          else link.setAttribute(attr.name, attr.value);
        }
        // The source uses the media=print+onload trick; set directly.
        if (link.getAttribute("media") === "print") link.setAttribute("media", "all");
        document.head.appendChild(link);
        injected.push(link);
      } else if (el.tagName === "STYLE") {
        const style = document.createElement("style");
        style.textContent = el.textContent;
        document.head.appendChild(style);
        injected.push(style);
      }
    }

    // 3. Run the legacy scripts in exact document order (src awaited
    //    sequentially to preserve defer ordering; inline run in place).
    const full = shell.chunks[0] + sections.map((s) => s.rawHtml).join("") + shell.chunks.slice(1).join("");
    const tags = [...full.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
    let cancelled = false;
    (async () => {
      for (const m of tags) {
        if (cancelled) break;
        const srcMatch = m[1].match(/src="([^"]+)"/);
        const script = document.createElement("script");
        if (srcMatch) {
          script.src = toRoot(srcMatch[1]);
          script.async = false;
          await new Promise((resolve) => {
            script.onload = resolve;
            script.onerror = () => resolve();
            document.body.appendChild(script);
            injected.push(script);
          });
        } else if (m[2].trim()) {
          script.textContent = m[2];
          document.body.appendChild(script);
          injected.push(script);
        }
      }
      if (cancelled) return;
      /*
       * The legacy scripts register ~27 DOMContentLoaded/window-load hooks
       * (i18n default+observer at js/i18n.js:2471, auth restore at
       * script.js:261, modal hiding, profiler, guides, …). They were
       * injected after those events already fired, so replay both events
       * once, in legacy order. Nothing double-fires: these scripts were
       * absent for the real events.
       */
      document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));
      window.dispatchEvent(new Event("load"));
    })();
    doneRef.current = true;

    return () => {
      cancelled = true;
      for (const el of injected) el.remove();
      doneRef.current = false;
    };
  }, [doc]);

  if (failed) {
    return (
      <main style={{ padding: 32, color: "#f1ece3", background: "#0b0a09", minHeight: "100vh" }}>
        <p>Could not load the site data. Check /data/document-shell.json.</p>
      </main>
    );
  }
  if (!doc) {
    return (
      <main style={{ padding: 32, color: "#a49a8e", background: "#0b0a09", minHeight: "100vh" }}>
        <p>Loading Charme…</p>
      </main>
    );
  }
  return <div ref={hostRef} id="faithful-root" />;
}
