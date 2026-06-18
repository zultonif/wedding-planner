// pages/api/vendor-upload.js
// POST /api/vendor-upload
// Dipanggil SETELAH browser berhasil PUT file ke Backblaze B2 via presigned URL.
// Endpoint ini hanya mencatat metadata (tidak menerima file lagi), sehingga
// tidak kena limit body request Vercel — cocok untuk file besar (hingga 200MB).
// Bucket PRIVATE: viewUrl/downloadUrl dibuat on-demand lewat /api/vendor-view
// karena presigned URL kadaluarsa, jadi tidak bisa disimpan permanen.
// Body: { key, name, mimeType, size }

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { key, name, mimeType, size } = req.body || {};

  if (!key) {
    return res.status(400).json({ success: false, error: "Data file tidak lengkap" });
  }

  const isImage = (mimeType || "").startsWith("image/");

  // viewUrl/downloadUrl TIDAK dibuat di sini (akan expired).
  // Frontend akan panggil /api/vendor-view?key=... setiap kali user klik "Lihat"/"Download".
  return res.status(200).json({
    success: true,
    fileId: key,
    name: name || "upload",
    mimeType,
    size,
    isImage,
  });
}
