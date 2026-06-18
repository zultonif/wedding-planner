// pages/api/setup-cors.js
// TEMPORARY — hapus setelah CORS berhasil!

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
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

  // Cek env dulu
  const envCheck = {
    B2_ENDPOINT: process.env.B2_ENDPOINT || "❌ KOSONG",
    B2_REGION: process.env.B2_REGION || "❌ KOSONG",
    B2_KEY_ID: process.env.B2_KEY_ID || "❌ KOSONG",
    B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY ? "✅ ada" : "❌ KOSONG",
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || "❌ KOSONG",
  };

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

    // Verifikasi langsung
    const result = await client.send(new GetBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME,
    }));

    return res.status(200).json({
      success: true,
      message: "✅ CORS berhasil diset! Coba upload lagi. Lalu hapus file ini.",
      env: envCheck,
      corsRules: result.CORSRules,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      env: envCheck,
    });
  }
}
