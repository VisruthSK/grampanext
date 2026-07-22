(() => {
  const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption';
  const IGNORED = 'script,style,noscript,nav,header,footer,aside,button,input,textarea,select,option,code,pre,[contenteditable="true"],[data-grampanext="true"]';
  function isRendered(el) { if (!(el instanceof Element) || el.closest(IGNORED)) return false; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && s.contentVisibility !== 'hidden'; }
  function score(el) { const blocks = [...el.querySelectorAll(BLOCKS)].filter(isRendered); return blocks.reduce((n, block) => n + (block.innerText || '').length, 0) + blocks.length * 160; }
  function chooseArticle() {
    for (const selector of ['article', 'main', '[role="main"]']) { const found = [...document.querySelectorAll(selector)].filter(isRendered); if (found.length) return found.sort((a, b) => score(b) - score(a))[0]; }
    const found = [...document.querySelectorAll('section,div')].filter(isRendered).filter((el) => el.querySelectorAll(BLOCKS).length >= 2).sort((a, b) => score(b) - score(a));
    return found[0] || document.body;
  }
  function articleBlocks(container) { return [...container.querySelectorAll(BLOCKS)].filter((block) => isRendered(block) && !block.closest(`${IGNORED}, mark[data-grampanext="true"]`)); }
  globalThis.GrampanArticle = { chooseArticle, articleBlocks, IGNORED };
})();
