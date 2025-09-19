import { selectors, extractTitle, extractDuration, getWatchedStatus, applyStyle } from './dom.js';
import { parseDurationToSeconds } from './utils.js';

export function scanVideos(settings) {
  const { minDurationMinutes, maxDurationMinutes, titleKeywords, hideUnknownDurations, hideStyle, watchedThreshold } = settings;
  const videos = document.querySelectorAll(selectors.join(','));
  let processed = 0;

  videos.forEach(el => {
    if (el.dataset.scanned === '1') return;

    const title = extractTitle(el);
    const durationText = extractDuration(el);
    const seconds = parseDurationToSeconds(durationText);
    const watched = getWatchedStatus(el);

    const tooShort = Number.isFinite(seconds) && seconds < minDurationMinutes * 60;
    const tooLong = Number.isFinite(seconds) && maxDurationMinutes !== null && seconds > maxDurationMinutes * 60;
    const keywordMatch = titleKeywords.some(k => title.toLowerCase().includes(k.toLowerCase()));
    const noDuration = !Number.isFinite(seconds);

    const reasons = [];
    if (tooShort) reasons.push(`⏱ under ${minDurationMinutes} min`);
    if (tooLong) reasons.push(`⏱ over ${maxDurationMinutes} min`);
    if (keywordMatch) reasons.push(`📝 matched keyword`);
    if (hideUnknownDurations && noDuration) reasons.push(`❓ no/invalid duration`);

    const filterHit = reasons.length > 0;
    const watchedHit = watched.pct >= watchedThreshold;

    let logPrefix = '🎬';
    if (filterHit) {
      applyStyle(el, hideStyle);
      logPrefix = hideStyle === 'gray' ? '⚠️ GRAYED DEVIL' : '⛔️ HIDDEN DEVIL';
    } else if (watchedHit) {
      applyStyle(el, 'gray');
      logPrefix = '⚠️ GRAYED WATCHED';
    }

    const watchedLabel = watched.label;
    const message = `${logPrefix} [${processed + 1}] '${title}' | ${durationText}` +
      (reasons.length ? ` | ${reasons.join(' | ')}` : '') +
      ` | 👀 ${watchedLabel}`;
    console.log(message);

    el.dataset.scanned = '1';
    processed++;
  });

  console.log(`✅ Processed ${processed} new videos`);
}

export function createDebouncedScan(fn, wait = 250) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
}