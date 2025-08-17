(() => {
  const { log } = window.ytfUtils || {};

  log("Content script loaded", { url: location.href, ts: new Date().toISOString() });

  // Expose utilities globally
  window.ytfUtils = { log, warn, dbg, getText, parseDurationToSeconds, debounce };
  window.ytfDom = { extractTitle, extractDurationText, processRenderer, diagnoseDOM, allVideoSelectors };
  window.ytfFilter = { shouldHide, getHideReason, settings: window.ytfFilter?.settings || {}, DEFAULTS };
  window.ytfObserver = { scanAndFilter, reapplyFilter, startObserver, stopObserver, initUrlWatcher };
  window.ytfStorage = { loadSettings, watchStorage };

  const initialScanWithRetries = (maxAttempts = 15, delayMs = 300) => {
    let attempts = 0;
    const tryScan = () => {
      const count = window.ytfObserver.scanAndFilter();
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
    await window.ytfStorage.loadSettings();
    window.ytfStorage.watchStorage();
    window.ytfObserver.startObserver();
    window.ytfObserver.initUrlWatcher();
    initialScanWithRetries();
    log("Init complete");
  };

  try {
    window.ytf = {
      scan: window.ytfObserver.scanAndFilter,
      reapply: window.ytfObserver.reapplyFilter,
      startObserver: window.ytfObserver.startObserver,
      stopObserver: window.ytfObserver.stopObserver,
      getSettings: () => ({ ...window.ytfFilter.settings }),
      setSettings: (partial) => {
        window.ytfFilter.settings = { ...window.ytfFilter.settings, ...partial };
        log("setSettings (debug):", JSON.stringify(window.ytfFilter.settings, null, 2));
        window.ytfObserver.reapplyFilter();
      },
      parseDurationToSeconds: window.ytfUtils.parseDurationToSeconds,
      diagnoseDOM: window.ytfDom.diagnoseDOM
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