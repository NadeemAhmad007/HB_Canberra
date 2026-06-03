/**
 * Houseboat Canberra — PMS Google Apps Script
 *
 * Steps:
 *   1. Open your sheet → Extensions → Apps Script
 *   2. Paste this code → Save
 *   3. Run install() once to create all missing tabs
 *   4. Fill in your data in each tab
 *   5. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)
 *   6. Copy the URL → set as APPS_SCRIPT_URL in .env
 */

// ── Auth ─────────────────────────────────────────────────────────────────
var AUTH_TOKEN = "Ghulam_Nabi_Kolu";

// ── Tab names used in this sheet ─────────────────────────────────────────
var TAB_NAMES = {
  PROPERTY_CONFIG:  "Property_Config",
  ROOM_INVENTORY:   "Room_Inventory",
  BASE_RATES:       "Base_Rates",
  SEASONS:          "Seasons",
  MEAL_PLANS:       "Meal_Plans",
  CALENDARS:        "Calendar_Block_Map",
  BOOKINGS:         "Bookings",
};

// ── install(): run once to create any missing tabs with headers ──────────
function install() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = [
    {
      name: TAB_NAMES.PROPERTY_CONFIG,
      headers: [["Key", "Value"]],
      data: [["NAME", "Houseboat Canberra"], ["GST", "18"], ["ADDRESS", "Dal Lake, Srinagar"], ["CURRENCY", "INR"]],
    },
    {
      name: TAB_NAMES.ROOM_INVENTORY,
      headers: [["Room_ID", "Room_Type", "Total_Units", "Price", "Max_Adults", "Max_Children", "Child_Policy"]],
      data: [
        ["R1", "Deluxe Room 1", 2, 11500, 2, 2, "1 child above 10, 2 children below 10"],
        ["R2", "Deluxe Room 2", 2, 11500, 2, 2, "1 child above 10, 2 children below 10"],
        ["R3", "Family Suite", 1, 24500, 4, 2, "2 children below 12"],
      ],
    },
    {
      name: TAB_NAMES.BASE_RATES,
      headers: [["Room_ID", "Base_Price"]],
      data: [["R1", 11500], ["R2", 11500], ["R3", 24500]],
    },
    {
      name: TAB_NAMES.SEASONS,
      headers: [["Start_Date", "End_Date", "Multiplier"]],
      data: [["2026-04-01", "2026-09-30", 1.0], ["2026-10-01", "2027-03-31", 1.4]],
    },
    {
      name: TAB_NAMES.MEAL_PLANS,
      headers: [["Code", "Name", "Price"]],
      data: [
        ["EP", "European Plan (Room only)", 0],
        ["CP", "Continental Plan (Breakfast only)", 650],
        ["MAP", "Modified American Plan (Breakfast + Dinner)", 1800],
        ["AP", "American Plan (All meals)", 3200],
      ],
    },
    {
      name: TAB_NAMES.CALENDARS,
      headers: [["Room_ID", "Calendar_ID"]],
      data: [["R1", ""], ["R2", ""], ["R3", ""]],
    },
    {
      name: TAB_NAMES.BOOKINGS,
      headers: [["Booking_ID", "Guest_Name", "Phone", "Email", "Room_ID", "Meal_Code", "Adults", "Children", "Units", "Check_In", "Check_Out", "Nights", "Amount", "Status", "Invoice_URL", "Created_At"]],
      data: [],
    },
  ];

  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var sheet = ss.getSheetByName(t.name);
    if (!sheet) {
      sheet = ss.insertSheet(t.name);
      sheet.getRange(1, 1, 1, t.headers[0].length).setValues(t.headers);
      if (t.data.length > 0) {
        sheet.getRange(2, 1, t.data.length, t.headers[0].length).setValues(t.data);
      }
      sheet.setFrozenRows(1);
      Logger.log("Created tab: " + t.name);
    } else {
      Logger.log("Tab already exists: " + t.name);
    }
  }

  // Remove the default "Sheet1" if it exists and is empty
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
  Logger.log("Install complete — fill in your data and deploy.");
}

// ── doGet: Read all PMS data ──────────────────────────────────────────────
function doGet(e) {
  if (e?.parameter?.token !== AUTH_TOKEN) {
    return jsonResponse(403, { ok: false, error: "Unauthorized" });
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {
      ok: true,
      property:    sheetToKeyValue(ss, TAB_NAMES.PROPERTY_CONFIG),
      rooms:       sheetToObjects(ss, TAB_NAMES.ROOM_INVENTORY),
      rates:       sheetToObjects(ss, TAB_NAMES.BASE_RATES),
      seasons:     sheetToObjects(ss, TAB_NAMES.SEASONS),
      mealPlans:   sheetToObjects(ss, TAB_NAMES.MEAL_PLANS),
      calendars:   sheetToObjects(ss, TAB_NAMES.CALENDARS),
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
    var sheet = ss.getSheetByName(TAB_NAMES.BOOKINGS);
    var nextId = "HBC-" + Utilities.formatDate(new Date(), "IST", "yyyyMMdd") + "-" + String(sheet.getLastRow()).padStart(3, "0");
    var row = [
      nextId,
      body.guestName || "",
      body.phone || "",
      body.email || "",
      body.roomId || "",
      body.mealCode || "",
      body.adults || 1,
      body.children || 0,
      body.units || 1,
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
function getSheet(ss, name) {
  return ss.getSheetByName(name);
}

function sheetToKeyValue(ss, name) {
  var sheet = getSheet(ss, name);
  if (!sheet) return {};
  var rows = sheet.getDataRange().getValues();
  var obj = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) obj[String(rows[i][0]).trim()] = String(rows[i][1]).trim();
  }
  return obj;
}

function sheetToObjects(ss, name) {
  var sheet = getSheet(ss, name);
  if (!sheet) return [];
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
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
