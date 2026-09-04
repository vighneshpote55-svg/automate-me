var LEAD_SHEET_NAME = "Leads";
var LEAD_HEADERS = [
  "Lead ID",
  "Timestamp",
  "Name",
  "Phone",
  "Email",
  "College",
  "Course",
  "Branch",
  "Project Type",
  "Domain",
  "Submission Deadline",
  "Project Requirement",
  "Source",
  "Status",
  "Consent",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "Landing Page",
  "Referrer",
  "Admin Email Sent"
];

function doGet() {
  return jsonResponse_({ success: true, service: "Automate Me lead form" });
}

function doPost(e) {
  try {
    var input = e && e.parameter ? e.parameter : {};

    // Return a harmless success for honeypot submissions without saving anything.
    if (cleanText_(input.website, 200, false)) {
      return jsonResponse_({ success: true });
    }

    var lead = normalizeLead_(input);
    if (!isValidLead_(lead)) {
      return jsonResponse_({ success: false, message: "Unable to submit your enquiry." });
    }

    var properties = PropertiesService.getScriptProperties();
    var spreadsheetId = cleanText_(properties.getProperty("SPREADSHEET_ID"), 300, false);
    if (!spreadsheetId) throw new Error("Missing SPREADSHEET_ID script property.");

    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var timestamp = new Date();
    var leadId = createLeadId_(timestamp);
    var writeResult = saveLead_(spreadsheet, leadId, timestamp, lead);

    var adminEmail = cleanText_(properties.getProperty("ADMIN_EMAIL"), 320, false);
    if (adminEmail && isValidEmail_(adminEmail)) {
      try {
        sendAdminEmail_(adminEmail, leadId, timestamp, lead);
        markAdminEmailSent_(writeResult.sheet, writeResult.rowNumber, leadId);
      } catch (emailError) {
        // The lead remains saved even if Gmail quota or email delivery fails.
        console.error("Admin email failed for lead " + leadId + ": " + emailError.message);
      }
    }

    return jsonResponse_({ success: true });
  } catch (error) {
    console.error("Lead submission failed: " + error.message);
    return jsonResponse_({ success: false, message: "Unable to submit your enquiry. Please try again." });
  }
}

function normalizeLead_(input) {
  return {
    name: cleanText_(input.name, 120, false),
    phone: cleanText_(input.phone, 40, false),
    email: cleanText_(input.email, 180, false),
    college: cleanText_(input.college, 180, false),
    course: cleanText_(input.course, 120, false),
    branch: cleanText_(input.branch, 160, false),
    projectType: cleanText_(input.project_type, 120, false),
    domain: cleanText_(input.domain, 120, false),
    deadline: cleanText_(input.deadline, 120, false),
    message: cleanText_(input.message, 2500, true),
    source: cleanText_(input.source, 100, false) || "website_full_form",
    consent: String(input.consent || "").toLowerCase() === "true" ? "Yes" : "No",
    utmSource: cleanText_(input.utm_source, 200, false),
    utmMedium: cleanText_(input.utm_medium, 200, false),
    utmCampaign: cleanText_(input.utm_campaign, 200, false),
    utmContent: cleanText_(input.utm_content, 200, false),
    utmTerm: cleanText_(input.utm_term, 200, false),
    landingPage: cleanText_(input.landing_page, 1000, false),
    referrer: cleanText_(input.referrer, 1000, false)
  };
}

function isValidLead_(lead) {
  if (!lead.name || lead.name.length < 2) return false;
  if (!lead.message) return false;
  if (!isValidPhone_(lead.phone)) return false;
  if (lead.email && !isValidEmail_(lead.email)) return false;
  return true;
}

