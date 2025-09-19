export const defaultSettings = {
  minDurationMinutes: 10,
  maxDurationMinutes: 120,
  titleKeywords: ['Mix', 'Trailer', 'Teaser'],
  hideStyle: 'gray',
  hideUnknownDurations: true,
  watchedThreshold: 10
};

export function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['ytf_settings'], res => {
      resolve(res.ytf_settings || {});
    });
  });
}