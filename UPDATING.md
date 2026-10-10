# Updating the list

The daily routine follows these steps. A person editing by hand should follow them too.

1. Run `node check.mjs --write`. This drops events that have finished.
2. Look for public events in Ulaanbaatar over the next 30 days. Search in both Mongolian and
   English. Start with these sources:
   - **MONTSAME**: the weekly "This Week in Mongolia" roundup, published on Mondays at
     montsame.mn/en/read/…, plus montsame.mn/mn news.
   - **News sites**: ikon.mn, news.mn, isee.mn, unuudur.mn, mnb.mn. Useful search words:
     тоглолт, концерт, үзэсгэлэн, фестиваль, наадам, тэмцээн, нээлт, болно.
   - **Venues**: museums (Chinggis Khaan, Zanabazar, Bogd Khaan Palace), Union of
     Mongolian Artists, Central Stadium, Buyant-Ukhaa, Steppe Arena, and the hotel and club stages.
   - **Others**: eventx.mn/event/{id} (ticketed events), urlag.mn posts, yolo.mn (youth news; its
     "Хаана, юу болох вэ?" and "Эвэнт" sections), zms.mn, news.zindaa.mn, new.urgoo.mn and tengis.mn/film
     (cinema release dates), ted.com/tedx, gdg.community.dev (GDG Ulaanbaatar), embassies and
     cultural centres, universities, The League (basketball), Bandsintown (/c/ulaanbaatar-mongolia),
     allevents.in/ulaanbaatar and happeningnext.com/ulaanbaatar.
   - Skip these, which can't be read automatically:
     - Blocked: Ticket.mn, Shoppy.mn, tasalbar.mn, ulaanbaatar.mn, opera.mn and theubpost.mn.
     - Load with JavaScript, nothing to read: gogo.mn.
     - Placeholder dates: philharmonic.mn and drama.mn.
3. Add an event only if a page you read states its date and its place. Put that page in `url`.
   Never guess a date, time, price or venue; leave out an optional field rather than guess it.
4. Events whose `id` starts with `org-` were added by organizers through the "Add an event" form.
   Leave them alone: `check.mjs` drops them once they finish. Don't add a second copy of one.
5. Don't add an event twice. Before adding one, check for the same title, or an obviously
   matching one, on the same day. When a source changes an event, correct it. When a source
   says an event is cancelled, remove it.
6. Write ids as `<source>-<YYYY-MM-DD>-<short-slug>`, using lowercase letters, digits and dashes.
   Give a new source an entry in `publishers` too.
7. Fill in `titleMn` and `titleEn` when you can; a faithful translation is fine. Choose a
   `category` from the list in `check.mjs`. Add a few English and Mongolian `tags`.
8. Map positions: `check.mjs --write` gives each event the coordinates of the venue in
   `venues.json` that its `location` names. When it reports an event as "Not on the map", look
   the venue up and add it to `venues.json` with its English and Mongolian names, the spellings
   events use (`aliases`), and `lat`/`lng` read from OpenStreetMap (mapcarta.com shows OSM
   data) or the venue's own map pin. Put that page in `source`. Never estimate coordinates from
   an address; leave the venue out instead. Skip "Nationwide" and online events.
9. Pictures: don't add `image` by hand. After each push, a GitHub workflow
   (`.github/workflows/fill-images.yml`) adds the listing's own preview picture.
10. Run `node check.mjs --write` and fix anything it reports.
11. Commit `events.json` (and `venues.json` if you added venues), with the message
    `Update events for YYYY-MM-DD`. Pull first
    (`git pull --rebase origin main`), because organizer events can arrive at any time, then push to `main`.
