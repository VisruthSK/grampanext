import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const files = ['src/grampan-engine.js', 'src/article.js', 'src/dom-map.js', 'src/highlights.js', 'src/content.js'];

async function install(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/article' });
  const listeners = [];
  dom.window.chrome = { runtime: { onMessage: { addListener(listener) { listeners.push(listener); } } } };
  for (const file of files) dom.window.eval(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
  assert.equal(listeners.length, 1, 'content script registers one message listener');
  return { window: dom.window, toggle: () => listeners[0]({ type: 'grampanext-toggle' }) };
}

test('first toggle scans once, second removes marks, third restores cached ranges', async () => {
  const { window, toggle } = await install('<nav>We leverage navigation.</nav><main><p>At its core, we leverage a robust ecosystem.</p></main>');
  let scans = 0;
  const original = window.GrampanEngine.findAllMatches;
  window.GrampanEngine.findAllMatches = (text) => { scans += 1; return original(text); };
  toggle();
  const first = [...window.document.querySelectorAll('mark[data-grampanext="true"]')].map((mark) => mark.textContent);
  assert.deepEqual(first, ['At its core', 'leverage', 'robust', 'ecosystem']);
  assert.equal(scans, 1);
  toggle();
  assert.equal(window.document.querySelectorAll('mark[data-grampanext="true"]').length, 0);
  toggle();
  assert.deepEqual([...window.document.querySelectorAll('mark[data-grampanext="true"]')].map((mark) => mark.textContent), first);
  assert.equal(scans, 1, 'restoration does not rerun Grampan');
});

test('a match spanning inline elements is highlighted without rebuilding page content', async () => {
  const { window, toggle } = await install('<main><p id="copy">This is <em>not just a trend</em>, but <strong>also a shift</strong>.</p><button id="button">Keep me</button></main>');
  let clicks = 0;
  window.document.querySelector('#button').addEventListener('click', () => { clicks += 1; });
  const paragraph = window.document.querySelector('#copy');
  toggle();
  assert.equal([...paragraph.querySelectorAll('mark')].map((mark) => mark.textContent).join(''), 'not just a trend, but also a');
  assert.equal(paragraph.querySelector('em').textContent, 'not just a trend');
  assert.equal(paragraph.querySelector('strong').textContent, 'also a shift');
  window.document.querySelector('#button').click();
  assert.equal(clicks, 1, 'unrelated event listeners survive highlighting');
});

test('ignored page chrome is not scanned and changed cached text safely skips restoration', async () => {
  const { window, toggle } = await install('<nav>At its core, we leverage navigation.</nav><main><p id="article">At its core, we leverage a robust ecosystem.</p><pre>At its core, we leverage code.</pre></main>');
  toggle();
  assert.equal(window.document.querySelector('nav mark'), null);
  assert.equal(window.document.querySelector('pre mark'), null);
  toggle();
  window.document.querySelector('#article').textContent = 'The article changed after scanning.';
  toggle();
  assert.equal(window.document.querySelectorAll('mark[data-grampanext="true"]').length, 0);
});
