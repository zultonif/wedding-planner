// pages/api/vendor-file-delete.js
// DELETE /api/vendor-file-delete
// Body: { fileId }  ← fileId di sini adalah "key" dari Backblaze B2

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const config = { api: { bodyParser: true } };

function getS3Client() {
  return new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
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
    const client = getS3Client();
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: fileId,
    }));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[vendor-file-delete]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
