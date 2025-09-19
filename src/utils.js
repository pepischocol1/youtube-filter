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

/**
 * Convert a relative date string like "5 hours ago" into a timestamp.
 */
export function parseRelativeDate(dateString) {
  if (!dateString) return 0;
  const now = new Date();
  const [valueRaw, unitRaw] = dateString.toLowerCase().split(' ');
  const value = parseInt(valueRaw, 10);
  if (isNaN(value)) return 0;

  if (unitRaw.includes('second'))       now.setSeconds(now.getSeconds() - value);
  else if (unitRaw.includes('minute'))  now.setMinutes(now.getMinutes() - value);
  else if (unitRaw.includes('hour'))    now.setHours(now.getHours() - value);
  else if (unitRaw.includes('day'))     now.setDate(now.getDate() - value);
  else if (unitRaw.includes('week'))    now.setDate(now.getDate() - 7 * value);
  else if (unitRaw.includes('month'))   now.setMonth(now.getMonth() - value);
  else if (unitRaw.includes('year'))    now.setFullYear(now.getFullYear() - value);
  else                                   return 0;

  return now.getTime();
}
