// pages/api/updateStatus.js
// PATCH /api/updateStatus
// Body: { sheet, id, status }
// Ekivalen dengan: google.script.run.updateStatus(sheetName, id, status)
// Kolom 3 = Status (C)

import { updateCell } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, id, status } = req.body;
  if (!sheet || id === undefined || !status) {
    return res.status(400).json({ error: "Parameter sheet, id, status wajib diisi" });
  }

  try {
    const ok = await updateCell(sheet, id, 3, status); // kolom C = Status
    return res.status(200).json({ success: ok });
  } catch (err) {
    console.error("[updateStatus]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
