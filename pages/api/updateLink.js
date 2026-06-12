// pages/api/updateLink.js
// PATCH /api/updateLink
// Body: { sheet, id, link }
// Ekivalen dengan: google.script.run.updateLink(sheetName, id, link)
// Kolom 5 = Link (E)

import { updateCell } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, id, link } = req.body;
  if (!sheet || id === undefined) {
    return res.status(400).json({ error: "Parameter sheet dan id wajib diisi" });
  }

  try {
    const ok = await updateCell(sheet, id, 5, link || ""); // kolom E = Link
    return res.status(200).json({ success: ok });
  } catch (err) {
    console.error("[updateLink]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
