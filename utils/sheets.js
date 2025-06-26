// utils/sheets.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.SPREADSHEET_ID;

console.log("Service Account Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "Loaded" : "Not Loaded");
console.log("Private Key:", process.env.GOOGLE_PRIVATE_KEY ? "Loaded" : "Not Loaded");

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Cache for headers and column indices with shorter duration
const cache = {
  headers: new Map(),
  lastUpdated: new Map(),
  CACHE_DURATION: 30 * 1000, // 30 seconds for real-time updates
};

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
};

// Cache for sheet data
let cachedSheetData = null;
let lastFetchTime = null;
const CACHE_DURATION_SHEET = 5 * 60 * 1000; // 5 minutes

// Retry helper function
async function withRetry(operation, operationName) {
  let lastError;
  let delay = RETRY_CONFIG.initialDelay;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for ${operationName}:`, error);
      
      if (attempt < RETRY_CONFIG.maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, RETRY_CONFIG.maxDelay);
      }
    }
  }

  throw new Error(`Failed after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError.message}`);
}

// Batch operations queue
let batchQueue = [];
let batchTimeout = null;

// Process batch operations
async function processBatchQueue() {
  if (batchQueue.length === 0) return;
  
  const batch = batchQueue;
  batchQueue = [];
  
  try {
    const requests = batch.map(op => ({
      range: `${op.sheetName}!${op.range}`,
      values: [[op.value]],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: requests,
      },
    });
  } catch (error) {
    console.error('Batch update failed:', error);
    // Retry individual operations
    for (const op of batch) {
      try {
        await updateCell(op.sheetName, op.range, op.value);
      } catch (err) {
        console.error(`Failed to update ${op.sheetName}!${op.range}:`, err);
      }
    }
  }
}

export async function appendRow(sheetName, values) {
  return withRetry(
    async () => {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      return response;
    },
    'appendRow'
  );
}

export async function getSheetData() {
  try {
    // Check if we have valid cached data
    if (cachedSheetData && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION_SHEET)) {
      return cachedSheetData;
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "AllUsers!A:F",
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return [];
    }

    cachedSheetData = rows;
    lastFetchTime = Date.now();

    return rows;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function updateCell(sheetName, cell, value) {
  return withRetry(
    async () => {
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${cell}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]],
        },
      });
      return response;
    },
    'updateCell'
  );
}

export async function findRowByValue(value) {
  try {
    const rows = await getSheetData();
    const rowIndex = rows.findIndex((row) => row[1] === value);
    return rowIndex !== -1 ? { rowIndex: rowIndex + 1, row: rows[rowIndex] } : null;
  } catch (error) {
    console.error("Error finding row:", error);
    throw error;
  }
}

export async function getRowData(sheetName, rowNumber) {
  if (!rowNumber) {
    throw new Error('Row number is required');
  }

  return withRetry(
    async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      return response.data.values?.[0] || null;
    },
    'getRowData'
  );
}

export async function updateRowScore(rowIndex, newScore) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `AllUsers!F${rowIndex}`,
      valueInputOption: "RAW",
      resource: {
        values: [[newScore]],
      },
    });

    // Update cache if it exists
    if (cachedSheetData && cachedSheetData[rowIndex - 1]) {
      cachedSheetData[rowIndex - 1][5] = newScore;
    }

    return true;
  } catch (error) {
    console.error("Error updating score:", error);
    throw error;
  }
}

// Get header row (dates) and names column
export async function getAttendanceSheetStructure(sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:ZZ1000`, // Large range to cover all columns/rows
  });
  const rows = response.data.values || [];
  if (rows.length === 0) return { headers: [], names: [] };
  const headers = rows[0];
  // Names are in the column with header "الاسم"
  const nameColIndex = headers.findIndex(h => h.trim() === "الاسم");
  const names = rows.slice(1).map(row => row[nameColIndex]);
  return { headers, names, nameColIndex, rows };
}

// Mark attendance: set 1 for (name, date)
export async function markAttendance(sheetName, name, date) {
  const { headers, names, nameColIndex, rows } = await getAttendanceSheetStructure(sheetName);
  const dateColIndex = headers.findIndex(h => h.trim() === date.trim());
  if (dateColIndex === -1) throw new Error('Date not found');
  const rowIndex = names.findIndex(n => n && n.trim() === name.trim());
  if (rowIndex === -1) throw new Error('Name not found');
  // Sheet rows are 1-indexed, +2 for header and 0-index
  const cell = String.fromCharCode(65 + dateColIndex) + (rowIndex + 2);
  return updateCell(sheetName, cell, 1);
}
