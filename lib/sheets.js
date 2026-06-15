// lib/sheets.js
// Helper untuk autentikasi dan akses Google Sheets API
// Menggunakan Service Account credentials dari environment variables

import { google } from "googleapis";

const SPREADSHEET_ID = "1Jdw7nPh4-Ao8lWIKUPh29SFCEY0rZFxDfyb1ZKrZTFo";

/**
 * Membuat Google Sheets client yang sudah terotentikasi.
 * Credentials dibaca dari env variable GOOGLE_SERVICE_ACCOUNT_JSON
 * yang berisi JSON string dari service account key file.
 */
export function getSheetsClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set"
    );
  }

  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export { SPREADSHEET_ID };

/**
 * Ambil semua data dari sheet tertentu.
 * Return: array of arrays (rows), termasuk header di index 0.
 */
export async function getData(sheetName) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = response.data.values || [];

  // Jika sheet kosong, inisialisasi header sesuai sheet
  if (rows.length === 0) {
    const headers = getDefaultHeaders(sheetName);
    if (headers) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
      return [headers];
    }
  }

  // Paksa ID di kolom pertama selalu string (mencegah parse sebagai tanggal)
  const checklistSheets = ["Lamaran", "Pernikahan", "Seserahan"];
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
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });

  const col = response.data.values || [];
  for (let i = 1; i < col.length; i++) {
    if (String(col[i][0]) === String(id)) {
      return i + 1; // 1-indexed row number di Sheets
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

  const colLetter = String.fromCharCode(64 + colIndex); // 1=A, 2=B, 3=C, dst.
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
 * Menggunakan batchUpdate karena deleteRows butuh sheetId, bukan nama.
 */
export async function deleteRowById(sheetName, id) {
  const sheets = getSheetsClient();

  // Cari row number dulu
  const rowNum = await findRowById(sheets, sheetName, id);
  if (!rowNum) return false;

  // Dapatkan sheetId dari nama sheet
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === sheetName
  );
  if (!sheet) return false;

  const sheetId = sheet.properties.sheetId;

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
 * Return ID (nomor baris terakhir sebelum append, sama logika dengan GAS).
 */
export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();

  // Cek berapa baris sudah ada (untuk generate ID)
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const lastRow = (existing.data.values || []).length;
  const newId = lastRow; // sama dengan logika GAS: sh.getLastRow()

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: "RAW",
    requestBody: { values: [[newId, ...values]] },
  });

  return newId;
}

function getDefaultHeaders(sheetName) {
  const map = {
    Lamaran: ["ID", "Nama", "Status", "Budget", "Link"],
    Pernikahan: ["ID", "Nama", "Status", "Budget", "Link"],
    Seserahan: ["ID", "Nama", "Status", "Budget", "Link"],
    RSVP: ["ID", "Nama", "Phone", "JumlahTamu", "Status"],
    Rundown: ["Mulai", "Selesai", "Acara", "Durasi", "PIC"],
    Vendor: ["ID", "Nama", "Kategori", "Deskripsi", "Phone", "Harga", "Alamat", "Social", "Status"],
  };
  return map[sheetName] || null;
}
