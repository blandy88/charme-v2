/* Keyboard behaviour for a role="tablist".
 *
 * A tablist is a single tab stop: Tab enters the strip and moves on; the arrow
 * keys move between the tabs within it. Without this, reaching the last tab
 * means tabbing through every earlier one, and a screen-reader user gets five
 * separate stops for what is one control.
 *
 * Also the piece the audit kept flagging: role="tab" with no aria-controls and
 * no role="tabpanel" behind it, which tells assistive tech the tab controls
 * nothing.
 */
export function tablistKeys(current, setCurrent, order, idPrefix) {
  return (e) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const at = order.indexOf(current);
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? order.length - 1
      : (at + (e.key === "ArrowRight" ? 1 : -1) + order.length) % order.length;
    const id = order[next];
    setCurrent(id);
    document.getElementById(`${idPrefix}${id}`)?.focus();
  };
}

/* Convenience wrapper matching the call signature used in the pages. */
export const paneKeys = tablistKeys;