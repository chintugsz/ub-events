# UB events

This is the events list for the **Yaahii?** app. The app reads `events.json` from this
repository every time it refreshes, so a change here shows up on phones without reinstalling the app.

A Claude routine updates the list every morning (Ulaanbaatar time), following
[UPDATING.md](UPDATING.md). Every event links to the page that announced it.

## Adding your own event

Organizers add events with the **+** button in the app or the web form at
https://chintugsz.github.io/ub-events/add.html, in Mongolian or English. Neither needs an account.
Both send the event to the owner's Google Sheet ("Yaahii? organizer submissions"). The owner sets
the row's Status to **Approve**, and the "Add approved events" workflow
([.github/workflows/add-from-sheet.yml](.github/workflows/add-from-sheet.yml)) publishes it within
half an hour. Setting it to **Reject** keeps it out. See [sheet/README.md](sheet/README.md).

The older GitHub issue form ([.github/workflows/add-event.yml](.github/workflows/add-event.yml) and
[scripts/add-event.mjs](scripts/add-event.mjs)) still works for the owner and anyone listed in
[organizers.txt](organizers.txt), but the app and the web pages no longer point to it. The tests run
with `node --test scripts/*.test.mjs`.

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

## Is the list healthy?

The **List health** workflow ([scripts/health.mjs](scripts/health.mjs)) runs every morning at 09:30
Ulaanbaatar time. If the list hasn't been updated for 36 hours, or fewer than 15 events fall in the
coming week, it opens an issue called "The events list needs attention" (GitHub emails the owner),
and closes it once the list is fine again.

## The app's web pages

The `docs` folder holds the app's home page, [privacy policy](docs/privacy.html) and
[help page](docs/help.html), in Mongolian and English. The app links to them, and the App Store and
Google Play ask for them. They are served by GitHub Pages at https://chintugsz.github.io/ub-events/
once Pages is turned on (Settings → Pages → Deploy from a branch → `main`, `/docs`).
