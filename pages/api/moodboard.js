// pages/api/moodboard.js
// GET    /api/moodboard             — ambil semua item
// POST   /api/moodboard             — tambah item baru (image atau text)
// DELETE /api/moodboard  body:{id}  — hapus item
// PATCH  /api/moodboard  body:{id,field,value} — update field
//
// Sheet "MOODBOARD" kolom:
// A=ID  B=Type  C=Content  D=Section  E=Title  F=Note  G=CreatedAt

import {
  getData,
  appendRow,
  updateCell,
  deleteRowById,
  findRowById,
  getSheetsClient,
} from "../../lib/sheets";

export const config = { api: { bodyParser: true } };

const SHEET = "MOODBOARD";

const COL = {
  type:      2, // B
  content:   3, // C — URL untuk image, teks utama untuk text
  section:   4, // D
  title:     5, // E
  note:      6, // F
  createdAt: 7, // G
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {

    // ── GET: ambil semua item moodboard ──────────────────────────────────
    if (req.method === "GET") {
      const data = await getData(SHEET);
      // Ensure ID is always string
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] !== undefined) data[i][0] = String(data[i][0]);
      }
      return res.status(200).json({ success: true, data });
    }

    // ── POST: tambah item baru ────────────────────────────────────────────
    if (req.method === "POST") {
      const body = req.body || {};
      const { type, content, section, title, note } = body;

      if (!type || !["image", "text"].includes(type)) {
        return res.status(400).json({ success: false, error: "type harus 'image' atau 'text'" });
      }
      if (!content) {
        return res.status(400).json({ success: false, error: "content wajib diisi" });
      }

      const createdAt = new Date().toISOString();
      const id = await appendRow(SHEET, [
        type,
        content,
        section || "Lainnya",
        title || "",
        note || "",
        createdAt,
      ]);

      return res.status(200).json({ success: true, id });
    }

    // ── DELETE: hapus item ─────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: "id wajib diisi" });

      const ok = await deleteRowById(SHEET, id);
      if (!ok) return res.status(404).json({ success: false, error: "Item tidak ditemukan" });
      return res.status(200).json({ success: true });
    }

    // ── PATCH: update field ────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, field, value } = req.body || {};
      if (!id || !field) return res.status(400).json({ success: false, error: "id dan field wajib diisi" });

      const colIdx = COL[field];
      if (!colIdx) return res.status(400).json({ success: false, error: "Field tidak valid: " + field });

      const ok = await updateCell(SHEET, id, colIdx, value ?? "");
      if (!ok) return res.status(404).json({ success: false, error: "Item tidak ditemukan" });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });

  } catch (err) {
    console.error("[moodboard]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
