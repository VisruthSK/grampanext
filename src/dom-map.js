(() => {
  function textMap(block) {
    const parts = []; let text = '';
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, { acceptNode(node) { return node.nodeValue && !node.parentElement?.closest(globalThis.GrampanArticle.IGNORED) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    while (walker.nextNode()) { const node = walker.currentNode; const start = text.length; text += node.nodeValue; parts.push({ node, start, end: text.length }); }
    return { text, parts };
  }
  function rangeFor(map, start, end) {
    const first = map.parts.find((part) => start >= part.start && start < part.end); const last = [...map.parts].reverse().find((part) => end > part.start && end <= part.end);
    if (!first || !last) return null;
    try { const range = document.createRange(); range.setStart(first.node, start - first.start); range.setEnd(last.node, end - last.start); return range; } catch { return null; }
  }
  // Split a match at inline-element boundaries so surroundContents never sees
  // a partially selected element.
  function rangesFor(map, start, end) {
    return map.parts.flatMap((part) => {
      const segmentStart = Math.max(start, part.start);
      const segmentEnd = Math.min(end, part.end);
      return segmentStart < segmentEnd ? [rangeFor(map, segmentStart, segmentEnd)].filter(Boolean) : [];
    });
  }
  globalThis.GrampanDomMap = { textMap, rangeFor, rangesFor };
})();
