// pages/api/rsvp.js
// GET    /api/rsvp              → getRSVP()
// POST   /api/rsvp              → saveRSVP(name, phone, guest, status)
// DELETE /api/rsvp  body: {id}  → deleteRSVP(id)

import { getSheetsClient, SPREADSHEET_ID, deleteRowById } from "../../lib/sheets";

async function getRSVP() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "RSVP",
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [["ID", "Nama", "Phone", "JumlahTamu", "Status"]];
  }

  // Paksa ID dan Phone menjadi string
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== undefined) rows[i][0] = String(rows[i][0]);
    if (rows[i][2] !== undefined) rows[i][2] = String(rows[i][2]);
  }

  return rows;
}

async function saveRSVP(name, phone, guest, status) {
  const sheets = getSheetsClient();

  // Cek baris terakhir untuk generate ID (sama logika GAS)
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "RSVP!A:A",
  });
  const lastRow = (existing.data.values || []).length;
  const id = lastRow; // ID = jumlah baris sekarang (sebelum append)

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "RSVP",
    valueInputOption: "RAW",
    requestBody: {
      values: [[String(id), name, String(phone), Number(guest) || 1, status || "Hadir"]],
    },
  });

  return id;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const data = await getRSVP();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      const { name, phone, guest, status } = req.body;
      if (!name) return res.status(400).json({ error: "Nama wajib diisi" });
      const id = await saveRSVP(name, phone, guest, status);
      return res.status(200).json({ success: true, id });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID wajib diisi" });
      const ok = await deleteRowById("RSVP", id);
      return res.status(200).json({ success: ok });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[rsvp]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
