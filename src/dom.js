import { getText } from './utils.js';

export const selectors = [
  'ytd-video-renderer',
  'ytd-rich-item-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer'
];

export function extractTitle(el) {
  const titleEl = el.querySelector('a#video-title, yt-formatted-string#video-title, h3, [title]');
  return getText(titleEl) || '[no title]';
}

export function extractDuration(el) {
  const durationSelectors = [
    '.yt-badge-shape__text',
    'ytd-thumbnail-overlay-time-status-renderer',
    '.ytd-thumbnail-overlay-time-status-renderer',
    '#time-status',
    'span.ytd-thumbnail-overlay-time-status-renderer',
    '[aria-label*=\"duration\"]',
    'span[aria-label]',
    '.badge-shape-wiz__text'
  ];
  for (const sel of durationSelectors) {
    const durEl = el.querySelector(sel);
    if (durEl) {
      const text = getText(durEl);
      if (text) return text;
    }
  }
  const fallback = [el.querySelector('a#thumbnail'), el.querySelector('[aria-label]'), el];
  for (const el2 of fallback) {
    const aria = el2?.getAttribute('aria-label');
    if (aria) {
      const match = aria.match(/(\d{1,2}:)?\d{1,2}:\d{2}|LIVE|SHORTS|PREMIERE/i);
      if (match) return match[0];
    }
  }
  return '[no duration]';
}

export function getWatchedStatus(el) {
  let pct = null;
  const progress = el.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment');
  if (progress) {
    const w = progress.style?.width || '';
    if (w.endsWith('%')) pct = parseFloat(w);
  }
  if (pct === null) {
    const oldProg = el.querySelector('ytd-thumbnail-overlay-resume-playback-renderer #progress');
    if (oldProg) {
      const w = oldProg.style?.width || '';
      if (w.endsWith('%')) pct = parseFloat(w);
    }
  }
  if (pct === null) return { label: 'Not watched', pct: 0 };
  if (pct >= 99) return { label: 'Watched 100%', pct };
  if (pct > 0) return { label: `Watched ~${pct}%`, pct };
  return { label: 'Not watched', pct: 0 };
}

export function applyStyle(el, mode) {
  if (mode === 'hide') {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  } else if (mode === 'gray') {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
    el.style.filter = 'grayscale(100%)';
    el.setAttribute('aria-hidden', 'true');
  }
}

export function resetStyles() {
  document.querySelectorAll(selectors.join(',')).forEach(el => {
    el.style.display = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    el.style.filter = '';
    el.removeAttribute('aria-hidden');
    delete el.dataset.scanned;
    el.style.order = '';
  });
}

/**
 * Extract the "X ago" upload date text from a video element.
 */
export function extractUploadDate(el) {
  let dateText = null;
  el.querySelectorAll('.yt-content-metadata-view-model__metadata-row span').forEach(span => {
    const t = span.textContent.trim();
    if (t.endsWith(' ago')) dateText = t;
  });
  return dateText;
}
