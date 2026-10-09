# UB events

This is the events list for the **UB This Week** app. The app reads `events.json` from this
repository every time it refreshes, so a change here shows up on phones without reinstalling the app.

A Claude routine updates the list every morning (Ulaanbaatar time), following
[UPDATING.md](UPDATING.md). Every event links to the page that announced it.

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
- Optional fields are `titleMn`, `titleEn`, `end`, `allDay`, `locationEn`, `description`, `cost`
  and `tags`.
- `sourceName` must match one of the `publishers`.

## Checking a change

```
node check.mjs           # report problems
node check.mjs --write   # also drop finished events, sort, and stamp updatedAt
```

Only commit when `check.mjs` passes. This repository is public: never put API keys or passwords in it.
