// pages/api/moodboard-view.js
// GET /api/moodboard-view?key=...
// Generate presigned URL untuk LIHAT foto moodboard dari bucket PRIVATE.

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ success: false, error: "key wajib diisi" });
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    });

    // URL berlaku 2 jam — cukup untuk session moodboard
    const url = await getSignedUrl(client, command, { expiresIn: 7200 });

    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error("[moodboard-view] error:", err);
    return res.status(500).json({ success: false, error: "Gagal mengambil foto: " + err.message });
  }
}
