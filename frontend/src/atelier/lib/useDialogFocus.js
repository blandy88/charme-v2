/* Focus management for a dialog.
 *
 * Five dialogs across the app declare aria-modal="true", which tells assistive
 * tech that everything outside is inert. None of them did anything about the
 * keyboard to make that true, which left two real problems:
 *
 *   - Focus stayed wherever it was. Opening a dialog left focus on the button
 *     behind it, so a screen reader carried on reading the page under the
 *     dialog and Tab walked the form behind it.
 *   - Focus was never given back. Closing left it on <body>, so the next Tab
 *     started at the top of the document - losing the reader's place after
 *     every dialog.
 *
 * This moves focus into the dialog, keeps Tab and Shift+Tab inside it, and
 * restores focus to whatever opened it.
 *
 * `initialFocus` picks the first control when nothing is explicitly requested.
 * Escape is NOT handled here: several call sites already bind it, and a second
 * listener would close the dialog twice.
 */
import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogFocus(ref, { initialFocus } = {}) {
  const restoreTo = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    restoreTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );

    const target =
      (initialFocus && node.querySelector(initialFocus)) || focusables()[0] || node;
    // rAF so the element exists and its own transition has begun; focusing an
    // element mid-layout can land before it has a box.
    const raf = requestAnimationFrame(() => {
      try {
        target.focus({ preventScroll: true });
      } catch {
        /* an element that cannot take focus is not worth failing over */
      }
    });

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      const back = restoreTo.current;
      // Only restore if focus is still inside the dialog. If it was moved
      // deliberately - a field submitted, a route changed - yanking it back to
      // the opener would be worse than leaving it.
      if (back && back.isConnected && (!document.activeElement || document.body.contains(document.activeElement))) {
        try {
          back.focus({ preventScroll: true });
        } catch {
          /* the opener may have been removed */
        }
      }
    };
  }, [ref, initialFocus]);
}