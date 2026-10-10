// Run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addToFeed, buildEvent, parseIssueBody, readOrganizers, toCategory, ubToday } from './add-event.mjs';

// What GitHub writes into an issue made with the "Add an event" form.
const BODY = `### Event name / Нэр

Jazz night at Fat Cat

### Date / Огноо

2026-10-25

### Start time / Эхлэх цаг

20:00

### Last day / Дуусах өдөр

_No response_

### Place / Байршил

Fat Cat Jazz Club

### Category / Төрөл

Music & Performance

### Price / Үнэ

30,000₮

### Link / Холбоос

_No response_

### Image link / Зургийн холбоос

https://example.mn/poster.jpg

### Organizer / Зохион байгуулагч

UB Jazz

### Description / Тайлбар

Live quartet.
Two sets.`;

const CONTEXT = { issueNumber: 7, issueUrl: 'https://github.com/o/r/issues/7', author: 'someone', today: '2026-10-09' };

test('reads the form answers', () => {
  assert.deepEqual(parseIssueBody(BODY), {
    name: 'Jazz night at Fat Cat',
    date: '2026-10-25',
    time: '20:00',
    endDate: '',
    place: 'Fat Cat Jazz Club',
    category: 'Music & Performance',
    price: '30,000₮',
    link: '',
    image: 'https://example.mn/poster.jpg',
    organizer: 'UB Jazz',
    description: 'Live quartet.\nTwo sets.',
  });
});

test('builds an entry that links back to the issue when no link is given', () => {
  const { event, problems } = buildEvent(parseIssueBody(BODY), CONTEXT);
  assert.deepEqual(problems, []);
  assert.deepEqual(event, {
    id: 'org-2026-10-25-7',
    title: 'Jazz night at Fat Cat',
    start: '2026-10-25T20:00',
    allDay: false,
    location: 'Fat Cat Jazz Club',
    description: 'Live quartet.\nTwo sets.',
    cost: '30,000₮',
    category: 'Music & Performance',
    tags: ['organizer', 'зохион байгуулагч'],
    url: 'https://github.com/o/r/issues/7',
    image: 'https://example.mn/poster.jpg',
    sourceName: 'Organizers',
    host: 'UB Jazz',
  });
});

test('lists what needs fixing', () => {
  const { event, problems } = buildEvent(
    { name: '', date: '2026-10-05', time: '8pm', endDate: '2026-10-01', place: '', link: 'www.x.mn' },
    CONTEXT,
  );
  assert.equal(event, undefined);
  assert.equal(problems.length, 6);
  assert.equal(buildEvent({ name: 'x', date: '2026-02-30', place: 'y' }, CONTEXT).problems.length, 1);
});

test('an all-day event over several days', () => {
  const { event } = buildEvent({ name: 'Fair', date: '2026-10-23', endDate: '2026-10-25', place: 'Misheel Expo' }, CONTEXT);
  assert.equal(event.start, '2026-10-23');
  assert.equal(event.end, '2026-10-25');
  assert.equal(event.allDay, true);
  assert.equal(event.category, 'Other');
  assert.equal(event.host, '@someone');
});

test('category in either language, anything else is Other', () => {
  assert.equal(toCategory(' sports '), 'Sports');
  assert.equal(toCategory('Хөгжим, тайз'), 'Music & Performance');
  assert.equal(toCategory('party'), 'Other');
  assert.equal(toCategory(''), 'Other');
});

test('organizers list ignores case, @ and comments', () => {
  assert.deepEqual([...readOrganizers('# comment\n@Bold\n\nquiet # note\n')], ['bold', 'quiet']);
});

test('adding twice replaces the first copy and lists the publisher once', () => {
  const { event } = buildEvent(parseIssueBody(BODY), CONTEXT);
  let feed = { publishers: [{ name: 'MONTSAME', url: 'https://www.montsame.mn/en/' }], events: [] };
  feed = addToFeed(feed, event, 'o/r');
  feed = addToFeed(feed, { ...event, title: 'Edited' }, 'o/r');
  assert.equal(feed.events.length, 1);
  assert.equal(feed.events[0].title, 'Edited');
  assert.deepEqual(feed.publishers.map((p) => p.name), ['MONTSAME', 'Organizers']);
});

test('Ulaanbaatar date', () => {
  assert.equal(ubToday(new Date('2026-10-08T16:30:00Z')), '2026-10-09');
});

test('keeps a poster link, and asks for https', () => {
  const { event } = buildEvent(parseIssueBody(BODY), CONTEXT);
  assert.equal(event.image, 'https://example.mn/poster.jpg');
  const { problems } = buildEvent({ ...parseIssueBody(BODY), image: 'http://example.mn/p.jpg' }, CONTEXT);
  assert.deepEqual(problems, ['The image link should start with https://']);
});
