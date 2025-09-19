import { selectors, extractTitle, extractDuration, getWatchedStatus, applyStyle, resetStyles } from './dom.js';
import { parseDurationToSeconds } from './utils.js';

/**
 * Hide or gray out videos per filter settings.
 * @returns Array<HTMLElement> the elements that passed the filters.
 */
export function filterVideos(settings) {
  resetStyles();
  const passed = [];

  document.querySelectorAll(selectors.join(',')).forEach(el => {
    if (el.dataset.scanned === '1') return;
    const title = extractTitle(el);
    const durText = extractDuration(el);
    const seconds = parseDurationToSeconds(durText);
    const watched = getWatchedStatus(el);

    const tooShort = Number.isFinite(seconds) && seconds < settings.minDurationMinutes * 60;
    const tooLong  = Number.isFinite(seconds) && settings.maxDurationMinutes != null && seconds > settings.maxDurationMinutes * 60;
    const keywordHit = settings.titleKeywords.some(k => title.toLowerCase().includes(k.toLowerCase()));
    const noDur    = !Number.isFinite(seconds);

    const reasons = [];
    if (tooShort)   reasons.push(`⏱ under ${settings.minDurationMinutes} min`);
    if (tooLong)    reasons.push(`⏱ over ${settings.maxDurationMinutes} min`);
    if (keywordHit) reasons.push(`📝 matched keyword`);
    if (settings.hideUnknownDurations && noDur) reasons.push(`❓ no/invalid duration`);

    const filtered = reasons.length > 0;
    const watchedHit = watched.pct >= settings.watchedThreshold;

    if (filtered || watchedHit) {
      applyStyle(el, filtered ? settings.hideStyle : 'gray');
    } else {
      passed.push(el);
    }

    el.dataset.scanned = '1';
  });

  return passed;
}
