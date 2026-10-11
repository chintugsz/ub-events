/**
 * Yaahii? organizer submissions.
 *
 * Paste this into the review sheet (Extensions → Apps Script) and deploy it as a web app
 * (Execute as: Me, Who has access: Anyone). The app sends organizers' events here; each lands as a
 * row with Status "New". Set Status to "Approve" and the events repository's "Add approved events"
 * workflow publishes it within half an hour. "Reject" (or leaving it) keeps it out.
 *
 * The web app's GET returns only approved rows, without the organizer's contact details.
 */

const SHEET_NAME = 'Submissions';
const HEADERS = [
  'Received', 'Status', 'Event name', 'Date', 'Start time', 'Last day', 'Place', 'Category',
  'Price', 'Link', 'Image link', 'Organizer', 'Description', 'Contact', 'ID',
];
const FIELDS = ['name', 'date', 'time', 'endDate', 'place', 'category', 'price', 'link', 'image', 'organizer', 'description', 'contact'];
const MAX_LENGTH = { name: 150, description: 1000 };
const STATUSES = ['New', 'Approve', 'Reject'];
const MAX_PER_HOUR = 60;

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    // Dates and times stay as typed instead of turning into spreadsheet dates.
    sheet.getRange('D:F').setNumberFormat('@');
    const status = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
    sheet.getRange('B2:B').setDataValidation(status);
  }
  return sheet;
}

/** Runs when the sheet opens, so it is always set up. */
function onOpen() {
  sheet_();
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'not JSON' });
  }
  // A field people never see; bots fill it in.
  if (data.website) return json_({ ok: true });

  const values = {};
  for (const key of FIELDS) values[key] = String(data[key] || '').trim().slice(0, MAX_LENGTH[key] || 300);
  if (!values.name || !/^\d{4}-\d{2}-\d{2}$/.test(values.date) || !values.place || values.contact.length < 5) {
    return json_({ ok: false, error: 'missing details' });
  }

  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('count') || 0);
  if (count >= MAX_PER_HOUR) return json_({ ok: false, error: 'too many events right now, try again later' });
  cache.put('count', String(count + 1), 3600);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    sheet_().appendRow([
      new Date(), 'New', values.name, values.date, values.time, values.endDate, values.place, values.category,
      values.price, values.link, values.image, values.organizer, values.description, values.contact, id,
    ]);
  } finally {
    lock.releaseLock();
  }

  try {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'Yaahii?: new event to check: ' + values.name,
      values.name + '\n' + values.date + ' ' + values.time + '\n' + values.place + '\n\n' +
        'Open the review sheet and set Status to Approve to publish it:\n' + SpreadsheetApp.getActive().getUrl(),
    );
  } catch (err) {
    // The row is saved either way.
  }
  return json_({ ok: true });
}

function cell_(value, pattern) {
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Ulaanbaatar', pattern);
  return String(value || '').trim();
}

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const events = rows
    .filter((row) => /^approve/i.test(String(row[1]).trim()))
    .map((row) => ({
      id: cell_(row[14]).toLowerCase(),
      name: cell_(row[2]),
      date: cell_(row[3], 'yyyy-MM-dd'),
      time: cell_(row[4], 'HH:mm'),
      endDate: cell_(row[5], 'yyyy-MM-dd'),
      place: cell_(row[6]),
      category: cell_(row[7]),
      price: cell_(row[8]),
      link: cell_(row[9]),
      image: cell_(row[10]),
      organizer: cell_(row[11]),
      description: cell_(row[12]),
    }))
    .filter((ev) => /^[a-z0-9]{4,}$/.test(ev.id));
  return json_({ events });
}
