(() => {
  // Overlapping or adjacent ranges become their union, never introducing a gap.
  function normalizeMatches(matches, length) {
    const merged = [];
    for (const match of matches.filter((m) => Number.isInteger(m.start) && Number.isInteger(m.end) && m.start >= 0 && m.end <= length && m.start < m.end).sort((a, b) => a.start - b.start || b.end - a.end)) {
      const previous = merged[merged.length - 1];
      if (previous && match.start <= previous.end) previous.end = Math.max(previous.end, match.end); else {
        const entry = { start: match.start, end: match.end };
        if (match.patternId) entry.patternId = match.patternId;
        merged.push(entry);
      }
    }
    return merged;
  }
  function applyRange(range, patternId) {
    const mark = document.createElement('mark');
    mark.className = 'grampanext-highlight';
    mark.dataset.grampanext = 'true';
    if (patternId) {
      mark.dataset.patternId = patternId;
      const pattern = globalThis.GrampanEngine?.patterns?.find((p) => p.id === patternId);
      if (pattern) mark.dataset.patternName = pattern.name;
    }
    try { range.surroundContents(mark); return true; } catch { return false; }
  }
  function removeHighlights() { document.querySelectorAll('mark[data-grampanext="true"]').forEach((mark) => mark.replaceWith(...mark.childNodes)); }
  globalThis.GrampanHighlights = { normalizeMatches, applyRange, removeHighlights };
})();
