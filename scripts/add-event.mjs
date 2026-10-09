// Turns an "Add an event" issue into an entry in events.json. The workflow in
// .github/workflows/add-event.yml runs it; it reads the GitHub event from GITHUB_EVENT_PATH and
// writes `result` (added, waiting, invalid or skip) and `message` (the reply to post) to GITHUB_OUTPUT.
//
// An event goes live when its author is the repository owner or listed in organizers.txt, or when
// the owner (or a collaborator) comments /approve on the issue.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const FEED = new URL('events.json', ROOT);
const PUBLISHER = 'Organizers';
const CATEGORIES = [
  'Arts & Museums', 'Music & Performance', 'Sports', 'Talks & Learning', 'Kids & Family',
  'Outdoors & Parks', 'Tours', 'Film', 'Community & Civic', 'Online', 'Other',
];

// The English half of each question in .github/ISSUE_TEMPLATE/add-event.yml.
const FIELDS = {
  'Event name': 'name',
  Date: 'date',
  'Start time': 'time',
  'Last day': 'endDate',
  Place: 'place',
  Category: 'category',
  Price: 'price',
  Link: 'link',
  Organizer: 'organizer',
  Description: 'description',
};

/** Reads the answers out of an issue written with the "Add an event" form. */
export function parseIssueBody(body) {
  const fields = {};
  for (const part of (body ?? '').replace(/\r\n/g, '\n').split(/^### /m).slice(1)) {
    const lineEnd = part.indexOf('\n');
    const key = FIELDS[part.slice(0, lineEnd < 0 ? undefined : lineEnd).split(' / ')[0].trim()];
    if (!key) continue;
    const value = lineEnd < 0 ? '' : part.slice(lineEnd + 1).trim();
    fields[key] = value === '_No response_' ? '' : value;
  }
  return fields;
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** Today's date in Ulaanbaatar, which is UTC+8 all year. */
export const ubToday = (now = new Date()) => new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** Builds the events.json entry, or lists what the organizer needs to fix. */
export function buildEvent(fields, { issueNumber, issueUrl, author, today }) {
  const get = (key) => (fields[key] ?? '').trim();
  const [name, date, time, endDate, place, link] = ['name', 'date', 'time', 'endDate', 'place', 'link'].map(get);
  const problems = [];

  if (!name) problems.push('The event name is missing.');
  else if (name.length > 150) problems.push('The event name is too long (150 characters at most).');
  if (!isDate(date)) problems.push(`The date "${date}" should look like 2026-10-25.`);
  else if (date < today) problems.push(`The date ${date} has already passed.`);
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) problems.push(`The start time "${time}" should look like 19:00.`);
  if (endDate && (!isDate(endDate) || endDate < date)) problems.push(`The last day "${endDate}" should look like 2026-10-27 and come after the date.`);
  if (!place) problems.push('The place is missing.');
  if (link && !/^https:\/\/\S+$/.test(link)) problems.push('The link should start with https://');
  if (problems.length) return { problems };

  const description = get('description').slice(0, 1000);
  const price = get('price');
  const event = {
    id: `org-${date}-${issueNumber}`,
    title: name,
    start: time ? `${date}T${time}` : date,
    ...(endDate && endDate !== date ? { end: endDate } : {}),
    allDay: !time,
    location: place,
    ...(description ? { description } : {}),
    ...(price ? { cost: price } : {}),
    category: CATEGORIES.includes(get('category')) ? get('category') : 'Other',
    tags: ['organizer', 'зохион байгуулагч'],
    url: link || issueUrl,
    sourceName: PUBLISHER,
    host: get('organizer') || `@${author}`,
  };
  return { event, problems };
}

/** GitHub usernames from organizers.txt, lowercased. Blank lines and # comments are ignored. */
export function readOrganizers(text) {
  return new Set(
    text
      .split('\n')
      .map((line) => line.replace(/#.*/, '').trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean),
  );
}

/** Adds or replaces the event in the feed, making sure the Organizers publisher is listed. */
export function addToFeed(feed, event, repo) {
  const publishers = feed.publishers ?? [];
  if (!publishers.some((p) => p.name === PUBLISHER)) {
    publishers.push({ name: PUBLISHER, url: `https://github.com/${repo}/issues` });
  }
  const events = (feed.events ?? []).filter((e) => e.id !== event.id);
  return { ...feed, publishers, events: [...events, event] };
}

const MESSAGES = {
  added: () =>
    'Added to UB This Week. It shows in the app after a pull-to-refresh.\n\n' +
    'UB This Week апп-д нэмэгдлээ. Апп-аа доош татаж шинэчилбэл харагдана.',
  waiting: (author, owner) =>
    `Thanks! This event is waiting for approval, because @${author} isn't on the organizers list yet. ` +
    `@${owner} can approve it by commenting \`/approve\`, or add @${author} to organizers.txt so future events go live automatically.\n\n` +
    'Баярлалаа! Энэ арга хэмжээ батлагдахыг хүлээж байна.',
  invalid: (problems) =>
    `Some details need fixing before this event can be added:\n${problems.map((p) => `- ${p}`).join('\n')}\n\n` +
    'Edit this issue to fix them, and it will be checked again.\n\n' +
    'Арга хэмжээг нэмэхийн өмнө дээрх мэдээллийг засна уу. Засвал дахин шалгана.',
};

function output(result, message = '') {
  console.log(`${result}${message ? `: ${message}` : ''}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `result=${result}\nmessage<<END_OF_MESSAGE\n${message}\nEND_OF_MESSAGE\n`);
  }
}

function main() {
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const { issue, comment, repository } = payload;
  if (!issue || issue.state !== 'open' || issue.pull_request || !/^### Event name/m.test(issue.body ?? '')) {
    return output('skip');
  }
  if (comment && !/^\/approve\b/.test(comment.body.trim())) return output('skip');

  const author = issue.user.login;
  const owner = repository.owner.login;
  const { event, problems } = buildEvent(parseIssueBody(issue.body), {
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    author,
    today: ubToday(),
  });
  if (problems.length) return output('invalid', MESSAGES.invalid(problems));

  const organizers = readOrganizers(readFileSync(new URL('organizers.txt', ROOT), 'utf8'));
  const approved = comment
    ? ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association)
    : author.toLowerCase() === owner.toLowerCase() || organizers.has(author.toLowerCase());
  if (!approved) {
    // Only say so once, not on every edit or stray /approve.
    return output(payload.action === 'opened' ? 'waiting' : 'skip', MESSAGES.waiting(author, owner));
  }

  const before = readFileSync(FEED, 'utf8');
  writeFileSync(FEED, JSON.stringify(addToFeed(JSON.parse(before), event, repository.full_name), null, 2) + '\n');
  try {
    execFileSync('node', [fileURLToPath(new URL('check.mjs', ROOT)), '--write'], { stdio: 'inherit' });
  } catch {
    writeFileSync(FEED, before);
    return output('invalid', MESSAGES.invalid([`Something went wrong adding it to the list. @${owner}, please check the Actions log.`]));
  }
  output('added', MESSAGES.added());
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
