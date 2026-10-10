# UB events

This is the events list for the **Yaahii?** app. The app reads `events.json` from this
repository every time it refreshes, so a change here shows up on phones without reinstalling the app.

A Claude routine updates the list every morning (Ulaanbaatar time), following
[UPDATING.md](UPDATING.md). Every event links to the page that announced it.

## Adding your own event

Organizers add events with the **Add an event** form under
[Issues → New issue](https://github.com/chintugsz/ub-events/issues/new?template=add-event.yml), or from the
"+" button in the app, which opens the same form. They need a free GitHub account.

- If the author is the owner or is listed in [organizers.txt](organizers.txt), the event goes live
  within a few minutes. The issue is then closed with a note.
- Anyone else's event waits for approval. The owner approves it by commenting `/approve` on the issue,
  or adds the person's GitHub username to `organizers.txt` so their future events go live straight away.
- If something in the form is wrong, such as a date in the past, the reply says what to fix. Editing
  the issue checks it again.

[.github/workflows/add-event.yml](.github/workflows/add-event.yml) does this with
[scripts/add-event.mjs](scripts/add-event.mjs). Its tests run with `node --test`.

## Format

```json
{
  "updatedAt": "2026-10-09T08:30:00+08:00",
  "publishers": [{ "name": "MONTSAME", "url": "https://www.montsame.mn/en/" }],
  "events": [
    {
      "id": "montsame-2026-10-10-tree-planting",
      "title": "National Tree-Planting Day",
      "titleMn": "Үндэсний мод тарих өдөр",
      "start": "2026-10-10",
      "allDay": true,
      "location": "Улс даяар",
      "locationEn": "Nationwide",
      "category": "Community & Civic",
      "tags": ["volunteer", "сайн дурын"],
      "url": "https://www.montsame.mn/en/read/411448",
      "sourceName": "MONTSAME"
    }
  ]
}
```

- `start` and `end` are `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`, in Ulaanbaatar time.
- Optional fields are `titleMn`, `titleEn`, `end`, `allDay`, `locationEn`, `description`, `cost`,
  `tags`, `lat`/`lng` and `image`.
- `lat`/`lng` put the event on the app's map. `check.mjs --write` fills them in from
  [venues.json](venues.json), where every venue's coordinates come from OpenStreetMap or the
  venue's own map pin (see `source`).
- `image` is an https link to a picture of the event. The **Add event pictures** workflow fills it
  in with the listing's own preview picture ([scripts/fill-images.mjs](scripts/fill-images.mjs)),
  and organizers can give one in the form.
- `sourceName` must match one of the `publishers`.

## Checking a change

```
node check.mjs           # report problems
node check.mjs --write   # also drop finished events, add map positions, sort, and stamp updatedAt
```

Only commit when `check.mjs` passes. This repository is public: never put API keys or passwords in it.
