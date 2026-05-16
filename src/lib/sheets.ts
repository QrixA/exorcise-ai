import { google } from "googleapis";

function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export interface SheetRow {
  name: string;
  email: string;
  company: string;
  role: string;
  interests: string;
}

export async function readSheetData(): Promise<SheetRow[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) throw new Error("GOOGLE_SHEET_ID not configured");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A2:E", // Skip header row
  });

  const rows = response.data.values || [];

  return rows
    .map((row) => ({
      name: (row[0] || "").trim(),
      email: (row[1] || "").trim().toLowerCase(),
      company: (row[2] || "").trim(),
      role: (row[3] || "").trim(),
      interests: (row[4] || "").trim(),
    }))
    .filter((row) => row.email && row.email.includes("@"));
}