function isValidPhone_(phone) {
  if (!/^[+()\-\s0-9]{7,25}$/.test(phone)) return false;
  var digitCount = phone.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanText_(value, maxLength, multiline) {
  if (value === undefined || value === null) return "";
  var text = String(value).replace(/\u0000/g, "");

  if (multiline) {
    text = text
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    text = text.replace(/\s+/g, " ").trim();
  }

  return text.slice(0, maxLength);
}

function createLeadId_(timestamp) {
  var timezone = Session.getScriptTimeZone() || "Asia/Kolkata";
  var datePart = Utilities.formatDate(timestamp, timezone, "yyyyMMdd");
  var randomPart = Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
  return "AM-" + datePart + "-" + randomPart;
}

function saveLead_(spreadsheet, leadId, timestamp, lead) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = spreadsheet.getSheetByName(LEAD_SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(LEAD_SHEET_NAME);
    ensureHeaders_(sheet);

    var rowNumber = sheet.getLastRow() + 1;
    var row = [
      leadId,
      timestamp,
      lead.name,
      lead.phone,
      lead.email,
      lead.college,
      lead.course,
      lead.branch,
      lead.projectType,
      lead.domain,
      lead.deadline,
      lead.message,
      lead.source,
      "New",
      lead.consent,
      lead.utmSource,
      lead.utmMedium,
      lead.utmCampaign,
      lead.utmContent,
      lead.utmTerm,
      lead.landingPage,
      lead.referrer,
      "No"
    ].map(sheetSafeValue_);

    sheet.getRange(rowNumber, 1, 1, LEAD_HEADERS.length).setValues([row]);
    return { sheet: sheet, rowNumber: rowNumber };
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() !== 0) return;

  var headerRange = sheet.getRange(1, 1, 1, LEAD_HEADERS.length);
  headerRange.setValues([LEAD_HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0b51b4");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

function sheetSafeValue_(value) {
  if (value instanceof Date) return value;
  var text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function sendAdminEmail_(adminEmail, leadId, timestamp, lead) {
  var timezone = Session.getScriptTimeZone() || "Asia/Kolkata";
  var timestampText = Utilities.formatDate(timestamp, timezone, "yyyy-MM-dd HH:mm:ss Z");
  var subject = "🎓 New Automate Me Project Lead - " + lead.name;
  var fields = [
    ["Lead ID", leadId],
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email || "Not provided"],
    ["College", lead.college || "Not provided"],
    ["Course", lead.course || "Not provided"],
    ["Branch", lead.branch || "Not provided"],
    ["Project Type", lead.projectType || "Not provided"],
    ["Domain", lead.domain || "Not provided"],
    ["Submission Deadline", lead.deadline || "Not provided"],
    ["Project Requirement", lead.message],
    ["Source", lead.source],
    ["UTM Source", lead.utmSource || "Not provided"],
    ["UTM Campaign", lead.utmCampaign || "Not provided"],
    ["Timestamp", timestampText]
  ];

  var plainText = fields.map(function (field) {
    return field[0] + ": " + field[1];
  }).join("\n");

  var htmlRows = fields.map(function (field) {
    return "<tr>" +
      "<td style=\"padding:7px 12px;font-weight:700;vertical-align:top;color:#173a5b\">" + escapeHtml_(field[0]) + "</td>" +
      "<td style=\"padding:7px 12px;color:#334e68;white-space:pre-wrap\">" + escapeHtml_(field[1]) + "</td>" +
      "</tr>";
  }).join("");

  var htmlBody = "<div style=\"font-family:Arial,sans-serif;max-width:720px;color:#102a43\">" +
    "<h2 style=\"margin:0 0 12px;color:#0b51b4\">New Automate Me Project Lead</h2>" +
    "<table style=\"width:100%;border-collapse:collapse;background:#f7fafc;border:1px solid #dce7f1\">" +
    htmlRows +
    "</table></div>";

  MailApp.sendEmail({
    to: adminEmail,
    subject: subject,
    body: plainText,
    htmlBody: htmlBody,
    name: "Automate Me Leads"
  });
}

function markAdminEmailSent_(sheet, rowNumber, leadId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var targetRow = rowNumber;
    if (sheet.getRange(targetRow, 1).getDisplayValue() !== leadId) {
      var match = sheet
        .getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
        .createTextFinder(leadId)
        .matchEntireCell(true)
        .findNext();
      if (!match) return;
      targetRow = match.getRow();
    }
    sheet.getRange(targetRow, LEAD_HEADERS.length).setValue("Yes");
  } finally {
    lock.releaseLock();
  }
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
