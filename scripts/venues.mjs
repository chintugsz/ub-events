// Puts events on the map. venues.json lists places in Ulaanbaatar with their coordinates, read
// from OpenStreetMap or the venue's own map pin (never guessed), and the names events use for
// them. check.mjs --write gives each event without coordinates those of the venue its location
// names.
import { readFileSync } from 'node:fs';

/** Lowercase, without quotes or slashes, single-spaced, so "“Б Контемпорари”" matches "б контемпорари". */
export const normalize = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/["'“”„«»‘’/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function readVenues(url = new URL('../venues.json', import.meta.url)) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

/** The venue whose name appears in the event's location (the longest such name wins), if any. */
export function findVenue(ev, venues) {
  const places = [normalize(ev.location), normalize(ev.locationEn)].filter(Boolean);
  let best;
  let bestLength = 0;
  for (const venue of venues) {
    for (const alias of [venue.name, venue.nameMn, ...(venue.aliases ?? [])]) {
      const a = normalize(alias);
      if (a.length >= 4 && a.length > bestLength && places.some((p) => p.includes(a))) {
        best = venue;
        bestLength = a.length;
      }
    }
  }
  return best;
}

/** Fills in lat and lng from the venue list for events that don't have them. Returns how many it placed. */
export function placeEvents(events, venues) {
  let placed = 0;
  for (const ev of events) {
    if (ev.lat !== undefined || ev.lng !== undefined) continue;
    const venue = findVenue(ev, venues);
    if (!venue) continue;
    ev.lat = venue.lat;
    ev.lng = venue.lng;
    placed++;
  }
  return placed;
}

/** Problems with the venue list itself. */
export function checkVenues(venues) {
  const problems = [];
  for (const v of venues) {
    if (!v.name) problems.push('a venue has no name');
    if (!inMongolia(v.lat, v.lng)) problems.push(`${v.name}: lat/lng are missing or outside Mongolia`);
    if (!v.source) problems.push(`${v.name}: say where the coordinates came from (source)`);
  }
  return problems;
}

export const inMongolia = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' && lat > 41 && lat < 53 && lng > 87 && lng < 120;
