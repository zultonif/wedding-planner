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

export default async function handler(req, res) {
  try {

    // ── GET ──────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const data = await getData(SHEET);
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] !== undefined) data[i][0] = String(data[i][0]);
        // Parse kolom Files dari JSON string
        if (data[i][9]) {
          try { data[i][9] = JSON.parse(data[i][9]); } catch { data[i][9] = []; }
        } else {
          data[i][9] = [];
        }
      }
      return res.status(200).json({ success: true, data });
    }

    // ── POST: tambah vendor ───────────────────────────────────────────────
    if (req.method === "POST") {
      const { nama, kategori, desc, phone, harga, address, social } = req.body;
      if (!nama) return res.status(400).json({ error: "Nama vendor wajib diisi" });
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
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID wajib diisi" });
      const ok = await deleteRowById(SHEET, id);
      return res.status(200).json({ success: ok });
    }

    // ── PATCH: update field atau tambah/hapus file ────────────────────────
    if (req.method === "PATCH") {
      const { id, field, value } = req.body;
      if (!id || !field) return res.status(400).json({ error: "ID dan field wajib diisi" });

      if (field === "addFile") {
        // value = {fileId, name, mimeType, viewUrl, downloadUrl, size}
        // Baca files yang ada dulu
        const data = await getData(SHEET);
        const row = data.find(r => String(r[0]) === String(id));
        let files = [];
        if (row && row[9]) {
          try { files = typeof row[9] === 'string' ? JSON.parse(row[9]) : row[9]; } catch { files = []; }
        }
        files.push(value);
        const ok = await updateCell(SHEET, id, COL.files, JSON.stringify(files));
        return res.status(200).json({ success: ok, files });
      }

      if (field === "removeFile") {
        // value = fileId yang dihapus
        const data = await getData(SHEET);
        const row = data.find(r => String(r[0]) === String(id));
        let files = [];
        if (row && row[9]) {
          try { files = typeof row[9] === 'string' ? JSON.parse(row[9]) : row[9]; } catch { files = []; }
        }
        files = files.filter(f => f.fileId !== value);
        const ok = await updateCell(SHEET, id, COL.files, JSON.stringify(files));
        return res.status(200).json({ success: ok, files });
      }

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
