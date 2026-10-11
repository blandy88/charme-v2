import { createElement, Fragment } from "react";

function sectionInnerHtml(section) {
  const openEnd = section.rawHtml.indexOf(">") + 1;
  const closeStart = section.rawHtml.lastIndexOf("</section>");
  if (openEnd <= 0 || closeStart < openEnd) {
    throw new Error(`Malformed legacy section fixture: ${section.slug}`);
  }
  return section.rawHtml.slice(openEnd, closeStart);
}

/**
 * Lossless first-step React adapter for the hand-authored homepage product blocks.
 *
 * Each actual legacy section is a React element; there is no added wrapper node. Its descendants
 * come from the exact captured inner HTML. This retains the legacy tag/class/id/data attributes
 * while React takes ownership of the section root. Replace raw descendants with typed components
 * only after they pass the DOM and visual parity gates.
 */
export function LegacyProductSections({ sections }) {
  const children = [];
  sections.forEach((section, index) => {
    if (index > 0) children.push("\n");
    children.push(createElement("section", {
      key: section.slug,
      className: section.sectionClass.join(" "),
      id: section.slug,
      dangerouslySetInnerHTML: { __html: sectionInnerHtml(section) },
    }));
  });
  return createElement(Fragment, null, ...children);
}
