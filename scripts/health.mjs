// Checks that the list is still fresh and full enough to be worth opening the app for.
// The "List health" workflow runs it every morning after the update and opens an issue when it
// finds a problem, so a broken update is noticed the same day rather than by users.
//   node scripts/health.mjs   prints the problems, exits with 1 if there are any
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The list should be updated every morning; a day and a half without one means it stopped. */
export const MAX_AGE_HOURS = 36;
/** Fewer events than this in the coming week makes the app look empty. */
export const MIN_NEXT_7_DAYS = 15;

const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function healthProblems(feed, now = new Date()) {
  const problems = [];
  const today = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const updated = Date.parse(feed.updatedAt ?? '');
  const ageHours = (now.getTime() - updated) / 3600_000;
  if (!Number.isFinite(ageHours)) problems.push('events.json has no valid updatedAt.');
  else if (ageHours > MAX_AGE_HOURS)
    problems.push(`The list was last updated ${Math.floor(ageHours)} hours ago (${feed.updatedAt}). The morning update may have stopped.`);

  const weekEnd = addDays(today, 6);
  const nextWeek = (feed.events ?? []).filter((ev) => {
    const first = (ev.start ?? '').slice(0, 10);
    const last = (ev.end ?? ev.start ?? '').slice(0, 10);
    return last >= today && first <= weekEnd;
  });
  if (nextWeek.length < MIN_NEXT_7_DAYS)
    problems.push(`Only ${nextWeek.length} events fall in the next 7 days (${today} to ${weekEnd}); the app needs at least ${MIN_NEXT_7_DAYS} to feel alive.`);
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const feed = JSON.parse(readFileSync(new URL('../events.json', import.meta.url), 'utf8'));
  const problems = healthProblems(feed);
  for (const p of problems) console.log(`- ${p}`);
  if (!problems.length) console.log('The list is fresh and full.');
  process.exit(problems.length ? 1 : 0);
}
