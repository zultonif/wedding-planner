# 💒 Wedding Planner — Migrasi GAS → Vercel

Data Google Sheets **tidak berubah**. Spreadsheet ID dan struktur sheet tetap sama persis.  
Yang berubah hanya cara backend memanggil Sheets: dari `google.script.run` ke REST API via Service Account.

---

## Struktur Project

```
wedding-planner/
├── lib/
│   └── sheets.js          # Helper autentikasi + semua operasi Sheets
├── pages/
│   ├── index.js           # Redirect ke /planner
│   ├── planner.js         # Halaman utama (HTML + JS frontend)
│   └── api/
│       ├── getData.js      # GET  /api/getData?sheet=Lamaran
│       ├── addItem.js      # POST /api/addItem
│       ├── deleteItem.js   # DELETE /api/deleteItem
│       ├── updateStatus.js # PATCH /api/updateStatus
│       ├── updateBudget.js # PATCH /api/updateBudget
│       ├── updateItemName.js # PATCH /api/updateItemName
│       ├── updateLink.js   # PATCH /api/updateLink
│       ├── rsvp.js         # GET/POST/DELETE /api/rsvp
│       └── rundown.js      # POST /api/rundown
├── .env.example
├── .gitignore
├── next.config.js
└── package.json
```

---

## LANGKAH 1 — Buat Google Service Account

Service Account adalah "akun robot" yang dipakai Next.js untuk akses Sheets.  
**Ini pengganti OAuth — tidak perlu login manual.**

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru (atau pakai yang sudah ada)
3. Aktifkan **Google Sheets API**:
   - Klik menu ☰ → **APIs & Services** → **Library**
   - Cari "Google Sheets API" → klik **Enable**
4. Buat Service Account:
   - Menu ☰ → **IAM & Admin** → **Service Accounts**
   - Klik **+ Create Service Account**
   - Nama: `wedding-planner` → klik **Create and Continue** → **Done**
5. Buat Key:
   - Klik service account yang baru dibuat
   - Tab **Keys** → **Add Key** → **Create new key** → pilih **JSON**
   - File JSON akan otomatis terdownload — **simpan baik-baik, jangan sampai hilang**

---

## LANGKAH 2 — Beri Akses ke Spreadsheet

Service account perlu diberi izin ke spreadsheet Anda.

1. Buka file JSON yang baru didownload
2. Copy nilai `client_email` (contoh: `wedding-planner@myproject.iam.gserviceaccount.com`)
3. Buka Spreadsheet: `https://docs.google.com/spreadsheets/d/1Jdw7nPh4-Ao8lWIKUPh29SFCEY0rZFxDfyb1ZKrZTFo`
4. Klik tombol **Share** (pojok kanan atas)
5. Paste `client_email` tadi → pilih role **Editor** → klik **Share**

✅ Sekarang service account bisa baca dan tulis spreadsheet Anda.

---

## LANGKAH 3 — Setup Lokal (untuk testing)

```bash
# Clone / masuk folder project
cd wedding-planner

# Install dependencies
npm install

# Buat file environment
cp .env.example .env.local
```

Edit `.env.local` — masukkan seluruh isi JSON key file sebagai satu baris:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"myproject","private_key_id":"abc123","private_key":"-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n","client_email":"wedding-planner@myproject.iam.gserviceaccount.com",...}
```

> ⚠️ **Penting:** `private_key` di dalam JSON mengandung `\n` — pastikan karakter ini tidak diubah menjadi newline sungguhan saat paste.

```bash
# Jalankan development server
npm run dev
```

Buka `http://localhost:3000` — seharusnya tampil Wedding Planner dengan data dari Sheets.

---

## LANGKAH 4 — Deploy ke Vercel

### 4a. Push ke GitHub

```bash
git init
git add .
git commit -m "Wedding Planner - migrasi dari GAS ke Vercel"
git remote add origin https://github.com/USERNAME/wedding-planner.git
git push -u origin main
```

### 4b. Import di Vercel

1. Buka [vercel.com](https://vercel.com) → Login
2. Klik **Add New** → **Project**
3. Pilih repository `wedding-planner` → klik **Import**
4. Framework sudah terdeteksi otomatis sebagai **Next.js**

### 4c. Tambahkan Environment Variable

Di halaman konfigurasi deploy (sebelum klik Deploy):

1. Expand bagian **Environment Variables**
2. **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON`
3. **Value:** paste seluruh isi file JSON sebagai satu baris

   Cara mudah: buka file JSON dengan teks editor, **Select All** → **Copy** → paste di Vercel

4. Klik **Add**
5. Klik **Deploy**

### 4d. Selesai!

Vercel akan memberikan URL seperti `https://wedding-planner-xxx.vercel.app`  
Semua data lama di Sheets tetap terbaca. ✅

---

## Cara Kerja Teknis (Ringkasan)

```
Browser                  Vercel (Next.js)              Google Sheets
  │                           │                              │
  │  fetch('/api/getData')    │                              │
  │ ─────────────────────────>│                              │
  │                           │  Sheets API (Service Account)│
  │                           │ ────────────────────────────>│
  │                           │         rows[]               │
  │                           │ <────────────────────────────│
  │       JSON response       │                              │
  │ <─────────────────────────│                              │
```

| GAS (lama) | Vercel (baru) |
|---|---|
| `google.script.run.getData('Lamaran')` | `fetch('/api/getData?sheet=Lamaran')` |
| `google.script.run.addItem('Lamaran', nama)` | `fetch('/api/addItem', {method:'POST', body:...})` |
| `google.script.run.deleteItem(sheet, id)` | `fetch('/api/deleteItem', {method:'DELETE', body:...})` |
| `google.script.run.updateStatus(...)` | `fetch('/api/updateStatus', {method:'PATCH', body:...})` |
| `google.script.run.saveRSVP(...)` | `fetch('/api/rsvp', {method:'POST', body:...})` |

---

## Troubleshooting

**"GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set"**  
→ Cek apakah env variable sudah ditambahkan di Vercel Settings > Environment Variables.  
→ Setelah menambah env variable di Vercel, perlu redeploy (klik Redeploy di dashboard).

**"The caller does not have permission"**  
→ Spreadsheet belum di-share ke `client_email` service account. Ulangi Langkah 2.

**"Sheet tidak ditemukan: Lamaran"**  
→ Nama sheet di spreadsheet harus persis: `Lamaran`, `Pernikahan`, `Seserahan`, `RSVP`, `Rundown`, `Vendor`.

**Data lama tidak muncul**  
→ Buka spreadsheet langsung dan pastikan sheet ada dan berisi data.  
→ Pastikan Spreadsheet ID di `lib/sheets.js` sesuai: `1Jdw7nPh4-Ao8lWIKUPh29SFCEY0rZFxDfyb1ZKrZTFo`

**private_key error saat deploy**  
→ Vercel kadang menangani `\n` berbeda. Jika gagal, coba tambahkan env variable lewat Vercel CLI:
```bash
npx vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
```
Lalu paste konten JSON saat diminta (mode interaktif lebih aman untuk key panjang).
