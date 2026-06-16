// pages/api/vendor-file-delete.js
// DELETE /api/vendor-file-delete
// Body: { fileId }
// Hapus file dari Google Drive

import { google } from "googleapis";

function getDriveClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: "fileId wajib diisi" });

  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[vendor-file-delete]", err);
    // Jika file sudah tidak ada, anggap sukses
    if (err.code === 404) return res.status(200).json({ success: true });
    return res.status(500).json({ success: false, error: err.message });
  }
}
