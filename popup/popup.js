const DEFAULTS = {
  minDurationMinutes: 10,
  maxDurationMinutes: 120,
  titleKeywords: ['Mix', 'Trailer', 'Teaser'],
  hideUnknownDurations: true,
  hideStyle: 'hide'
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
    els.max.value = s.maxDurationMinutes || '';
    els.keywords.value = s.titleKeywords.join(', ');
    els.hideUnknown.checked = s.hideUnknownDurations;
    els.hideStyle.value = s.hideStyle;
  });
};

// Debounce function for real-time updates
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const saveSettings = () => {
  const min = Math.max(0, Number(els.min.value) || 0);
  const maxInput = Number(els.max.value);
  const max = Number.isFinite(maxInput) && maxInput > 0 ? maxInput : null;
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
    // Send update to all YouTube tabs
    chrome.runtime.sendMessage({ action: 'updateFilters', settings: ytf_settings });
  });

  return ytf_settings;
};

// Debounced version for real-time updates
const debouncedSave = debounce(() => {
  const settings = saveSettings();
  chrome.runtime.sendMessage({ action: 'updateFilters', settings });
}, 500);

const save = () => {
  saveSettings();
  window.close();
};

const reset = () => {
  chrome.storage.sync.set({ ytf_settings: { ...DEFAULTS } }, () => {
    load();
    chrome.runtime.sendMessage({ action: 'updateFilters', settings: DEFAULTS });
  });
};

// Add real-time listeners
els.min.addEventListener('input', debouncedSave);
els.max.addEventListener('input', debouncedSave);
els.keywords.addEventListener('input', debouncedSave);
els.hideUnknown.addEventListener('change', debouncedSave);
els.hideStyle.addEventListener('change', debouncedSave);

// Save and close on button click
els.save.addEventListener('click', save);
els.reset.addEventListener('click', reset);

document.addEventListener('DOMContentLoaded', load);