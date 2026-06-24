// pages/api/moodboard-presign.js
// POST /api/moodboard-presign
// Body: { fileName, fileType, fileSize }
// Menggunakan infrastruktur yang sama dengan vendor-presign
// Folder terpisah: wedding-planner/moodboard/

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const config = { api: { bodyParser: true } };

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB per foto

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

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

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { fileName, fileType, fileSize } = req.body || {};

  if (!fileName || !fileType) {
    return res.status(400).json({ success: false, error: "fileName dan fileType wajib diisi" });
  }

  // Accept HEIC as image/jpeg in some cases
  const normalizedType = fileType === "image/heic" || fileType === "image/heif"
    ? "image/jpeg"
    : fileType;

  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ success: false, error: "Hanya gambar yang diizinkan (JPG, PNG, WEBP, GIF)" });
  }

  if (fileSize && fileSize > MAX_SIZE) {
    return res.status(400).json({ success: false, error: "Ukuran foto maksimal 50 MB per file" });
  }

  try {
    const client = getS3Client();
    const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
    const key = `wedding-planner/moodboard/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      ContentType: normalizedType,
      ChecksumAlgorithm: undefined,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
    });
  } catch (err) {
    console.error("[moodboard-presign] error:", err);
    return res.status(500).json({
      success: false,
      error: "Gagal membuat presigned URL: " + err.message,
    });
  }
}
