(function() {
  const { getText, parseDurationToSeconds, warn, log, dbg } = window.ytfUtils || {};

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

  // Extract title
  const extractTitle = (root) => {
    // Primary selector: most reliable
    const primarySelector = "a#video-title";
    let titleEl = root.querySelector(primarySelector);
    let title = titleEl ? getText(titleEl) : "";

    // Handle yt-formatted-string specifically
    if (!title && titleEl && titleEl.tagName.toLowerCase() === "yt-formatted-string") {
      // Try shadow DOM for yt-formatted-string
      const shadowRoot = titleEl.shadowRoot;
      if (shadowRoot) {
        const shadowText = getText(shadowRoot.querySelector("span") || shadowRoot);
        if (shadowText) title = shadowText;
      }
      // Fallback to aria-label
      if (!title && titleEl.getAttribute("aria-label")) {
        title = titleEl.getAttribute("aria-label").trim().toLowerCase();
        dbg("extractTitle: extracted from yt-formatted-string aria-label", { title });
      }
    }

    // Fallback selectors if primary fails
    if (!title) {
      const fallbackSelectors = [
        "yt-formatted-string#video-title",
        "[id='video-title-link']",
        "h3",
        "[title]",
        "a[aria-label]",
        ".title",
        ".yt-formatted-string"
      ];
      for (const selector of fallbackSelectors) {
        titleEl = root.querySelector(selector);
        if (titleEl) {
          title = getText(titleEl);
          // Handle yt-formatted-string for fallback selectors
          if (!title && titleEl.tagName.toLowerCase() === "yt-formatted-string") {
            const shadowRoot = titleEl.shadowRoot;
            if (shadowRoot) {
              const shadowText = getText(shadowRoot.querySelector("span") || shadowRoot);
              if (shadowText) title = shadowText;
            }
            if (!title && titleEl.getAttribute("aria-label")) {
              title = titleEl.getAttribute("aria-label").trim().toLowerCase();
              dbg("extractTitle: extracted from fallback yt-formatted-string aria-label", { title, selector });
            }
          }
          if (title) {
            dbg("extractTitle: extracted from fallback", { selector, title });
            break;
          }
        }
      }
    }

    if (!title) {
      // Final fallback: check root's aria-label
      if (root.getAttribute("aria-label")) {
        title = root.getAttribute("aria-label").trim().toLowerCase();
        dbg("extractTitle: extracted from root aria-label", { title });
      }
    }

    if (!title) warn("extractTitle: empty title", { el: root.tagName });
    return title;
  };

  // Extract duration text (enhanced)
  const extractDurationText = (root) => {
    let durEl = root.querySelector(
      "ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer, #time-status, span.ytd-thumbnail-overlay-time-status-renderer, #time-status span, [aria-label*='duration'], span[aria-label], .badge-shape-wiz__text"
    );
    let text = durEl ? durEl.textContent.replace(/\s/g, " ").trim() : "";

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

  // Process a single renderer
  const processRenderer = (el) => {
    if (!el || el.dataset.ytfProcessed === "1") return;

    const title = extractTitle(el);
    const durText = extractDurationText(el);
    const seconds = parseDurationToSeconds(durText);
    const hide = window.ytfFilter.shouldHide(title, seconds);
    const reason = window.ytfFilter.getHideReason(title, seconds);

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

  // Expose DOM functions
  window.ytfDom = {
    extractTitle,
    extractDurationText,
    processRenderer,
    diagnoseDOM,
    allVideoSelectors
  };
})();