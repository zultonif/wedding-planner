// pages/api/setup-cors.js
// TEMPORARY — hapus setelah CORS berhasil!

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  const logs = [];

  // ── Step 1: Hapus B2 Native CORS via B2 API ──────────────
  try {
    logs.push("⏳ Menghapus B2 Native CORS rules...");

    // Authorize B2 account
    const authStr = Buffer.from(
      `${process.env.B2_KEY_ID}:${process.env.B2_APPLICATION_KEY}`
    ).toString("base64");

    const authRes = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
      headers: { Authorization: `Basic ${authStr}` },
    });
    const auth = await authRes.json();

    if (!authRes.ok) throw new Error("Auth B2 gagal: " + JSON.stringify(auth));
    logs.push("✅ B2 auth sukses, apiUrl: " + auth.apiInfo?.storageApi?.apiUrl);

    const apiUrl = auth.apiInfo?.storageApi?.apiUrl;
    const authToken = auth.authorizationToken;

    // Cari bucket ID
    const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets?accountId=${auth.accountId}&bucketName=${process.env.B2_BUCKET_NAME}`, {
      headers: { Authorization: authToken },
    });
    const listData = await listRes.json();
    const bucket = listData.buckets?.[0];
    if (!bucket) throw new Error("Bucket tidak ditemukan: " + process.env.B2_BUCKET_NAME);
    logs.push("✅ Bucket ditemukan: " + bucket.bucketId);

    // Hapus B2 Native CORS dengan set corsRules: []
    const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId: auth.accountId,
        bucketId: bucket.bucketId,
        corsRules: [], // hapus semua B2 native CORS
      }),
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error("Gagal hapus B2 CORS: " + JSON.stringify(updateData));
    logs.push("✅ B2 Native CORS berhasil dihapus!");

  } catch (err) {
    return res.status(500).json({ success: false, step: "hapus B2 CORS", error: err.message, logs });
  }

  // ── Step 2: Set S3-compatible CORS ───────────────────────
  try {
    logs.push("⏳ Setting S3-compatible CORS...");

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

    const result = await client.send(new GetBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME,
    }));

    logs.push("✅ S3 CORS berhasil diset!");

    return res.status(200).json({
      success: true,
      message: "✅ Selesai! Coba upload lagi. Lalu hapus file setup-cors.js ini.",
      logs,
      corsRules: result.CORSRules,
    });

  } catch (err) {
    return res.status(500).json({ success: false, step: "set S3 CORS", error: err.message, logs });
  }
}
