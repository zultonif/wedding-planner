// pages/api/vendor-upload.js
// POST /api/vendor-upload
// multipart/form-data: file (PDF/gambar), vendorId

import { google } from "googleapis";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false, // jangan batasi ukuran response
    sizeLimit: '10mb',    // izinkan request body sampai 10mb di level Next.js
  },
};

const FOLDER_ID = "1xylxO2-hny8hNhCBHuOO5duP6Cqhh6tS";

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
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (parseErr) {
    console.error("[vendor-upload] parse error:", parseErr);
    // formidable melempar error kalau file terlalu besar
    const isTooBig = parseErr.message?.includes('maxFileSize') || parseErr.code === 1009;
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

  let drive;
  try {
    drive = getDriveClient();
  } catch (credErr) {
    return res.status(500).json({ success: false, error: credErr.message });
  }

  try {
    const uploaded = await drive.files.create({
      requestBody: {
        name: file.originalFilename || file.newFilename || "upload",
        parents: 1xylxO2-hny8hNhCBHuOO5duP6Cqhh6tS,
        mimeType: mime,
      },
      media: {
        mimeType: mime,
        body: fs.createReadStream(file.filepath),
      },
      fields: "id, name, mimeType, size",
    });

    const fileId = uploaded.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const isImage = mime.startsWith("image/");
    const viewUrl = isImage
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
      : `https://drive.google.com/file/d/${fileId}/preview`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

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
    try { fs.unlink(file.filepath, () => {}); } catch (_) {}
    return res.status(500).json({
      success: false,
      error: "Gagal upload ke Drive: " + driveErr.message,
    });
  }
}
