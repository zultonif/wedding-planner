// pages/api/vendor.js
// GET    /api/vendor                        → getVendors()
// POST   /api/vendor                        → addVendor(data)
// DELETE /api/vendor  body:{id}             → deleteVendor(id)
// PATCH  /api/vendor  body:{id,field,value} → updateVendorField(id,field,value)
//
// Sheet "Vendor" kolom:
// A=ID  B=Nama  C=Kategori  D=Deskripsi  E=Phone  F=Harga  G=Alamat  H=Social  I=Status

import { getSheetsClient, SPREADSHEET_ID, deleteRowById } from "../../lib/sheets";

const SHEET = "Vendor";
const HEADER = ["ID","Nama","Kategori","Deskripsi","Phone","Harga","Alamat","Social","Status"];

async function getVendors() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [HEADER];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== undefined) rows[i][0] = String(rows[i][0]);
  }
  return rows;
}

async function addVendor({ nama, kategori, desc, phone, harga, address, social }) {
  const sheets = getSheetsClient();
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET}!A:A`,
  });
  const id = String((existing.data.values || []).length);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET,
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, nama||"", kategori||"Lainnya", desc||"", String(phone||""), Number(harga)||0, address||"", social||"", "Aktif"]],
    },
  });
  return id;
}

async function updateVendorField(id, field, value) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET}!A:A`,
  });
  const col = res.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(id)) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return false;
  const colMap = { nama:"B", kategori:"C", desc:"D", phone:"E", harga:"F", address:"G", social:"H", status:"I" };
  const colLetter = colMap[field];
  if (!colLetter) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET}!${colLetter}${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
  return true;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const data = await getVendors();
      return res.status(200).json({ success: true, data });
    }
    if (req.method === "POST") {
      const { nama } = req.body;
      if (!nama) return res.status(400).json({ error: "Nama vendor wajib diisi" });
      const id = await addVendor(req.body);
      return res.status(200).json({ success: true, id });
    }
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID wajib diisi" });
      const ok = await deleteRowById(SHEET, id);
      return res.status(200).json({ success: ok });
    }
    if (req.method === "PATCH") {
      const { id, field, value } = req.body;
      if (!id || !field) return res.status(400).json({ error: "ID dan field wajib diisi" });
      const ok = await updateVendorField(id, field, value);
      return res.status(200).json({ success: ok });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[vendor]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
