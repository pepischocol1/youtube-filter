// YouTube Filter (Duration & Keywords) - content script with enhanced diagnostics
(() => {
  // Default settings (fallback if storage is empty)
  let settings = {
    minDurationMinutes: 10,
    maxDurationMinutes: 120,
    titleKeywords: ['Mix', 'Trailer', 'Teaser'],
    hideStyle: 'hide',
    hideUnknownDurations: true
  };

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
      el.setAttribute('aria-hidden', 'true');
    } else if (mode === 'gray') {
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'none';
      el.style.filter = 'grayscale(100%)';
      el.setAttribute('aria-hidden', 'true');
    }
  };

  const resetStyles = () => {
    const videos = document.querySelectorAll(selectors.join(','));
    videos.forEach((el) => {
      el.style.display = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
      el.style.filter = '';
      el.removeAttribute('aria-hidden');
      el.dataset.scanned = '0'; // Mark for reprocessing
    });
  };

  const scanVideos = () => {
    try {
      const videos = document.querySelectorAll(selectors.join(','));
      let count = 0;

      videos.forEach((el) => {
        if (el.dataset.scanned === '1') return;

        const title = extractTitle(el);
        const durationText = extractDuration(el);
        const seconds = parseDurationToSeconds(durationText);

        const tooShort = Number.isFinite(seconds) && seconds < settings.minDurationMinutes * 60;
        const tooLong = Number.isFinite(seconds) && settings.maxDurationMinutes !== null && seconds > settings.maxDurationMinutes * 60;
        const titleMatch = settings.titleKeywords.some((word) =>
          title.toLowerCase().includes(word.toLowerCase())
        );
        const noDuration = !Number.isFinite(seconds);

        let caught = false;
        if (tooShort || tooLong || titleMatch || (settings.hideUnknownDurations && noDuration)) {
          applyStyle(el, settings.hideStyle);
          caught = true;
        }

        console.log(
          `${caught ? (settings.hideStyle === 'gray' ? '⚠️ GRAYED' : '⛔️ HIDDEN') : '🎬'} [${count + 1}] "${title}" | ${durationText}` +
          (tooShort ? ` | ⏱ under ${settings.minDurationMinutes} min` : '') +
          (tooLong ? ` | ⏱ over ${settings.maxDurationMinutes} min` : '') +
          (titleMatch ? ` | 📝 matched keyword` : '') +
          (noDuration ? ` | ❓ no/invalid duration` : '')
        );

        el.dataset.scanned = '1';
        count++;
      });

      if (count > 0) {
        console.log(`✅ Processed ${count} new videos (min: ${settings.minDurationMinutes} min, max: ${settings.maxDurationMinutes || 'none'} min, keywords: ${settings.titleKeywords.join(', ')}, style: ${settings.hideStyle}, hideUnknown: ${settings.hideUnknownDurations})`);
      }
    } catch (e) {
      console.error('Error in scanVideos:', e);
    }
  };

  // Debounce function to prevent rapid scans
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedScan = debounce(scanVideos, 500); // 500ms debounce

  // Reset and scan after topic switch
  const handleTopicSwitch = () => {
    resetStyles();
    debouncedScan(); // Delayed to ensure DOM is updated
  };

  // Load initial settings
  chrome.storage.sync.get(['ytf_settings'], (res) => {
    settings = { ...settings, ...(res.ytf_settings || {}) };
    scanVideos(); // Initial scan
  });

  // Listen for setting updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateFilters') {
      settings = { ...settings, ...message.settings };
      resetStyles();
      scanVideos();
    }
  });

  // Observe topic bar for changes
  const topicObserver = new MutationObserver(() => {
    handleTopicSwitch();
  });

  // Observe general DOM for new video elements
  const videoObserver = new MutationObserver(() => {
    debouncedScan();
  });

  // Start observing
  const startObservers = () => {
    const topicBar = document.querySelector('ytd-chip-cloud-renderer');
    if (topicBar) {
      topicObserver.observe(topicBar, { childList: true, subtree: true });
    }
    videoObserver.observe(document.body, { childList: true, subtree: true });
  };

  // Wait for page to load
  const initialize = () => {
    if (document.querySelector('ytd-chip-cloud-renderer') || document.querySelector(selectors.join(','))) {
      startObservers();
      scanVideos();
    } else {
      setTimeout(initialize, 500); // Retry until elements are present
    }
  };

  initialize();
})();