export function getWatchedStatus(el) {
  let pct = null;
  const prog = el.querySelector(
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment'
  );
  if (prog) {
    const w = prog.style?.width || '';
    if (w.endsWith('%')) pct = parseFloat(w);
  }
  if (pct === null) {
    const oldProg = el.querySelector(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress'
    );
    if (oldProg) {
      const w = oldProg.style?.width || '';
      if (w.endsWith('%')) pct = parseFloat(w);
    }
  }
  if (pct === null) return { label: 'Not watched', pct: 0 };
  if (pct >= 99) return { label: 'Watched 100%', pct };
  if (pct > 0) return { label: `Watched ~${pct}%`, pct };
  return { label: 'Not watched', pct: 0 };
}