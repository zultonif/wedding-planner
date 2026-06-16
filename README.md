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
