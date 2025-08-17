const DEFAULTS = {
  minDurationMinutes: 10, // Matches content.js MIN_DURATION_MINUTES
  maxDurationMinutes: 120, // Matches content.js MAX_DURATION_MINUTES
  titleKeywords: ['Mix', 'Trailer', 'Teaser'], // Matches content.js TITLE_KEYWORDS
  hideUnknownDurations: true, // Matches content.js FILTER_NO_DURATION
  hideStyle: 'hide' // Matches content.js HIDE_STYLE
};

const els = {
  min: document.getElementById('minDurationMinutes'),
  max: document.getElementById('maxDurationMinutes'),
  keywords: document.getElementById('titleKeywords'),
  hideUnknown: document.getElementById('hideUnknownDurations'),
  hideStyle: document.getElementById('hideStyle'),
  save: document.getElementById('save'),
  reset: document.getElementById('reset')
};

const load = () => {
  chrome.storage.sync.get(['ytf_settings'], (res) => {
    const s = { ...DEFAULTS, ...(res.ytf_settings || {}) };
    els.min.value = s.minDurationMinutes;
    els.max.value = s.maxDurationMinutes || ''; // Empty for null (no max)
    els.keywords.value = s.titleKeywords.join(', ');
    els.hideUnknown.checked = s.hideUnknownDurations;
    els.hideStyle.value = s.hideStyle;
  });
};

const save = () => {
  const min = Math.max(0, Number(els.min.value) || 0);
  const maxInput = Number(els.max.value);
  const max = Number.isFinite(maxInput) && maxInput > 0 ? maxInput : null; // null for no max
  const keywords = els.keywords.value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const hideUnknown = !!els.hideUnknown.checked;
  const hideStyle = els.hideStyle.value;

  const ytf_settings = {
    minDurationMinutes: min,
    maxDurationMinutes: max,
    titleKeywords: keywords,
    hideUnknownDurations: hideUnknown,
    hideStyle: hideStyle
  };

  chrome.storage.sync.set({ ytf_settings }, () => {
    // Notify all YouTube tabs to reapply filters
    chrome.runtime.sendMessage({ action: 'updateFilters', settings: ytf_settings });
    window.close();
  });
};

const reset = () => {
  chrome.storage.sync.set({ ytf_settings: { ...DEFAULTS } }, () => {
    load(); // Refresh UI
    chrome.runtime.sendMessage({ action: 'updateFilters', settings: DEFAULTS });
  });
};

els.save.addEventListener('click', save);
els.reset.addEventListener('click', reset);

document.addEventListener('DOMContentLoaded', load);