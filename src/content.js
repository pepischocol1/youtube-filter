// YouTube Filter (Duration & Keywords) - content script with enhanced diagnostics
// NEW-FILTER-OPTIONS

(() => {
  // --- CONFIG ---
  const MIN_DURATION_MINUTES = 10; // hide if shorter than this
  const MAX_DURATION_MINUTES = 120; // hide if longer than this (set null to disable)
  const TITLE_KEYWORDS = ['Mix', 'Trailer', 'Teaser']; // case-insensitive

  const HIDE_STYLE = 'hide'; // 'hide' or 'gray'
  const FILTER_NO_DURATION = true; // true = filter them, false = ignore them

  const getText = (el) => (el?.textContent || '').trim();
  const selectors = [
    'ytd-video-renderer',
    'ytd-rich-item-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer'
  ];

  const extractTitle = (el) => {
    const titleEl = el.querySelector('a#video-title, yt-formatted-string#video-title, h3, [title]');
    return getText(titleEl) || '[no title]';
  };

  const extractDuration = (el) => {
    const candidates = [
      'ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-thumbnail-overlay-time-status-renderer',
      '#time-status',
      'span.ytd-thumbnail-overlay-time-status-renderer',
      '[aria-label*="duration"]',
      'span[aria-label]',
      '.badge-shape-wiz__text'
    ];
    for (const selector of candidates) {
      const durEl = el.querySelector(selector);
      if (durEl) {
        const text = getText(durEl);
        if (text) return text;
      }
    }
    const fallbackEls = [el.querySelector('a#thumbnail'), el.querySelector('[aria-label]'), el];
    for (const el2 of fallbackEls) {
      const aria = el2?.getAttribute('aria-label');
      if (aria) {
        const match = aria.match(/(\d{1,2}:)?\d{1,2}:\d{2}|LIVE|SHORTS|PREMIERE/i);
        if (match) return match[0];
      }
    }
    return '[no duration]';
  };

  const parseDurationToSeconds = (text) => {
    if (!text) return NaN;
    const t = String(text).toUpperCase();
    if (/LIVE|SHORTS|PREMIERE|PLAYLIST/.test(t)) return NaN;
    const m = t.match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
    if (!m) return NaN;
    const parts = m[0].split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return NaN;
  };

  const applyStyle = (el, mode) => {
    if (mode === 'hide') {
      el.style.display = 'none';
    } else if (mode === 'gray') {
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'none';
      el.style.filter = 'grayscale(100%)';
    }
  };

  const scanVideos = () => {
    const videos = document.querySelectorAll(selectors.join(','));
    let count = 0;

    videos.forEach((el) => {
      if (el.dataset.scanned === '1') return;

      const title = extractTitle(el);
      const durationText = extractDuration(el);
      const seconds = parseDurationToSeconds(durationText);

      const tooShort = Number.isFinite(seconds) && seconds < MIN_DURATION_MINUTES * 60;
      const tooLong = Number.isFinite(seconds) && MAX_DURATION_MINUTES !== null && seconds > MAX_DURATION_MINUTES * 60;
      const titleMatch = TITLE_KEYWORDS.some((word) =>
        title.toLowerCase().includes(word.toLowerCase())
      );
      const noDuration = !Number.isFinite(seconds);

      let caught = false;
      if (tooShort || tooLong || titleMatch || (FILTER_NO_DURATION && noDuration)) {
        applyStyle(el, HIDE_STYLE);
        caught = true;
      }

      console.log(
        `${caught ? (HIDE_STYLE === 'gray' ? '⚠️ GRAYED' : '⛔️ HIDDEN') : '🎬'} [${count + 1}] "${title}" | ${durationText}` +
        (tooShort ? ` | ⏱ under ${MIN_DURATION_MINUTES} min` : '') +
        (tooLong ? ` | ⏱ over ${MAX_DURATION_MINUTES} min` : '') +
        (titleMatch ? ` | 📝 matched keyword` : '') +
        (noDuration ? ` | ❓ no/invalid duration` : '')
      );

      el.dataset.scanned = '1';
      count++;
    });

    if (count > 0) {
      console.log(`✅ Processed ${count} new videos (min: ${MIN_DURATION_MINUTES} min, max: ${MAX_DURATION_MINUTES} min, keywords: ${TITLE_KEYWORDS.join(', ')}, style: ${HIDE_STYLE}, filterNoDuration: ${FILTER_NO_DURATION})`);
    }
  };

  setInterval(scanVideos, 2000);
})();
