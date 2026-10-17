/* The running interactive tour, lifted out of the Guides page.
 *
 * A tour points at `data-guide` hooks that live on the page the journey
 * happens on. While the runner lived inside Guides.jsx it could only ever
 * spotlight a hook that happened to be on /guides, so every page-scoped tour
 * opened on "this element is not visible right now" and dead-ended - the
 * collection, account, auth, favourites, contact and basket tours were all
 * unrunnable. Here the tour is owned above the router, so starting one can
 * navigate to the page the steps are written against and wait for it to mount.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tour } from "../atelier/pages/Guides.jsx";
import { GUIDES, ROUTE } from "../atelier/lib/guidesData.js";

const Ctx = createContext(null);

/* Which tours have been run to the end. Lived in Guides' own state before,
   which meant the label reset to "Start" the moment a tour navigated away
   from /guides - the one page it is read on. */
const DONE_KEY = "charme-guides-done";

function readDone() {
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function GuideTourProvider({ children }) {
  const [active, setActive] = useState(null);
  /* A guide waiting for its route to render before the spotlight opens. */
  const [pending, setPending] = useState(null);
  const [done, setDone] = useState(readDone);
  const navigate = useNavigate();
  const location = useLocation();

  const guide = useMemo(
    () => GUIDES.find((g) => g.id === active) || null,
    [active],
  );

  const routeOf = (id) => {
  const r = ROUTE[id];
  if (!r) return { path: null, open: null };
  return typeof r === "string" ? { path: r, open: null } : { path: r.path || null, open: r.open || null };
};

/* Open the tour once we are on the page its steps target, clicking `open`
   first when the steps live behind a control. Both the page and the control
   can still be loading - the collection is a lazy chunk, so a click fired on a
   fixed delay lands on nothing and silently does nothing. Poll instead. */
  useEffect(() => {
    if (!pending) return undefined;
    const { path, open } = routeOf(pending);
    if (path && !location.pathname.startsWith(path)) return undefined;

    let tries = 0;
    let timer = 0;
    const attempt = () => {
      if (open) {
        const el = document.querySelector(open);
        if (!el) {
          if (tries < 30) {
            tries += 1;
            timer = setTimeout(attempt, 120);
            return;
          }
        } else {
          el.click();
        }
      }
      setActive(pending);
      setPending(null);
    };
    timer = setTimeout(attempt, 0);
    return () => clearTimeout(timer);
  }, [pending, location.pathname]);

  const start = useCallback(
    (id) => {
      if (!GUIDES.some((x) => x.id === id)) return;
      const { path } = routeOf(id);
      setPending(id);
      if (path && !location.pathname.startsWith(path)) navigate(path);
    },
    [navigate, location.pathname],
  );

  const stop = useCallback((id, finished = false) => {
    if (finished && id) {
      setDone((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          window.localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
        } catch {
          /* private mode: the tour still runs, it just forgets it was done */
        }
        return next;
      });
    }
    setActive(null);
  }, []);

  const value = useMemo(
    () => ({ active, guide, done, start, stop }),
    [active, guide, done, start, stop],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {guide ? <Tour guide={guide} onExit={(finished) => stop(guide.id, finished)} /> : null}
    </Ctx.Provider>
  );
}

export function useGuideTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGuideTour must be used inside GuideTourProvider");
  return ctx;
}