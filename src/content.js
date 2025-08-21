// YouTube Filter (Duration, Keywords & Watched) - content script with enhanced diagnostics
(() => {
  // Default settings (fallback if storage is empty)
  let settings = {
    minDurationMinutes: 10,
    maxDurationMinutes: 120,
    titleKeywords: ['Mix', 'Trailer', 'Teaser'],
    hideStyle: 'hide',
    hideUnknownDurations: true,
    watchedThreshold: 5
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

  const getWatchedStatus = (el) => {
    let pct = null;

    // New structure: progress bar segment with inline width
    const prog = el.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment');
    if (prog) {
      const w = prog.style?.width || '';
      if (w.endsWith('%')) pct = parseFloat(w);
    }

    // Fallback to old #progress element if present
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
        const watchedInfo = getWatchedStatus(el);

        const tooShort = Number.isFinite(seconds) && seconds < settings.minDurationMinutes * 60;
        const tooLong = Number.isFinite(seconds) && settings.maxDurationMinutes !== null && seconds > settings.maxDurationMinutes * 60;
        const titleMatch = settings.titleKeywords.some((word) =>
          title.toLowerCase().includes(word.toLowerCase())
        );
        const noDuration = !Number.isFinite(seconds);

        const filterReasons = [];
        if (tooShort) filterReasons.push(`⏱ under ${settings.minDurationMinutes} min`);
        if (tooLong) filterReasons.push(`⏱ over ${settings.maxDurationMinutes} min`);
        if (titleMatch) filterReasons.push(`📝 matched keyword`);
        if (settings.hideUnknownDurations && noDuration) filterReasons.push(`❓ no/invalid duration`);

        const hasFilterCatch = filterReasons.length > 0;
        const hasWatchedCatch = watchedInfo.pct >= settings.watchedThreshold;

        let logPrefix = '🎬';
        let appliedStyle = null;

        if (hasFilterCatch) {
          applyStyle(el, settings.hideStyle);
          appliedStyle = settings.hideStyle;
          logPrefix = settings.hideStyle === 'gray' ? '⚠️ GRAYED DEVIL' : '⛔️ HIDDEN DEVIL';
        } else if (hasWatchedCatch) {
          applyStyle(el, 'gray'); // Always gray for watched
          appliedStyle = 'gray';
          logPrefix = '⚠️ GRAYED WATCHED';
        }

        let logMessage = `${logPrefix} [${count + 1}] "${title}" | ${durationText}`;
        if (filterReasons.length > 0) {
          logMessage += ` | ${filterReasons.join(' | ')}`;
        }
        if (hasWatchedCatch) {
          logMessage += ` | 👀 ${watchedInfo.label}`;
        } else {
          logMessage += ` | 👀 ${watchedInfo.label}`;
        }

        console.log(logMessage);

        el.dataset.scanned = '1';
        count++;
      });

      if (count > 0) {
        console.log(`✅ Processed ${count} new videos (min: ${settings.minDurationMinutes} min, max: ${settings.maxDurationMinutes || 'none'} min, keywords: ${settings.titleKeywords.join(', ')}, watched threshold: ${settings.watchedThreshold}%, style: ${settings.hideStyle}, hideUnknown: ${settings.hideUnknownDurations})`);
      } else if (videos.length > 0) {
        console.log(`🔄 No new videos to process, but ${videos.length} videos exist on page.`);
      }
    } catch (e) {
      console.error('Error in scanVideos:', e);
    }
  };

  // Debounce function with reset
  let scanTimeout = null;
  const debouncedScan = () => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      resetStyles();
      scanVideos();
    }, 250);
  };

  // Handle topic switch or major content change
  const handleContentChange = () => {
    resetStyles();
    scanVideos();
    setTimeout(scanVideos, 500);
  };

  // Load initial settings
  chrome.storage.sync.get(['ytf_settings'], (res) => {
    settings = { ...settings, ...(res.ytf_settings || {}) };
    debouncedScan();
  });

  // Listen for setting updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateFilters') {
      console.log('Received new settings:', message.settings);
      settings = { ...settings, ...message.settings };
      resetStyles();
      scanVideos(); // Immediate scan for new settings
      sendResponse({ status: 'Settings applied' });
    }
  });

  // Observe topic bar and video grid
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const isMajorChange = Array.from(mutation.addedNodes).some(node => {
          return node.nodeType === 1 && (
            node.tagName === 'YTD-RICH-GRID-RENDERER' ||
            node.tagName === 'YTD-ITEM-SECTION-RENDERER' ||
            node.id === 'contents' ||
            node.tagName === 'YTD-CHIP-CLOUD-RENDERER' ||
            node.querySelector?.('ytd-chip-cloud-renderer')
          );
        });
        if (isMajorChange) {
          handleContentChange();
          return;
        }
      }
    }
    debouncedScan();
  });

  // Start observing
  const startObserver = () => {
    const gridContainer = document.querySelector('ytd-rich-grid-renderer');
    if (gridContainer) {
      observer.observe(gridContainer, { childList: true, subtree: true });
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  // Wait for page to load
  const initialize = () => {
    if (document.querySelector('ytd-rich-grid-renderer, ytd-chip-cloud-renderer') || document.querySelector(selectors.join(','))) {
      startObserver();
      debouncedScan();
    } else {
      setTimeout(initialize, 500);
    }
  };

  initialize();
})();