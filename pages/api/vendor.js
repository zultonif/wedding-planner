// pages/api/vendor.js
// GET    /api/vendor
// POST   /api/vendor  body:{nama,...}
// DELETE /api/vendor  body:{id}
// PATCH  /api/vendor  body:{id,field,value}
//
// Sheet "Vendor" kolom:
// A=ID  B=Nama  C=Kategori  D=Deskripsi  E=Phone  F=Harga  G=Alamat  H=Social  I=Status  J=Files (JSON)

import {
  getData,
  appendRow,
  updateCell,
  deleteRowById,
} from "../../lib/sheets";

// Pastikan bodyParser aktif untuk metode POST/DELETE/PATCH yang pakai JSON
export const config = { api: { bodyParser: true } };

const SHEET = "Vendor";

const COL = {
  nama:     2,  // B
  kategori: 3,  // C
  desc:     4,  // D
  phone:    5,  // E
  harga:    6,  // F
  address:  7,  // G
  social:   8,  // H
  status:   9,  // I
  files:    10, // J — JSON array of {fileId,name,mimeType,viewUrl,downloadUrl}
};

// Helper: pastikan kolom Files selalu array
function parseFiles(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default async function handler(req, res) {
  // Selalu set header JSON supaya client tidak pernah dapat "unexpected input"
  res.setHeader("Content-Type", "application/json");

  try {

    // ── GET ──────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const data = await getData(SHEET);
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] !== undefined) data[i][0] = String(data[i][0]);
        // Parse kolom Files dari JSON string
        data[i][9] = parseFiles(data[i][9]);
      }
      return res.status(200).json({ success: true, data });
    }

    // ── POST: tambah vendor ───────────────────────────────────────────────
    if (req.method === "POST") {
      const body = req.body || {};
      const { nama, kategori, desc, phone, harga, address, social } = body;
      if (!nama) return res.status(400).json({ success: false, error: "Nama vendor wajib diisi" });
      const id = await appendRow(SHEET, [
        nama,
        kategori || "Lainnya",
        desc || "",
        String(phone || ""),
        Number(harga) || 0,
        address || "",
        social || "",
        "Aktif",
        "[]", // kolom J: files kosong
      ]);
      return res.status(200).json({ success: true, id });
    }

    // ── DELETE: hapus vendor ──────────────────────────────────────────────
    if (req.method === "DELETE") {
      const body = req.body || {};
      const { id } = body;
      if (!id) return res.status(400).json({ success: false, error: "ID wajib diisi" });
      const ok = await deleteRowById(SHEET, id);
      return res.status(200).json({ success: !!ok });
    }

    // ── PATCH: update field atau tambah/hapus file ────────────────────────
    if (req.method === "PATCH") {
      const body = req.body || {};
      const { id, field, value } = body;
      if (!id || !field) return res.status(400).json({ success: false, error: "ID dan field wajib diisi" });

      if (field === "addFile") {
        // value = {fileId, name, mimeType, viewUrl, downloadUrl, size}
        const data = await getData(SHEET);
        const row = data.find(r => String(r[0]) === String(id));
        const files = parseFiles(row && row[9]);
        files.push(value);
        const ok = await updateCell(SHEET, id, COL.files, JSON.stringify(files));
        return res.status(200).json({ success: !!ok, files });
      }

      if (field === "removeFile") {
        // value = fileId yang dihapus
        const data = await getData(SHEET);
        const row = data.find(r => String(r[0]) === String(id));
        let files = parseFiles(row && row[9]);
        files = files.filter(f => f.fileId !== value);
        const ok = await updateCell(SHEET, id, COL.files, JSON.stringify(files));
        return res.status(200).json({ success: !!ok, files });
      }

      const colIndex = COL[field];
      if (!colIndex) return res.status(400).json({ success: false, error: "Field tidak valid: " + field });
      const ok = await updateCell(SHEET, id, colIndex, value ?? "");
      return res.status(200).json({ success: !!ok });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });

  } catch (err) {
    console.error("[vendor]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
