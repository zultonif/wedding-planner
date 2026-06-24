// pages/api/moodboard-delete.js
// DELETE /api/moodboard-delete
// Body: { key } — hapus file dari Backblaze B2

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getS3Client() {
  return new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION || "us-west-004",
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { key } = req.body || {};
  if (!key) {
    return res.status(400).json({ success: false, error: "key wajib diisi" });
  }

  try {
    const client = getS3Client();
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    }));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[moodboard-delete] error:", err);
    return res.status(500).json({ success: false, error: "Gagal menghapus file: " + err.message });
  }
}
