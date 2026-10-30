/**
 * Charles Fan Club Poll - Google Apps Script backend
 *
 * SETUP
 * 1. Create a Google Sheet, then Extensions > Apps Script, and paste this file.
 *    (The script is container-bound, so it uses the sheet it lives in.)
 * 2. Deploy > New deployment > type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Copy the deployment URL that ends in /exec and set it as GOOGLE_SCRIPT_URL
 *    in index.html. The /dev URL only works for the script owner.
 * 4. After editing this file, use Deploy > Manage deployments > Edit > New version,
 *    otherwise the /exec URL keeps serving the old code.
 *
 * API
 *   POST  body (JSON): { action: 'vote', voterName: 'Name', candidates: ['A', 'B'] }
 *   GET   ?action=results  ->  { "results": { "Laeith": 2, ... } }
 *
 * Votes are validated server-side (known candidates, exactly two distinct picks,
 * one vote per voter name, case-insensitive). Voter name is a weak identity, so
 * this stops casual double-voting but is not strong anti-fraud.
 */

var CANDIDATES = ['Laeith', 'Hudson', 'Gideon', 'Sam', 'Elijah', 'Titus', 'Malachi', 'Anders', 'Liam'];
var SHEET_NAME = 'Votes';
var HEADERS = ['Timestamp', 'Voter', 'Candidate 1', 'Candidate 2'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'results') {
    return json_({ success: true, results: tally_() });
  }
  return json_({ success: false, error: 'Unknown action' });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ success: false, error: 'Invalid JSON' });
  }

  if (!data || data.action !== 'vote') {
    return json_({ success: false, error: 'Unknown action' });
  }

  var voter = String(data.voterName || '').trim().slice(0, 60);
  var picks = Array.isArray(data.candidates) ? data.candidates.map(String) : [];

  if (!voter) {
    return json_({ success: false, error: 'Name required' });
  }
  if (picks.length !== 2 || picks[0] === picks[1]) {
    return json_({ success: false, error: 'Pick exactly two different candidates' });
  }
  if (picks.some(function (c) { return CANDIDATES.indexOf(c) === -1; })) {
    return json_({ success: false, error: 'Unknown candidate' });
  }

  // Serialize writes so concurrent votes can't race the duplicate check.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var rows = sheet.getDataRange().getValues();
    var key = voter.toLowerCase();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).trim().toLowerCase() === key) {
        return json_({ success: false, error: 'Already voted' });
      }
    }
    // Prefix with a quote-safe form to stop spreadsheet formula injection.
    var safeVoter = /^[=+\-@]/.test(voter) ? "'" + voter : voter;
    sheet.appendRow([new Date(), safeVoter, picks[0], picks[1]]);
  } finally {
    lock.releaseLock();
  }
  return json_({ success: true });
}

function tally_() {
  var counts = {};
  CANDIDATES.forEach(function (c) { counts[c] = 0; });
  var rows = getSheet_().getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    for (var j = 2; j <= 3; j++) {
      var name = String(rows[i][j]);
      if (counts.hasOwnProperty(name)) counts[name]++;
    }
  }
  return counts;
}
