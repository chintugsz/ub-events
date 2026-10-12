// Publishes the events approved in the organizer review sheet (see sheet/Code.gs). The "Add
// approved events" workflow runs it every half hour. It reads the sheet's web app address from
// sheet/url.txt and does nothing while that is empty.
//
// It only adds: an event already in events.json (same id) is left alone, so editing a row after it
// went live doesn't change it, and a past date is skipped.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addToFeed, buildEvent, ubToday } from './add-event.mjs';

const ROOT = new URL('../', import.meta.url);
const FEED = new URL('events.json', ROOT);
const HELP = 'https://chintugsz.github.io/ub-events/help.html';

/** The events.json entries for approved rows that aren't in the feed yet. */
export function newEvents(rows, feed, today) {
  const have = new Set((feed.events ?? []).map((e) => e.id));
  const out = [];
  for (const row of rows ?? []) {
    if (!/^[a-z0-9]{4,}$/.test(row.id ?? '')) continue;
    const { event, problems } = buildEvent(row, { issueNumber: `s${row.id}`, issueUrl: HELP, author: 'Yaahii?', today });
    if (problems.length || have.has(event.id)) continue;
    // The sheet has no GitHub author to fall back on.
    if (!row.organizer?.trim()) delete event.host;
    have.add(event.id);
    out.push(event);
  }
  return out;
}

async function main() {
  const url = readFileSync(new URL('sheet/url.txt', ROOT), 'utf8').replace(/#.*/g, '').trim();
  if (!url) return console.log('No review sheet set up yet (sheet/url.txt is empty).');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`The review sheet answered ${res.status}`);
  const { events: rows } = await res.json();

  const before = readFileSync(FEED, 'utf8');
  let feed = JSON.parse(before);
  const added = newEvents(rows, feed, ubToday());
  if (!added.length) return console.log(`Nothing new to publish (${rows?.length ?? 0} approved rows).`);
  for (const event of added) feed = addToFeed(feed, event, process.env.GITHUB_REPOSITORY ?? 'chintugsz/ub-events');
  writeFileSync(FEED, JSON.stringify(feed, null, 2) + '\n');
  try {
    execFileSync('node', [fileURLToPath(new URL('check.mjs', ROOT)), '--write'], { stdio: 'inherit' });
  } catch (err) {
    writeFileSync(FEED, before);
    throw err;
  }
  console.log(`Published ${added.length}: ${added.map((e) => e.title).join('; ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
