// pages/api/vendor.js
// GET    /api/vendor                         → ambil semua vendor
// POST   /api/vendor  body:{nama,...}        → tambah vendor
// DELETE /api/vendor  body:{id}              → hapus vendor
// PATCH  /api/vendor  body:{id,field,value}  → update satu field
//
// Sheet "Vendor" kolom (sesuai appendRow yang prepend ID otomatis):
// A=ID  B=Nama  C=Kategori  D=Deskripsi  E=Phone  F=Harga  G=Alamat  H=Social  I=Status 

import {
  getSheetsClient,
  SPREADSHEET_ID,
  getData,
  appendRow,
  updateCell,
  deleteRowById,
} from "../../lib/sheets";

const SHEET = "Vendor";

// Map nama field → nomor kolom (1-based, A=1)
const COL = {
  nama:     2,  // B
  kategori: 3,  // C
  desc:     4,  // D
  phone:    5,  // E
  harga:    6,  // F
  address:  7,  // G
  social:   8,  // H
  status:   9,  // I
};

export default async function handler(req, res) {
  try {
    // ── GET: ambil semua vendor ──────────────────────────────────────────
    if (req.method === "GET") {
      const data = await getData(SHEET);
      // Paksa ID kolom A jadi string
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] !== undefined) data[i][0] = String(data[i][0]);
      }
      return res.status(200).json({ success: true, data });
    }

    // ── POST: tambah vendor baru ─────────────────────────────────────────
    if (req.method === "POST") {
      const { nama, kategori, desc, phone, harga, address, social } = req.body;
      if (!nama) return res.status(400).json({ error: "Nama vendor wajib diisi" });

      // appendRow otomatis prepend ID dan append ke sheet
      const id = await appendRow(SHEET, [
        nama,
        kategori || "Lainnya",
        desc || "",
        String(phone || ""),
        Number(harga) || 0,
        address || "",
        social || "",
        "Aktif",
      ]);

      return res.status(200).json({ success: true, id });
    }

    // ── DELETE: hapus vendor ─────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID wajib diisi" });
      const ok = await deleteRowById(SHEET, id);
      return res.status(200).json({ success: ok });
    }

    // ── PATCH: update satu field vendor ─────────────────────────────────
    if (req.method === "PATCH") {
      const { id, field, value } = req.body;
      if (!id || !field) return res.status(400).json({ error: "ID dan field wajib diisi" });
      const colIndex = COL[field];
      if (!colIndex) return res.status(400).json({ error: "Field tidak valid: " + field });
      const ok = await updateCell(SHEET, id, colIndex, value ?? "");
      return res.status(200).json({ success: ok });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error("[vendor]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
