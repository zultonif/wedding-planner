// pages/api/updateItemName.js
// PATCH /api/updateItemName
// Body: { sheet, id, newName }
// Ekivalen dengan: google.script.run.updateItemName(sheetName, id, newName)
// Kolom 2 = Nama (B)

import { updateCell } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, id, newName } = req.body;
  if (!sheet || id === undefined || !newName) {
    return res.status(400).json({ error: "Parameter sheet, id, newName wajib diisi" });
  }

  try {
    const ok = await updateCell(sheet, id, 2, newName); // kolom B = Nama
    return res.status(200).json({ success: ok });
  } catch (err) {
    console.error("[updateItemName]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
