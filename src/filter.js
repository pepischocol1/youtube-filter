const { log, warn } = window.ytfUtils || {};

const DEFAULTS = {
  minDurationSec: 0,
  maxDurationSec: 86400,
  bannedKeywords: [],
  hideUnknownDurations: false
};

let settings = { ...DEFAULTS };

// Decide whether to hide an element
const shouldHide = (title, durationSeconds) => {
  if (!title) {
    warn("shouldHide: no title provided, hiding by default");
    return true;
  }

  if (settings.bannedKeywords && settings.bannedKeywords.length > 0) {
    const hitKw = settings.bannedKeywords.find((kw) => {
      const k = String(kw || "").toLowerCase().trim();
      return k && title.includes(k);
    });
    if (hitKw) {
      log("shouldHide: hide due to keyword", { hitKw, title });
      return true;
    }
  }

  if (durationSeconds == null) {
    const hide = !!settings.hideUnknownDurations;
    log("shouldHide: unknown duration", { hide, title });
    return hide;
  }
  if (durationSeconds < settings.minDurationSec) {
    log("shouldHide: too short", {
      seconds: durationSeconds,
      min: settings.minDurationSec,
      title
    });
    return true;
  }
  if (durationSeconds > settings.maxDurationSec) {
    log("shouldHide: too long", {
      seconds: durationSeconds,
      max: settings.maxDurationSec,
      title
    });
    return true;
  }

  return false;
};

// Helper for hide reason
const getHideReason = (title, seconds) => {
  if (!title) return "no_title";
  if (settings.bannedKeywords.find((kw) => title.includes(String(kw).toLowerCase().trim()))) return "keyword";
  if (seconds == null && settings.hideUnknownDurations) return "unknown_duration";
  if (seconds < settings.minDurationSec) return "too_short";
  if (seconds > settings.maxDurationSec) return "too_long";
  return "none";
};