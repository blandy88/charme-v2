/*
 * Cart — the legacy cartModal, as a page.
 *
 * The legacy basket was localStorage-only and keyed on
 * (productId, quality, size); "Proceed to Checkout" was a stub that fired a
 * "coming soon" toast. There is still no checkout endpoint, so the summary
 * ends in a real, working hand-off instead of a dead button: the basket is
 * itemised into the boutique's existing note channel (POST /api/notes), which
 * is what the shop actually reads. Nothing is invented server-side.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { lineKey, useCart } from "../../contexts/CartContext.jsx";
import { useI18n } from "../../contexts/I18nContext.jsx";
import { api } from "../../api/client.js";
import { initials } from "../lib/text.js";
import "./account.css";

const money = (n) => `${Math.round(n * 100) / 100} dt`;

export default function Cart() {
  const { t } = useI18n();
  const { lines, count, subtotal, setQty, remove, clear } = useCart();
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [state, setState] = useState("idle"); // idle | sending | sent | failed

  const send = async (e) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const itemised = lines
      .map((l) => `${l.qty} × ${l.name}${l.quality ? ` (${l.quality})` : ""}${l.size ? ` ${l.size}ml` : ""} — ${money(Number(l.price) * l.qty)}`)
      .join("\n");
    const message = [
      t("cartOrderIntro"),
      "",
      itemised,
      "",
      `${t("cartSubtotal")}: ${money(subtotal)}`,
      form.phone ? `${t("notePhone")}: ${form.phone}` : "",
      form.note ? `\n${form.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      // The server stores the order lines in the same message the admin reads.
      await api("/api/notes", { method: "POST", body: { authorName: form.name, message }, auth: false });
      setState("sent");
      clear();
    } catch {
      setState("failed");
    }
  };

  if (!lines.length) {
    return (
      <main className="wrap acct">
        <header className="acct-head" data-guide="cart-head">
          <p className="eyebrow">Parfumerie Charme</p>
          <h1>{t("cart")}</h1>
        </header>
        <div
          className="empty"
          /* Sending clears the basket, so the confirmation lands in this empty
             state, not in the summary column. The guide hook has to be here or
             it points at an element that cannot exist once the order is sent. */
          data-guide={state === "sent" ? "cart-handoff-done" : undefined}
          style={{ marginTop: "var(--space-l)" }}
        >
          <ShoppingBag size={40} strokeWidth={1.4} aria-hidden="true" />
          <h2>{state === "sent" ? t("cartOrderSent") : t("cartEmpty")}</h2>
          <p>{state === "sent" ? t("cartOrderSentBody") : t("cartEmptyBody")}</p>
          <Link to="/collection" className="btn btn-accent pressable">{t("cartBrowse")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap acct" data-guide="cart">
      <header className="acct-head" data-guide="cart-head">
        <p className="eyebrow">Parfumerie Charme</p>
        <h1>{t("cart")}</h1>
        <p className="acct-sub">
          <strong>{count}</strong> {count > 1 ? t("cartItems") : t("cartItem")}
        </p>
      </header>

      <div className="cart-layout">
        <ul className="cart-lines" data-guide="cart-items">
          {lines.map((l) => {
            const key = lineKey(l);
            const qty = Number(l.qty) || 1;
            return (
              <li key={key} className="cart-line">
                <span className="cart-media">
                  {l.image ? (
                    <img src={l.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  ) : (
                    <span aria-hidden="true">{initials(l.name)}</span>
                  )}
                </span>

                <div>
                  <p className="cart-name">
                    {l.id ? (
                      <Link to={`/collection/${encodeURIComponent(l.id)}`}>{l.name}</Link>
                    ) : (
                      l.name
                    )}
                  </p>
                  {l.brand ? <p className="cart-meta">{l.brand}</p> : null}
                  {/* Concentration and volume are both self-describing
                      ("Eau de Parfum", "125 ml"), so no labels are needed. */}
                  <p className="cart-unit">
                    {[l.quality, l.size ? `${l.size} ml` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <div className="cart-side">
                  <span className="qty">
                    <button
                      type="button"
                      onClick={() => setQty(key, qty - 1)}
                      aria-label={t("cartLess")}
                    >
                      −
                    </button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" onClick={() => setQty(key, qty + 1)} aria-label={t("cartMore")}>
                      +
                    </button>
                  </span>
                  <span className="cart-price">{money(Number(l.price) * qty)}</span>
                  <button
                    type="button"
                    className="icon-btn pressable"
                    onClick={() => remove(key)}
                    aria-label={`${t("cartRemove")} ${l.name}`}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="cart-sum">
          <h2>{t("cartSummary")}</h2>
          <div className="cart-rows">
            <div>
              <span>{t("cartSubtotal")}</span>
              <span className="num">{money(subtotal)}</span>
            </div>
            <div>
              <span>{t("cartShipping")}</span>
              <span className="num">{t("cartFree")}</span>
            </div>
            <div className="total">
              <span>{t("cartTotal")}</span>
              <span className="num">{money(subtotal)}</span>
            </div>
          </div>

          {state === "sent" ? (
            <p className="msg ok" data-guide="cart-handoff-done" style={{ marginTop: "var(--space-xs)" }}>{t("cartOrderSent")}</p>
          ) : checkout ? (
            <form onSubmit={send} data-guide="cart-handoff-note" style={{ marginTop: "var(--space-xs)" }}>
              <p className="fld-hint" style={{ marginBottom: "0.6rem" }}>{t("cartOrderBody")}</p>
              <div className="fld-stack">
                <div className="fld">
                  <label htmlFor="co-name">{t("noteName")}</label>
                  <input
                    id="co-name"
                    className="field"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="co-phone">{t("notePhone")}</label>
                  <input
                    id="co-phone"
                    className="field"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="co-note">{t("noteMessage")}</label>
                  <textarea
                    id="co-note"
                    className="field"
                    rows={3}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>
              {state === "failed" ? <p className="msg error" style={{ marginTop: "0.6rem" }}>{t("noteFail")}</p> : null}
              <button type="submit" className="btn btn-accent pressable" disabled={state === "sending"} data-guide="cart-send">
                {state === "sending" ? t("noteSending") : t("cartOrderSend")}
              </button>
              <button type="button" className="btn btn-ghost pressable" onClick={() => setCheckout(false)}>
                {t("cartBack")}
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-accent pressable" data-guide="cart-checkout" onClick={() => setCheckout(true)}>
              {t("cartCheckout")}
            </button>
          )}

          <button type="button" className="btn btn-ghost pressable" onClick={clear}>
            {t("cartClear")}
          </button>
        </aside>
      </div>
    </main>
  );
}
