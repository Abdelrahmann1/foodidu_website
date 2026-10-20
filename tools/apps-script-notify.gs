/* Foodidu Business: an email for every new request in the "Vendor Requests" Google Sheet.
   The site sends each request (the full form and the quick one) to this sheet through the Apps Script web app, and also to
   Firestore (foodidu.com/dashboard/ > طلبات الشراكة). This script checks the sheet every 5 minutes and emails each new row.

   Setup, once:
   1. Open the "Vendor Requests" sheet > Extensions > Apps Script.
   2. Add a file (+ > Script), name it "notify", paste this file, Save.
   3. In the function list pick setupNotify > Run, and allow access (Google asks once: send email as you, read this sheet).
   4. Optional: pick testNotify > Run to receive the last request as a test email.
   Apps Script starts this every 5 minutes on its own; the free quota is 100 emails a day. */

const NOTIFY_TO = 'abdelrhmannkhaledd1@gmail.com';
const SHEET_NAME = '';   // the tab with the requests; empty = the first tab
const DASHBOARD = 'https://foodidu.com/dashboard/#applications';

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
}

// Run once: a 5-minute timer, starting after the rows that are already there (no emails for old requests).
function setupNotify() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'notifyNewRows').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('notifyNewRows').timeBased().everyMinutes(5).create();
  PropertiesService.getScriptProperties().setProperty('lastRow', String(sheet_().getLastRow()));
}

// Emails every row added since the last run.
function notifyNewRows() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const sh = sheet_(), props = PropertiesService.getScriptProperties();
    const now = sh.getLastRow(), last = Number(props.getProperty('lastRow') || now);
    if (now > last) {
      const cols = sh.getLastColumn();
      const head = sh.getRange(1, 1, 1, cols).getDisplayValues()[0];
      sh.getRange(last + 1, 1, now - last, cols).getDisplayValues().forEach((row) => send_(head, row));
    }
    props.setProperty('lastRow', String(now));
  } finally {
    lock.releaseLock();
  }
}

// Sends the last request again, to check that the email arrives.
function testNotify() {
  const sh = sheet_(), cols = sh.getLastColumn();
  send_(sh.getRange(1, 1, 1, cols).getDisplayValues()[0], sh.getRange(sh.getLastRow(), 1, 1, cols).getDisplayValues()[0]);
}

function send_(head, row) {
  const pick = (re) => { const i = head.findIndex((h) => re.test(String(h))); return i > -1 ? row[i] : ''; };
  const name = pick(/business|النشاط/i) || 'طلب جديد';
  const phone = pick(/phone|تليفون|هاتف/i);
  const lines = head.map((h, i) => (h || 'Column ' + (i + 1)) + ': ' + (row[i] || '–'));
  const wa = phone ? '\nواتساب: https://wa.me/' + String(phone).replace(/\D/g, '').replace(/^0/, '20') : '';
  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: 'طلب جديد على Foodidu Business: ' + name,
    body: 'وصل طلب جديد من موقع Foodidu Business.\n\n' + lines.join('\n') + wa + '\n\nكل الطلبات في لوحة التحكم: ' + DASHBOARD
  });
}
