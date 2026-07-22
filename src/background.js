const api = globalThis.browser ?? globalThis.chrome;
const contentFiles = ['src/grampan-engine.js', 'src/article.js', 'src/dom-map.js', 'src/highlights.js', 'src/content.js'];
async function sendToggle(tabId) {
  try { await api.tabs.sendMessage(tabId, { type: 'grampanext-toggle' }); }
  catch {
    try {
      await api.scripting.insertCSS({ target: { tabId }, files: ['styles/highlights.css'] });
      await api.scripting.executeScript({ target: { tabId }, files: contentFiles });
      await api.tabs.sendMessage(tabId, { type: 'grampanext-toggle' });
    } catch { /* Restricted pages intentionally stay quiet. */ }
  }
}
api.commands.onCommand.addListener((command) => {
  if (command === 'toggle-grampanext') api.tabs.query({ active: true, currentWindow: true }).then(([tab]) => tab?.id != null && sendToggle(tab.id));
});
