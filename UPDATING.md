# Updating the list

The daily routine follows these steps. A person editing by hand should follow them too.

1. Run `node check.mjs --write`. This drops events that have finished.
2. Look for public events in Ulaanbaatar over the next 30 days. Search in both Mongolian and
   English. Start with these sources:
   - **MONTSAME**: the weekly "This Week in Mongolia" roundup, published on Mondays at
     montsame.mn/en/read/…, plus montsame.mn/mn news.
   - **News sites**: ikon.mn, gogo.mn, news.mn, isee.mn, mnb.mn. Useful search words:
     тоглолт, концерт, үзэсгэлэн, фестиваль, наадам, тэмцээн, нээлт, болно.
   - **Venues**: State Opera and Ballet, State Drama Theatre, Philharmonic, museums, Union of
     Mongolian Artists, Central Stadium, Buyant-Ukhaa, Steppe Arena, and the hotel and club stages.
   - **Others**: cultural centres and embassies, universities, The League (basketball),
     Bandsintown (/c/ulaanbaatar-mongolia), allevents.in/ulaanbaatar and happeningnext.com/ulaanbaatar.
   - Ticket.mn, Shoppy.mn, tasalbar.mn and ulaanbaatar.mn can't be read automatically, so skip them.
3. Add an event only if a page you read states its date and its place. Put that page in `url`.
   Never guess a date, time, price or venue; leave out an optional field rather than guess it.
4. Don't add an event twice. Before adding one, check for the same title, or an obviously
   matching one, on the same day. When a source changes an event, correct it. When a source
   says an event is cancelled, remove it.
5. Write ids as `<source>-<YYYY-MM-DD>-<short-slug>`, using lowercase letters, digits and dashes.
   Give a new source an entry in `publishers` too.
6. Fill in `titleMn` and `titleEn` when you can; a faithful translation is fine. Choose a
   `category` from the list in `check.mjs`. Add a few English and Mongolian `tags`.
7. Run `node check.mjs --write` and fix anything it reports.
8. Commit only `events.json`, with the message `Update events for YYYY-MM-DD`, and push to `main`.
