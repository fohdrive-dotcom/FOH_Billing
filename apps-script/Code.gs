/**
 * Google Apps Script for the FOH Billing app (your script).
 *
 * The app calls it with POST { apiKey, action: "get" } or
 * POST { apiKey, action: "update", updates: { "business.name": "..." } }.
 *
 * Set API_KEY below to the SAME value as GOOGLE_SCRIPT_API_KEY in .env.local
 * (don't commit the real key — keep it only in the Apps Script editor).
 * Deploy → Manage deployments → Edit → Version: New version,
 * Execute as: Me, Who has access: Anyone → Deploy.
 */
const SPREADSHEET_ID = "1qJfZ84S5jUTw31kU62TZXp5GrjePXN41J4U8ooQ-BZY";
const API_KEY = "PASTE_GOOGLE_SCRIPT_API_KEY_FROM_.env.local";

const NUMBER_KEYS = ["invoiceTaxRate", "quotationTaxRate", "nextInvoiceNumber", "nextQuotationNumber", "numberPadding", "paymentDays", "validityDays"];
const BOOLEAN_KEYS = ["quotationShowUnitPrice"];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.apiKey !== API_KEY) throw new Error("Unauthorized access");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Settings");
    if (!sheet) throw new Error("Settings sheet not found");
    const rows = sheet.getDataRange().getValues();

    // READ SETTINGS -> nested object, e.g. { business: { name: "..." }, currency: "AED" }
    if (body.action === "get") {
      const settings = {};
      for (let i = 1; i < rows.length; i++) {
        const key = String(rows[i][0] || "").trim();
        if (!key) continue;
        let value = rows[i][1];
        const parts = key.split(".");
        const lastKey = parts[parts.length - 1];
        if (NUMBER_KEYS.includes(lastKey)) value = Number(value);
        if (BOOLEAN_KEYS.includes(lastKey)) value = String(value).trim().toLowerCase().startsWith("true");
        let current = settings;
        for (let j = 0; j < parts.length - 1; j++) {
          if (!current[parts[j]]) current[parts[j]] = {};
          current = current[parts[j]];
        }
        current[lastKey] = value;
      }
      return jsonResponse({ success: true, settings: settings });
    }

    // UPDATE SETTINGS -> only rows that already exist in the sheet
    if (body.action === "update") {
      const updates = body.updates;
      if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw new Error("Invalid updates");

      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const keyRows = {};
        for (let i = 1; i < rows.length; i++) {
          const key = String(rows[i][0] || "").trim();
          if (key) keyRows[key] = i + 1;
        }
        for (const [key, value] of Object.entries(updates)) {
          if (!Object.prototype.hasOwnProperty.call(keyRows, key)) throw new Error("Unknown setting: " + key);
          const lastKey = key.split(".").pop();
          let finalValue = value;
          if (NUMBER_KEYS.includes(lastKey)) {
            finalValue = Number(value);
            if (!Number.isFinite(finalValue)) throw new Error("Invalid number: " + key);
          }
          if (BOOLEAN_KEYS.includes(lastKey)) finalValue = String(value).toLowerCase() === "true";
          // Keep text as text (stops "=..." formulas and "+971..." phone numbers being changed).
          const cell = sheet.getRange(keyRows[key], 2);
          if (typeof finalValue === "string") cell.setNumberFormat("@");
          cell.setValue(finalValue);
        }
      } finally {
        lock.releaseLock();
      }
      return jsonResponse({ success: true, message: "Settings updated successfully" });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
