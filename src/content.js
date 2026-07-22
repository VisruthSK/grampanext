(() => {
  if (globalThis.__grampanextInstalled) return;
  globalThis.__grampanextInstalled = true;

  const api = globalThis.browser ?? globalThis.chrome;

  const HIGHLIGHT_COLOR_KEY = "highlightColor";
  const DEFAULT_HIGHLIGHT_COLOR = "#fcd34d";
  const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

  function normaliseColour(value) {
    return HEX_COLOR_PATTERN.test(value)
      ? value.toLowerCase()
      : DEFAULT_HIGHLIGHT_COLOR;
  }

  function applyHighlightColour(value) {
    document.documentElement.style.setProperty(
      "--grampanext-highlight-color",
      normaliseColour(value),
    );
  }

  async function loadHighlightColour() {
    const result = await api?.storage?.local?.get(HIGHLIGHT_COLOR_KEY);

    applyHighlightColour(
      result?.[HIGHLIGHT_COLOR_KEY] ?? DEFAULT_HIGHLIGHT_COLOR,
    );
  }

  let activePatterns = null;

  async function loadPatterns() {
    const result = await api?.storage?.local?.get(["disabledPatterns", "customPatterns"]) ?? {};
    const disabled = new Set(result?.disabledPatterns || []);
    const custom = (result?.customPatterns || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      find: globalThis.GrampanEngine.makeRegexFinder(new RegExp(p.regex, "gi")),
    }));
    activePatterns = globalThis.GrampanEngine.patterns
      .filter((p) => !disabled.has(p.id))
      .concat(custom);
  }

  void loadPatterns().catch(() => {});

  api?.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (Object.hasOwn(changes, HIGHLIGHT_COLOR_KEY)) {
      applyHighlightColour(
        changes[HIGHLIGHT_COLOR_KEY].newValue ??
          DEFAULT_HIGHLIGHT_COLOR,
      );
    }
    if (Object.hasOwn(changes, "disabledPatterns") || Object.hasOwn(changes, "customPatterns")) {
      void loadPatterns();
    }
  });

  void loadHighlightColour().catch((error) => {
    console.error("Could not load highlight colour.", error);
    applyHighlightColour(DEFAULT_HIGHLIGHT_COLOR);
  });

  let state = 'empty'; let cached = [];
  function scan() {
    const container = globalThis.GrampanArticle.chooseArticle();
    cached = globalThis.GrampanArticle.articleBlocks(container).map((block) => { const map = globalThis.GrampanDomMap.textMap(block); return { block, text: map.text, matches: globalThis.GrampanHighlights.normalizeMatches(globalThis.GrampanEngine.findAllMatches(map.text, activePatterns), map.text.length) }; }).filter((entry) => entry.matches.length);
  }
  function show() {
    for (const entry of cached) {
      if (!entry.block.isConnected) continue;
      const map = globalThis.GrampanDomMap.textMap(entry.block);
      if (map.text !== entry.text) continue;
      for (const match of [...entry.matches].reverse()) {
        for (const range of globalThis.GrampanDomMap.rangesFor(map, match.start, match.end).reverse()) globalThis.GrampanHighlights.applyRange(range, match.patternId);
      }
    }
    state = 'visible';
  }
  function toggle() { if (state === 'empty') { scan(); show(); } else if (state === 'visible') { globalThis.GrampanHighlights.removeHighlights(); state = 'hidden'; } else show(); }
  api?.runtime?.onMessage?.addListener((message) => { if (message?.type === 'grampanext-toggle') toggle(); });
})();
