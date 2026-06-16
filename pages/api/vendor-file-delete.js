// pages/api/vendor-file-delete.js
// DELETE /api/vendor-file-delete
// Body: { fileId }

import { google } from "googleapis";

// Perlu bodyParser untuk membaca JSON body pada DELETE
export const config = { api: { bodyParser: true } };

function getDriveClient() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tidak diset");
  let creds;
  try {
    creds = JSON.parse(credJson);
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON valid");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { fileId } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ success: false, error: "fileId wajib diisi" });
  }

  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true, }), ;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[vendor-file-delete]", err);
    // Jika file sudah tidak ada, anggap sukses
    if (err.code === 404 || err.status === 404) {
      return res.status(200).json({ success: true });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}
