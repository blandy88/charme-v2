import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CornerDownLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { api, authHeader } from "../../api/client.js";
import "./adminAssistant.css";

/*
 * Charme Copilot — the admin-only assistant dock.
 *
 * This is a thin view over a real agent that lives on the server
 * (services/adminAssistant): we send a message, then read a Server-Sent Events
 * stream back and render whatever happens — prose deltas, the tools the model
 * decides to run, their results, and any write it wants the administrator to
 * approve. Nothing here decides *what* to do; that is the model's job.
 *
 * Two notes on the transport:
 *  - fetch(), not EventSource: EventSource cannot POST a body or send an
 *    Authorization header, and we need both.
 *  - The stream ends (server closes) when the agent pauses for approval, so
 *    `busy` is cleared in `finally`, not on a "done" event.
 *
 * Mounted from Admin.jsx, which is already behind the isAdmin gate, so the dock
 * only ever renders for administrators.
 */

/* Server timestamps and multi-line answers are rendered as light Markdown:
   **bold**, `code`, "- " bullets and "1." numbered steps. A dependency-free
   formatter is enough here and keeps the bundle lean. */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function inline(text, keyPrefix) {
  return String(text)
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (/^`[^`]+`$/.test(part)) return <code key={key}>{part.slice(1, -1)}</code>;
      return <span key={key}>{part}</span>;
    });
}

function Rich({ text }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let list = null;
  let ordered = false;
  const flush = () => {
    if (list) blocks.push({ list, ordered });
    list = null;
    ordered = false;
  };
  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const isOrdered = Boolean(numbered);
      if (!list || isOrdered !== ordered) {
        flush();
        list = [];
        ordered = isOrdered;
      }
      list.push((bullet || numbered)[1]);
      continue;
    }
    flush();
    if (line.trim()) blocks.push({ text: line });
  }
  flush();

  return (
    <>
      {blocks.map((block, i) =>
        block.list ? (
          // eslint-disable-next-line react/no-array-index-key
          <ul key={`b${i}`} className={block.ordered ? "copilot-ol" : undefined}>
            {block.list.map((item, j) => (
              <li key={`b${i}-${j}`}>{inline(item, `b${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={`b${i}`}>{inline(block.text, `b${i}`)}</p>
        ),
      )}
    </>
  );
}

/* One tool the agent ran (or is running). Writes read differently from reads so
   the administrator can see at a glance what changed the shop. */

/* Pull the human-usable reason out of a failed tool result. Handlers return
   { ok: false, error }; a driver-level failure arrives as { error } or a raw
   message string. */
function failureReason(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result.error === "string" && result.error.trim()) return result.error;
  if (typeof result.message === "string" && result.message.trim()) return result.message;
  if (result.note && typeof result.note === "string") return result.note;
  return "";
}
function Step({ step, at }) {
  const state =
    step.status === "running"
      ? at("assistantRunning")
      : step.status === "error"
        ? at("assistantToolFailed")
        : step.status === "declined"
          ? at("assistantDeclined")
          : at("assistantDone");
  return (
    <div className={`copilot-step is-${step.status}${step.risk === "write" ? " is-write" : ""}`}>
      <span className="copilot-step-icon" aria-hidden="true">
        {step.status === "running" ? (
          <span className="copilot-spin" />
        ) : step.status === "error" ? (
          <AlertTriangle size={12} />
        ) : step.status === "declined" ? (
          <X size={12} />
        ) : (
          <Check size={12} />
        )}
      </span>
      <span className="copilot-step-name">
        {step.label || String(step.name || "").replace(/_/g, " ")}
      </span>
      <span className="copilot-step-state">{state}</span>
      {step.detail ? <span className="copilot-step-detail">{step.detail}</span> : null}
    </div>
  );
}

