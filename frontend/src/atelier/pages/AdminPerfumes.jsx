import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, apiUpload, apiUrl } from "../../api/client.js";
import { fmtDateTime, Modal, parseDateTime, useLiveRefresh } from "./adminKit.jsx";
import { money } from "../lib/catalog.js";
import { catalogueChanged, useCatalogue } from "../lib/catalogStore.js";
import "./collection.css";
import "./admin-perfumes.css";

/* Perfume administration: add perfumes by name + transparent PNG, flip
   in-stock / hors-stock, edit/duplicate/delete/restore, and bulk actions.
   The catalogue itself is a build-time array; admin changes live in the
   database as an overlay (services/perfumeAdmin.js) and catalogStore merges
   it into the live catalogue, so an added perfume appears in /app/collection
   in the same .shelf card as the 752 static ones — no rebuild, no reload.

   Same-tick guard: `inFlight` is a synchronous Set, so two rapid clicks on a
   stock toggle issue exactly one request (the loyalty-panel incident fix).
   `alive` re-arms in the effect body: React 19 StrictMode double-mounts, and
   a cleanup-only effect would strand it false and pin loads on the spinner. */

const PAGE_SIZE = 10;

const blankForm = () => ({
  name: "",
  brand: "",
  family: "",
  concentration: "",
  perfumer: "",
  year: "",
  description: "",
  ingredientsText: "",
  sizes: [{ size: "Standard", price: "" }],
  available: true,
});

function formFromRecord(r) {
  return {
    name: r.name || "",
    brand: r.brand || "",
    family: r.family || "",
    concentration: r.concentration || "",
    perfumer: r.perfumer || "",
    year: r.year == null ? "" : String(r.year),
    description: r.description || "",
    ingredientsText: (r.ingredients || []).join("\n"),
    sizes:
      r.sizes && r.sizes.length
        ? r.sizes.map((s) => ({ size: s.size || "", price: s.price == null ? "" : String(s.price) }))
        : [{ size: "Standard", price: r.fromPrice == null ? "" : String(r.fromPrice) }],
    available: r.available !== false,
  };
}

