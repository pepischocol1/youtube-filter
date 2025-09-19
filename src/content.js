// content.js (verbose)

import { defaultSettings, loadSettings } from './settings.js';
import { scanVideos, createDebouncedScan } from './scanner.js';
import { resetStyles } from './dom.js';
import { startObserver } from './observer.js';

let settings = { ...defaultSettings };

console.log('YT-FILTER ▶ Content script loaded with defaultSettings:', defaultSettings);

// Debounced scan wrapper
const debouncedScan = createDebouncedScan(() => {
  console.log('YT-FILTER ▶ debouncedScan triggered');
  resetStyles();
  scanVideos(settings);
}, 250);

// Handles a full content refresh (e.g., on major feed changes)
function handleContentChange() {
  console.log('YT-FILTER ▶ handleContentChange: resetStyles + scanVideos');
  resetStyles();
  scanVideos(settings);

  // Second pass catches late-rendered items
  setTimeout(() => {
    console.log('YT-FILTER ▶ handleContentChange: second scan pass');
    scanVideos(settings);
  }, 500);
}

// 1. Load stored settings, then kick off initial scan
loadSettings().then(stored => {
  settings = { ...defaultSettings, ...stored };
  console.log('YT-FILTER ▶ Loaded settings from storage:', settings);
  debouncedScan();
}).catch(err => {
  console.error('YT-FILTER ✖ Failed to load settings:', err);
});

// 2. React to incoming messages with updated filter settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('YT-FILTER ▶ onMessage received:', message);
  if (message.action === 'updateFilters') {
    settings = { ...settings, ...message.settings };
    console.log('YT-FILTER ▶ Merged settings:', settings);
    resetStyles();
    scanVideos(settings);
    sendResponse({ status: 'YT-FILTER ✔ Settings applied' });
  }
});

// 3. Observe YouTube’s dynamic DOM and trigger scans
startObserver(mutations => {
  console.log('YT-FILTER ▶ MutationObserver callback:', mutations);

  // Detect “major” layout nodes (home feed, sections, chips)
  const major = mutations.some(m =>
    Array.from(m.addedNodes).some(node =>
      node.nodeType === 1 && (
        node.tagName === 'YTD-RICH-GRID-RENDERER' ||
        node.tagName === 'YTD-ITEM-SECTION-RENDERER' ||
        node.id === 'contents' ||
        node.tagName === 'YTD-CHIP-CLOUD-RENDERER' ||
        node.querySelector?.('ytd-chip-cloud-renderer')
      )
    )
  );

  if (major) {
    console.log('YT-FILTER ▶ Major change detected, calling handleContentChange()');
    handleContentChange();
  } else {
    console.log('YT-FILTER ▶ Minor change, calling debouncedScan()');
    debouncedScan();
  }
});
