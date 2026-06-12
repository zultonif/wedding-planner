// pages/api/addItem.js
// POST /api/addItem
// Body: { sheet: "Lamaran", nama: "Cincin" }
// Ekivalen dengan: google.script.run.addItem(sheetName, nama)

import { appendRow } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, nama } = req.body;
  if (!sheet || !nama) {
    return res.status(400).json({ error: "Parameter 'sheet' dan 'nama' wajib diisi" });
  }

  try {
    // appendRow akan otomatis prepend ID, lalu append: Status, Budget, Link
    const id = await appendRow(sheet, [nama, "Belum Mulai", 0, ""]);
    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error("[addItem]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
