export function getText(el) {
  return (el?.textContent || '').trim();
}

export function parseDurationToSeconds(text) {
  if (!text) return NaN;
  const t = String(text).toUpperCase();
  if (/LIVE|SHORTS|PREMIERE|PLAYLIST/.test(t)) return NaN;
  const m = t.match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
  if (!m) return NaN;
  const parts = m[0].split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
}