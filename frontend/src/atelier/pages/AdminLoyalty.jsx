import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client.js";
import { fmtDate, fmtDateTime, useLiveRefresh } from "./adminKit.jsx";
import { money } from "../lib/catalog.js";

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

/* Rows per page in the card table and the purchase history. The tabs ended
   the section-level scroll; this ends the table-level one, which was the
   "all the cards at once" complaint all along. */
const PAGE_SIZE = 10;

const audienceLabel = (value, at) =>
  value === "men"
    ? at("audienceMen")
    : value === "women"
      ? at("audienceWomen")
      : value === "unisex"
        ? at("audienceUnisex")
        : at("familyNone");

/* A tab bar in the admin house style, shared by the card list and the
   customer profile so both sections page through instead of scrolling.
   `hook` prefixes the data-guide attribute of each button, so the guide
   videos can click a tab by name instead of by its (translated) label. */
function Tabs({ at, label, tabs, current, onSelect, hook }) {
  return (
    <nav className="admin-tabs" role="tablist" aria-label={label} data-guide={hook ? `${hook}-tabs` : undefined}>
      {tabs.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          data-guide={hook ? `${hook}-${id}` : undefined}
          aria-selected={current === id}
          className={`admin-tab pressable${current === id ? " on" : ""}`}
          onClick={() => onSelect(id)}
        >
          {text}
        </button>
      ))}
    </nav>
  );
}

/* Row pager for long tables. Hidden while everything fits on one page, so
   small accounts see no extra furniture. */
function Pager({ at, page, pageCount, count, unit, onPage, hook }) {
  if (pageCount < 2) return null;
  return (
    <nav className="admin-pager" aria-label={at("loyPage")} data-guide={hook}>
      <span className="admin-muted admin-small">
        {count} {unit}
      </span>
      <span className="admin-muted admin-small">
        {at("loyPage")} {page} {at("loyOf")} {pageCount}
      </span>
      <span className="admin-pager-btns">
        <button type="button" className="admin-mini pressable" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {at("loyPrev")}
        </button>
        <button type="button" className="admin-mini pressable" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          {at("loyNext")}
        </button>
      </span>
    </nav>
  );
}

/* PARITY 2026-11-07: the legacy root shows #loyaltyStaleBanner whenever a
   refresh fails while old data is still on screen. Without it staff quote
   stale balances to customers. Same unmissable signal in the React admin. */
function StaleBanner({ at, onRefresh, hook = "loyalty-stale" }) {
  return (
    <div className="admin-stale" role="status" data-guide={hook}>
      <span>{at("loyStale")}</span>
      <button
        type="button"
        className="admin-mini pressable"
        data-guide="loyalty-refresh"
        onClick={onRefresh}
      >
        {at("loyRefresh")}
      </button>
    </div>
  );
}

const HISTORY_PAGE_SIZE = 25;
/* A dense log, so the page cap is generous. If the account ever exceeds it the
   UI says so out loud rather than pretending the list is complete. */
const HISTORY_MAX_PAGES = 20;

/* Every point movement on every card, newest first.
   INCIDENT 2026-11-06: a disputed balance used to be a number on a badge with
   no way to explain it, and the assistant had to open profiles one by one. */
