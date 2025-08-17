const DEBUG = true; // set to false to silence logs
const TAG = "[YouTube Filter Hillary]";
const log = (...args) => DEBUG && console.log(TAG, ...args);
const warn = (...args) => DEBUG && console.warn(TAG, ...args);
const dbg = (...args) => DEBUG && console.debug(TAG, ...args);

// Utility: clean and normalize text
const getText = (el) => (el ? el.textContent.trim() : "").toLowerCase();

// Utility: parse duration string
const parseDurationToSeconds = (rawText) => {
  if (!rawText) {
    warn("parseDurationToSeconds: empty rawText");
    return null;
  }

  const t = rawText.trim().toUpperCase();
  if (t.includes("LIVE") || t.includes("SHORTS") || t.includes("PREMIERE")) {
    warn("parseDurationToSeconds: special non-duration detected", { rawText });
    return null;
  }

  const match = t.match(/(\d{1,2}:)?(\d{1,2}:)?\d{2}|\d{1,2}:\d{2}/);
  if (!match) {
    warn("parseDurationToSeconds: no duration match", { rawText });
    return null;
  }

  const parts = match[0].split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) {
    warn("parseDurationToSeconds: NaN in parts", { parts });
    return null;
  }

  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else if (parts.length === 1) seconds = parts[0];
  return seconds;
};

// Utility: debounce function
const debounce = (fn, delay = 50) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};