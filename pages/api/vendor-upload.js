// pages/api/vendor-upload.js
// POST /api/vendor-upload
// multipart/form-data: file (PDF/gambar), vendorId

import { v2 as cloudinary } from "cloudinary";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    sizeLimit: "10mb",
  },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 8 * 1024 * 1024,
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (parseErr) {
    console.error("[vendor-upload] parse error:", parseErr);
    const isTooBig = parseErr.message?.includes("maxFileSize") || parseErr.code === 1009;
    return res.status(413).json({
      success: false,
      error: isTooBig
        ? "File terlalu besar. Maksimal 8 MB."
        : "Gagal membaca file upload: " + parseErr.message,
    });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) {
    return res.status(400).json({ success: false, error: "File wajib disertakan" });
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const mime = file.mimetype || file.type || "";
  if (!allowedTypes.includes(mime)) {
    fs.unlink(file.filepath, () => {});
    return res.status(400).json({
      success: false,
      error: "Tipe file tidak didukung: " + mime,
    });
  }

  try {
    const isImage = mime.startsWith("image/");

    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: "wedding-planner/vendor",
      resource_type: isImage ? "image" : "raw",
      use_filename: true,
      unique_filename: true,
    });

    fs.unlink(file.filepath, () => {});

    const fileId = uploadResult.public_id;
    const viewUrl = uploadResult.secure_url;
    const downloadUrl = cloudinary.url(fileId, {
      resource_type: isImage ? "image" : "raw",
      flags: "attachment",
      secure: true,
    });

    return res.status(200).json({
      success: true,
      fileId,
      name: file.originalFilename || file.newFilename || "upload",
      mimeType: mime,
      size: file.size,
      viewUrl,
      downloadUrl,
      isImage,
    });
  } catch (uploadErr) {
    console.error("[vendor-upload] cloudinary error:", uploadErr);
    try { fs.unlink(file.filepath, () => {}); } catch (_) {}
    return res.status(500).json({
      success: false,
      error: "Gagal upload ke Cloudinary: " + uploadErr.message,
    });
  }
}
