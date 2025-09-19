import { extractUploadDate } from './dom.js';
import { parseRelativeDate } from './utils.js';

/**
 * Sort the given video elements by upload timestamp newest→oldest.
 */
export function sortVideosByDate(elements) {
  const data = elements
    .map(el => ({ el, ts: parseRelativeDate(extractUploadDate(el) || '') }))
    .filter(d => d.ts > 0)
    .sort((a, b) => b.ts - a.ts);

  data.forEach((d, i) => {
    d.el.style.order = i;
  });
}