function Bubble({ message, at }) {
  const isUser = message.role === "user";
  return (
    <div className={`copilot-msg ${isUser ? "from-user" : "from-ai"}`}>
      {!isUser && message.steps && message.steps.length ? (
        <div className="copilot-steps">
          {message.steps.map((step, i) => (
            <Step key={step.id || `s${i}`} step={step} at={at} />
          ))}
        </div>
      ) : null}

      {message.text ? (
        <div className="copilot-bubble">
          <Rich text={message.text} />
        </div>
      ) : null}

      {!isUser && message.thinking ? (
        <div className="copilot-bubble copilot-typing" aria-label={at("assistantThinking")}>
          <span className="copilot-dot" />
          <span className="copilot-dot" />
          <span className="copilot-dot" />
        </div>
      ) : null}

      {message.notExecuted ? (
        <p className="copilot-nothing">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>
            {at("assistantNotExecuted")}
            {typeof message.notExecuted === "string" ? (
              <> <code>{message.notExecuted}</code></>
            ) : null}
          </span>
        </p>
      ) : null}

      {message.error ? <p className="copilot-error">{message.error}</p> : null}
    </div>
  );
}

/* Small SSE reader: fetch + ReadableStream, one JSON object per `data:` frame. */
async function streamEvents(url, body, onEvent) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data && data.error;
    } catch {
      /* not JSON */
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error("unauthenticated");
      err.code = res.status === 403 ? "FORBIDDEN" : "AUTH";
      throw err;
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (!res.body) throw new Error("This browser cannot read a streamed response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let payload;
      try {
        payload = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      onEvent(payload);
    }
  }
}

/*
 * The dock is portaled to <body> rather than rendered inside the admin page.
 * The admin route is wrapped by an animated page container, and a finished
 * animation that touched transform/opacity makes that wrapper a stacking
 * context — which traps a viewport-fixed panel beneath the storefront's own
 * floating buttons (the cart). Those would then swallow the panel's clicks.
 * Portaling keeps the dock in the root stacking context, where its z-index
 * means what it says.
 */
function dock(node) {
  return createPortal(node, document.body);
}

/*
 * Provider settings. Deliberately a separate view inside the same dock rather
 * than a new admin page: the assistant is what it configures, and this way it
 * is reachable from wherever the admin already is.
 *
 * Nothing here is trusted server-side: the panel previews the same JSON the
 * assistant itself is ultimately configured from, and "Test" fires one real
 * call at the provider before anything is saved.
 */
