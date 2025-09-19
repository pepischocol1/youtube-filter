import { extractUploadDate } from './dom.js';
import { parseRelativeDate } from './utils.js';

/**
 * Sort the given video elements by upload timestamp newest→oldest.
 * If timestamps are equal, fall back to DOM order index for stability.
 */
export function sortVideosByDate(elements) {
  const data = elements
    .map((el, idx) => ({ el, ts: parseRelativeDate(extractUploadDate(el) || ''), idx }))
    .filter(d => d.ts > 0)
    .sort((a, b) => {
      if (b.ts === a.ts) return a.idx - b.idx; // stable fallback
      return b.ts - a.ts;
    });

  data.forEach((d, i) => {
    d.el.style.order = i;
  });
}
