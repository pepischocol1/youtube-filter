import { extractTitle, extractDuration } from './utils/extractors.js';
import { parseDurationToSeconds } from './utils/durationParser.js';
import { getWatchedStatus } from './utils/watchStatus.js';
import { applyStyle } from './utils/applyStyle.js';

(() => {
  let settings = {
    minDurationMinutes: 10,
    maxDurationMinutes: 120,
    titleKeywords: ['Mix', 'Trailer', 'Teaser'],
    hideStyle: 'gray',
    hideUnknownDurations: true,
    watchedThreshold: 10
  };

  const selectors = [
    'ytd-video-renderer',
    'ytd-rich-item-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer'
  ];

  const resetStyles = () => {
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      el.style.display = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
      el.style.filter = '';
      el.removeAttribute('aria-hidden');
      el.dataset.scanned = '0';
    });
  };

  const scanVideos = () => {
    try {
      const videos = document.querySelectorAll(selectors.join(','));
      let count = 0;

      videos.forEach(el => {
        if (el.dataset.scanned === '1') return;

        const title = extractTitle(el);
        const durationText = extractDuration(el);
        const seconds = parseDurationToSeconds(durationText);
        const watchedInfo = getWatchedStatus(el);

        const tooShort = Number.isFinite(seconds) && seconds < settings.minDurationMinutes * 60;
        const tooLong = Number.isFinite(seconds) && settings.maxDurationMinutes !== null && seconds > settings.maxDurationMinutes * 60;
        const titleMatch = settings.titleKeywords.some(word =>
          title.toLowerCase().includes(word.toLowerCase())
        );
        const noDuration = !Number.isFinite(seconds);

        const filterReasons = [];
        if (tooShort) filterReasons.push(`⏱ under ${settings.minDurationMinutes} min`);
        if (tooLong) filterReasons.push(`⏱ over ${settings.maxDurationMinutes} min`);
        if (titleMatch) filterReasons.push('📝 matched keyword');
        if (settings.hideUnknownDurations && noDuration) filterReasons.push('❓ no/invalid duration');

        const hasFilterCatch = filterReasons.length > 0;
        const hasWatchedCatch = watchedInfo.pct >= settings.watchedThreshold;

        let logPrefix = '🎬';

        if (hasFilterCatch) {
          applyStyle(el, settings.hideStyle);
          logPrefix = settings.hideStyle === 'gray'
            ? '⚠️ GRAYED DEVIL'
            : '⛔️ HIDDEN DEVIL';
        } else if (hasWatchedCatch) {
          applyStyle(el, 'gray');
          logPrefix = '⚠️ GRAYED WATCHED';
        }

        let logMessage = `${logPrefix} [${count + 1}] "${title}" | ${durationText}`;
        if (filterReasons.length) logMessage += ` | ${filterReasons.join(' | ')}`;
        logMessage += ` | 👀 ${watchedInfo.label}`;

        console.log(logMessage);

        el.dataset.scanned = '1';
        count++;
      });

      if (count > 0) {
        console.log(
          `✅ Processed ${count} new videos (min: ${settings.minDurationMinutes} min, ` +
          `max: ${settings.maxDurationMinutes || 'none'} min, ` +
          `keywords: ${settings.titleKeywords.join(', ')}, ` +
          `watched threshold: ${settings.watchedThreshold}%, ` +
          `style: ${settings.hideStyle}, hideUnknown: ${settings.hideUnknownDurations})`
        );
      } else if (videos.length) {
        console.log(
          `🔄 No new videos to process, but ${videos.length} videos exist on page.`
        );
      }
    } catch (e) {
      console.error('Error in scanVideos:', e);
    }
  };

  let scanTimeout = null;
  const debouncedScan = () => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      resetStyles();
      scanVideos();
    }, 250);
  };

  const handleContentChange = () => {
    resetStyles();
    scanVideos();
    setTimeout(scanVideos, 500);
  };

  chrome.storage.sync.get(['ytf_settings'], res => {
    settings = { ...settings, ...(res.ytf_settings || {}) };
    debouncedScan();
  });

  chrome.runtime.onMessage.addListener((msg, _, send) => {
    if (msg.action === 'updateFilters') {
      settings = { ...settings, ...msg.settings };
      resetStyles();
      scanVideos();
      send({ status: 'Settings applied' });
    }
  });

  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (!m.addedNodes.length) continue;
      const major = Array.from(m.addedNodes).some(node =>
        node.nodeType === 1 && (
          node.tagName === 'YTD-RICH-GRID-RENDERER' ||
          node.tagName === 'YTD-ITEM-SECTION-RENDERER' ||
          node.id === 'contents' ||
          node.tagName === 'YTD-CHIP-CLOUD-RENDERER' ||
          node.querySelector?.('ytd-chip-cloud-renderer')
        )
      );
      if (major) {
        handleContentChange();
        return;
      }
    }
    debouncedScan();
  });

  const startObserver = () => {
    const container = document.querySelector('ytd-rich-grid-renderer');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  const init = () => {
    if (
      document.querySelector('ytd-rich-grid-renderer, ytd-chip-cloud-renderer') ||
      document.querySelector(selectors.join(','))
    ) {
      startObserver();
      debouncedScan();
    } else {
      setTimeout(init, 500);
    }
  };

  init();
})();