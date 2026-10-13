/* Carte Fidélité — raster art.
 *
 * The card is one illustrated template (public/media/loyalty-card.jpg) whose
 * only unfinished parts are two gold dot-leaders waiting for a holder name and
 * a card number, plus six punch slots. Those are painted straight onto the
 * bitmap with a 2D canvas. Nothing is drawn as HTML on top of the picture, so
 * what the customer sees, downloads and prints is a single self-contained
 * image — which is what a physical loyalty card is.
 *
 * Every number below is in TEMPLATE pixels (4096 × 2164) and was measured off
 * the artwork by scanning the pixels, not guessed. If the template is ever
 * re-exported at another size, only `width`/`height` and the `scale()` call in
 * drawLoyaltyCard() need to change; everything else is a fraction of them.
 *
 *   gold bar ............. x 663..3447,  y 1849..2061
 *   "Nom:" label ......... x 749..1175,  baseline y 2010, cap height 127
 *   "Num:" label ......... x 2022..2436, baseline y 2009, cap height 126
 *   name dot-leader ...... x 1227..1776, ink rows y 1987..2009
 *   number dot-leader .... x 2483..3324, ink rows y 1987..2009
 *   bar ink .............. rgb(4, 3, 2)
 *   bar gold ............. a shallow vertical ramp, rgb(235,192,76) at the top
 *                          of the bar down to rgb(226,182,81) at the bottom
 *   six punch slots ...... centres (928,900) (2080,900) (3232,900)
 *                          (928,1518) (2080,1518) (3232,1518), radius 275.
 *                          The sixth is the gold "Free" reward disc.
 *
 * The scans live in _recon/loyalty-card-geometry.md.
 */

export const CARD_TEMPLATE = {
  src: "/media/loyalty-card.jpg",
  width: 4096,
  height: 2164,
  bar: { x: 663, y: 1849, w: 2785, h: 213 },
  /** Vertical colour ramp of the bar, sampled top → bottom. */
  goldRamp: [
    [235, 192, 76],
    [227, 188, 74],
    [226, 182, 81],
  ],
  ink: [4, 3, 2],
  /** Serif stack that matches the template's "Nom:" lettering. */
  font: 'Georgia, "Times New Roman", "Nimbus Roman", Times, serif',
  /** The last slot is the reward disc, not a punch slot. */
  rewardSlot: 5,
  slots: [
    { x: 928, y: 900, r: 275 },
    { x: 2080, y: 900, r: 275 },
    { x: 3232, y: 900, r: 275 },
    { x: 928, y: 1518, r: 275 },
    { x: 2080, y: 1518, r: 275 },
    { x: 3232, y: 1518, r: 275 },
  ],
  name: {
    /** Dots that get painted over — x 1227..1776. */
    erase: { x: 1227, y: 1985, w: 550, h: 28 },
    /** Where the text starts: right after "Nom:" (which ends at x 1175). */
    start: 1227,
    /** Stops short of the "Num:" label at x 2022. */
    maxWidth: 700,
    baseline: 2010,
    capHeight: 127,
  },
  number: {
    erase: { x: 2483, y: 1985, w: 842, h: 28 },
    start: 2483,
    /** Stops short of the bar's right edge (3447), keeping its 86px inset. */
    maxWidth: 860,
    baseline: 2009,
    capHeight: 126,
  },
};

const RGB = (c, a) => `rgba(${c[0]},${c[1]},${c[2]}${a === undefined ? "" : `,${a}`})`;

/* Resolve the bar's golden ramp into a gradient that spans the bar, so the
   erased leader is repainted with exactly the colour that was there before
   rather than a flat guess that would show as a band. */
function barGradient(ctx, k) {
  const { y, h } = CARD_TEMPLATE.bar;
  const [top, , bottom] = CARD_TEMPLATE.goldRamp;
  const g = ctx.createLinearGradient(0, y * k, 0, (y + h) * k);
  g.addColorStop(0, RGB(top));
  g.addColorStop(1, RGB(bottom));
  return g;
}

/* Font size whose cap height is exactly `target` px.
   Two passes: measure a reference capital, then scale. Relying on a hard-coded
   em-to-cap ratio would drift the lettering off the printed labels the moment
   the fallback serif changes between platforms. */
function fitFontSize(ctx, size, targetCap) {
  ctx.font = `${size}px ${CARD_TEMPLATE.font}`;
  const measured = ctx.measureText("N").actualBoundingBoxAscent;
  if (!measured || measured <= 0) return size;
  return (size * targetCap) / measured;
}

/* Right-to-left names (Arabic) must be laid out RTL or the canvas will render
   the letters in visual order and the word comes out reversed. */