function SettingsView({ at, data, onSaved, onReset, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...data.settings }));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showKey, setShowKey] = useState(false);

  const presets = data.presets || [];
  const preset = presets.find((p) => p.id === draft.provider) || null;
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  /* Kept explicit so a typo shows up as a missing key in the i18n check. */
  const GROUP_KEY = {
    cloud: "assistantProviderCloud",
    free: "assistantProviderFree",
    local: "assistantProviderLocal",
    custom: "assistantProviderCustom",
  };
  const groups = Object.keys(GROUP_KEY);

  const choose = (id) => {
    const next = presets.find((p) => p.id === id);
    if (!next) return;
    set({
      provider: next.id,
      baseUrl: next.baseUrl || draft.baseUrl,
      model: next.models && next.models.length ? next.models[0] : draft.model,
      /* A key belongs to the provider it was issued by: keeping the previous
         provider's key would send it to a stranger on the next save. */
      apiKey: "",
    });
    setResult(null);
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    setError("");
    setOk("");
    try {
      const body = await api("/api/admin/assistant/test", {
        method: "POST",
        body: {
          provider: draft.provider,
          baseUrl: draft.baseUrl,
          model: draft.model,
          apiKey: draft.apiKey || "",
          timeoutMs: draft.timeoutMs,
        },
      });
      setResult(body.result || null);
      if (body.result && !body.result.ok) setError(body.result.error || at("assistantTestFail"));
    } catch (e) {
      setError(e.message || at("assistantTestFail"));
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const body = await api("/api/admin/assistant/settings", {
        method: "PUT",
        body: {
          provider: draft.provider,
          baseUrl: draft.baseUrl,
          model: draft.model,
          apiKey: draft.apiKey || "",
          timeoutMs: draft.timeoutMs,
          maxSteps: draft.maxSteps,
        },
      });
      onSaved(body.settings || null);
      setOk(at("assistantSaved"));
    } catch (e) {
      setError(e.message || at("assistantSettingsError"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const body = await api("/api/admin/assistant/settings/reset", { method: "POST", body: {} });
      onReset(body.settings || null);
      setOk(at("assistantUseEnvDone"));
    } catch (e) {
      setError(e.message || at("assistantSettingsError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="copilot-settings">
      <div className="copilot-settings-head">
        <button type="button" className="copilot-icon pressable" onClick={onClose} title={at("assistantSettingsBack")} aria-label={at("assistantSettingsBack")}>
          <ArrowLeft size={14} aria-hidden="true" />
        </button>
        <strong>{at("assistantSettingsTitle")}</strong>
      </div>

      <label className="copilot-field">
        <span>{at("assistantProvider")}</span>
        <select value={draft.provider} onChange={(e) => choose(e.target.value)}>
          {groups.map((group) => {
            const list = presets.filter((p) => p.group === group);
            if (!list.length) return null;
            return (
              <optgroup key={group} label={at(GROUP_KEY[group])}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <label className="copilot-field">
        <span>{at("assistantModel")}</span>
        <input
          value={draft.model}
          onChange={(e) => set({ model: e.target.value })}
          list="copilot-models"
          placeholder={at("assistantModelHint")}
        />
        <datalist id="copilot-models">
          {(preset && preset.models ? preset.models : []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <small>{at("assistantModelHint")}</small>
      </label>

      <label className="copilot-field">
        <span>{at("assistantApiKey")}</span>
        <span className="copilot-keyrow">
          <input
            type={showKey ? "text" : "password"}
            value={draft.apiKey || ""}
            onChange={(e) => set({ apiKey: e.target.value })}
            placeholder={preset && preset.keyHint ? preset.keyHint : "key"}
            autoComplete="off"
            spellCheck="false"
            disabled={preset && !preset.needsKey}
          />
          <button type="button" className="copilot-icon pressable" onClick={() => setShowKey((v) => !v)} title={at(showKey ? "assistantApiKeyHide" : "assistantApiKeyShow")} aria-label={at(showKey ? "assistantApiKeyHide" : "assistantApiKeyShow")}>
            {showKey ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          </button>
        </span>
        <small>
          {preset && !preset.needsKey
            ? at("assistantNoKeyNeeded")
            : draft.hasKey
              ? `${at("assistantApiKeySaved")} (${draft.keyFingerprint || ""})`
              : at("assistantApiKeyRequired")}
        </small>
        {preset && preset.docs ? (
          <a className="copilot-link" href={preset.docs} target="_blank" rel="noreferrer noopener">
            {at("assistantOpenKey")} <ExternalLink size={11} aria-hidden="true" />
          </a>
        ) : null}
      </label>

      <label className="copilot-field">
        <span>{at("assistantBaseUrl")}</span>
        <input value={draft.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} spellCheck="false" />
        {preset && preset.deployment ? <small>{at("assistantDeploymentHint")}</small> : null}
      </label>

      <details className="copilot-advanced">
        <summary>{at("assistantAdvanced")}</summary>
        <label className="copilot-field">
          <span>{at("assistantTimeout")}</span>
          <input
            type="number"
            min={5}
            max={600}
            value={Math.round(draft.timeoutMs / 1000)}
            onChange={(e) => set({ timeoutMs: Math.max(5, Number(e.target.value) || 60) * 1000 })}
          />
        </label>
        <label className="copilot-field">
          <span>{at("assistantMaxSteps")}</span>
          <input
            type="number"
            min={1}
            max={30}
            value={draft.maxSteps}
            onChange={(e) => set({ maxSteps: Math.min(30, Math.max(1, Number(e.target.value) || 8)) })}
          />
        </label>
      </details>

      {error ? <p className="copilot-error">{error}</p> : null}
      {ok ? <p className="copilot-ok">{ok}</p> : null}

      {result ? (
        <p className={`copilot-test ${result.ok ? "is-ok" : "is-bad"}`}>
          {result.ok ? (
            <>
              <Check size={12} aria-hidden="true" /> {at("assistantTestOk")} {result.latencyMs} ms
              {result.reply ? <em> — “{result.reply}”</em> : null}
            </>
          ) : (
            <>
              <AlertTriangle size={12} aria-hidden="true" /> {at("assistantTestFail")}
              {result.error ? <em> — {result.error}</em> : null}
            </>
          )}
        </p>
      ) : null}

      <div className="copilot-settings-actions">
        <button type="button" className="btn-accent pressable" onClick={save} disabled={busy}>
          {busy ? <span className="copilot-spin" /> : null} {at("assistantSave")}
        </button>
        <button type="button" className="btn-ghost pressable" onClick={test} disabled={testing || busy}>
          {testing ? <span className="copilot-spin" /> : null} {at("assistantTest")}
        </button>
        <button type="button" className="btn-ghost pressable" onClick={reset} disabled={busy} title={at("assistantUseEnv")}>
          {at("assistantUseEnv")}
        </button>
      </div>

      <p className="copilot-note">{at("assistantSettingsNote")}</p>
    </div>
  );
}


export default function AdminAssistant({ at, onMutated, lang }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  /* Detect scrollbar width so the dock panel never overlaps it on Windows. */
  useEffect(() => {
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll";
    outer.style.msOverflowStyle = "scrollbar";
    document.body.appendChild(outer);
    const inner = document.createElement("div");
    outer.appendChild(inner);
    const w = outer.offsetWidth - inner.offsetWidth;
    document.body.removeChild(outer);
    setScrollbarWidth(w);
  }, []);

  /* The dock has two views: the chat, and the provider settings behind it. */
  const [view, setView] = useState("chat");
  const [settingsData, setSettingsData] = useState(null);

  const conversation = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  /* Patch the trailing assistant message (the one the stream is filling in). */
  const patchLast = useCallback((patch) => {
    setMessages((prev) => {
      const next = prev.slice();
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === "assistant") {
          next[i] = patch(next[i]);
          break;
        }
      }
      return next;
    });
  }, []);

  const handle = useCallback(
    (event) => {
      switch (event.type) {
        case "conversation":
          conversation.current = event.conversationId;
          break;
        case "thinking":
          setThinking(true);
          patchLast((m) => ({ ...m, thinking: true }));
          break;
        case "text":
          setThinking(false);
          patchLast((m) => ({ ...m, thinking: false, text: (m.text || "") + event.text }));
          break;
        case "tool_start":
          setThinking(false);
          patchLast((m) => ({
            ...m,
            thinking: false,
            steps: [
              ...(m.steps || []),
              { id: event.id, name: event.name, label: event.label, args: event.args, risk: event.risk, status: "running" },
            ],
          }));
          break;
        case "tool_result":
          patchLast((m) => ({
            ...m,
            steps: (m.steps || []).map((s) =>
              s.id === event.id
                ? {
                    ...s,
                    status: event.ok ? "ok" : "error",
                    /* A step that only says "failed" tells the administrator
                       nothing. The handler's own message ("That statement
                       contains a write keyword...", a Postgres error) is the
                       only clue there is, so show it. */
                    detail: event.ok ? s.detail : failureReason(event.result) || s.detail,
                  }
                : s,
            ),
          }));
          if (event.risk === "write" && event.ok && onMutated) onMutated();
          break;
        case "action_required":
          setPending(event.action);
          break;
        case "not_executed":
          /* The model described a write in prose instead of requesting it, so
             nothing ran. Record it on the message rather than as a global
             banner: it belongs to that turn's answer. */
          patchLast((m) => ({ ...m, notExecuted: event.tool || true }));
          break;
        case "error":
          setError(event.error || at("assistantError"));
          break;
        default:
          break;
      }
    },
    [at, onMutated, patchLast],
  );

  /* Load the model/provider state the first time the dock is opened. */
  useEffect(() => {
    if (!open || status) return;
    let alive = true;
    api("/api/admin/assistant/status")
      .then((data) => alive && setStatus(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [open, status]);

  /* Settings are only fetched when the panel is opened, so an administrator who
     never touches them pays nothing for them. */
  useEffect(() => {
    if (!open || view !== "settings" || settingsData) return;
    let alive = true;
    api("/api/admin/assistant/settings")
      .then((data) => alive && setSettingsData(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [open, view, settingsData]);

  useEffect(() => {
    if (!open) return undefined;
    const target = bodyRef.current;
    if (target) target.scrollTop = target.scrollHeight;
    return undefined;
  }, [open, messages, pending, thinking]);

  useEffect(() => {
    if (!open) return undefined;
    if (inputRef.current) inputRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const run = useCallback(
    async (url, body) => {
      setBusy(true);
      setThinking(true);
      patchLast((m) => ({ ...m, thinking: true }));
      try {
        await streamEvents(url, body, handle);
      } catch (e) {
        if (e.code === "AUTH") setError(at("assistantSignedOut"));
        else if (e.code === "FORBIDDEN") setError(at("assistantForbidden"));
        else setError(e.message || at("assistantError"));
      } finally {
        setThinking(false);
        setBusy(false);
        patchLast((m) => ({ ...m, thinking: false }));
      }
    },
    [at, handle, patchLast],
  );

  const send = useCallback(
    async (event) => {
      event.preventDefault();
      const text = input.trim();
      if (!text || busy || !status || !status.configured) return;
      /* While a write is waiting for approval the server is paused on that
         tool call: a new message would be appended to a conversation whose
         next answer can only come after the pending action is decided, so the
         administrator would watch their question vanish. The pending card is
         already visible and actionable; no error text is needed here. */
      if (pending) return;
      setInput("");
      setError("");
      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        { role: "assistant", text: "", steps: [], thinking: true },
      ]);
      await run("/api/admin/assistant/chat", {
        message: text,
        conversationId: conversation.current,
        lang,
      });
    },
    [at, busy, input, lang, pending, run, status],
  );

  const decide = useCallback(
    async (decision) => {
      if (!pending || busy) return;
      const action = pending;
      setDeciding(true);
      setError("");
      try {
        await run("/api/admin/assistant/actions", {
          conversationId: conversation.current,
          actionId: action.id,
          decision,
          lang,
        });
        // Clear only the action that was actually answered. This stream is
        // also how the agent asks for its NEXT approval: after approving a
        // write it can immediately hit a second one, whose action_required
        // event has already set `pending` by the time run() resolves. An
        // unconditional setPending(null) one line later wiped it - the card
        // flashed and vanished and the second write never happened.
        setPending((p) => (p && p.id === action.id ? null : p));
        if (decision === "decline") {
          patchLast((m) => ({
            ...m,
            steps: [
              ...(m.steps || []),
              { id: `declined-${action.id}`, name: action.name, label: action.label, status: "declined", detail: action.preview },
            ],
          }));
        }
      } catch (e) {
        // Server error: keep the pending action visible so the user can retry
        setError(e.message || at("assistantError"));
      } finally {
        setDeciding(false);
      }
    },
    [busy, pending, run],
  );

  const reset = useCallback(async () => {
    const id = conversation.current;
    conversation.current = null;
    setMessages([]);
    setPending(null);
    setError("");
    setThinking(false);
    setInput("");
    if (id) {
      try {
        await api("/api/admin/assistant/reset", {
          method: "POST",
          body: { conversationId: id },
        });
      } catch {
        /* a dropped conversation is not worth surfacing */
      }
    }
  }, []);

  const configured = Boolean(status && status.configured);
  const canSend = configured && !busy && input.trim().length > 0;

  const fab = (
      <button
        type="button"
        className="copilot-fab pressable"
        onClick={() => setOpen(true)}
        aria-label={at("assistantOpen")}
        title={at("assistantOpen")}
        data-guide="admin-assistant"
      >
        <Sparkles size={19} aria-hidden="true" />
        {pending ? <span className="copilot-ping" aria-hidden="true" /> : null}
      </button>
  );

  if (!open) return dock(fab);

  return dock(
    <aside
      className="copilot card"
      role="dialog"
      aria-label={at("assistantTitle")}
      style={{ "--scrollbar-width": `${scrollbarWidth}px` }}
    >
      <header className="copilot-head">
        <span className="copilot-brand">
          <Sparkles size={15} aria-hidden="true" />
          <strong>{at("assistantTitle")}</strong>
        </span>
        <span
          className="copilot-sub"
          title={
            status
              ? `${status.providerLabel || ""} · ${status.baseUrl || ""} · ${status.model}`
              : ""
          }
        >
          {status && status.configured ? status.model || "" : at("assistantSubtitle")}
        </span>
        <span className="copilot-actions">
          <button
            type="button"
            className="copilot-icon pressable"
            onClick={() => {
              setView((v) => (v === "settings" ? "chat" : "settings"));
              setError("");
            }}
            title={at("assistantSettingsOpen")}
            aria-label={at("assistantSettingsOpen")}
            aria-pressed={view === "settings"}
          >
            <Settings size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="copilot-icon pressable"
            onClick={reset}
            title={at("assistantNewChat")}
            aria-label={at("assistantNewChat")}
            /* Starting over mid-answer would wipe the transcript a server-side
               run is still writing into; wait for the stream to finish. */
            disabled={busy}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="copilot-icon pressable"
            onClick={() => setOpen(false)}
            title={at("assistantClose")}
            aria-label={at("assistantClose")}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </span>
      </header>

      <div className="copilot-body" ref={bodyRef}>
        {!status ? <p className="copilot-muted">{at("loading")}</p> : null}

        {view === "settings" ? (
          settingsData ? (
            <SettingsView
              at={at}
              data={settingsData}
              onSaved={(saved) => {
                if (saved) {
                  setStatus((prev) => ({ ...(prev || {}), ...saved }));
                  setSettingsData((prev) => (prev ? { ...prev, settings: saved } : prev));
                }
              }}
              onReset={(saved) => {
                if (saved) {
                  setStatus((prev) => ({ ...(prev || {}), ...saved }));
                  setSettingsData((prev) => (prev ? { ...prev, settings: saved } : prev));
                }
              }}
              onClose={() => setView("chat")}
            />
          ) : (
            <p className="copilot-muted">{at("loading")}</p>
          )
        ) : (
          <>
            {status && !status.configured ? (
              <div className="copilot-setup">
                <AlertTriangle size={16} aria-hidden="true" />
                <p>
                  <strong>{at("assistantNeedsKey")}</strong>
                </p>
                <p className="copilot-muted">{at("assistantNeedsKeyBody")}</p>
              </div>
            ) : null}

            {messages.map((message, i) => (
              <Bubble key={message.id || `m${i}`} message={message} at={at} />
            ))}

            {configured && !messages.length ? (
              <div className="copilot-intro">
                <p className="copilot-muted">{at("assistantEmpty")}</p>
                {[1, 2, 3].map((n) => {
                  const suggestion = at(`assistantSug${n}`);
                  return (
                    <button
                      key={n}
                      type="button"
                      className="copilot-sug pressable"
                      onClick={() => {
                        setInput(suggestion);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                    >
                      <span>{suggestion}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {pending ? (
              <div className="copilot-action">
                <p className="copilot-action-title">
                  <Wrench size={13} aria-hidden="true" />
                  {at("assistantConfirmTitle")}
                </p>
                <p className="copilot-action-text">{pending.preview}</p>
                <details className="copilot-args">
                  <summary>{at("assistantDetails")}</summary>
                  <pre>{JSON.stringify(pending.args || {}, null, 2)}</pre>
                </details>
                <div className="copilot-action-buttons">
                  <button
                    type="button"
                    className="btn-accent pressable"
                    onClick={() => decide("approve")}
                    disabled={busy || deciding}
                  >
                    {deciding ? <span className="copilot-spin" /> : <Check size={14} aria-hidden="true" />}
                    {at("assistantApprove")}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost pressable"
                    onClick={() => decide("decline")}
                    disabled={busy || deciding}
                  >
                    {deciding ? <span className="copilot-spin" /> : <X size={14} aria-hidden="true" />}
                    {at("assistantDecline")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}

        {error ? <p className="copilot-error">{error}</p> : null}
      </div>
      {view === "settings" ? null : (
        <>
          <form className="copilot-compose" onSubmit={send}>
            <textarea
              ref={inputRef}
              className="copilot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              placeholder={at("assistantPlaceholder")}
              rows={2}
              disabled={!configured || busy}
              aria-label={at("assistantPlaceholder")}
            />
            <button
              type="submit"
              className="copilot-send btn-accent pressable"
              disabled={!canSend}
              title={at("assistantSend")}
              aria-label={at("assistantSend")}
            >
              {busy ? <span className="copilot-spin" /> : <Send size={15} aria-hidden="true" />}
            </button>
          </form>

          <footer className="copilot-foot">
            <span className="copilot-hint">
              <ShieldCheck size={11} aria-hidden="true" />
              {at("assistantApprovalAlways")}
            </span>
            <span className="copilot-hint" aria-hidden="true">
              <CornerDownLeft size={11} />
            </span>
          </footer>
        </>
      )}
    </aside>,
  );
}
