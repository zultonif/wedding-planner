// pages/api/deleteItem.js
// DELETE /api/deleteItem
// Body: { sheet: "Lamaran", id: "3" }
// Ekivalen dengan: google.script.run.deleteItem(sheetName, id)

import { deleteRowById } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, id } = req.body;
  if (!sheet || id === undefined) {
    return res.status(400).json({ error: "Parameter 'sheet' dan 'id' wajib diisi" });
  }

  try {
    const ok = await deleteRowById(sheet, id);
    return res.status(200).json({ success: ok });
  } catch (err) {
    console.error("[deleteItem]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
