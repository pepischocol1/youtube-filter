export function applyStyle(el, mode) {
  if (mode === 'hide') {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  } else if (mode === 'gray') {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
    el.style.filter = 'grayscale(100%)';
    el.setAttribute('aria-hidden', 'true');
  }
}