function PointsHistory({ at }) {
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const alive = useRef(true);
  /* StrictMode re-arms on remount; a cleanup-only effect strands it false. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /* The server computes totalMovements AND totalPoints over the WHOLE ledger,
     independently of the page. Using them (rather than summing the rows we
     happened to load) means a page cap or a search can never silently turn
     "net points" into a partial figure. */
  const load = useCallback(async () => {
    setError("");
    try {
      const PAGE = 1000;
      const all = [];
      let reported = 0;
      let net = 0;
      let offset = 0;
      for (let i = 0; i < HISTORY_MAX_PAGES; i += 1) {
        const d = await api(`/api/admin/loyalty/history?limit=${PAGE}&offset=${offset}`);
        reported = Number(d.totalMovements) || 0;
        net = Number(d.totalPoints) || 0;
        const batch = d.movements || [];
        all.push(...batch);
        if (!d.hasMore || batch.length === 0) break;
        offset = Number(d.nextOffset) || offset + batch.length;
      }
      if (!alive.current) return;
      setMovements(all);
      setTotal(reported);
      setTotalPoints(net);
      setStale(false);
    } catch (e) {
      if (!alive.current) return;
      setError(e.message);
      setStale(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load, { intervalMs: 60000 });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return movements;
    return movements.filter((m) =>
      `${m.name || ""} ${m.cardNumber || ""} ${m.phone || ""} ${m.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [movements, q]);

  const pageCount = Math.max(1, Math.ceil(shown.length / HISTORY_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => shown.slice((current - 1) * HISTORY_PAGE_SIZE, current * HISTORY_PAGE_SIZE),
    [shown, current],
  );
  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  const shownTotal = shown.reduce((sum, m) => sum + (Number(m.pointsChange) || 0), 0);

  if (loading && movements.length === 0) return <p className="admin-muted">{at("loading")}</p>;
  if (error && movements.length === 0) return <p className="admin-error">{error}</p>;

  return (
    <>
      {error ? <p className="admin-error">{error}</p> : null}
      {stale ? <StaleBanner at={at} onRefresh={load} hook="loyalty-history-stale" /> : null}
      <div className="admin-toolbar">
        <input
          type="search"
          className="field admin-search"
          data-guide="loyalty-history-search"
          placeholder={at("search")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className="admin-mini pressable"
          data-guide="loyalty-history-refresh"
          onClick={load}
        >
          {at("loyRefresh")}
        </button>
      </div>
      <p className="admin-muted">{at("loyHistoryIntro")}</p>
      {movements.length < total ? (
        <p className="admin-muted admin-small">{at("loyHistoryCapped")}</p>
      ) : null}

      {shown.length === 0 ? (
        <p className="admin-muted">{at("loyHistoryEmpty")}</p>
      ) : (
        <>
          <div className="admin-table-wrap" data-guide="loyalty-history-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{at("loyColDate")}</th>
                  <th>{at("loyColClient")}</th>
                  <th>{at("loyColMovement")}</th>
                  <th className="num">{at("loyColPoints")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr key={m.id} data-guide="loyalty-history-row">
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(m.createdAt)}</td>
                    <td>
                      {m.name || "—"}
                      <div className="admin-muted admin-small">
                        {m.cardNumber || "—"}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </div>
                    </td>
                    <td>
                      {m.description || (m.type === "redeem" ? at("loyRedeem") : "—")}
                      {m.purchaseId ? (
                        <div className="admin-muted admin-small">#{m.purchaseId}</div>
                      ) : null}
                    </td>
                    <td className="num">
                      <strong style={{ color: m.pointsChange >= 0 ? undefined : "var(--danger, #e39a92)" }}>
                        {m.pointsChange > 0 ? "+" : ""}
                        {m.pointsChange}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            at={at}
            page={current}
            pageCount={pageCount}
            count={shown.length}
            unit={at("loyHistoryUnit")}
            onPage={setPage}
            hook="loyalty-history-pager"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>{at("loyHistoryNet")}</span>
            <span>
              {totalPoints > 0 ? "+" : ""}
              {totalPoints}
            </span>
          </div>
          {q.trim() ? (
            <p className="admin-muted admin-small" style={{ marginTop: 4 }}>
              {at("loyHistoryNetShown")}: {shownTotal > 0 ? "+" : ""}{shownTotal}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Loyalty */
export function Loyalty({ at }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileId, setProfileId] = useState(null);
  /* The admin used to pop the create/edit forms over the table, which landed
     mid-scroll and read as a bug. They are tabs now: "cards" is the table,
     "new" and "edit" are forms. */
  const [tab, setTab] = useState("cards");
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  /* PARITY 2026-11-07: the same Set-based synchronous guard the legacy root
     uses (`loyaltyGuard`). `busy` is React state, so two clicks in the same
     tick both read false. Every mutation takes its own in-flight key. */
  const inFlight = useRef(new Set());
  const alive = useRef(true);
  /* StrictMode re-arms on remount; a cleanup-only effect strands it false. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /* Reset the error on every attempt, so a successful refresh does not leave a
     stale red banner above correct data.
     INCIDENT 2026-11-06: the server caps one page at 1000 cards. Fetch every
     page instead of silently showing only the first one - a hidden card is a
     customer whose points appear to have vanished. */
  const load = useCallback(() => {
    setError("");
    const PAGE = 1000;
    return (async () => {
      const all = [];
      let last = null;
      let offset = 0;
      for (let i = 0; i < 20; i += 1) {
        const d = await api(`/api/admin/loyalty?limit=${PAGE}&offset=${offset}`);
        last = d;
        const batch = d.cards || [];
        all.push(...batch);
        if (!d.hasMore || batch.length === 0) break;
        offset = Number(d.nextOffset) || offset + batch.length;
      }
      if (!alive.current) return;
      setData({ ...(last || {}), cards: all });
      setStale(false);
    })().catch((e) => {
      if (!alive.current) return;
      setError(e.message);
      setStale(true);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  /* Live sync: a point stamped at the register appears without a reload. */
  useLiveRefresh(load, { intervalMs: 30000 });

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

  /* Ten rows per page. "current" clamps, so a narrowed search or a shorter
     list can never strand the admin on an empty page; the effect folds the
     state back so the buttons stay honest. */
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [shown, current],
  );
  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  const guard = async (key, fn) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setError("");
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
      setStale(true);
    } finally {
      inFlight.current.delete(key);
      setBusy(false);
    }
  };

  const addPoint = (card) =>
    guard(`add:${card.cardId}`, () =>
      api("/api/admin/loyalty/add-points", { method: "POST", body: { cardId: card.cardId, points: 1 } }),
    );

  const redeem = (card) => {
    if (!window.confirm(at("loyRedeemConfirm"))) return;
    guard(`redeem:${card.cardId}`, () =>
      api("/api/admin/loyalty/redeem", { method: "POST", body: { cardId: card.cardId } }),
    );
  };

  const remove = (card) => {
    if (!window.confirm(at("loyDeleteConfirm"))) return;
    guard(`delete:${card.cardId}`, () =>
      api(`/api/admin/loyalty/delete?cardId=${card.cardId}`, { method: "DELETE" }),
    );
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

  const tabs = [
    ["cards", at("loyTabCards")],
    ["history", at("loyTabHistory")],
    ["new", at("loyNew")],
  ];
  if (tab === "edit" && editing) {
    tabs.push(["edit", editing.name || at("loyEditTitle")]);
  }

  return (
    <div className="admin-block">
      <Tabs at={at} label={at("tabLoyalty")} tabs={tabs} current={tab} onSelect={setTab} hook="loyalty" />
      {error ? <p className="admin-error">{error}</p> : null}
      {stale ? <StaleBanner at={at} onRefresh={load} /> : null}

      {tab === "cards" ? (
        <>
          <div className="admin-toolbar">
            <input
              type="search"
              className="field admin-search"
              data-guide="loyalty-search"
              placeholder={at("search")}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <button
              type="button"
              className="admin-mini pressable"
              data-guide="loyalty-refresh-cards"
              onClick={load}
            >
              {at("loyRefresh")}
            </button>
            <button
              type="button"
              className="btn-accent pressable"
              data-guide="loyalty-new-card"
              onClick={() => { setEditing(null); setTab("new"); }}
            >
              {at("loyNew")}
            </button>
          </div>
          <p className="admin-muted">{at("loyIntro")}</p>

          {!data ? (
            <p className="admin-muted">{at("loading")}</p>
          ) : cards.length === 0 ? (
            <p className="admin-muted">{at("empty")}</p>
          ) : (
            <>
              <div className="admin-table-wrap" data-guide="loyalty-table">
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
                    {pageRows.map((c) => (
                      <tr
                        key={c.cardId}
                        data-guide="loyalty-row"
                        className={c.eligible ? "is-eligible" : undefined}
                      >
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
                          <button
                            type="button"
                            className="admin-mini pressable"
                            data-guide="loyalty-add-point"
                            disabled={busy}
                            onClick={() => addPoint(c)}
                          >
                            {at("loyAddPoint")}
                          </button>
                          <button
                            type="button"
                            className="admin-mini pressable"
                            data-guide="loyalty-redeem"
                            disabled={busy || !c.eligible}
                            onClick={() => redeem(c)}
                          >
                            {at("loyRedeem")}
                          </button>
                          <button
                            type="button"
                            className="admin-mini pressable"
                            data-guide="loyalty-view"
                            onClick={() => setProfileId(c.cardId)}
                          >
                            {at("loyView")}
                          </button>
                          <button
                            type="button"
                            className="admin-mini pressable"
                            data-guide="loyalty-row-edit"
                            onClick={() => {
                              setEditing(c);
                              setTab("edit");
                            }}
                          >
                            {at("edit")}
                          </button>
                          <button
                            type="button"
                            className="admin-mini pressable danger"
                            data-guide="loyalty-row-delete"
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
              <Pager
                at={at}
                page={current}
                pageCount={pageCount}
                count={shown.length}
                unit={at("loyCards")}
                onPage={setPage}
                hook="loyalty-pager"
              />
            </>
          )}
        </>
      ) : null}

      {tab === "history" ? <PointsHistory at={at} /> : null}

      {tab === "new" ? (
        <NewCardPanel
          at={at}
          usersWithoutCards={data?.usersWithoutCards || []}
          onCancel={() => setTab("cards")}
          onDone={() => {
            setTab("cards");
            load();
          }}
        />
      ) : null}

      {tab === "edit" && editing ? (
        <EditCardPanel
          at={at}
          card={editing}
          onCancel={() => setTab("cards")}
          onDone={() => {
            setEditing(null);
            setTab("cards");
            load();
          }}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- New card */
/* A card is born from its first purchase, so this form opens one: the
   customer, then the fragrance that stamps the first point. */
function NewCardPanel({ at, usersWithoutCards, onCancel, onDone }) {
  const [mode, setMode] = useState("manual");
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    perfumeName: "",
    brand: "",
    fragranceFamily: "",
    audience: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
    awardPoints: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  /* `busy` is React state: two clicks in the same tick both read `false`, so
     disabling the button was not enough - it is how card 334 ended up with two
     identical purchases 19 seconds apart. A ref is synchronous and is the real
     guard against a double submit. */
  const inFlight = useRef(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const purchaseFields = () => ({
    perfumeName: form.perfumeName,
    brand: form.brand,
    fragranceFamily: form.fragranceFamily,
    audience: form.audience,
    purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
    purchaseDate: form.purchaseDate,
    notes: form.notes,
    awardPoints: form.awardPoints,
  });

  async function postPurchase(body) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setDuplicate(null);
    try {
      await api("/api/admin/loyalty/purchases", { method: "POST", body });
      onDone();
    } catch (e2) {
      setError(e2.message);
      /* The server refuses to silently open a second card for an existing
         walk-in. Offer a one-click recovery instead of making the assistant
         hunt through the card list to find it. */
      if (e2.status === 409 && e2.data && e2.data.existingCardId) {
        setDuplicate({
          cardId: e2.data.existingCardId,
          cardNumber: e2.data.existingCardNumber,
        });
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    if (mode === "link" && !userId) return setError(at("loyPickUser"));
    if (mode === "manual" && !form.name.trim()) return setError(at("loyName"));
    if (!form.perfumeName.trim()) return setError(at("rpPerfume"));
    const purchase = purchaseFields();
    const body =
      mode === "link"
        ? { userId: Number(userId), ...purchase }
        : {
            holderName: form.name,
            holderEmail: form.email,
            holderPhone: form.phone,
            ...purchase,
          };
    await postPurchase(body);
  }

  function useExistingCard() {
    if (!duplicate || inFlight.current) return;
    postPurchase({ cardId: duplicate.cardId, ...purchaseFields() });
  }

  return (
    <form className="admin-block" data-guide="new-card" onSubmit={submit}>
      <p className="admin-muted">{at("loyTabNewIntro")}</p>
      {error ? <p className="admin-error">{error}</p> : null}
      {duplicate ? (
        <div className="admin-toolbar">
          <button type="button" className="admin-mini pressable" onClick={useExistingCard} disabled={busy}>
            {at("loyUseExisting")} {duplicate.cardNumber || duplicate.cardId}
          </button>
        </div>
      ) : null}

      <section className="card admin-section">
        <h2 className="admin-subhead">{at("loyNew")}</h2>
        <div className="admin-seg" role="tablist">
          <button
            type="button"
            className={`admin-seg-btn pressable${mode === "manual" ? " on" : ""}`}
            data-guide="new-card-manual"
            onClick={() => setMode("manual")}
          >
            {at("loyManual")}
          </button>
          <button
            type="button"
            className={`admin-seg-btn pressable${mode === "link" ? " on" : ""}`}
            data-guide="new-card-link"
            onClick={() => setMode("link")}
          >
            {at("loyLink")}
          </button>
        </div>

        {mode === "link" ? (
          <label className="admin-field">
            <span>{at("loyPickUser")}</span>
            <select
              className="field"
              data-guide="new-card-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">—</option>
              {usersWithoutCards.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div data-guide="new-card-holder">
            <label className="admin-field">
              <span>{at("loyName")}</span>
              <input
                className="field"
                data-guide="new-card-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={80}
              />
            </label>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>{at("loyEmail")}</span>
                <input
                  className="field"
                  type="email"
                  data-guide="new-card-email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>{at("colPhone")}</span>
                <input
                  className="field"
                  data-guide="new-card-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  maxLength={30}
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="card admin-section" data-guide="new-card-purchase">
        <h2 className="admin-subhead">{at("rpTitle")}</h2>
        <PurchaseFields at={at} form={form} set={set} hook="new-card" />
      </section>

      <div className="admin-form-foot">
        <button type="button" className="btn-ghost pressable" data-guide="new-card-cancel" onClick={onCancel}>
          {at("cancel")}
        </button>
        <button type="submit" className="btn-accent pressable" data-guide="new-card-submit" disabled={busy}>
          {at("loyCreate")}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------- Edit card */
function EditCardPanel({ at, card, onCancel, onDone }) {
  const [form, setForm] = useState({
    name: card.name || "",
    cardNumber: card.cardNumber || "",
    phone: card.phone || "",
    points: String(card.points ?? 0),
  });
  /* The balance this form was seeded with. A save only moves points if the
     assistant deliberately changed the field. */
  const [originalPoints, setOriginalPoints] = useState(String(card.points ?? 0));
  const [livePoints, setLivePoints] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  /* StrictMode re-arms on remount; a cleanup-only effect strands it false. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* PARITY 2026-11-07 with the legacy root's updateLoyaltyPoints(): that form
     pre-filled `points` from the in-memory table and ALWAYS sent it back, so
     correcting a phone number on a tab open for an hour rewrote the balance to
     an hour-old value and silently deleted newly earned points. Read the card
     fresh before showing anything, and keep a live read running while the
     form is open so a point stamped at the register is not invisible. */
  const fetchCard = useCallback(
    () => api(`/api/admin/loyalty/profiles/${card.cardId}`).then((d) => d.card || {}),
    [card.cardId],
  );

  const seed = useCallback(async () => {
    try {
      const fresh = await fetchCard();
      if (!alive.current) return;
      const pts = String(fresh.points ?? card.points ?? 0);
      setForm({
        name: fresh.name || card.name || "",
        cardNumber: fresh.cardNumber || card.cardNumber || "",
        phone: fresh.phone || card.phone || "",
        points: pts,
      });
      setOriginalPoints(pts);
      setLivePoints(pts);
      setError("");
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setReady(true);
    }
  }, [fetchCard, card]);

  useEffect(() => {
    seed();
  }, [seed]);

  const poll = useCallback(async () => {
    try {
      const fresh = await fetchCard();
      if (alive.current) setLivePoints(String(fresh.points ?? 0));
    } catch {
      if (alive.current) setError(at("loyStaleShort"));
    }
  }, [fetchCard, at]);
  useLiveRefresh(poll, { intervalMs: 30000, active: ready });

  const changed = String(form.points) !== String(originalPoints);
  const drifted = livePoints != null && String(livePoints) !== String(originalPoints);

  async function submit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    const pts = Number.parseInt(form.points, 10);
    if (!Number.isInteger(pts) || pts < 0 || pts > 10000) {
      setError(at("loyPointsInvalid"));
      return;
    }
    inFlight.current = true;
    setError("");
    setBusy(true);
    try {
      /* Never echo a stale balance back to the server. Only a deliberate edit
         of this field may move points; every other change leaves them alone. */
      const body = {
        cardId: card.cardId,
        name: form.name,
        cardNumber: form.cardNumber,
        phone: form.phone,
      };
      if (changed) body.points = pts;
      await api("/api/admin/loyalty/update", { method: "PUT", body });
      onDone();
    } catch (e2) {
      setError(e2.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!ready) return <p className="admin-muted">{at("loading")}</p>;

  return (
    <form className="admin-block" data-guide="edit-card" onSubmit={submit}>
      <p className="admin-muted">
        {at("loyCardNumber")}: <strong>{card.cardNumber || "—"}</strong>
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-toolbar">
        <span className="admin-muted admin-small">
          {at("loyLiveBalance")}: <strong>{livePoints ?? "—"}</strong>
        </span>
        {drifted ? <span className="admin-error admin-small">{at("loyPointsChanged")}</span> : null}
        <button
          type="button"
          className="admin-mini pressable"
          data-guide="edit-card-refresh"
          onClick={seed}
        >
          {at("loyReloadCard")}
        </button>
      </div>

      <section className="card admin-section">
        <h2 className="admin-subhead">{at("loyEditTitle")}</h2>
        <label className="admin-field">
          <span>{at("colName")}</span>
          <input
            className="field"
            data-guide="edit-card-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
          />
        </label>
        <label className="admin-field">
          <span>{at("loyCardNumber")}</span>
          <input
            className="field"
            data-guide="edit-card-number"
            value={form.cardNumber}
            onChange={(e) => set("cardNumber", e.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>{at("colPhone")}</span>
          <input
            className="field"
            data-guide="edit-card-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={30}
          />
        </label>
        <label className="admin-field">
          <span>{at("loyPoints")}</span>
          <input
            className="field"
            type="number"
            data-guide="edit-card-points"
            min="0"
            max="10000"
            value={form.points}
            onChange={(e) => set("points", e.target.value)}
          />
        </label>
      </section>

      <div className="admin-form-foot">
        <button type="button" className="btn-ghost pressable" data-guide="edit-card-cancel" onClick={onCancel}>
          {at("cancel")}
        </button>
        <button type="submit" className="btn-accent pressable" data-guide="edit-card-submit" disabled={busy}>
          {at("save")}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------- Shared purchase form */
/* `hook` prefixes the data-guide attributes. The same fields appear in three
   places (new card, edit card, record a purchase) and the guide videos need to
   address one of them, not all three. */
function PurchaseFields({ at, form, set, hook = "purchase" }) {
  const g = (k) => `${hook}-${k}`;
  return (
    <>
      <label className="admin-field">
        <span>{at("rpPerfume")}</span>
        <input
          className="field"
          data-guide={g("perfume")}
          value={form.perfumeName}
          onChange={(e) => set("perfumeName", e.target.value)}
          maxLength={150}
        />
      </label>
      <div className="admin-form-row">
        <label className="admin-field">
          <span>{at("rpBrand")}</span>
          <input
            className="field"
            data-guide={g("brand")}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            maxLength={100}
          />
        </label>
        <label className="admin-field">
          <span>{at("rpFamily")}</span>
          <select
            className="field"
            data-guide={g("family")}
            value={form.fragranceFamily}
            onChange={(e) => set("fragranceFamily", e.target.value)}
          >
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
          <select
            className="field"
            data-guide={g("audience")}
            value={form.audience}
            onChange={(e) => set("audience", e.target.value)}
          >
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
            data-guide={g("price")}
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)}
          />
        </label>
      </div>
      <label className="admin-field">
        <span>{at("rpDate")}</span>
        <input
          className="field"
          type="date"
          data-guide={g("date")}
          value={form.purchaseDate}
          onChange={(e) => set("purchaseDate", e.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>{at("rpNotes")}</span>
        <input
          className="field"
          data-guide={g("notes")}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
        />
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          data-guide={g("award")}
          checked={form.awardPoints}
          onChange={(e) => set("awardPoints", e.target.checked)}
        />
        <span>{at("rpAward")}</span>
      </label>
    </>
  );
}

/* ------------------------------------------------------- Customer profile */
/* One long scroll before (head, stats, personality, tastes, brands,
   suggestions, history). It pages now. */
function CustomerProfile({ at, cardId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [tab, setTab] = useState("overview");
  const [pPage, setPPage] = useState(1);
  const inFlight = useRef(new Set());
  const alive = useRef(true);
  /* StrictMode re-arms on remount; a cleanup-only effect strands it false. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(
    () =>
      api(`/api/admin/loyalty/profiles/${cardId}`)
        .then((d) => {
          if (!alive.current) return;
          setProfile(d);
          setError("");
          setStale(false);
        })
        .catch((e) => {
          if (!alive.current) return;
          setError(e.message);
          setStale(true);
        }),
    [cardId],
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load, { intervalMs: 30000 });

  async function removePurchase(id) {
    if (!window.confirm(at("cpDeletePurchase"))) return;
    const key = `purchase:${id}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    try {
      await api(`/api/admin/loyalty/purchases/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
      setStale(true);
    } finally {
      inFlight.current.delete(key);
    }
  }

  const personality = useMemo(() => {
    if (!profile || !profile.stats || profile.stats.totalPurchases === 0) return at("cpPersonalityNone");
    const top = profile.preferences[0];
    if (!top) return at("cpPersonalityNone");
    return `${top.family} · ${top.percentage}%`;
  }, [profile, at]);

  /* A heavy customer's history scrolls as badly as the card list did, so it
     pages on the same rule. */
  const purchases = profile ? profile.purchases : [];
  const profileTransactions = profile ? profile.transactions || [] : [];
  const pointTotal = profileTransactions.reduce(
    (sum, tx) => sum + (Number(tx.points_change) || 0),
    0,
  );
  const pPageCount = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pIndex = Math.min(pPage, pPageCount);
  const pRows = purchases.slice((pIndex - 1) * PAGE_SIZE, pIndex * PAGE_SIZE);
  useEffect(() => {
    if (pPage !== pIndex) setPPage(pIndex);
  }, [pPage, pIndex]);

  const tabs = [
    ["overview", at("cpTabOverview")],
    ["tastes", at("cpTabTastes")],
    ["purchases", at("cpTabPurchases")],
    ["points", at("cpTabPoints")],
    ["record", at("rpTitle")],
  ];

  return (
    <div className="admin-block admin-profile" data-guide="cp">
      <div className="admin-toolbar">
        <button type="button" className="admin-mini pressable" data-guide="cp-back" onClick={onBack}>
          ← {at("cpBack")}
        </button>
        <button type="button" className="admin-mini pressable" data-guide="cp-refresh" onClick={load}>
          {at("loyRefresh")}
        </button>
      </div>
      <Tabs at={at} label={at("cpTitle")} tabs={tabs} current={tab} onSelect={setTab} hook="cp" />
      {error ? <p className="admin-error">{error}</p> : null}
      {stale ? <StaleBanner at={at} onRefresh={load} hook="cp-stale" /> : null}

      {!profile ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : (
        <>
          {tab === "overview" ? (
            <>
              <div className="card admin-profile-head" data-guide="cp-head">
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

              <div className="admin-stats" data-guide="cp-stats">
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

              <section className="card admin-section" data-guide="cp-personality">
                <h2 className="admin-subhead">{at("cpPersonality")}</h2>
                <p className="admin-muted">{personality}</p>
              </section>
            </>
          ) : null}

          {tab === "tastes" ? (
            <>
              {profile.preferences.length > 0 ? (
                <section className="card admin-section" data-guide="cp-preferences">
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
                <section className="card admin-section" data-guide="cp-brands">
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
                <section className="card admin-section" data-guide="cp-suggestions">
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

              {profile.preferences.length === 0 && profile.topBrands.length === 0 && profile.suggestions.length === 0 ? (
                <p className="admin-muted">{at("cpPersonalityNone")}</p>
              ) : null}
            </>
          ) : null}

          {tab === "purchases" ? (
            <section className="card admin-section" data-guide="cp-history">
              <h2 className="admin-subhead">{at("cpHistory")}</h2>
              {profile.purchases.length === 0 ? (
                <p className="admin-muted">{at("cpNoPurchases")}</p>
              ) : (
                <ul className="admin-purchases">
                  {pRows.map((p) => (
                    <li key={p.id} className="admin-purchase" data-guide="cp-purchase">
                      <div>
                        <strong>{p.perfume_name}</strong>
                        <div className="admin-muted admin-small">
                          {[p.brand, p.fragrance_family, audienceLabel(p.audience, at)].filter(Boolean).join(" · ")}
                        </div>
                        {p.notes ? <p className="admin-small admin-muted">{p.notes}</p> : null}
                      </div>
                      <div className="admin-purchase-meta">
                        <span>{p.purchase_date || fmtDate(p.created_at)}</span>
                        <strong>{money(p.purchase_price)}</strong>
                        <button
                          type="button"
                          className="admin-mini pressable danger"
                          data-guide="cp-delete-purchase"
                          onClick={() => removePurchase(p.id)}
                        >
                          {at("delete")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pager
                at={at}
                page={pIndex}
                pageCount={pPageCount}
                count={purchases.length}
                unit={at("cpTabPurchases")}
                onPage={setPPage}
                hook="cp-pager"
              />
            </section>
          ) : null}

          {/* PARITY 2026-11-07: the legacy admin profile renders every point
              movement (renderProfilePointsHistory). The server already returns
              `transactions`; this tab was the missing consumer. A disputed
              balance is explainable here, without opening the global log. */}
          {tab === "points" ? (
            <section className="card admin-section" data-guide="cp-points-history">
              <h2 className="admin-subhead">{at("cpTabPoints")}</h2>
              <p className="admin-muted">{at("loyHistoryIntro")}</p>
              {profileTransactions.length === 0 ? (
                <p className="admin-muted">{at("loyHistoryEmpty")}</p>
              ) : (
                <>
                  <ul className="admin-purchases">
                    {profileTransactions.map((tx) => (
                      <li key={tx.id} className="admin-purchase" data-guide="cp-point-row">
                        <div>
                          <strong>
                            {tx.description || (tx.type === "redeem" ? at("loyRedeem") : "—")}
                          </strong>
                          <div className="admin-muted admin-small">{fmtDateTime(tx.created_at)}</div>
                        </div>
                        <div className="admin-purchase-meta">
                          <strong
                            style={{
                              color:
                                (Number(tx.points_change) || 0) < 0
                                  ? "var(--danger, #e39a92)"
                                  : undefined,
                            }}
                          >
                            {(Number(tx.points_change) || 0) > 0 ? "+" : ""}
                            {tx.points_change}
                          </strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 10,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span>{at("loyHistoryNet")}</span>
                    <span>
                      {pointTotal > 0 ? "+" : ""}
                      {pointTotal}
                    </span>
                  </div>
                  <p className="admin-muted admin-small" style={{ marginTop: 8 }}>
                    {at("cpPointsNote")}
                  </p>
                </>
              )}
            </section>
          ) : null}

          {tab === "record" ? (
            <PurchasePanel
              at={at}
              cardId={cardId}
              onDone={() => {
                setTab("purchases");
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
function PurchasePanel({ at, cardId, onDone }) {
  const [form, setForm] = useState({
    perfumeName: "",
    brand: "",
    fragranceFamily: "",
    audience: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
    awardPoints: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    /* Synchronous guard: React state has not re-rendered yet when a second
       click lands in the same tick, so `busy` alone cannot stop a duplicate
       purchase (and its duplicate +1 point). */
    if (inFlight.current) return;
    if (!form.perfumeName.trim()) {
      setError(at("rpPerfume"));
      return;
    }
    inFlight.current = true;
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
          awardPoints: form.awardPoints,
        },
      });
      onDone();
    } catch (e2) {
      setError(e2.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="admin-block" data-guide="record-purchase" onSubmit={submit}>
      {error ? <p className="admin-error">{error}</p> : null}
      <section className="card admin-section" data-guide="record-purchase-fields">
        <h2 className="admin-subhead">{at("rpTitle")}</h2>
        <PurchaseFields at={at} form={form} set={set} hook="record-purchase" />
      </section>
      <div className="admin-form-foot">
        <button type="submit" className="btn-accent pressable" data-guide="record-purchase-submit" disabled={busy}>
          {at("rpSave")}
        </button>
      </div>
    </form>
  );
}
