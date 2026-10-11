import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client.js";
import { fmtDate, Modal } from "./adminKit.jsx";

const FAMILIES = [
  "",
  "Woody",
  "Floral",
  "Oriental",
  "Fresh",
  "Citrus",
  "Gourmand",
  "Aromatic",
  "Chypre",
  "Aldehyde",
  "Fougère",
  "Other",
];

const AUDIENCES = ["", "men", "women", "unisex"];

const audienceLabel = (value, at) =>
  value === "men"
    ? at("audienceMen")
    : value === "women"
      ? at("audienceWomen")
      : value === "unisex"
        ? at("audienceUnisex")
        : at("familyNone");

/* ------------------------------------------------------------------ Loyalty */
export function Loyalty({ at }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(
    () =>
      api("/api/admin/loyalty")
        .then((d) => setData(d))
        .catch((e) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const cards = data?.cards || [];
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((c) =>
      `${c.name} ${c.cardNumber || ""} ${c.phone || ""} ${c.email || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [cards, q]);

  const guard = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addPoint = (card) =>
    guard(() =>
      api("/api/admin/loyalty/add-points", { method: "POST", body: { cardId: card.cardId, points: 1 } }),
    );

  const redeem = (card) => {
    if (!window.confirm(at("loyRedeemConfirm"))) return;
    guard(() => api("/api/admin/loyalty/redeem", { method: "POST", body: { cardId: card.cardId } }));
  };

  const remove = (card) => {
    if (!window.confirm(at("loyDeleteConfirm"))) return;
    guard(() => api(`/api/admin/loyalty/delete?cardId=${card.cardId}`, { method: "DELETE" }));
  };

  if (profileId != null) {
    return (
      <CustomerProfile
        at={at}
        cardId={profileId}
        onBack={() => {
          setProfileId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="admin-block">
      <div className="admin-toolbar">
        <input
          type="search"
          className="field admin-search"
          placeholder={at("search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn-accent pressable" onClick={() => setNewOpen(true)}>
          {at("loyNew")}
        </button>
      </div>
      <p className="admin-muted">{at("loyIntro")}</p>
      {error ? <p className="admin-error">{error}</p> : null}

      {!data ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : cards.length === 0 ? (
        <p className="admin-muted">{at("empty")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{at("colName")}</th>
                <th>{at("loyCardNumber")}</th>
                <th>{at("colPhone")}</th>
                <th className="num">{at("loyPoints")}</th>
                <th className="num">{at("loyPurchases")}</th>
                <th className="num">{at("loyRewards")}</th>
                <th className="num">{at("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.cardId} className={c.eligible ? "is-eligible" : undefined}>
                  <td>
                    {c.name || "—"}
                    {c.isManual ? <span className="admin-tag">{at("loyManual")}</span> : null}
                    {c.isBanned ? <span className="admin-tag danger">{at("banned")}</span> : null}
                    <div className="admin-muted admin-small">{c.email || "—"}</div>
                  </td>
                  <td>{c.cardNumber || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td className="num">
                    <strong>{c.points}</strong>
                    <div className="admin-progress" aria-hidden="true">
                      <span style={{ inlineSize: `${c.progress}%` }} />
                    </div>
                  </td>
                  <td className="num">{c.purchaseCount}</td>
                  <td className="num">{c.rewards}</td>
                  <td className="num admin-actions">
                    <button type="button" className="admin-mini pressable" disabled={busy} onClick={() => addPoint(c)}>
                      {at("loyAddPoint")}
                    </button>
                    <button
                      type="button"
                      className="admin-mini pressable"
                      disabled={busy || !c.eligible}
                      onClick={() => redeem(c)}
                    >
                      {at("loyRedeem")}
                    </button>
                    <button type="button" className="admin-mini pressable" onClick={() => setProfileId(c.cardId)}>
                      {at("loyView")}
                    </button>
                    <button type="button" className="admin-mini pressable" onClick={() => setEditing(c)}>
                      {at("edit")}
                    </button>
                    <button
                      type="button"
                      className="admin-mini pressable danger"
                      disabled={busy}
                      onClick={() => remove(c)}
                    >
                      {at("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newOpen ? (
        <NewCardModal
          at={at}
          usersWithoutCards={data?.usersWithoutCards || []}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            load();
          }}
        />
      ) : null}

      {editing ? (
        <EditCardModal
          at={at}
          card={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- New card */
function NewCardModal({ at, usersWithoutCards, onClose, onDone }) {
  const [mode, setMode] = useState("manual");
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "link" && !userId) throw new Error(at("loyPickUser"));
      if (mode === "manual" && !form.name.trim()) throw new Error(at("loyName"));
      const body =
        mode === "link"
          ? { userId: Number(userId) }
          : { name: form.name, email: form.email, phone: form.phone };
      await api("/api/admin/loyalty/create", { method: "POST", body });
      onDone();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={at("loyNew")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost pressable" onClick={onClose}>
            {at("cancel")}
          </button>
          <button type="button" className="btn-accent pressable" disabled={busy} onClick={submit}>
            {at("loyCreate")}
          </button>
        </>
      }
    >
      <div className="admin-seg" role="tablist">
        <button
          type="button"
          className={`admin-seg-btn pressable${mode === "manual" ? " on" : ""}`}
          onClick={() => setMode("manual")}
        >
          {at("loyManual")}
        </button>
        <button
          type="button"
          className={`admin-seg-btn pressable${mode === "link" ? " on" : ""}`}
          onClick={() => setMode("link")}
        >
          {at("loyLink")}
        </button>
      </div>

      {mode === "link" ? (
        <label className="admin-field">
          <span>{at("loyPickUser")}</span>
          <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">—</option>
            {usersWithoutCards.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} · {u.email}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="admin-field">
            <span>{at("loyName")}</span>
            <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>{at("loyEmail")}</span>
            <input className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>{at("colPhone")}</span>
            <input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
        </>
      )}

      {error ? <p className="admin-error">{error}</p> : null}
    </Modal>
  );
}

/* -------------------------------------------------------------- Edit card */
function EditCardModal({ at, card, onClose, onDone }) {
  const [form, setForm] = useState({
    name: card.name || "",
    cardNumber: card.cardNumber || "",
    phone: card.phone || "",
    points: String(card.points ?? 0),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/admin/loyalty/update", {
        method: "PUT",
        body: {
          cardId: card.cardId,
          name: form.name,
          cardNumber: form.cardNumber,
          phone: form.phone,
          points: Number(form.points),
        },
      });
      onDone();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={at("loyEditTitle")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost pressable" onClick={onClose}>
            {at("cancel")}
          </button>
          <button type="button" className="btn-accent pressable" disabled={busy} onClick={submit}>
            {at("save")}
          </button>
        </>
      }
    >
      <label className="admin-field">
        <span>{at("colName")}</span>
        <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
      </label>
      <label className="admin-field">
        <span>{at("loyCardNumber")}</span>
        <input className="field" value={form.cardNumber} onChange={(e) => set("cardNumber", e.target.value)} />
      </label>
      <label className="admin-field">
        <span>{at("colPhone")}</span>
        <input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
      </label>
      <label className="admin-field">
        <span>{at("loyPoints")}</span>
        <input
          className="field"
          type="number"
          min="0"
          max="10000"
          value={form.points}
          onChange={(e) => set("points", e.target.value)}
        />
      </label>
      {error ? <p className="admin-error">{error}</p> : null}
    </Modal>
  );
}

/* ------------------------------------------------------- Customer profile */
function CustomerProfile({ at, cardId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const load = useCallback(
    () =>
      api(`/api/admin/loyalty/profiles/${cardId}`)
        .then(setProfile)
        .catch((e) => setError(e.message)),
    [cardId],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function removePurchase(id) {
    if (!window.confirm(at("cpDeletePurchase"))) return;
    try {
      await api(`/api/admin/loyalty/purchases/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const personality = useMemo(() => {
    if (!profile || !profile.stats || profile.stats.totalPurchases === 0) return at("cpPersonalityNone");
    const top = profile.preferences[0];
    if (!top) return at("cpPersonalityNone");
    return `${top.family} · ${top.percentage}%`;
  }, [profile, at]);

  return (
    <div className="admin-block admin-profile">
      <div className="admin-toolbar">
        <button type="button" className="admin-mini pressable" onClick={onBack}>
          ← {at("cpBack")}
        </button>
        <button type="button" className="btn-accent pressable" onClick={() => setPurchaseOpen(true)}>
          {at("cpAddPurchase")}
        </button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}

      {!profile ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : (
        <>
          <div className="card admin-profile-head">
            <div>
              <h2>{profile.card.name || "—"}</h2>
              <p className="admin-muted">
                {profile.card.cardNumber || "—"} · {profile.card.phone || "—"} · {profile.card.email || "—"}
              </p>
            </div>
            <div className="admin-profile-points">
              <strong>{profile.card.points}</strong>
              <span>{at("loyPoints")}</span>
            </div>
          </div>

          <div className="admin-stats">
            <div className="admin-stat card">
              <strong>{profile.stats.totalPurchases}</strong>
              <span>{at("loyPurchases")}</span>
            </div>
            <div className="admin-stat card">
              <strong>{profile.stats.totalSpent}</strong>
              <span>{at("cpTotalSpent")}</span>
            </div>
            <div className="admin-stat card">
              <strong>{profile.stats.topFamily || at("familyNone")}</strong>
              <span>{at("cpTopFamily")}</span>
            </div>
            <div className="admin-stat card">
              <strong>{profile.stats.favoriteBrand || at("familyNone")}</strong>
              <span>{at("cpFavouriteBrand")}</span>
            </div>
          </div>

      <section className="card admin-section">
        <h2 className="admin-subhead">{at("cpPersonality")}</h2>
        <p className="admin-muted">{personality}</p>
      </section>

      {profile.preferences.length > 0 ? (
        <section className="card admin-section">
          <h2 className="admin-subhead">{at("cpPreferences")}</h2>
          <ul className="admin-bars">
            {profile.preferences.map((p) => (
              <li key={p.family}>
                <span className="admin-bar-label">
                  {p.family === "Non spécifié" ? at("familyNone") : p.family}
                </span>
                <span className="admin-bar">
                  <span style={{ inlineSize: `${p.percentage}%` }} />
                </span>
                <span className="admin-bar-val">{p.percentage}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.topBrands.length > 0 ? (
        <section className="card admin-section">
          <h2 className="admin-subhead">{at("cpBrands")}</h2>
          <ul className="admin-chips">
            {profile.topBrands.map((b) => (
              <li key={b.brand} className="admin-chip">
                {b.brand} <strong>{b.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.suggestions.length > 0 ? (
        <section className="card admin-section">
          <h2 className="admin-subhead">{at("cpSuggestions")}</h2>
          <ul className="admin-suggestions">
            {profile.suggestions.map((s, i) => (
              <li key={`${s.name}-${i}`} className="admin-suggestion">
                <strong>{s.name}</strong>
                <span className="admin-muted">
                  {s.brand || "—"} · {s.fragrance_family || at("familyNone")} · {audienceLabel(s.audience, at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card admin-section">
        <h2 className="admin-subhead">{at("cpHistory")}</h2>
        {profile.purchases.length === 0 ? (
          <p className="admin-muted">{at("cpNoPurchases")}</p>
        ) : (
          <ul className="admin-purchases">
            {profile.purchases.map((p) => (
              <li key={p.id} className="admin-purchase">
                <div>
                  <strong>{p.perfume_name}</strong>
                  <div className="admin-muted admin-small">
                    {[p.brand, p.fragrance_family, audienceLabel(p.audience, at)].filter(Boolean).join(" · ")}
                  </div>
                  {p.notes ? <p className="admin-small admin-muted">{p.notes}</p> : null}
                </div>
                <div className="admin-purchase-meta">
                  <span>{p.purchase_date || fmtDate(p.created_at)}</span>
                  <strong>{p.purchase_price == null ? "—" : `${p.purchase_price} dt`}</strong>
                  <button
                    type="button"
                    className="admin-mini pressable danger"
                    onClick={() => removePurchase(p.id)}
                  >
                    {at("delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="admin-error">{error}</p> : null}

      {purchaseOpen ? (
        <PurchaseModal
          at={at}
          cardId={cardId}
          onClose={() => setPurchaseOpen(false)}
          onDone={() => {
            setPurchaseOpen(false);
            load();
          }}
        />
      ) : null}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------ Record a purchase */
function PurchaseModal({ at, cardId, onClose, onDone }) {
  const [form, setForm] = useState({
    perfumeName: "",
    brand: "",
    fragranceFamily: "",
    audience: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [awardPoints, setAwardPoints] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.perfumeName.trim()) {
      setError(at("rpPerfume"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api("/api/admin/loyalty/purchases", {
        method: "POST",
        body: {
          cardId,
          perfumeName: form.perfumeName,
          brand: form.brand,
          fragranceFamily: form.fragranceFamily,
          audience: form.audience,
          purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
          purchaseDate: form.purchaseDate,
          notes: form.notes,
          awardPoints,
        },
      });
      onDone();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={at("rpTitle")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost pressable" onClick={onClose}>
            {at("cancel")}
          </button>
          <button type="button" className="btn-accent pressable" disabled={busy} onClick={submit}>
            {at("rpSave")}
          </button>
        </>
      }
    >
      <label className="admin-field">
        <span>{at("rpPerfume")}</span>
        <input className="field" value={form.perfumeName} onChange={(e) => set("perfumeName", e.target.value)} maxLength={150} />
      </label>
      <div className="admin-form-row">
        <label className="admin-field">
          <span>{at("rpBrand")}</span>
          <input className="field" value={form.brand} onChange={(e) => set("brand", e.target.value)} maxLength={100} />
        </label>
        <label className="admin-field">
          <span>{at("rpFamily")}</span>
          <select className="field" value={form.fragranceFamily} onChange={(e) => set("fragranceFamily", e.target.value)}>
            {FAMILIES.map((f) => (
              <option key={f || "none"} value={f}>
                {f || "—"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-field">
          <span>{at("rpAudience")}</span>
          <select className="field" value={form.audience} onChange={(e) => set("audience", e.target.value)}>
            {AUDIENCES.map((a) => (
              <option key={a || "none"} value={a}>
                {a ? audienceLabel(a, at) : "—"}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>{at("rpPrice")}</span>
          <input
            className="field"
            type="number"
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)}
          />
        </label>
      </div>
      <label className="admin-field">
        <span>{at("rpDate")}</span>
        <input className="field" type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
      </label>
      <label className="admin-field">
        <span>{at("rpNotes")}</span>
        <input className="field" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
      </label>
      <label className="admin-check">
        <input type="checkbox" checked={awardPoints} onChange={(e) => setAwardPoints(e.target.checked)} />
        <span>{at("rpAward")}</span>
      </label>
      {error ? <p className="admin-error">{error}</p> : null}
    </Modal>
  );
}
