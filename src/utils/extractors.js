export function extractTitle(el) {
  const titleEl = el.querySelector(
    'a#video-title, yt-formatted-string#video-title, h3, [title]'
  );
  return (titleEl?.textContent || '').trim() || '[no title]';
}

export function extractDuration(el) {
  const candidates = [
    '.yt-badge-shape__text',
    'ytd-thumbnail-overlay-time-status-renderer',
    '.ytd-thumbnail-overlay-time-status-renderer',
    '#time-status',
    'span.ytd-thumbnail-overlay-time-status-renderer',
    '[aria-label*="duration"]',
    'span[aria-label]',
    '.badge-shape-wiz__text'
  ];
  for (const sel of candidates) {
    const durEl = el.querySelector(sel);
    if (durEl) {
      const txt = (durEl.textContent || '').trim();
      if (txt) return txt;
    }
  }
  const fallbacks = [
    el.querySelector('a#thumbnail'),
    el.querySelector('[aria-label]'),
    el
  ];
  for (const node of fallbacks) {
    const aria = node?.getAttribute('aria-label');
    if (aria) {
      const m = aria.match(/(\d{1,2}:)?\d{1,2}:\d{2}|LIVE|SHORTS|PREMIERE/i);
      if (m) return m[0];
    }
  }
  return '[no duration]';
}