// pages/api/vendor-upload.js
// POST /api/vendor-upload
// multipart/form-data: file (PDF/gambar), vendorId
// Upload file ke Google Drive, return fileId + viewUrl

import { google } from "googleapis";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const FOLDER_ID = "1tOLyM_4iURANXU7NJO2L9N6up0h8INHu";

function getDriveClient() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tidak diset");
  let creds;
  try {
    creds = JSON.parse(credJson);
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON valid: " + e.message);
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  return google.drive({ version: "v3", auth });
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 8 * 1024 * 1024, // 8 MB
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  // Always set JSON content-type so client never gets "unexpected input"
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (parseErr) {
    console.error("[vendor-upload] parse error:", parseErr);
    return res.status(400).json({
      success: false,
      error: "Gagal membaca file upload: " + parseErr.message,
    });
  }

  // formidable v3 kadang returns array
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

  let drive;
  try {
    drive = getDriveClient();
  } catch (credErr) {
    return res.status(500).json({ success: false, error: credErr.message });
  }

  try {
    // Upload ke Google Drive
    const uploaded = await drive.files.create({
      requestBody: {
        name: file.originalFilename || file.newFilename || "upload",
        parents: [FOLDER_ID],
        mimeType: mime,
      },
      media: {
        mimeType: mime,
        body: fs.createReadStream(file.filepath),
      },
      fields: "id, name, mimeType, size",
    });

    const fileId = uploaded.data.id;

    // Set permission publik
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const isImage = mime.startsWith("image/");
    const viewUrl = isImage
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
      : `https://drive.google.com/file/d/${fileId}/preview`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Hapus file temp
    fs.unlink(file.filepath, () => {});

    return res.status(200).json({
      success: true,
      fileId,
      name: uploaded.data.name,
      mimeType: mime,
      size: file.size,
      viewUrl,
      downloadUrl,
      isImage,
    });
  } catch (driveErr) {
    console.error("[vendor-upload] drive error:", driveErr);
    // Cleanup temp file if still exists
    try { fs.unlink(file.filepath, () => {}); } catch (_) {}
    return res.status(500).json({
      success: false,
      error: "Gagal upload ke Drive: " + driveErr.message,
    });
  }
}
