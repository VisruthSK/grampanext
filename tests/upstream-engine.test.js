import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/grampan-engine.js');

test('lifted Grampan patterns retain representative upstream results', () => {
  const byId = Object.fromEntries(globalThis.GrampanEngine.patterns.map((pattern) => [pattern.id, pattern]));
  assert.equal(byId['no-chain'].find('No fluff, no filler, no jargon.').length, 1);
  assert.equal(byId['ai-vocab'].find('We leverage a robust ecosystem.').length, 3);
  assert.equal(byId['negative-listing'].find('Not a bug. Not a feature. A design flaw.')[0].count, 2);
  assert.equal(byId['emoji'].find('Plain text only.').length, 0);
});

test('adapter invokes every upstream detector without modifying offsets', () => {
  const text = 'Let us unpack the robust ecosystem.';
  const matches = globalThis.GrampanEngine.findAllMatches(text);
  assert.deepEqual(matches.map(({ start, end }) => text.slice(start, end)), ['robust', 'ecosystem', 'unpack']);
});
