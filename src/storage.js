const { log, warn } = window.ytfUtils || {};
const { settings, DEFAULTS } = window.ytfFilter || {};

const loadSettings = () =>
  new Promise((resolve) => {
    try {
      chrome.storage.sync.get(["ytf_settings"], (res) => {
        const loaded = res && res.ytf_settings ? res.ytf_settings : {};
        window.ytfFilter.settings = {
          ...DEFAULTS,
          ...loaded,
          bannedKeywords: Array.isArray(loaded.bannedKeywords)
            ? loaded.bannedKeywords.map((kw) => String(kw || "").toLowerCase().trim()).filter((kw) => kw)
            : []
        };
        log("Settings loaded", JSON.stringify(window.ytfFilter.settings, null, 2));
        resolve();
      });
    } catch (e) {
      warn("loadSettings: storage access failed, using defaults", e);
      window.ytfFilter.settings = { ...DEFAULTS };
      log("Settings loaded (default)", JSON.stringify(window.ytfFilter.settings, null, 2));
      resolve();
    }
  });

const watchStorage = () => {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.ytf_settings) {
        const newVal = changes.ytf_settings.newValue || {};
        window.ytfFilter.settings = {
          ...DEFAULTS,
          ...newVal,
          bannedKeywords: Array.isArray(newVal.bannedKeywords)
            ? newVal.bannedKeywords.map((kw) => String(kw || "").toLowerCase().trim()).filter((kw) => kw)
            : []
        };
        log("Settings changed", JSON.stringify(window.ytfFilter.settings, null, 2));
        window.ytfObserver.reapplyFilter();
      }
    });
    log("Storage watcher attached");
  } catch (e) {
    warn("watchStorage: could not attach listener", e);
  }
};