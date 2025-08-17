const { log, warn, debounce } = window.ytfUtils || {};
const { allVideoSelectors, processRenderer, diagnoseDOM } = window.ytfDom || {};

const scanAndFilter = () => {
  const counts = {};
  let total = 0;
  for (const sel of allVideoSelectors) {
    const n = document.querySelectorAll(sel).length;
    counts[sel] = n;
    total += n;
  }
  log("scanAndFilter: selector counts", JSON.stringify(counts, null, 2), "total:", total, "url:", location.href);
  log("scanAndFilter: current settings", JSON.stringify(window.ytfFilter.settings, null, 2));

  if (total === 0) {
    warn("scanAndFilter: no video elements found");
  }
  diagnoseDOM();

  const nodes = document.querySelectorAll(allVideoSelectors.join(","));
  nodes.forEach(processRenderer);
  return nodes.length;
};

const reapplyFilter = () => {
  log("reapplyFilter: resetting processed flags and rescanning");
  document
    .querySelectorAll(allVideoSelectors.join(","))
    .forEach((el) => (el.dataset.ytfProcessed = "0"));
  scanAndFilter();
};

const debouncedScan = debounce(() => {
  log("debouncedScan: triggering scan");
  scanAndFilter();
}, 50);

const observer = new MutationObserver((mutations) => {
  let addedNodes = 0;
  let hasVideoNodes = false;
  for (const m of mutations) {
    if (m.addedNodes && m.addedNodes.length) {
      addedNodes += m.addedNodes.length;
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && allVideoSelectors.some((sel) => node.matches(sel) || node.querySelector(sel))) {
          hasVideoNodes = true;
          break;
        }
      }
    }
  }
  if (addedNodes > 0 && hasVideoNodes) {
    log("MutationObserver: video-related DOM mutation detected", { addedNodes });
    debouncedScan();
  }
});

const startObserver = () => {
  if (!document.body) {
    warn("startObserver: document.body not ready yet");
    return;
  }
  observer.observe(document.body, { childList: true, subtree: true });
  log("Observer started");
};

const stopObserver = () => {
  observer.disconnect();
  log("Observer stopped");
};

const initUrlWatcher = () => {
  let lastUrl = location.href;
  const checkUrl = () => {
    const current = location.href;
    if (current !== lastUrl) {
      log("URL changed (poll)", { from: lastUrl, to: current });
      lastUrl = current;
      reapplyFilter();
    }
    setTimeout(checkUrl, 500);
  };
  checkUrl();

  new MutationObserver(() => {
    const current = location.href;
    if (current !== lastUrl) {
      log("URL changed (observer)", { from: lastUrl, to: current });
      lastUrl = current;
      reapplyFilter();
    }
  }).observe(document.body, { subtree: true, childList: true });
  log("URL watcher attached");

  try {
    document.addEventListener("yt-navigate-finish", () => {
      log("yt-navigate-finish event");
      reapplyFilter();
    }, true);
  } catch {}
};