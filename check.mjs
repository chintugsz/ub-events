// Checks events.json before it is published, so a bad edit can't break the app.
//   node check.mjs          report problems, change nothing
//   node check.mjs --write  also drop finished events, put events on the map (venues.json),
//                           sort, and stamp updatedAt
// Exits with 1 if any event or venue is invalid.
import { readFileSync, writeFileSync } from 'node:fs';
import { checkVenues, findVenue, inMongolia, placeEvents, readVenues } from './scripts/venues.mjs';

const FILE = new URL('./events.json', import.meta.url);
const CATEGORIES = [
  'Arts & Museums', 'Music & Performance', 'Sports', 'Talks & Learning', 'Kids & Family',
  'Outdoors & Parks', 'Tours', 'Film', 'Community & Civic', 'Online', 'Other',
];
const WHEN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

// Ulaanbaatar is UTC+8 all year.
const ubNow = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
const today = ubNow.slice(0, 10);

const feed = JSON.parse(readFileSync(FILE, 'utf8'));
const publishers = new Set((feed.publishers ?? []).map((p) => p.name));
const venues = readVenues();
const errors = checkVenues(venues).map((p) => `venues.json: ${p}`);
const seen = new Set();

for (const ev of feed.events ?? []) {
  const where = ev.id || ev.title || JSON.stringify(ev).slice(0, 60);
  const bad = (msg) => errors.push(`${where}: ${msg}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(ev.id ?? '')) bad('id must be lowercase letters, digits and dashes');
  if (seen.has(ev.id)) bad('id is used twice');
  seen.add(ev.id);
  if (!ev.title?.trim()) bad('missing title');
  if (!WHEN.test(ev.start ?? '')) bad(`start "${ev.start}" is not YYYY-MM-DD or YYYY-MM-DDTHH:MM`);
  if (ev.end !== undefined && (!WHEN.test(ev.end) || ev.end < ev.start)) bad(`end "${ev.end}" is invalid or before start`);
  if (!/^https:\/\//.test(ev.url ?? '')) bad('missing https source url');
  if (!publishers.has(ev.sourceName)) bad(`sourceName "${ev.sourceName}" is not in publishers`);
  if (ev.category !== undefined && !CATEGORIES.includes(ev.category)) bad(`unknown category "${ev.category}"`);
  if ((ev.lat !== undefined || ev.lng !== undefined) && !inMongolia(ev.lat, ev.lng)) bad('lat and lng must both be numbers inside Mongolia');
  if (ev.image !== undefined && !/^https:\/\/\S+$/.test(ev.image)) bad('image must be an https link');
}

const findsVenue = (ev) => !!findVenue(ev, venues);
const lastDay = (ev) => (ev.end ?? ev.start ?? '').slice(0, 10);
const finished = (feed.events ?? []).filter((ev) => lastDay(ev) < today);
const upcoming = (feed.events ?? []).filter((ev) => lastDay(ev) >= today);

const bySource = {};
for (const ev of upcoming) bySource[ev.sourceName] = (bySource[ev.sourceName] ?? 0) + 1;
console.log(`Today in Ulaanbaatar: ${today}`);
console.log(`${upcoming.length} upcoming, ${finished.length} finished`);
for (const [name, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) console.log(`  ${name}: ${n}`);
const unplaced = upcoming.filter((ev) => ev.lat === undefined && !findsVenue(ev));
console.log(`${upcoming.length - unplaced.length} on the map, ${upcoming.filter((ev) => ev.image).length} with a picture`);
if (unplaced.length) console.log(`  Not on the map: ${unplaced.map((ev) => ev.location || '(no location)').join('; ')}`);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

if (process.argv.includes('--write')) {
  const placed = placeEvents(upcoming, venues);
  if (placed) console.log(`Put ${placed} event(s) on the map from venues.json.`);
  upcoming.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const out = { updatedAt: `${ubNow.slice(0, 19)}+08:00`, publishers: feed.publishers, events: upcoming };
  writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('\nevents.json updated.');
}
