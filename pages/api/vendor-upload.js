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
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  return google.drive({ version: "v3", auth });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse multipart form
    const form = new IncomingForm({ maxFileSize: 8 * 1024 * 1024 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "File wajib disertakan" });

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Tipe file tidak didukung" });
    }

    const drive = getDriveClient();

    // Upload ke Google Drive
    const uploaded = await drive.files.create({
      requestBody: {
        name: file.originalFilename || file.newFilename,
        parents: [FOLDER_ID],
        mimeType: file.mimetype,
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.filepath),
      },
      fields: "id, name, mimeType, size",
    });

    const fileId = uploaded.data.id;

    // Set permission publik agar bisa dilihat semua orang
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // URL untuk preview/lihat
    const isImage = file.mimetype.startsWith("image/");
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
      mimeType: uploaded.data.mimeType,
      size: file.size,
      viewUrl,
      downloadUrl,
      isImage,
    });

  } catch (err) {
    console.error("[vendor-upload]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
