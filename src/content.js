(() => {
  if (globalThis.__grampanextInstalled) return;
  globalThis.__grampanextInstalled = true;
  let state = 'empty'; let cached = [];
  function scan() {
    const container = globalThis.GrampanArticle.chooseArticle();
    cached = globalThis.GrampanArticle.articleBlocks(container).map((block) => { const map = globalThis.GrampanDomMap.textMap(block); return { block, text: map.text, matches: globalThis.GrampanHighlights.normalizeMatches(globalThis.GrampanEngine.findAllMatches(map.text), map.text.length) }; }).filter((entry) => entry.matches.length);
  }
  function show() {
    for (const entry of cached) {
      if (!entry.block.isConnected) continue;
      const map = globalThis.GrampanDomMap.textMap(entry.block);
      if (map.text !== entry.text) continue;
      for (const match of [...entry.matches].reverse()) {
        for (const range of globalThis.GrampanDomMap.rangesFor(map, match.start, match.end).reverse()) globalThis.GrampanHighlights.applyRange(range);
      }
    }
    state = 'visible';
  }
  function toggle() { if (state === 'empty') { scan(); show(); } else if (state === 'visible') { globalThis.GrampanHighlights.removeHighlights(); state = 'hidden'; } else show(); }
  (globalThis.browser ?? globalThis.chrome).runtime.onMessage.addListener((message) => { if (message?.type === 'grampanext-toggle') toggle(); });
})();
