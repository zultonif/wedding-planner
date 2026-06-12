// pages/api/getData.js
// GET /api/getData?sheet=Lamaran
// Ekivalen dengan: google.script.run.getData(sheetName)

import { getData } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sheet } = req.query;
  if (!sheet) {
    return res.status(400).json({ error: "Parameter 'sheet' wajib diisi" });
  }

  try {
    const data = await getData(sheet);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[getData]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
