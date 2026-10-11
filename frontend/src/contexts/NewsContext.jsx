import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

/*
 * Announcements are public (the legacy news modal had no sign-in gate), so the
 * feed is fetched once for the whole shell and shared by the navbar badge and
 * the /news page. Unread is a local watermark, exactly like the legacy badge:
 * everything published after the visitor last opened the feed.
 */
const NewsContext = createContext(null);

const SEEN_KEY = "charme-news-seen";

/* SQLite timestamps are "YYYY-MM-DD HH:MM:SS" in UTC. */
function stamp(value) {
  if (!value) return 0;
  const s = String(value);
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function NewsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(readSeen);

  const refresh = useCallback(() => {
    api("/api/news", { auth: false })
      .then((d) => setItems(d && d.news ? d.news : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unread = useMemo(() => items.filter((n) => stamp(n.created_at) > seen).length, [items, seen]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* storage unavailable — the badge just comes back next visit */
    }
  }, []);

  const value = useMemo(
    () => ({ items, unread, refresh, markAllRead }),
    [items, unread, refresh, markAllRead],
  );

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}

export function useNews() {
  return useContext(NewsContext) || { items: [], unread: 0, refresh: () => {}, markAllRead: () => {} };
}
