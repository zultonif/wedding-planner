// pages/api/vendor-upload.js
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
    const form = new IncomingForm({ maxFileSize: 8 * 1024 * 1024, keepExtensions: true });
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
    const isTooBig = parseErr.message?.includes("maxFileSize") || parseErr.code === 1009;
    return res.status(413).json({
      success: false,
      error: isTooBig ? "File terlalu besar. Maksimal 8 MB." : "Gagal membaca file: " + parseErr.message,
    });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ success: false, error: "File wajib disertakan" });

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
  const mime = file.mimetype || file.type || "";
  if (!allowedTypes.includes(mime)) {
    fs.unlink(file.filepath, () => {});
    return res.status(400).json({ success: false, error: "Tipe file tidak didukung: " + mime });
  }

  try {
    const isImage = mime.startsWith("image/");

    // Gambar pakai resource_type "image", PDF pakai "raw"
    const resourceType = isImage ? "image" : "raw";

    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: "wedding-planner/vendor",
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      // Untuk PDF: paksa Content-Type application/pdf agar browser bisa buka
      ...(isImage ? {} : { format: "pdf" }),
    });

    fs.unlink(file.filepath, () => {});

    const fileId = uploadResult.public_id;

    let viewUrl;
    if (isImage) {
      viewUrl = uploadResult.secure_url;
    } else {
      // URL raw PDF dengan .pdf extension eksplisit — browser buka sebagai PDF
      viewUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${fileId}.pdf`;
    }

    const downloadUrl = cloudinary.url(fileId, {
      resource_type: resourceType,
      flags: "attachment",
      secure: true,
    });

    return res.status(200).json({
      success: true,
      fileId,
      resourceType,
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
