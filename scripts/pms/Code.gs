/**
 * Houseboat Canberra — PMS Google Apps Script
 *
 * Deploy as Web App → Executes as "Me", Access "Anyone"
 * Provides JSON API for the Next.js front-end.
 */

// ── Sheet GIDs ──────────────────────────────────────────────────────────────
// Match the tabs in the PMS spreadsheet.
// Update these if tabs are reordered.
var GIDS = {
  PROPERTY_CONFIG: 0,
  ROOM_INVENTORY: 1347479558,
  BASE_RATES: 107645891,
  SEASON_MULTIPLIER: 470367777,
  MEAL_PLANS: 1896615790,
  CALENDAR_BLOCK_MAP: 1878263457,
  BOOKINGS: 1980912302,
};

// Auth token — passed as ?token= in every request.
// Change this to a random string and keep secret.
var AUTH_TOKEN = "Ghulam_Nabi_Kolu";

// ── doGet: Read all PMS data ──────────────────────────────────────────────
function doGet(e) {
  if (e?.parameter?.token !== AUTH_TOKEN) {
    return jsonResponse(403, { ok: false, error: "Unauthorized" });
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {
      ok: true,
      property:    sheetToKeyValue(ss, GIDS.PROPERTY_CONFIG),
      rooms:       sheetToObjects(ss, GIDS.ROOM_INVENTORY),
      rates:       sheetToObjects(ss, GIDS.BASE_RATES),
      seasons:     sheetToObjects(ss, GIDS.SEASON_MULTIPLIER),
      mealPlans:   sheetToObjects(ss, GIDS.MEAL_PLANS),
      calendars:   sheetToObjects(ss, GIDS.CALENDAR_BLOCK_MAP),
    };
    // Enrich rooms with their computed current price
    data.rooms = data.rooms.map(function (r) {
      r.basePrice = parseInt(String(r.Price).replace(/,/g, "")) || 0;
      r.currentPrice = calculatePrice(r.Room_ID, r.basePrice, data.seasons);
      delete r.Price;
      return r;
    });
    // Fetch blocked dates from Google Calendars
    data.blockedDates = fetchAllBlockedDates(data.calendars);
    return jsonResponse(200, data);
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message });
  }
}

// ── doPost: Write a new booking ──────────────────────────────────────────
function doPost(e) {
  if (e?.parameter?.token !== AUTH_TOKEN) {
    return jsonResponse(403, { ok: false, error: "Unauthorized" });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetById(GIDS.BOOKINGS);
    var nextId = "HBC-" + Utilities.formatDate(new Date(), "IST", "yyyyMMdd") + "-" + String(sheet.getLastRow()).padStart(3, "0");
    var row = [
      nextId,
      body.guestName || "",
      body.phone || "",
      body.email || "",
      body.roomId || "",
      body.mealCode || "",
      body.adults || 1,
      body.checkIn || "",
      body.checkOut || "",
      body.nights || 1,
      body.amount || 0,
      body.status || "pending",
      body.invoiceUrl || "",
      new Date().toISOString(),
    ];
    sheet.appendRow(row);
    return jsonResponse(200, { ok: true, bookingId: nextId, status: "received" });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message });
  }
}

// ── Price calculation ────────────────────────────────────────────────────
function calculatePrice(roomId, basePrice, seasons) {
  var today = new Date();
  var multiplier = 1.0;
  for (var i = 0; i < seasons.length; i++) {
    var s = seasons[i];
    var start = new Date(s.Start_Date);
    var end = new Date(s.End_Date);
    if (today >= start && today <= end) {
      multiplier = parseFloat(s.Multiplier) || 1.0;
      break;
    }
  }
  return Math.round(basePrice * multiplier);
}

// ── Calendar blocked dates ───────────────────────────────────────────────
function fetchAllBlockedDates(calendars) {
  var blocked = {};
  var now = new Date();
  var future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  for (var i = 0; i < calendars.length; i++) {
    var c = calendars[i];
    var roomId = String(c.Room_ID);
    var calId = c.Calendar_ID;
    if (!blocked[roomId]) blocked[roomId] = [];
    try {
      var events = CalendarApp.getCalendarById(calId).getEvents(now, future);
      for (var j = 0; j < events.length; j++) {
        var start = events[j].getStartTime();
        var end = events[j].getEndTime();
        var d = new Date(start);
        while (d < end) {
          var ds = Utilities.formatDate(d, "IST", "yyyy-MM-dd");
          if (blocked[roomId].indexOf(ds) === -1) blocked[roomId].push(ds);
          d.setDate(d.getDate() + 1);
        }
      }
    } catch (e) {
      // Calendar not accessible — skip
    }
  }
  return blocked;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function sheetToKeyValue(ss, gid) {
  var sheet = ss.getSheetById(gid);
  var rows = sheet.getDataRange().getValues();
  var obj = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) obj[String(rows[i][0]).trim()] = String(rows[i][1]).trim();
  }
  return obj;
}

function sheetToObjects(ss, gid) {
  var sheet = ss.getSheetById(gid);
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[String(headers[j]).trim()] = rows[i][j];
    }
    result.push(obj);
  }
  return result;
}

function jsonResponse(code, data) {
  // Always return with status info in the body — ContentService
  // does not support custom HTTP status codes.
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
