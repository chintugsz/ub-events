# Organizer review sheet

Organizers add events from the **+** button in the Yaahii? app without any account. The app sends
each event to a Google Sheet owned by the app's owner, through the script in [Code.gs](Code.gs).

1. A new event arrives as a row with **Status: New**, and the owner gets an email.
2. The owner checks it (the **Contact** column has the organizer's phone or email, which is never
   published) and sets **Status** to **Approve**, or **Reject**.
3. Every half hour the **Add approved events** workflow ([scripts/add-from-sheet.mjs](../scripts/add-from-sheet.mjs))
   reads the approved rows and adds any new ones to `events.json`. Changing a row after it went live
   doesn't change the published event; edit `events.json` for that.

## Setting it up (once)

1. Open the review sheet in Google Sheets, then **Extensions → Apps Script**.
2. Replace everything in the editor with [Code.gs](Code.gs) and save.
3. **Deploy → New deployment**, type **Web app**, *Execute as:* **Me**, *Who has access:* **Anyone**,
   then **Deploy** and allow the permissions it asks for.
4. Copy the **Web app URL** (it ends in `/exec`). It goes in `sheet/url.txt` here and in the app's
   `SUBMIT_URL` (`src/config.ts`).

The GitHub issue form keeps working for anyone who prefers it.
