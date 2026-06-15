# 💒 Wedding Planner

Data Google Sheets **tidak berubah**. Spreadsheet ID dan struktur sheet tetap sama persis.  
Yang berubah hanya cara backend memanggil Sheets: dari `google.script.run` ke REST API via Service Account.

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
