// pages/api/rundown.js
// POST /api/rundown
// Body: { rows: [[Mulai, Selesai, Acara, Durasi, PIC], ...] }
// Ekivalen dengan: google.script.run.saveRundown(rows)

import { getSheetsClient, SPREADSHEET_ID } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "Parameter 'rows' harus berupa array" });
  }

  try {
    const sheets = getSheetsClient();

    // Clear isi sheet, lalu tulis ulang (sama dengan GAS clearContents + appendRow)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: "Rundown",
    });

    const header = [["Mulai", "Selesai", "Acara", "Durasi", "PIC"]];
    const allRows = rows.length > 0 ? [header[0], ...rows] : header;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Rundown!A1",
      valueInputOption: "RAW",
      requestBody: { values: allRows },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[rundown]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