function parseIngredients(text) {
  return String(text || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Client-side pre-check only. The server is the source of truth: it verifies
   PNG chunks, real alpha pixels (via sharp), dimensions and the 5 MB cap. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readMagic(file, bytes) {
  if (!file || file.size < 8) return false;
  for (let i = 0; i < 8; i += 1) if (bytes[i] !== PNG_MAGIC[i]) return false;
  return true;
}

function errorMessage(err) {
  return (err && err.message) || String(err);
}

/* The REAL .shelf card, exactly as Collection.jsx renders it — a WYSIWYG
   preview of what the storefront will show. */
function ShelfPreview({ name, brand, family, concentration, fromPrice, available, imageUrl, outLabel }) {
  return (
    <div className="perf-preview" aria-hidden="true">
      <div className="shelf">
        <div className="shelf-media">
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <span className="bottle">
              <span className="bottle-neck" />
              <span className="bottle-body">
                <span className="bottle-mark">{(name || "?").slice(0, 2).toUpperCase()}</span>
                <span className="bottle-line" />
                <span className="bottle-line short" />
              </span>
            </span>
          )}
        </div>
        <div className="shelf-body">
          <p className="shelf-brand">{brand || "—"}</p>
          <h3>{name || "—"}</h3>
          <p className="shelf-meta">
            {family || "—"}
            {concentration ? ` · ${concentration}` : ""}
          </p>
          <p className="shelf-foot">
            {fromPrice != null ? <span className="shelf-price">{money(fromPrice)}</span> : null}
            {available ? null : <span className="shelf-out">{outLabel}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Perfumes({ at }) {
  const catalogue = useCatalogue();
  const [rows, setRows] = useState(null); // admin inventory (kind/deleted flags)
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stale, setStale] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | in | out
  const [source, setSource] = useState("all"); // all | created | override | static
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]); // ids, order-preserving
  const [dialog, setDialog] = useState(null); // {kind: "create"|"edit"|"duplicate", record?}
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(new Set());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/perfumes");
      if (!alive.current) return;
      setRows(d.rows || []);
      setStale(false);
      setError("");
    } catch (e) {
      if (!alive.current) return;
      setError(errorMessage(e));
      setStale(true);
      setRows((prev) => (prev == null ? [] : prev));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load, { intervalMs: 60000 });

  /* After any mutation: pull the new overlay so the storefront updates live,
     then reload the admin inventory (kind/deleted flags). */
  const sync = useCallback(async () => {
    await catalogueChanged().catch(() => {});
    await load();
  }, [load]);

  const guard = async (key, fn, { surface = true } = {}) => {
    if (inFlight.current.has(key)) return null;
    inFlight.current.add(key);
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
      await sync();
      return null;
    } catch (e) {
      if (surface) {
        setError(errorMessage(e));
        setStale(true);
      }
      return e;
    } finally {
      inFlight.current.delete(key);
      setBusy(false);
    }
  };

  const toggleStock = (record) =>
    guard(`stock:${record.id}`, () =>
      api(`/api/admin/perfumes/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: { available: record.available ? 0 : 1 },
      }),
    );

  const remove = (record) => {
    if (!window.confirm(at("perfDeleteConfirm"))) return;
    guard(`delete:${record.id}`, () =>
      api(`/api/admin/perfumes/${encodeURIComponent(record.id)}`, { method: "DELETE" }),
    ).then(() => setDialog(null));
  };

  const restore = (row) =>
    guard(`restore:${row.id}`, () =>
      api(`/api/admin/perfumes/${encodeURIComponent(row.id)}/restore`, { method: "POST", body: {} }),
    );

  const purge = (row) => {
    if (!window.confirm(at("perfPurgeConfirm"))) return;
    guard(`purge:${row.id}`, () =>
      api(`/api/admin/perfumes/${encodeURIComponent(row.id)}?purge=1`, { method: "DELETE" }),
    );
  };

  const bulk = (available) =>
    guard("bulk", () =>
      api("/api/admin/perfumes/bulk", {
        method: "POST",
        body: { ids: selected, available },
      }),
    ).then(() => setSelected([]));

  const bulkDelete = () => {
    if (!window.confirm(at("perfDeleteConfirm"))) return;
    guard("bulk-delete", () =>
      api("/api/admin/perfumes/bulk", {
        method: "POST",
        body: { ids: selected, deleted: 1 },
      }),
    ).then(() => setSelected([]));
  };

  const rowById = useMemo(() => {
    const m = new Map();
    for (const r of rows || []) m.set(String(r.id), r);
    return m;
  }, [rows]);

  const deletedRows = useMemo(() => (rows || []).filter((r) => r.deleted), [rows]);

  const sourceOf = (record) => {
    const row = rowById.get(String(record.id));
    if (row) return row.kind; // created | override
    return "static";
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalogue
      .filter((p) => {
        if (status === "in" && !p.available) return false;
        if (status === "out" && p.available) return false;
        if (source !== "all" && sourceOf(p) !== source) return false;
        if (!needle) return true;
        return `${p.name} ${p.brand} ${p.family || ""} ${p.perfumer || ""} ${p.id}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (sort === "name-desc") return b.name.localeCompare(a.name);
        if (sort === "price-asc") return (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity);
        if (sort === "price-desc") return (b.fromPrice ?? Infinity) - (a.fromPrice ?? Infinity);
        if (sort === "updated") {
          const tb = parseDateTime(rowById.get(String(b.id))?.updatedAt)?.getTime() || 0;
          const ta = parseDateTime(rowById.get(String(a.id))?.updatedAt)?.getTime() || 0;
          return tb - ta;
        }
        return a.name.localeCompare(b.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, q, status, source, sort, rows]);

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [shown, current],
  );
  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  useEffect(() => setPage(1), [q, status, source, sort]);

  /* Selection is a promise about what a bulk action will touch. A filter
     change hides rows, so silently keeping them selected would let "select
     one, filter, press Hors stock" change a perfume the admin can no longer
     see. Pagination keeps the selection; filtering does not. */
  useEffect(() => setSelected([]), [q, status, source, sort]);

  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allOnPage = pageRows.length > 0 && pageRows.every((p) => selected.includes(String(p.id)));
  const someOnPage = pageRows.length > 0 && pageRows.some((p) => selected.includes(String(p.id)));
  /* Native checkboxes only expose the indeterminate dash through a property,
     never an attribute, so wire it from the ref after every render. */
  const allCheckboxRef = useRef(null);
  useEffect(() => {
    if (allCheckboxRef.current) allCheckboxRef.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);
  const togglePage = () => {
    setSelected((prev) => {
      const ids = pageRows.map((p) => String(p.id));
      return ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])];
    });
  };

  return (
    <div className="admin-block perfumes">
      <p className="admin-muted">{at("perfIntro")}</p>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-ok" role="status">
          {notice}
        </p>
      ) : null}
      {stale ? (
        <div className="admin-stale" role="status" data-guide="perfumes-stale">
          <span>{at("perfStale")}</span>
          <button type="button" className="admin-mini pressable" data-guide="perfumes-refresh" onClick={load}>
            {at("loyRefresh")}
          </button>
        </div>
      ) : null}

      <div className="admin-toolbar perf-toolbar">
        <button type="button" className="btn-accent pressable" data-guide="perfumes-add" onClick={() => setDialog({ kind: "create" })}>
          {at("perfAdd")}
        </button>
        <input
          type="search"
          className="field admin-search"
          data-guide="perfumes-search"
          placeholder={at("search")}
          aria-label={at("search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field" data-guide="perfumes-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={at("perfColStock")}>
          <option value="all">{at("perfStatusAll")}</option>
          <option value="in">{at("perfInStock")}</option>
          <option value="out">{at("perfOutOfStock")}</option>
        </select>
        <select className="field" data-guide="perfumes-source" value={source} onChange={(e) => setSource(e.target.value)} aria-label={at("perfColSource")}>
          <option value="all">{at("perfSourceAll")}</option>
          <option value="created">{at("perfSourceCreated")}</option>
          <option value="override">{at("perfSourceOverride")}</option>
          <option value="static">{at("perfSourceStatic")}</option>
        </select>
        <select className="field" data-guide="perfumes-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={at("perfSort")}>
          <option value="name">{at("perfSortName")}</option>
          <option value="name-desc">{at("perfSortNameDesc")}</option>
          <option value="price-asc">{at("perfSortPriceAsc")}</option>
          <option value="price-desc">{at("perfSortPriceDesc")}</option>
          <option value="updated">{at("perfSortUpdated")}</option>
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="perf-bulk" data-guide="perfumes-bulk" role="status">
          <span className="admin-muted">
            {selected.length} {at("perfSelected")}
          </span>
          <button type="button" className="admin-mini pressable" disabled={busy} data-guide="perfumes-bulk-in" onClick={() => bulk(1)}>
            {at("perfInStock")}
          </button>
          <button type="button" className="admin-mini pressable" disabled={busy} data-guide="perfumes-bulk-out" onClick={() => bulk(0)}>
            {at("perfOutOfStock")}
          </button>
          <button type="button" className="admin-mini pressable danger" disabled={busy} data-guide="perfumes-bulk-delete" onClick={bulkDelete}>
            {at("delete")}
          </button>
        </div>
      ) : null}

      {!rows ? (
        <p className="admin-muted">{at("loading")}</p>
      ) : shown.length === 0 ? (
        <p className="admin-muted">{at("empty")}</p>
      ) : (
        <div className="admin-table-wrap" data-guide="perfumes-table">
          <table className="admin-table perf-table">
            <thead>
              <tr>
                <th scope="col">
                  <input ref={allCheckboxRef} type="checkbox" checked={allOnPage} onChange={togglePage} aria-label={at("perfSelectAll")} data-guide="perfumes-select-all" />
                </th>
                <th scope="col">{at("perfColImage")}</th>
                <th scope="col">{at("perfColName")}</th>
                <th scope="col">{at("perfColSource")}</th>
                <th scope="col" className="num">{at("perfColPrice")}</th>
                <th scope="col">{at("perfColStock")}</th>
                <th scope="col">{at("perfColUpdated")}</th>
                <th scope="col" className="num">{at("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => {
                const row = rowById.get(String(p.id));
                return (
                  <tr key={p.id} data-guide="perfumes-row" className={p.available ? undefined : "perf-row-out"}>
                    <td data-label={at("perfSelect")}>
                      <input
                        type="checkbox"
                        checked={selected.includes(String(p.id))}
                        onChange={() => toggleSelect(String(p.id))}
                        aria-label={p.name}
                        data-guide="perfumes-select"
                      />
                    </td>
                    <td data-label={at("perfColImage")}>
                      <span className="perf-thumb">
                        {p.image ? (
                          <img src={p.image} alt="" loading="lazy" />
                        ) : (
                          <span className="perf-thumb-placeholder" aria-hidden="true">
                            {(p.name || "?").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </span>
                    </td>
                    <td data-label={at("perfColName")}>
                      <strong>{p.name}</strong>
                      <span className="admin-muted"> {p.brand}</span>
                    </td>
                    <td data-label={at("perfColSource")}>
                      <span className="admin-pill">{at(sourceOf(p) === "created" ? "perfSourceCreated" : sourceOf(p) === "override" ? "perfSourceOverride" : "perfSourceStatic")}</span>
                    </td>
                    <td data-label={at("perfColPrice")} className="num">{p.fromPrice != null ? money(p.fromPrice) : "—"}</td>
                    <td data-label={at("perfColStock")}>
                      <span className={`admin-pill${p.available ? " on" : " off"}`}>
                        {p.available ? at("perfInStock") : at("perfOutOfStock")}
                      </span>
                    </td>
                    <td data-label={at("perfColUpdated")} className="admin-muted">{row?.updatedAt ? fmtDateTime(row.updatedAt) : "—"}</td>
                    <td data-label={at("colActions")} className="num perf-actions">
                      <button
                        type="button"
                        className="admin-mini pressable"
                        disabled={busy}
                        data-guide="perfumes-stock"
                        onClick={() => toggleStock(p)}
                      >
                        {p.available ? at("perfOutOfStock") : at("perfInStock")}
                      </button>
                      <button
                        type="button"
                        className="admin-mini pressable"
                        data-guide="perfumes-edit"
                        onClick={() => setDialog({ kind: "edit", record: p })}
                      >
                        {at("edit")}
                      </button>
                      <button
                        type="button"
                        className="admin-mini pressable"
                        data-guide="perfumes-duplicate"
                        onClick={() => setDialog({ kind: "duplicate", record: p })}
                      >
                        {at("perfDuplicate")}
                      </button>
                      <button
                        type="button"
                        className="admin-mini pressable danger"
                        disabled={busy}
                        data-guide="perfumes-delete"
                        onClick={() => remove(p)}
                      >
                        {at("delete")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav className="admin-pager" aria-label={at("loyPage")} data-guide="perfumes-pager">
          <span className="admin-muted admin-small">
            {shown.length} {at("perfCount")}
          </span>
          <span className="admin-muted admin-small">
            {at("loyPage")} {current} {at("loyOf")} {pageCount}
          </span>
          <span className="admin-pager-btns">
            <button type="button" className="admin-mini pressable" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              {at("loyPrev")}
            </button>
            <button type="button" className="admin-mini pressable" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
              {at("loyNext")}
            </button>
          </span>
        </nav>
      ) : null}

      {deletedRows.length > 0 ? (
        <div className="perf-deleted" data-guide="perfumes-deleted">
          <h2 className="admin-subhead">{at("perfDeletedSection")}</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{at("colName")}</th>
                  <th scope="col">{at("perfColSource")}</th>
                  <th scope="col">{at("perfColUpdated")}</th>
                  <th scope="col" className="num">{at("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {deletedRows.map((r) => (
                  <tr key={r.id} data-guide="perfumes-deleted-row">
                    <td data-label={at("colName")}>
                      <strong>{r.name || r.id}</strong>
                    </td>
                    <td data-label={at("perfColSource")}>
                      <span className="admin-pill">{at(r.kind === "created" ? "perfSourceCreated" : "perfSourceOverride")}</span>
                    </td>
                    <td data-label={at("perfColUpdated")} className="admin-muted">{r.updatedAt ? fmtDateTime(r.updatedAt) : "—"}</td>
                    <td data-label={at("colActions")} className="num perf-actions">
                      <button
                        type="button"
                        className="admin-mini pressable"
                        disabled={busy}
                        data-guide="perfumes-restore"
                        onClick={() => restore(r)}
                      >
                        {at("perfRestore")}
                      </button>
                      <button
                        type="button"
                        className="admin-mini pressable danger"
                        disabled={busy}
                        data-guide="perfumes-purge"
                        onClick={() => purge(r)}
                      >
                        {at("perfPurge")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {dialog ? (
        <PerfumeDialog
          at={at}
          dialog={dialog}
          onClose={() => setDialog(null)}
          onDone={(msg) => {
            setDialog(null);
            setNotice(msg);
          }}
          guard={guard}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- dialog */

function PerfumeDialog({ at, dialog, onClose, onDone, guard }) {
  const isEdit = dialog.kind === "edit";
  const isDuplicate = dialog.kind === "duplicate";
  const record = dialog.record;

  const [form, setForm] = useState(() => {
    if (isDuplicate) {
      const base = formFromRecord(record);
      return { ...base, name: `${record.name || "Parfum"} (copy)` };
    }
    if (isEdit) return formFromRecord(record);
    return blankForm();
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  /* The dialog owns its own synchronous guard: the parent's Set is keyed for
     row actions and lives in the parent scope, not here. */
  const inFlight = useRef(new Set());

  const currentImage = isEdit || isDuplicate ? record?.image || (record?.imagePath ? apiUrl(record.imagePath) : "") : "";

  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSize = (i, k, v) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) }));
  const addSizeRow = () => setForm((f) => ({ ...f, sizes: [...f.sizes, { size: "", price: "" }] }));
  const dropSizeRow = (i) => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));

  const pickFile = async (candidate) => {
    setFileError("");
    setFormError("");
    if (!candidate) return;
    /* Check the cap before reading anything: a 200 MB video does not need to
       travel through ArrayBuffer only to be refused. The signature needs just
       the first eight bytes, not the whole file. */
    if (candidate.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError(at("perfImageTooBig"));
      return;
    }
    try {
      const head = new Uint8Array(await candidate.slice(0, 8).arrayBuffer());
      if (!readMagic(candidate, head)) {
        setFile(null);
        setFileError(at("perfImageNotPng"));
        return;
      }
      setFile(candidate);
    } catch {
      setFile(null);
      setFileError(at("perfImageNotPng"));
    }
  };

  const previewPrice = useMemo(() => {
    const nums = form.sizes.map((s) => Number(s.price)).filter((n) => Number.isFinite(n) && n > 0);
    return nums.length ? Math.min(...nums) : null;
  }, [form.sizes]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const usableSizes = form.sizes.filter((s) => String(s.size).trim() && String(s.price).trim() !== "");
    if (!usableSizes.length) {
      setFormError(at("perfSizesRequired"));
      return;
    }
    /* The server requires a PNG for a new perfume. Checking here keeps the
       refusal next to the drop zone instead of behind the modal. */
    if (!isEdit && !isDuplicate && !file) {
      setFileError(at("perfImageRequired"));
      return;
    }
    const target = isDuplicate ? `/api/admin/perfumes/${encodeURIComponent(record.id)}/duplicate` : isEdit ? `/api/admin/perfumes/${encodeURIComponent(record.id)}` : "/api/admin/perfumes";
    const key = `dialog:${dialog.kind}:${isEdit || isDuplicate ? record.id : "new"}`;
    /* `inFlight` is synchronous and must be claimed here, not only checked.
       Without the add(), a second click in the same tick still reached the
       parent guard, which returned null because the first click had already
       claimed the key; the second submit's finally then cleared `busy` and
       re-enabled Save while the real upload was still running. */
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setBusy(true);
    try {
      const err = await guard(
        key,
        async () => {
          const fd = new FormData();
          fd.append("name", form.name);
          fd.append("brand", form.brand);
          fd.append("family", form.family);
          fd.append("concentration", form.concentration);
          fd.append("perfumer", form.perfumer);
          if (form.year) fd.append("year", form.year);
          fd.append("description", form.description);
          fd.append("ingredients", JSON.stringify(parseIngredients(form.ingredientsText)));
          fd.append("sizes", JSON.stringify(usableSizes.map((s) => ({ size: s.size, price: s.price }))));
          fd.append("available", form.available ? "1" : "0");
          if (file) fd.append("image", file);
          const method = isDuplicate ? "POST" : isEdit ? "PUT" : "POST";
          // onDone closes the dialog only after the server confirms, so an
          // error keeps the form (and the chosen PNG) intact.
          await apiUpload(target, fd, { method });
          onDone(at(isDuplicate ? "perfDuplicated" : isEdit ? "saved" : "perfCreated"));
        },
        { surface: false },
      );
      if (err) setFormError(errorMessage(err));
    } finally {
      inFlight.current.delete(key);
      setBusy(false);
    }
  };

  const title = isDuplicate ? at("perfDuplicateTitle") : isEdit ? at("perfEditTitle") : at("perfAddTitle");

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost pressable" onClick={onClose}>
            {at("cancel")}
          </button>
          <button type="submit" form="perfume-form" className="btn-accent pressable" data-guide="perfume-save" disabled={busy}>
            {at("save")}
          </button>
        </>
      }
    >
      <form id="perfume-form" data-guide="perfume-form" onSubmit={submit} aria-busy={busy ? "true" : undefined}>
        {formError ? (
          <p className="admin-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="perf-form-grid">
          <div className="perf-form-fields">
            <div className="admin-form-row">
              <label className="admin-field">
                <span>{at("perfName")} *</span>
                <input className="field" data-guide="perfume-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
              </label>
              <label className="admin-field">
                <span>{at("perfBrand")} *</span>
                <input className="field" data-guide="perfume-brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} maxLength={120} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>{at("perfFamily")}</span>
                <input className="field" data-guide="perfume-family" value={form.family} onChange={(e) => set("family", e.target.value)} maxLength={120} />
              </label>
              <label className="admin-field">
                <span>{at("perfConcentration")}</span>
                <input className="field" data-guide="perfume-concentration" value={form.concentration} onChange={(e) => set("concentration", e.target.value)} maxLength={60} />
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>{at("perfPerfumer")}</span>
                <input className="field" data-guide="perfume-perfumer" value={form.perfumer} onChange={(e) => set("perfumer", e.target.value)} maxLength={120} />
              </label>
              <label className="admin-field">
                <span>{at("perfYear")}</span>
                <input className="field" data-guide="perfume-year" value={form.year} onChange={(e) => set("year", e.target.value)} inputMode="numeric" placeholder="2024" />
              </label>
            </div>
            <label className="admin-field">
              <span>{at("perfDescription")}</span>
              <textarea className="field" data-guide="perfume-description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
            </label>
            <label className="admin-field">
              <span>{at("perfIngredients")}</span>
              <textarea className="field" data-guide="perfume-ingredients" rows={3} value={form.ingredientsText} onChange={(e) => set("ingredientsText", e.target.value)} placeholder={at("perfIngredientsHint")} />
            </label>

            <fieldset className="perf-sizes">
              <legend>{at("perfSizes")}</legend>
              {form.sizes.map((s, i) => (
                <div key={i} className="perf-size-row">
                  <input className="field" data-guide="perfume-size-label" value={s.size} onChange={(e) => setSize(i, "size", e.target.value)} placeholder={at("perfSizeLabel")} aria-label={at("perfSizeLabel")} />
                  <input className="field" data-guide="perfume-size-price" value={s.price} onChange={(e) => setSize(i, "price", e.target.value)} inputMode="decimal" placeholder="0.00" aria-label={at("perfPrice")} />
                  {form.sizes.length > 1 ? (
                    <button type="button" className="admin-mini pressable danger" onClick={() => dropSizeRow(i)} aria-label={at("delete")}>×</button>
                  ) : null}
                </div>
              ))}
              <button type="button" className="admin-mini pressable" data-guide="perfume-size-add" onClick={addSizeRow}>
                {at("perfAddSize")}
              </button>
            </fieldset>

            <label className="admin-check">
              <input type="checkbox" data-guide="perfume-available" checked={form.available} onChange={(e) => set("available", e.target.checked)} />
              <span>{at("perfInStock")}</span>
            </label>
          </div>

          <div className="perf-form-side">
            <div
              className={`perf-drop${dragOver ? " over" : ""}`}
              data-guide="perfume-drop"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files && e.dataTransfer.files[0]);
              }}
            >
              <p className="admin-muted">{at("perfDrop")}</p>
              <input
                type="file"
                accept="image/png"
                data-guide="perfume-image"
                aria-label={at("perfChooseImage")}
                onChange={(e) => {
                  const candidate = e.target.files && e.target.files[0];
                  /* Reset the input so choosing the same file again after an
                     error still fires change. The File object is kept in
                     state, so the preview and the upload are unaffected. */
                  e.target.value = "";
                  pickFile(candidate);
                }}
              />
              <p className="admin-muted perf-image-hint">{at("perfImageHint")}</p>
              {fileError ? (
                <p className="admin-error" role="alert">
                  {fileError}
                </p>
              ) : null}
              {currentImage && !previewUrl ? (
                <p className="admin-muted">{at("perfCurrentImage")}</p>
              ) : null}
            </div>
            <ShelfPreview
              name={form.name}
              brand={form.brand}
              family={form.family}
              concentration={form.concentration}
              fromPrice={previewPrice}
              available={form.available}
              imageUrl={previewUrl || currentImage || ""}
              outLabel={at("perfOutOfStock")}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
