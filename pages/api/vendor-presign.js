// pages/api/vendor-presign.js
// POST /api/vendor-presign
// Body: { fileName, fileType, fileSize }
// Mengembalikan presigned URL agar browser bisa upload LANGSUNG ke Backblaze B2
// (skip server, sehingga tidak kena limit body request Vercel ~4.5MB)
// Bucket PRIVATE — tidak perlu kartu kredit untuk verifikasi.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const config = { api: { bodyParser: true } };

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function getS3Client() {
  return new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`, // contoh: s3.us-west-004.backblazeb2.com
    region: process.env.B2_REGION || "us-west-004",
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    // Backblaze B2 butuh path-style URL (endpoint/bucket/key)
    // bukan virtual-hosted style (bucket.endpoint/key) yang jadi default AWS SDK v3
    forcePathStyle: true,
    // Backblaze B2 tidak support checksum CRC32 yang ditambahkan AWS SDK v3.700+
    // Tanpa ini, presigned URL akan mengandung x-amz-checksum-crc32 yang
    // menyebabkan CORS preflight gagal karena B2 tidak mengenali header tersebut.
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
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ success: false, error: "Tipe file tidak didukung: " + fileType });
  }
  if (fileSize && fileSize > MAX_SIZE) {
    return res.status(400).json({ success: false, error: "Ukuran file maksimal 200 MB" });
  }

  try {
    const client = getS3Client();
    const ext = (fileName.split(".").pop() || "bin").toLowerCase();
    const key = `wedding-planner/vendor/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ChecksumAlgorithm: undefined, // eksplisit nonaktifkan checksum — B2 tidak support
    });

    // URL ini berlaku 10 menit, cukup untuk upload file besar
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return res.status(200).json({
      success: true,
      uploadUrl, // browser PUT file ke sini
      key,       // simpan untuk referensi / lihat / delete nanti
    });
  } catch (err) {
    console.error("[vendor-presign] error:", err);
    return res.status(500).json({
      success: false,
      error: "Gagal membuat presigned URL: " + err.message,
    });
  }
}
