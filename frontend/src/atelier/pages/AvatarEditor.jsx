import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { apiUpload } from "../../api/client.js";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { useDialogFocus } from "../lib/useDialogFocus.js";
import "./avatarEditor.css";

/* Photo editor — the legacy's photoEditorModal (crop / zoom / rotate).
 *
 * The server's /api/upload-avatar always cover-crops the upload to a 200×200
 * centre square, so a client-side crop is the only way to choose what actually
 * lands in the frame. The editor therefore renders the picked file in a square
 * stage, lets you pan, zoom and rotate, and sends an already-square JPEG of
 * exactly that view — the server's own resize then has nothing left to decide.
 *
 * Everything is measured against the stage's real rendered size (a
 * ResizeObserver, not the constant below): the stage is a percentage of the
 * dialog, so hard-coding 288 would leave the pan limits and the exported crop
 * disagreeing with what the eye sees.
 */

const STAGE = 288; /* reference size the geometry is authored against */
const OUT = 512; /* exported canvas, which sharp then resizes to 200 */
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function AvatarEditor({ file, onDone, onCancel }) {
  const { t } = useI18n();
  const [url, setUrl] = useState(null);
  const [img, setImg] = useState(null);
  const [stageSize, setStageSize] = useState(STAGE);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef(null);
  const stageRef = useRef(null);
  /* aria-modal="true" said the page behind this was inert; nothing made that
     true of the keyboard. Focus stayed on the profile button that opened it,
     and closing left it on <body>, so the next Tab restarted at the top. */
  const panelRef = useRef(null);
  useDialogFocus(panelRef, { initialFocus: ".ae-close" });

  /* ---------- the stage's real size ---------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0;
      if (w > 0) setStageSize(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Load the picked file once. */
  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => setError(t("avatarEditorBadFile"));
    image.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, t]);

  /* How much bigger the picture is drawn than its natural size, in real px. */
  const cover = useMemo(() => {
    if (!img) return 0;
    return Math.max(stageSize / img.width, stageSize / img.height);
  }, [img, stageSize]);

  const drawn = useCallback(() => cover * scale, [cover, scale]);

  /* Keep the picture covering the stage: never show a gap, even at scale 1. */
  const clamp = useCallback(
    (next) => {
      if (!img) return next;
      const d = drawn();
      const limitX = Math.max(0, (img.width * d - stageSize) / 2);
      const limitY = Math.max(0, (img.height * d - stageSize) / 2);
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [img, drawn, stageSize],
  );

  /* ---------- drag to pan ---------- */
  const onPointerDown = (e) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    setOffset(
      clamp({
        x: drag.current.ox + (e.clientX - drag.current.x),
        y: drag.current.oy + (e.clientY - drag.current.y),
      }),
    );
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const zoom = (factor) => {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  };

  const rotate = () => {
    setRotation((r) => (r + 90) % 360);
    setOffset((o) => clamp(o));
  };

  const reset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  /* ---------- export ---------- */
  const save = async () => {
    if (!img) return;
    setBusy(true);
    setError("");
    try {
      const d = drawn();
      /* The stage square, expressed in the image's own pixels. */
      const sourceSize = stageSize / d;
      const cx = img.width / 2 - offset.x / d;
      const cy = img.height / 2 - offset.y / d;

      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.save();
      ctx.translate(OUT / 2, OUT / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        cx - sourceSize / 2,
        cy - sourceSize / 2,
        sourceSize,
        sourceSize,
        -OUT / 2,
        -OUT / 2,
        OUT,
        OUT,
      );
      ctx.restore();

      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92),
      );

      const body = new FormData();
      body.append("avatar", blob, "avatar.jpg");
      await apiUpload("/api/upload-avatar", body);
      onDone();
    } catch (err) {
      setError((err.data && err.data.error) || err.message || t("avatarEditorFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (k === "+" || k === "=") zoom(1.15);
    else if (k === "-") zoom(1 / 1.15);
    else if (k === "r") rotate();
    else return;
    e.preventDefault();
  };

  if (!file) return null;

  return (
    <div className="ae" role="dialog" aria-modal="true" aria-label={t("avatarEditorTitle")}>
      <button type="button" className="ae-scrim" aria-label={t("cancel")} onClick={onCancel} tabIndex={-1} />

      <div className="ae-panel panel" ref={panelRef}>
        <header className="ae-head">
          <div>
            <p className="eyebrow">{t("profilePhoto")}</p>
            <h2 className="ae-title">{t("avatarEditorTitle")}</h2>
          </div>
          <button type="button" className="ae-close pressable" onClick={onCancel} aria-label={t("cancel")}>
            ✕
          </button>
        </header>

        <p className="ae-lede">{t("avatarEditorLede")}</p>

        <div
          className="ae-stage"
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onWheel={(e) => {
            e.preventDefault();
            zoom(e.deltaY < 0 ? 1.08 : 1 / 1.08);
          }}
          role="application"
          tabIndex={0}
          aria-label={t("avatarEditorStage")}
        >
          {img ? (
            <span
              className="ae-img"
              style={{
                backgroundImage: `url(${url})`,
                inlineSize: `${img.width * cover * scale}px`,
                blockSize: `${img.height * cover * scale}px`,
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            />
          ) : (
            <span className="ae-loading">
              <Loader2 size={18} className="ae-spin" aria-hidden="true" />
            </span>
          )}
          <span className="ae-frame" aria-hidden="true" />
        </div>

        <div className="ae-tools">
          <button type="button" className="ae-tool pressable" onClick={() => zoom(1 / 1.2)} aria-label={t("avatarZoomOut")} title={t("avatarZoomOut")}>
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <input
            className="ae-range"
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            aria-label={t("avatarZoom")}
          />
          <button type="button" className="ae-tool pressable" onClick={() => zoom(1.2)} aria-label={t("avatarZoomIn")} title={t("avatarZoomIn")}>
            <ZoomIn size={16} aria-hidden="true" />
          </button>
          <button type="button" className="ae-tool pressable" onClick={rotate} aria-label={t("avatarRotate")} title={t("avatarRotate")}>
            <RotateCw size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="ae-scale">
          {Math.round(scale * 100)}%
          <span className="ae-rot">{rotation}°</span>
        </p>

        {error ? (
          <p className="ae-error" role="status">
            {error}
          </p>
        ) : null}

        <footer className="ae-foot">
          <button type="button" className="btn-ghost pressable ae-reset" onClick={reset} disabled={busy}>
            {t("avatarEditorReset")}
          </button>
          <span className="ae-foot-right">
            <button type="button" className="btn-ghost pressable ae-cancel" onClick={onCancel} disabled={busy}>
              {t("cancel")}
            </button>
            <button type="button" className="btn-accent pressable ae-confirm" onClick={save} disabled={busy || !img}>
              {busy ? <Loader2 size={15} className="ae-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
              {t("avatarEditorSave")}
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
