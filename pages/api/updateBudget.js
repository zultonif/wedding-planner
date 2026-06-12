// pages/api/updateBudget.js
// PATCH /api/updateBudget
// Body: { sheet, id, budget }
// Ekivalen dengan: google.script.run.updateBudget(sheetName, id, budget)
// Kolom 4 = Budget (D)

import { updateCell } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet, id, budget } = req.body;
  if (!sheet || id === undefined) {
    return res.status(400).json({ error: "Parameter sheet dan id wajib diisi" });
  }

  try {
    const ok = await updateCell(sheet, id, 4, Number(budget) || 0); // kolom D = Budget
    return res.status(200).json({ success: ok });
  } catch (err) {
    console.error("[updateBudget]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
