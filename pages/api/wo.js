// pages/api/wo.js
// Sheet "WO" struktur:
// A=ID  B=WOName  C=Gedung  D=Harga  E=DP  F=Pax  G=MUA  H=Fotografer
// I=Katering  J=JumlahMenu  K=JumlahBaju  L=Band  M=Dekorasi  N=MC
// O=JumlahUndangan  P=Transportasi  Q=Honeymoon  R=JumlahRevisi
// S=DurasiKontrak  T=DeadlineDP  U=Rating  V=Catatan

import { getData, appendRow, updateCell, deleteRowById } from "../../lib/sheets";

export const config = { api: { bodyParser: true } };

const SHEET = "WO";

const HEADERS = [
  "ID","WOName","Gedung","Harga","DP","Pax","MUA","Fotografer",
  "Katering","JumlahMenu","JumlahBaju","Band","Dekorasi","MC",
  "JumlahUndangan","Transportasi","Honeymoon","JumlahRevisi",
  "DurasiKontrak","DeadlineDP","Rating","Catatan"
];

// Kolom index (1-based untuk updateCell)
const COL = {
  woname:     2,
  gedung:     3,
  harga:      4,
  dp:         5,
  pax:        6,
  mua:        7,
  fotografer: 8,
  katering:   9,
  jumlahmenu: 10,
  jumlahbaju: 11,
  band:       12,
  dekorasi:   13,
  mc:         14,
  jumlahundangan: 15,
  transportasi:   16,
  honeymoon:      17,
  jumlahrevisi:   18,
  durasiKontrak:  19,
  deadlinedp:     20,
  rating:         21,
  catatan:        22,
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {

    // GET — ambil semua WO
    if (req.method === "GET") {
      const data = await getData(SHEET);
      return res.status(200).json({ success: true, data });
    }

    // POST — tambah WO baru
    if (req.method === "POST") {
      const b = req.body || {};
      if (!b.woname) return res.status(400).json({ success: false, error: "Nama WO wajib diisi" });
      const id = await appendRow(SHEET, [
        b.woname || "", b.gedung || "", b.harga || "", b.dp || "",
        b.pax || "", b.mua || "", b.fotografer || "", b.katering || "",
        b.jumlahmenu || "", b.jumlahbaju || "", b.band || "", b.dekorasi || "",
        b.mc || "", b.jumlahundangan || "", b.transportasi || "", b.honeymoon || "",
        b.jumlahrevisi || "", b.durasiKontrak || "", b.deadlinedp || "",
        b.rating || "", b.catatan || "",
      ]);
      return res.status(200).json({ success: true, id });
    }

    // PATCH — update satu cell
    if (req.method === "PATCH") {
      const { id, field, value } = req.body || {};
      if (!id || !field) return res.status(400).json({ success: false, error: "id dan field wajib" });
      const colIndex = COL[field.toLowerCase()];
      if (!colIndex) return res.status(400).json({ success: false, error: "Field tidak valid: " + field });
      await updateCell(SHEET, id, colIndex, value ?? "");
      return res.status(200).json({ success: true });
    }

    // DELETE — hapus WO
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: "id wajib" });
      await deleteRowById(SHEET, id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });

  } catch (err) {
    console.error("[wo]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
