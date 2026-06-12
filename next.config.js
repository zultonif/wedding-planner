/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tidak ada React pages — Next.js hanya dipakai sebagai API server.
  // File index.html di /public/ langsung di-serve oleh Next.js static file serving.
  // Semua route /api/* tetap berjalan normal.
};

module.exports = nextConfig;
