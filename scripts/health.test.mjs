import { test } from 'node:test';
import assert from 'node:assert/strict';
import { healthProblems } from './health.mjs';

const now = new Date('2026-10-12T01:00:00Z'); // 09:00 in Ulaanbaatar
const events = (n, start = '2026-10-13') => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, start }));

test('a fresh, full list has no problems', () => {
  assert.deepEqual(healthProblems({ updatedAt: '2026-10-12T07:00:00+08:00', events: events(20) }, now), []);
});

test('a list not updated for two days is flagged', () => {
  const problems = healthProblems({ updatedAt: '2026-10-10T07:00:00+08:00', events: events(20) }, now);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /last updated 50 hours ago/);
});

test('a thin coming week is flagged, counting runs that started earlier', () => {
  const feed = {
    updatedAt: '2026-10-12T07:00:00+08:00',
    events: [...events(10), ...events(10, '2026-11-01'), { id: 'run', start: '2026-09-01', end: '2026-12-01' }],
  };
  assert.match(healthProblems(feed, now)[0], /Only 11 events/);
});
