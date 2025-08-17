const DEFAULTS = {
  minDurationSec: 0,
  maxDurationSec: 86400,
  bannedKeywords: [],
  hideUnknownDurations: false
};

const els = {
  min: document.getElementById("minDurationSec"),
  max: document.getElementById("maxDurationSec"),
  banned: document.getElementById("bannedKeywords"),
  hideUnknown: document.getElementById("hideUnknownDurations"),
  save: document.getElementById("save"),
  reset: document.getElementById("reset")
};

const load = () => {
  chrome.storage.sync.get(["ytf_settings"], (res) => {
    const s = { ...DEFAULTS, ...(res.ytf_settings || {}) };
    els.min.value = s.minDurationSec;
    els.max.value = s.maxDurationSec;
    els.hideUnknown.checked = !!s.hideUnknownDurations;
    els.banned.value = (s.bannedKeywords || []).join(", ");
  });
};

const save = () => {
  const min = Math.max(0, Number(els.min.value || 0));
  const maxInput = Number(els.max.value);
  const max = Number.isFinite(maxInput) && maxInput > 0 ? maxInput : DEFAULTS.maxDurationSec;
  const hideUnknown = !!els.hideUnknown.checked;
  const banned = els.banned.value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const ytf_settings = { minDurationSec: min, maxDurationSec: max, hideUnknownDurations: hideUnknown, bannedKeywords: banned };

  chrome.storage.sync.set({ ytf_settings }, () => {
    window.close();
  });
};

const reset = () => {
  chrome.storage.sync.set({ ytf_settings: { ...DEFAULTS } }, load);
};

els.save.addEventListener("click", save);
els.reset.addEventListener("click", reset);

document.addEventListener("DOMContentLoaded", load);
