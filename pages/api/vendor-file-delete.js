// pages/api/vendor-file-delete.js
// DELETE /api/vendor-file-delete
// Body: { fileId, mimeType }

import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: true } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { fileId, mimeType } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ success: false, error: "fileId wajib diisi" });
  }

  try {
    // Coba hapus sebagai image dulu, kalau gagal coba raw (PDF)
    let destroyed = false;
    for (const rt of ["image", "raw", "video"]) {
      const result = await cloudinary.uploader.destroy(fileId, { resource_type: rt });
      if (result.result === "ok") { destroyed = true; break; }
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[vendor-file-delete]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
