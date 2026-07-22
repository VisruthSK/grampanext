import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('popup uses an in-page colour picker and saves hue changes', async () => {
  const html = await readFile(new URL('../src/popup/popup.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type="color"/);

  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const saved = [];
  dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  });
  dom.window.browser = {
    storage: {
      local: {
        get: async () => ({ highlightColor: '#fcd34d' }),
        set: async (value) => { saved.push(value); },
      },
    },
    commands: { getAll: async () => [] },
    tabs: { create: async () => {} },
  };
  dom.window.eval(await readFile(new URL('../src/popup/popup.js', import.meta.url), 'utf8'));
  await new Promise((resolve) => setImmediate(resolve));

  const hue = dom.window.document.querySelector('#hue');
  hue.value = '0';
  hue.dispatchEvent(new dom.window.Event('input'));
  hue.dispatchEvent(new dom.window.Event('change'));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(saved.at(-1).highlightColor, '#fc4f4f');
  assert.equal(dom.window.document.querySelector('#colour-preview').style.backgroundColor, 'rgb(252, 79, 79)');
});
