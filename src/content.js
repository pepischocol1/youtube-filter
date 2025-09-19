import { defaultSettings, loadSettings } from './settings.js';
import { scanVideos, createDebouncedScan } from './scanner.js';
import { resetStyles } from './dom.js';
import { startObserver } from './observer.js';

let settings;

function handleContentChange() {
  resetStyles();
  scanVideos(settings);
  setTimeout(() => scanVideos(settings), 500);
}

const debouncedScan = createDebouncedScan(() => {
  resetStyles();
  scanVideos(settings);
});

loadSettings().then(stored => {
  settings = { ...defaultSettings, ...stored };
  debouncedScan();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateFilters') {
    console.log('Received new settings:', message.settings);
    settings = { ...settings, ...message.settings };
    resetStyles();
    scanVideos(settings);
    sendResponse({ status: 'Settings applied' });
  }
});

startObserver(mutations => {
  if (mutations.some(m => m.addedNodes.length)) {
    const major = mutations.some(m => Array.from(m.addedNodes).some(node =>
      node.nodeType === 1 && (
        node.tagName === 'YTD-RICH-GRID-RENDERER' ||
        node.tagName === 'YTD-ITEM-SECTION-RENDERER' ||
        node.id === 'contents' ||
        node.tagName === 'YTD-CHIP-CLOUD-RENDERER' ||
        node.querySelector?.('ytd-chip-cloud-renderer')
      )
    ));
    if (major) handleContentChange();
    else debouncedScan();
  }
});