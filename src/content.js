// YouTube Filter (Duration & Keywords) - content script with enhanced diagnostics
// This is add-filter-options branch

(() => {
  // -------- Debug utilities --------
  const DEBUG = true; // set to false to silence logs
  const TAG = "[YouTube Filter Obama]";
  const log = (...args) => DEBUG && console.log(TAG, ...args);
  const warn = (...args) => DEBUG && console.warn(TAG, ...args);
  const dbg = (...args) => DEBUG && console.debug(TAG, ...args);

  log("Content script loaded", { url: location.href, ts: new Date().toISOString() });

  const DEFAULTS = {
    minDurationSec: 0,
    maxDurationSec: 86400,
    bannedKeywords: [],
    hideUnknownDurations: false
  };

  let settings = { ...DEFAULTS };

  // Utility: clean and normalize text
  const getText = (el) => (el ? el.textContent.trim() : "").toLowerCase();

  // Utility: parse duration string
  const parseDurationToSeconds = (rawText) => {
    if (!rawText) {
      warn("parseDurationToSeconds: empty rawText");
      return null;
    }

    const t = rawText.trim().toUpperCase();
    if (t.includes("LIVE") || t.includes("SHORTS") || t.includes("PREMIERE")) {
      warn("parseDurationToSeconds: special non-duration detected", { rawText });
      return null;
    }

    const match = t.match(/(\d{1,2}:)?(\d{1,2}:)?\d{2}|\d{1,2}:\d{2}/);
    if (!match) {
      warn("parseDurationToSeconds: no duration match", { rawText });
      return null;
    }

    const parts = match[0].split(":").map(Number);
    if (parts.some((n) => Number.isNaN(n))) {
      warn("parseDurationToSeconds: NaN in parts", { parts });
      return null;
    }

    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else if (parts.length === 1) seconds = parts[0];
    return seconds;
  };

  // Extract title
  const extractTitle = (root) => {
    const titleEl = root.querySelector(
      "#video-title, a#video-title, yt-formatted-string#video-title, [id='video-title-link'], h3, [title], a[aria-label], .title, .yt-formatted-string"
    );
    const t = getText(titleEl);
    if (!t) warn("extractTitle: empty title", { el: root.tagName });
    return t;
  };

  // Extract duration text (enhanced)
  const extractDurationText = (root) => {
    // Try standard duration selectors
    let durEl = root.querySelector(
      "ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer, #time-status, span.ytd-thumbnail-overlay-time-status-renderer, #time-status span, [aria-label*='duration'], span[aria-label], .badge-shape-wiz__text"
    );
    let text = durEl ? durEl.textContent.replace(/\s/g, " ").trim() : "";

    // Fallback: extract from aria-label on thumbnail or parent
    if (!text) {
      const els = [
        root.querySelector("a#thumbnail, [id='thumbnail'], ytd-thumbnail"),
        root.querySelector("a[aria-label]"),
        root
      ];
      for (const el of els) {
        if (el && el.getAttribute("aria-label")) {
          const aria = el.getAttribute("aria-label");
          const match = aria.match(/(\d{1,2}:)?\d{1,2}:\d{2}|LIVE|SHORTS|PREMIERE/i);
          if (match) {
            text = match[0];
            dbg("extractDurationText: extracted from aria-label", { text, el: el.tagName });
            break;
          }
        }
      }
    }

    if (!text) warn("extractDurationText: empty duration text", { el: root.tagName });
    return text;
  };

  // Decide whether to hide an element
  const shouldHide = (title, durationSeconds) => {
    if (!title) {
      warn("shouldHide: no title provided, hiding by default");
      return true;
    }

    // Keywords
    if (settings.bannedKeywords && settings.bannedKeywords.length > 0) {
      const hitKw = settings.bannedKeywords.find((kw) => {
        const k = String(kw || "").toLowerCase().trim();
        return k && title.includes(k);
      });
      if (hitKw) {
        log("shouldHide: hide due to keyword", { hitKw, title });
        return true;
      }
    }

    // Duration
    if (durationSeconds == null) {
      const hide = !!settings.hideUnknownDurations;
      log("shouldHide: unknown duration", { hide, title });
      return hide;
    }
    if (durationSeconds < settings.minDurationSec) {
      log("shouldHide: too short", {
        seconds: durationSeconds,
        min: settings.minDurationSec,
        title
      });
      return true;
    }
    if (durationSeconds > settings.maxDurationSec) {
      log("shouldHide: too long", {
        seconds: durationSeconds,
        max: settings.maxDurationSec,
        title
      });
      return true;
    }

    return false;
  };

  // Helper for hide reason
  const getHideReason = (title, seconds) => {
    if (!title) return "no_title";
    if (settings.bannedKeywords.find((kw) => title.includes(String(kw).toLowerCase().trim()))) return "keyword";
    if (seconds == null && settings.hideUnknownDurations) return "unknown_duration";
    if (seconds < settings.minDurationSec) return "too_short";
    if (seconds > settings.maxDurationSec) return "too_long";
    return "none";
  };

  // Process a single renderer
  const processRenderer = (el) => {
    if (!el || el.dataset.ytfProcessed === "1") return;

    const title = extractTitle(el);
    const durText = extractDurationText(el);
    const seconds = parseDurationToSeconds(durText);
    const hide = shouldHide(title, seconds);
    const reason = getHideReason(title, seconds);

    el.style.display = hide ? "none" : "";
    el.dataset.ytfProcessed = "1";

    log("processRenderer: processed video", {
      tag: el.tagName.toLowerCase(),
      title: title || "[no title]",
      durText: durText || "[no duration]",
      seconds,
      hide,
      reason
    });
  };

  // Video selectors
  const allVideoSelectors = [
    "ytd-rich-item-renderer",
    "ytd-rich-grid-media",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-rich-grid-video-renderer",
    "ytd-grid-media",
    "ytd-grid-renderer",
    "ytd-shelf-renderer",
    "ytd-item-section-renderer",
    "ytd-rich-section-renderer"
  ];

  // Diagnostic function
  const diagnoseDOM = () => {
    log("diagnoseDOM: starting DOM inspection");
    const selectors = allVideoSelectors.map((sel) => ({
      selector: sel,
      count: document.querySelectorAll(sel).length
    }));
    const titleElements = document.querySelectorAll(
      "#video-title, a#video-title, yt-formatted-string#video-title, [id='video-title-link'], h3, [title], a[aria-label], .title, .yt-formatted-string"
    );
    const durationElements = document.querySelectorAll(
      "ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer, #time-status, span.ytd-thumbnail-overlay-time-status-renderer, [aria-label*='duration'], span[aria-label], a#thumbnail, .badge-shape-wiz__text"
    );
    log("diagnoseDOM: selector counts", JSON.stringify(selectors, null, 2));
    log("diagnoseDOM: title elements found", titleElements.length);
    log("diagnoseDOM: duration elements found", durationElements.length);
    if (titleElements.length > 0) {
      const sampleTitle = getText(titleElements[0]);
      log("diagnoseDOM: sample title", sampleTitle || "[empty]");
      log("diagnoseDOM: sample title element", {
        tag: titleElements[0].tagName,
        id: titleElements[0].id,
        class: titleElements[0].className,
        ariaLabel: titleElements[0].getAttribute("aria-label") || "[none]"
      });
    }
    if (durationElements.length > 0) {
      const sampleDuration = durationElements[0].textContent.trim() || durationElements[0].getAttribute("aria-label") || "[no text]";
      log("diagnoseDOM: sample duration", sampleDuration);
      log("diagnoseDOM: sample duration element", {
        tag: durationElements[0].tagName,
        id: durationElements[0].id,
        class: durationElements[0].className,
        ariaLabel: durationElements[0].getAttribute("aria-label") || "[none]"
      });
    }
    return { selectors, titleCount: titleElements.length, durationCount: durationElements.length };
  };

  const scanAndFilter = () => {
    const counts = {};
    let total = 0;
    for (const sel of allVideoSelectors) {
      const n = document.querySelectorAll(sel).length;
      counts[sel] = n;
      total += n;
    }
    log("scanAndFilter: selector counts", JSON.stringify(counts, null, 2), "total:", total, "url:", location.href);
    log("scanAndFilter: current settings", JSON.stringify(settings, null, 2));

    if (total === 0) {
      warn("scanAndFilter: no video elements found");
    }
    diagnoseDOM();

    const nodes = document.querySelectorAll(allVideoSelectors.join(","));
    nodes.forEach(processRenderer);
    return nodes.length;
  };

  const reapplyFilter = () => {
    log("reapplyFilter: resetting processed flags and rescanning");
    document
      .querySelectorAll(allVideoSelectors.join(","))
      .forEach((el) => (el.dataset.ytfProcessed = "0"));
    scanAndFilter();
  };

  const debounce = (fn, delay = 50) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedScan = debounce(() => {
    log("debouncedScan: triggering scan");
    scanAndFilter();
  }, 50);

  const observer = new MutationObserver((mutations) => {
    let addedNodes = 0;
    let hasVideoNodes = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        addedNodes += m.addedNodes.length;
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && allVideoSelectors.some((sel) => node.matches(sel) || node.querySelector(sel))) {
            hasVideoNodes = true;
            break;
          }
        }
      }
    }
    if (addedNodes > 0 && hasVideoNodes) {
      log("MutationObserver: video-related DOM mutation detected", { addedNodes });
      debouncedScan();
    }
  });

  const startObserver = () => {
    if (!document.body) {
      warn("startObserver: document.body not ready yet");
      return;
    }
    observer.observe(document.body, { childList: true, subtree: true });
    log("Observer started");
  };

  const stopObserver = () => {
    observer.disconnect();
    log("Observer stopped");
  };

  const loadSettings = () =>
    new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["ytf_settings"], (res) => {
          const loaded = res && res.ytf_settings ? res.ytf_settings : {};
          settings = {
            ...DEFAULTS,
            ...loaded,
            bannedKeywords: Array.isArray(loaded.bannedKeywords)
              ? loaded.bannedKeywords.map((kw) => String(kw || "").toLowerCase().trim()).filter((kw) => kw)
              : []
          };
          log("Settings loaded", JSON.stringify(settings, null, 2));
          resolve();
        });
      } catch (e) {
        warn("loadSettings: storage access failed, using defaults", e);
        settings = { ...DEFAULTS };
        log("Settings loaded (default)", JSON.stringify(settings, null, 2));
        resolve();
      }
    });

  const watchStorage = () => {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes.ytf_settings) {
          const newVal = changes.ytf_settings.newValue || {};
          settings = {
            ...DEFAULTS,
            ...newVal,
            bannedKeywords: Array.isArray(newVal.bannedKeywords)
              ? newVal.bannedKeywords.map((kw) => String(kw || "").toLowerCase().trim()).filter((kw) => kw)
              : []
          };
          log("Settings changed", JSON.stringify(settings, null, 2));
          reapplyFilter();
        }
      });
      log("Storage watcher attached");
    } catch (e) {
      warn("watchStorage: could not attach listener", e);
    }
  };

  const initUrlWatcher = () => {
    let lastUrl = location.href;
    const checkUrl = () => {
      const current = location.href;
      if (current !== lastUrl) {
        log("URL changed (poll)", { from: lastUrl, to: current });
        lastUrl = current;
        reapplyFilter();
      }
      setTimeout(checkUrl, 500);
    };
    checkUrl();

    new MutationObserver(() => {
      const current = location.href;
      if (current !== lastUrl) {
        log("URL changed (observer)", { from: lastUrl, to: current });
        lastUrl = current;
        reapplyFilter();
      }
    }).observe(document.body, { subtree: true, childList: true });
    log("URL watcher attached");

    try {
      document.addEventListener("yt-navigate-finish", () => {
        log("yt-navigate-finish event");
        reapplyFilter();
      }, true);
    } catch {}
  };

  const initialScanWithRetries = (maxAttempts = 15, delayMs = 300) => {
    let attempts = 0;
    const tryScan = () => {
      const count = scanAndFilter();
      if (count === 0 && attempts < maxAttempts) {
        attempts += 1;
        warn(`initialScan: no nodes found (attempt ${attempts}/${maxAttempts})`);
        setTimeout(tryScan, delayMs);
      } else {
        log("initialScan: completed", { count, attempts });
      }
    };
    setTimeout(tryScan, 200);
  };

  const init = async () => {
    log("Init start");
    await loadSettings();
    watchStorage();
    startObserver();
    initUrlWatcher();
    initialScanWithRetries();
    log("Init complete");
  };

  try {
    window.ytf = {
      scan: scanAndFilter,
      reapply: reapplyFilter,
      startObserver,
      stopObserver,
      getSettings: () => ({ ...settings }),
      setSettings: (partial) => {
        settings = { ...settings, ...partial };
        log("setSettings (debug):", JSON.stringify(settings, null, 2));
        reapplyFilter();
      },
      parseDurationToSeconds,
      diagnoseDOM
    };
    log("Debug API exposed as window.ytf", Object.keys(window.ytf));
  } catch (e) {
    // ignore
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();