const RTL = /[\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
const direction = (text) => (RTL.test(text) ? "rtl" : "ltr");

/* Measure a real run of text, then shrink it until it fits the zone. Long
   holder names are the common case (a walk-in customer with three names), so
   the card degrades to a smaller size rather than overflowing onto "Num:". */
function fitText(ctx, text, zone, k) {
  const startPx = zone.start * k;
  const maxPx = zone.maxWidth * k;
  const capPx = zone.capHeight * k;
  const dir = direction(text);

  let size = fitFontSize(ctx, 200, capPx);
  ctx.font = `${size}px ${CARD_TEMPLATE.font}`;
  ctx.direction = dir;

  let width = ctx.measureText(text).width;
  if (width <= maxPx) return { size, text, width, start: startPx };

  // Shrink in 2% steps, down to a floor that is still legible next to the
  // template's own lettering (about a third of the label's cap height).
  const floor = capPx * 0.34;
  while (size > floor) {
    size *= 0.98;
    ctx.font = `${size}px ${CARD_TEMPLATE.font}`;
    width = ctx.measureText(text).width;
    if (width <= maxPx) return { size, text, width, start: startPx };
  }

  /* Still too long: shorten from the end. The cut always rebuilds from the
     original string so the loop strictly decreases — chopping a trailing "…"
     and re-appending it returns the same string forever. */
  let keep = text.length;
  let rendered = text;
  while (keep > 1) {
    keep -= 1;
    rendered = `${text.slice(0, keep).trimEnd()}…`;
    ctx.font = `${size}px ${CARD_TEMPLATE.font}`;
    width = ctx.measureText(rendered).width;
    if (width <= maxPx) break;
  }
  return { size, text: rendered, width, start: startPx };
}

/* A punch: a dark seal over the slot, ringed in the card's gold, with a tick
   through it. Drawn at the slot centre and never wider than the slot, so it
   cannot bleed onto the neighbouring disc. */
function stampPunch(ctx, slot, k, kind) {
  const { x, y, r } = slot;
  const cx = x * k;
  const cy = y * k;
  const rad = r * k;

  ctx.save();
  if (kind === "reward") {
    // The reward disc is already gold — fill it solid and ink the details so
    // it reads as claimed rather than merely present.
    ctx.fillStyle = RGB(CARD_TEMPLATE.goldRamp[1]);
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = RGB(CARD_TEMPLATE.ink);
    ctx.lineWidth = rad * 0.045;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = RGB(CARD_TEMPLATE.ink);
  } else {
    ctx.fillStyle = RGB(CARD_TEMPLATE.ink, 0.9);
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = RGB(CARD_TEMPLATE.goldRamp[1]);
    ctx.lineWidth = rad * 0.045;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.67, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = RGB(CARD_TEMPLATE.goldRamp[1]);
  }

  // The tick, sized to the slot so it stays proportional at any render size.
  ctx.lineWidth = rad * 0.085;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.26, cy + rad * 0.02);
  ctx.lineTo(cx - rad * 0.06, cy + rad * 0.22);
  ctx.lineTo(cx + rad * 0.28, cy - rad * 0.20);
  ctx.stroke();
  ctx.restore();
}

/**
 * Paint a finished loyalty card.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image      the loaded template
 * @param {{width:number,height:number,name:string,cardNumber:string,
 *          points?:number,threshold?:number}} opts
 */
export function drawLoyaltyCard(ctx, image, opts) {
  const width = opts.width;
  const height = opts.height;
  const k = width / CARD_TEMPLATE.width;
  const points = Math.max(0, Math.floor(Number(opts.points) || 0));
  const threshold = Math.max(1, Math.floor(Number(opts.threshold) || 5));

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const ink = CARD_TEMPLATE.ink;

  /* --- the two dot-leaders ------------------------------------------------ */
  // Paint them out first, in the bar's own gradient, so the name and number
  // sit on clean gold instead of on a ruled line.
  for (const zone of [CARD_TEMPLATE.name, CARD_TEMPLATE.number]) {
    const e = zone.erase;
    ctx.fillStyle = barGradient(ctx, k);
    ctx.fillRect(e.x * k, e.y * k, e.w * k, e.h * k);
  }

  /* --- holder name ------------------------------------------------------- */
  const name = String(opts.name || "").trim();
  if (name) {
    const fit = fitText(ctx, name, CARD_TEMPLATE.name, k);
    ctx.font = `${fit.size}px ${CARD_TEMPLATE.font}`;
    ctx.direction = direction(fit.text);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = RGB(ink);
    ctx.fillText(fit.text, fit.start, CARD_TEMPLATE.name.baseline * k);
  }

  /* --- card number ------------------------------------------------------- */
  const number = String(opts.cardNumber || "").trim();
  if (number) {
    const fit = fitText(ctx, number, CARD_TEMPLATE.number, k);
    ctx.font = `${fit.size}px ${CARD_TEMPLATE.font}`;
    ctx.direction = direction(fit.text);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = RGB(ink);
    ctx.fillText(fit.text, fit.start, CARD_TEMPLATE.number.baseline * k);
  }

  /* --- punch slots ------------------------------------------------------- */
  CARD_TEMPLATE.slots.forEach((slot, i) => {
    if (i === CARD_TEMPLATE.rewardSlot) {
      if (points >= threshold) stampPunch(ctx, slot, k, "reward");
      return;
    }
    if (i < points) stampPunch(ctx, slot, k, "punch");
  });

  ctx.restore();
}

/** A short, human summary of where the card stands — used for the alt text. */
export function cardProgressLabel(points, threshold) {
  if (points >= threshold) return "full";
  if (points <= 0) return "empty";
  return `${points}/${threshold}`;
}
