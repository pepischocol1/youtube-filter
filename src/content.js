import { defaultSettings, loadSettings } from './settings.js';
import { filterVideos } from './filterer.js';
import { sortVideosByDate } from './sorter.js';
import { createDebouncedScan } from './scanner.js';
import { startObserver } from './observer.js';

let settings = { ...defaultSettings };

/**
 * Run filtering then optional sorting on the page.
 */
function processPage() {
  const visible = filterVideos(settings);
  if (settings.sortByDate) {
    sortVideosByDate(visible);
  }
}

const debouncedProcess = createDebouncedScan(processPage, 250);

/**
 * On a major feed change, reset scan flags and run twice.
 */
function handleMajorChange() {
  document.querySelectorAll('[data-scanned]').forEach(el => delete el.dataset.scanned);
  processPage();
  setTimeout(processPage, 500);
}

// Initial load of settings & first run
loadSettings().then(stored => {
  settings = { ...settings, ...stored };
  processPage();
});

// React to popup updates
chrome.runtime.onMessage.addListener((msg, sender, resp) => {
  if (msg.action === 'updateFilters') {
    settings = { ...settings, ...msg.settings };
    handleMajorChange();
    resp({ status: 'done' });
  }
});

// Watch for dynamic content
startObserver(muts => {
  const major = muts.some(m => Array.from(m.addedNodes).some(n =>
    n.nodeType === 1 && ['YTD-RICH-GRID-RENDERER','YTD-ITEM-SECTION-RENDERER','contents'].includes(n.tagName || n.id)
  ));
  major ? handleMajorChange() : debouncedProcess();
});
