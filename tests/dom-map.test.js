import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/highlights.js');

test('overlapping and adjacent matches are replaced by their union', () => {
  assert.deepEqual(globalThis.GrampanHighlights.normalizeMatches([
    { start: 2, end: 6 }, { start: 4, end: 9 }, { start: 9, end: 11 }, { start: 12, end: 15 }
  ], 15), [{ start: 2, end: 11 }, { start: 12, end: 15 }]);
});

test('invalid and duplicate ranges are discarded', () => {
  assert.deepEqual(globalThis.GrampanHighlights.normalizeMatches([
    { start: 1, end: 4 }, { start: 1, end: 4 }, { start: -1, end: 2 }, { start: 5, end: 5 }, { start: 3, end: 20 }
  ], 10), [{ start: 1, end: 4 }]);
});
