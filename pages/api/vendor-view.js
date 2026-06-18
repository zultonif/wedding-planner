// pages/api/vendor-view.js
// GET /api/vendor-view?key=...
// Generate presigned URL untuk LIHAT/DOWNLOAD file dari bucket PRIVATE.
// Diperlukan karena bucket private tidak punya URL publik statis.

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

    // URL berlaku 1 jam — cukup untuk lihat/download, lalu expired demi keamanan
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error("[vendor-view] error:", err);
    return res.status(500).json({ success: false, error: "Gagal mengambil file: " + err.message });
  }
}
