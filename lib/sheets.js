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
 * Ambil semua data dari sheet tertentu.
 */
export async function getData(sheetName) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = response.data.values || [];

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

  // Paksa ID di kolom pertama selalu string
  const checklistSheets = ["Lamaran", "Pernikahan", "Seserahan", "Vendor", "RSVP"];
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
      return i + 1; // 1-indexed
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

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1,
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
 * Return ID (nomor baris terakhir).
 */
export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const lastRow = (existing.data.values || []).length;
  const newId = lastRow;

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
    Lamaran:    ["ID", "Nama", "Status", "Budget", "Link"],
    Pernikahan: ["ID", "Nama", "Status", "Budget", "Link"],
    Seserahan:  ["ID", "Nama", "Status", "Budget", "Link"],
    RSVP:       ["ID", "Nama", "Phone", "JumlahTamu", "Status"],
    Rundown:    ["Mulai", "Selesai", "Acara", "Durasi", "PIC"],
    // PENTING: Vendor harus include kolom Files (J) agar JSON array tersimpan
    Vendor:     ["ID", "Nama", "Kategori", "Deskripsi", "Phone", "Harga", "Alamat", "Social", "Status", "Files"],
  };
  return map[sheetName] || null;
}
