// lib/sheets.js
// Helper untuk autentikasi dan akses Google Sheets API

import { google } from "googleapis";

const SPREADSHEET_ID = "1Jdw7nPh4-Ao8lWIKUPh29SFCEY0rZFxDfyb1ZKrZTFo";

/**
 * Parse credentials with clear error message
 */
function parseCredentials() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
  }
  try {
    return JSON.parse(credJson);
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON valid: " + e.message);
  }
}

export function getSheetsClient() {
  const credentials = parseCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export { SPREADSHEET_ID };

/**
 * Pastikan tab sheet ada. Jika belum ada, buat tab + header.
 */
async function ensureSheet(sheets, sheetName) {
  // Cek apakah tab sudah ada
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = spreadsheet.data.sheets.some(
    (s) => s.properties.title === sheetName
  );

  if (!exists) {
    // Buat tab baru
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });

    // Tulis header
    const headers = getDefaultHeaders(sheetName);
    if (headers) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }
}

/**
 * Ambil semua data dari sheet tertentu.
 * Auto-create tab + header jika belum ada.
 */
export async function getData(sheetName) {
  const sheets = getSheetsClient();

  await ensureSheet(sheets, sheetName);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = response.data.values || [];

  // Paksa ID di kolom pertama selalu string
  const checklistSheets = ["Lamaran", "Pernikahan", "Seserahan", "Vendor", "RSVP", "MOODBOARD"];
  if (checklistSheets.includes(sheetName)) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] !== undefined) rows[i][0] = String(rows[i][0]);
    }
  }

  return rows;
}

/**
 * Cari baris berdasarkan ID (kolom pertama), return nomor baris 1-indexed.
 */
export async function findRowById(sheets, sheetName, id) {
  // Scan seluruh sheet (bukan hanya kolom A) untuk handle data yang mungkin
  // ter-offset ke kolom lain akibat bug append lama.
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // Cari ID di kolom A dulu (normal case)
    if (row[0] !== undefined && row[0] !== null && row[0] !== '') {
      if (String(row[0]) === String(id)) return i + 1;
    }

    // Fallback: scan kolom lain di baris ini — data lama mungkin offset ke H dst.
    // Cari kolom yang isinya ID dan kolom berikutnya adalah 'image' atau 'text'
    for (let c = 1; c < row.length; c++) {
      if (String(row[c]) === String(id) &&
          row[c + 1] && (row[c + 1] === 'image' || row[c + 1] === 'text')) {
        return i + 1;
      }
    }
  }
  return null;
}

/**
 * Update satu cell berdasarkan ID baris dan nomor kolom.
 */
export async function updateCell(sheetName, id, colIndex, value) {
  const sheets = getSheetsClient();
  const rowNum = await findRowById(sheets, sheetName, id);
  if (!rowNum) return false;

  const colLetter = String.fromCharCode(64 + colIndex); // 1=A, 2=B, dst.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${rowNum}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
  return true;
}

/**
 * Hapus baris berdasarkan ID.
 */
export async function deleteRowById(sheetName, id) {
  const sheets = getSheetsClient();

  const rowNum = await findRowById(sheets, sheetName, id);
  if (!rowNum) return false;

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === sheetName
  );
  if (!sheet) return false;

  const sheetId = sheet.properties.sheetId;

  // Hapus seluruh baris (termasuk data yang mungkin offset ke kolom H+)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1, // 0-indexed
              endIndex: rowNum,
            },
          },
        },
      ],
    },
  });

  return true;
}

/**
 * Tambah baris baru ke sheet.
 * Auto-create tab jika belum ada.
 * Return ID (nomor baris).
 */
export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();

  // Pastikan tab ada sebelum append
  await ensureSheet(sheets, sheetName);

  // Hitung baris berikutnya dari kolom A
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const lastRow = (existing.data.values || []).length;
  const newId = lastRow;
  const targetRow = lastRow + 1; // baris baru (1-indexed), tepat setelah data terakhir

  // Hitung kolom akhir
  const totalCols = 1 + values.length; // kolom A = ID, lalu values
  const lastColLetter = String.fromCharCode(64 + totalCols);

  // Gunakan UPDATE bukan APPEND agar data ditulis persis di baris yang kita tentukan,
  // tidak bergantung pada auto-detection tabel Google Sheets yang sering salah posisi.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${targetRow}:${lastColLetter}${targetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [[newId, ...values]] },
  });

  return newId;
}

function getDefaultHeaders(sheetName) {
  const map = {
    Lamaran:    ["ID", "Nama", "Status", "Budget", "Link"],
    Pernikahan: ["ID", "Nama", "Status", "Budget", "Link"],
    Seserahan:  ["ID", "Nama", "Status", "Budget", "Link"],
    RSVP:       ["ID", "Nama", "Phone", "JumlahTamu", "Status"],
    Rundown:    ["Mulai", "Selesai", "Acara", "Durasi", "PIC"],
    Vendor:     ["ID", "Nama", "Kategori", "Deskripsi", "Phone", "Harga", "Alamat", "Social", "Status", "Files"],
    WO:         ["ID","WOName","Gedung","Harga","DP","Pax","MUA","Fotografer","Katering","JumlahMenu","JumlahBaju","Band","Dekorasi","MC","JumlahUndangan","Transportasi","Honeymoon","JumlahRevisi","DurasiKontrak","DeadlineDP","Rating","Catatan"],
    MOODBOARD:  ["ID", "Type", "Content", "Section", "Title", "Note", "CreatedAt"],
  };
  return map[sheetName] || null;
}
