import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('toggle code scans only from the empty state and validates cached text before restoration', async () => {
  const source = await readFile(new URL('../src/content.js', import.meta.url), 'utf8');
  assert.match(source, /if \(state === 'empty'\) \{ scan\(\); show\(\); \}/);
  assert.match(source, /if \(map\.text !== entry\.text\) continue/);
  assert.equal((source.match(/GrampanEngine\.findAllMatches/g) || []).length, 1);
});
