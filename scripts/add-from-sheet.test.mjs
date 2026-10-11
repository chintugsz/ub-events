import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newEvents } from './add-from-sheet.mjs';

const row = (over = {}) => ({
  id: 'a1b2c3d4', name: 'Jazz night', date: '2026-10-25', time: '20:00', endDate: '', place: 'Fat Cat Jazz Club',
  category: 'Хөгжим, тайз', price: '30,000₮', link: '', image: '', organizer: 'Fat Cat', description: '', ...over,
});

test('an approved row becomes an organizer event', () => {
  const [ev] = newEvents([row()], { events: [] }, '2026-10-12');
  assert.equal(ev.id, 'org-2026-10-25-sa1b2c3d4');
  assert.equal(ev.start, '2026-10-25T20:00');
  assert.equal(ev.category, 'Music & Performance');
  assert.equal(ev.host, 'Fat Cat');
  assert.equal(ev.sourceName, 'Organizers');
  assert.match(ev.url, /^https:\/\//);
});

test('rows already published, past, broken or without an id are skipped', () => {
  const feed = { events: [{ id: 'org-2026-10-25-sa1b2c3d4' }] };
  const rows = [row(), row({ id: 'eeee1111', date: '2026-10-01' }), row({ id: 'ffff2222', place: '' }), row({ id: '' })];
  assert.deepEqual(newEvents(rows, feed, '2026-10-12'), []);
});

test('no organizer name means no host line', () => {
  const [ev] = newEvents([row({ organizer: '' })], { events: [] }, '2026-10-12');
  assert.equal(ev.host, undefined);
});
