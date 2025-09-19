export function startObserver(callback) {
  const observer = new MutationObserver(callback);
  const grid = document.querySelector('ytd-rich-grid-renderer');
  if (grid) {
    observer.observe(grid, { childList: true, subtree: true });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}