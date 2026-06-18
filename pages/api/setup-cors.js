// pages/api/setup-cors.js
// TEMPORARY — hapus file ini setelah CORS berhasil diset!
// Akses sekali via browser: https://wedding-planner-rjpt.vercel.app/api/setup-cors

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  // Keamanan: hanya bisa diakses sekali via GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const client = new S3Client({
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

  try {
    // Set CORS
    await client.send(new PutBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD", "DELETE", "POST"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        }],
      },
    }));

    // Verifikasi
    const result = await client.send(new GetBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME,
    }));

    return res.status(200).json({
      success: true,
      message: "✅ CORS berhasil diset! Sekarang coba upload lagi. Lalu hapus file ini.",
      corsRules: result.CORSRules,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
