import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { CARD_TEMPLATE, cardProgressLabel, drawLoyaltyCard } from "./lib/loyaltyCardArt.js";

/* Carte Fidélité — the customer's card as a picture.
 *
 * The name, the number and the punch marks are rasterised into the template by
 * drawLoyaltyCard(), so this component is deliberately thin: load the template
 * once, hand it to the painter whenever the balance changes. The text is baked
 * into the bitmap, which means a screen reader cannot see it — so the canvas
 * carries an explicit label describing exactly what is painted on it, and the
 * download is offered as a real file for keeping or printing.
 */

/* One shared load for every card on the page: the template is ~590 KB and is
   immutable, so it should be fetched once per session, not once per paint. */
let templatePromise = null;
function loadTemplate() {
  if (!templatePromise) {
    templatePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("loyalty template unavailable"));
      img.src = CARD_TEMPLATE.src;
    });
  }
  return templatePromise;
}

/* The template's own width: the artwork is authored at 2048 px across, which
   is ~2.5× a phone's logical width and comfortably print-usable. Rendering at
   anything smaller would soften the lettering we just matched to the bar. */
const RENDER_W = 2048;
const RENDER_H = Math.round((CARD_TEMPLATE.height / CARD_TEMPLATE.width) * RENDER_W);

export default function LoyaltyCardArt({
  name,
  cardNumber,
  points = 0,
  threshold = 5,
  label,
  downloadLabel,
}) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const progress = cardProgressLabel(points, threshold);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    loadTemplate()
      .then((img) => {
        if (!alive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawLoyaltyCard(ctx, img, {
          width: RENDER_W,
          height: RENDER_H,
          name,
          cardNumber,
          points,
          threshold,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [name, cardNumber, points, threshold]);

  /* Save the painted bitmap. Re-runs the painter at full resolution rather
     than reading the visible canvas back, so a scaled-down or
     devicePixelRatio-clipped display can never cost the download any
     sharpness. */
  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const off = document.createElement("canvas");
      off.width = RENDER_W;
      off.height = RENDER_H;
      const ctx = off.getContext("2d");
      // The template is already in the module cache at this point, so this
      // resolves without a network round-trip.
      loadTemplate().then((img) => {
        drawLoyaltyCard(ctx, img, {
          width: RENDER_W,
          height: RENDER_H,
          name,
          cardNumber,
          points,
          threshold,
        });
        const safe = (cardNumber || name || "carte")
          .toString()
          .replace(/[^\w-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase();
        off.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `carte-fidelite-${safe || "charme"}.jpg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          0.95,
        );
        setBusy(false);
      });
    } catch {
      setBusy(false);
    }
  }

  if (status === "error") {
    return (
      <div className="ly-art panel">
        <p className="ly-art-fallback">{label}</p>
      </div>
    );
  }

  return (
    <figure className="ly-art">
      <div className="ly-art-frame">
        {status === "loading" ? (
          <p className="ly-art-loading">
            <Loader2 size={16} className="ly-spin" aria-hidden="true" />
          </p>
        ) : null}
        <canvas
          ref={canvasRef}
          width={RENDER_W}
          height={RENDER_H}
          className="ly-art-canvas"
          /* The lettering is pixels, so describe it for assistive tech. */
          role="img"
          aria-label={label}
        />
      </div>
      <figcaption className="ly-art-foot">
        <button
          type="button"
          className="btn-ghost pressable ly-art-download"
          onClick={download}
          disabled={busy || status !== "ready"}
        >
          <Download size={15} aria-hidden="true" />
          {downloadLabel}
        </button>
      </figcaption>
    </figure>
  );
}
