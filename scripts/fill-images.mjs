// Gives events a picture: each listing's own preview image (the one link previews show), so the
// app can show it on the event's card and page. Run by .github/workflows/fill-images.yml whenever
// events.json changes. Events that already have an image keep it.
//   node scripts/fill-images.mjs           fill in what it can and save events.json
//   node scripts/fill-images.mjs --dry     only report
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FEED = new URL('../events.json', import.meta.url);
const AGENT = 'Mozilla/5.0 (compatible; Yaahii events list; +https://github.com/chintugsz/ub-events)';
/** Pages that never have a useful preview image, or need signing in. */
const NO_PREVIEW = /^https:\/\/([^/]+\.)?(github\.com|facebook\.com|fb\.com|instagram\.com|google\.[a-z.]+|t\.me)\//i;
/** Images that are a site's logo or a stand-in rather than the event. */
const GENERIC = /logo|favicon|placeholder|default[-_.]|no[-_]?image|blank\.|spacer|avatar/i;
/** The same picture on this many different pages is the site's default, not the event's. */
const SITE_DEFAULT = 3;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4]) : undefined;
}

/** Turns a link found on a page into a full https address, or undefined if it can't be used. */
export function absoluteUrl(src, pageUrl) {
  const s = decode(src.trim());
  if (!s || s.startsWith('data:')) return undefined;
  let url;
  try {
    url = new URL(s, pageUrl).href;
  } catch {
    return undefined;
  }
  url = url.replace(/^http:\/\//i, 'https://');
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : undefined;
}

/** The page's preview image (og:image, then twitter:image, then image_src), skipping logos. */
export function extractOgImage(html, pageUrl) {
  const found = {};
  for (const tag of html.slice(0, 400_000).match(/<(meta|link)\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? attr(tag, 'rel') ?? '').toLowerCase();
    const value = attr(tag, 'content') ?? attr(tag, 'href');
    if (value && !(key in found)) found[key] = value;
  }
  for (const key of ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src', 'image_src']) {
    const url = found[key] && absoluteUrl(found[key], pageUrl);
    if (url && !GENERIC.test(new URL(url).pathname)) return url;
  }
  return undefined;
}

async function get(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: accept }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
  return res;
}

async function previewOf(pageUrl) {
  try {
    const res = await get(pageUrl, 'text/html');
    if (!res.ok) return { why: `page answered ${res.status}` };
    const image = extractOgImage(await res.text(), res.url || pageUrl);
    if (!image) return { why: 'no preview image' };
    // Make sure it really is a picture that loads.
    const img = await get(image, 'image/*');
    const type = img.headers.get('content-type') ?? '';
    await img.body?.cancel();
    if (!img.ok || !type.startsWith('image/')) return { why: `image answered ${img.status} ${type}` };
    return { image };
  } catch (e) {
    return { why: String(e?.message ?? e) };
  }
}

/** Pages that several events link to are roundups (a weekly listing, a festival programme); their picture isn't any one event's. */
export function roundupPages(events) {
  const count = new Map();
  for (const ev of events) if (ev.url) count.set(ev.url, (count.get(ev.url) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n > 1).map(([url]) => url));
}

export async function fillImages(feed, { log = console.log } = {}) {
  const roundups = roundupPages(feed.events);
  const pages = [
    ...new Set(
      feed.events
        .filter((ev) => !ev.image && ev.url && !NO_PREVIEW.test(ev.url) && !roundups.has(ev.url))
        .map((ev) => ev.url),
    ),
  ];
  const found = new Map();
  for (const page of pages) {
    const { image, why } = await previewOf(page);
    if (image) found.set(page, image);
    else log(`  no picture: ${page} (${why})`);
  }
  // Pictures every page of a site shares are the site's default, not the event's.
  const pagesPerImage = new Map();
  for (const [page, image] of found) pagesPerImage.set(image, (pagesPerImage.get(image) ?? 0) + 1);
  const known = new Set(feed.events.map((ev) => ev.image).filter(Boolean));
  let added = 0;
  for (const ev of feed.events) {
    const image = !ev.image && found.get(ev.url);
    if (!image) continue;
    if (pagesPerImage.get(image) >= SITE_DEFAULT || known.has(image)) {
      log(`  skipped the shared picture ${image} for ${ev.id}`);
      continue;
    }
    ev.image = image;
    added++;
  }
  return added;
}

async function main() {
  const feed = JSON.parse(readFileSync(FEED, 'utf8'));
  const added = await fillImages(feed);
  const total = feed.events.filter((ev) => ev.image).length;
  console.log(`Added ${added} picture(s); ${total} of ${feed.events.length} events have one.`);
  if (added && !process.argv.includes('--dry')) writeFileSync(FEED, JSON.stringify(feed, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
