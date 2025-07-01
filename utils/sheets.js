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
  const operation = () => sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:ZZ1000`, // Large range to cover all columns/rows
  });

  const response = await withRetry(operation, 'getAttendanceSheetStructure');
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

// Get absentees for the latest week from 'الغياب' and their call status from 'افتقاد'
export async function getAbsenteesForLatestWeek() {
  const attendanceSheet = 'الغياب';
  const iftikadSheet = 'افتقاد';
  // Get attendance structure
  const { headers, names, nameColIndex, rows } = await getAttendanceSheetStructure(attendanceSheet);
  // Find latest date column (last non-empty header after the name column)
  let lastDateColIndex = headers.length - 1;
  while (lastDateColIndex > nameColIndex && !headers[lastDateColIndex]) lastDateColIndex--;
  const week = headers[lastDateColIndex];
  // Get absentees (empty or 0 in that column)
  const absentees = rows.slice(1).filter(row => {
    const val = row[lastDateColIndex];
    return !val || val === '0' || val === 0;
  }).map(row => ({
    name: row[nameColIndex],
    phone: row[nameColIndex + 1],
  }));

  // Get iftikad data
  const iftikadResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${iftikadSheet}!A1:Z1000`,
  });
  const iftikadRows = iftikadResp.data.values || [];
  const iftikadHeaders = iftikadRows[0] || [];
  const nameIdx = iftikadHeaders.findIndex(h => h.trim() === 'الاسم');
  const weekIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الغياب');
  const calledIdx = iftikadHeaders.findIndex(h => h.trim() === 'تم الاتصال');
  const callDateIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الاتصال');
  const notesIdx = iftikadHeaders.findIndex(h => h.trim() === 'ملاحظات');

  // Merge call status
  const result = absentees.map(abs => {
    const found = iftikadRows.find(row => row[nameIdx] === abs.name && row[weekIdx] === week);
    return {
      name: abs.name,
      phone: abs.phone,
      week,
      called: found ? found[calledIdx] : 'لا',
      callDate: found ? found[callDateIdx] : '',
      notes: found ? found[notesIdx] : '',
    };
  });
  return result;
}

// Mark a person as called in 'افتقاد' for the given week
export async function markAsCalled(name, week) {
  const iftikadSheet = 'افتقاد';
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${iftikadSheet}!A1:Z1000`,
  });
  const rows = resp.data.values || [];
  const headers = rows[0] || [];
  const nameIdx = headers.findIndex(h => h.trim() === 'الاسم');
  const weekIdx = headers.findIndex(h => h.trim() === 'تاريخ الغياب');
  const calledIdx = headers.findIndex(h => h.trim() === 'تم الاتصال');
  const callDateIdx = headers.findIndex(h => h.trim() === 'تاريخ الاتصال');
  // Find row
  const rowIdx = rows.findIndex(row => row[nameIdx] === name && row[weekIdx] === week);
  const today = new Date().toISOString().slice(0, 10);
  if (rowIdx !== -1) {
    // Update existing row
    const calledCell = String.fromCharCode(65 + calledIdx) + (rowIdx + 1);
    const callDateCell = String.fromCharCode(65 + callDateIdx) + (rowIdx + 1);
    await updateCell(iftikadSheet, calledCell, 'نعم');
    await updateCell(iftikadSheet, callDateCell, today);
  } else {
    // Append new row
    const newRow = Array(headers.length).fill('');
    newRow[nameIdx] = name;
    newRow[weekIdx] = week;
    newRow[calledIdx] = 'نعم';
    newRow[callDateIdx] = today;
    await appendRow(iftikadSheet, newRow);
  }
}

// Get absentees for a specific week from 'الغياب' and their call status from 'افتقاد'
export async function getAbsenteesForWeek(week) {
  const attendanceSheet = 'الغياب';
  const iftikadSheet = 'افتقاد';
  const { headers, names, nameColIndex, rows } = await getAttendanceSheetStructure(attendanceSheet);
  let weekColIndex;
  if (week) {
    weekColIndex = headers.findIndex(h => h && h.trim() === week.trim());
    if (weekColIndex === -1) throw new Error('Week not found');
  } else {
    weekColIndex = headers.length - 1;
    while (weekColIndex > nameColIndex && !headers[weekColIndex]) weekColIndex--;
    week = headers[weekColIndex];
  }
  const absentees = rows.slice(1).filter(row => {
    const val = row[weekColIndex];
    return !val || val === '0' || val === 0;
  }).map(row => ({
    name: row[nameColIndex],
    phone: row[nameColIndex + 1],
  }));
  const iftikadResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${iftikadSheet}!A1:Z1000`,
  });
  const iftikadRows = iftikadResp.data.values || [];
  const iftikadHeaders = iftikadRows[0] || [];
  const nameIdx = iftikadHeaders.findIndex(h => h.trim() === 'الاسم');
  const weekIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الغياب');
  const calledIdx = iftikadHeaders.findIndex(h => h.trim() === 'تم الاتصال');
  const callDateIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الاتصال');
  const notesIdx = iftikadHeaders.findIndex(h => h.trim() === 'ملاحظات');
  const result = absentees.map(abs => {
    const found = iftikadRows.find(row => row[nameIdx] === abs.name && row[weekIdx] === week);
    return {
      name: abs.name,
      phone: abs.phone,
      week,
      called: found ? found[calledIdx] : 'لا',
      callDate: found ? found[callDateIdx] : '',
      notes: found ? found[notesIdx] : '',
    };
  });
  return result;
}

// Get all missed weeks for a user, with call status
export async function getUserAbsenceHistory(name) {
  const attendanceSheet = 'الغياب';
  const iftikadSheet = 'افتقاد';
  const { headers, names, nameColIndex, rows } = await getAttendanceSheetStructure(attendanceSheet);
  const userRow = rows.slice(1).find(row => row[nameColIndex] === name);
  if (!userRow) return [];
  // Find all week columns (headers after name column)
  const weekHeaders = headers.slice(nameColIndex + 2); // skip name and phone
  const missedWeeks = [];
  for (let i = nameColIndex + 2; i < headers.length; i++) {
    const week = headers[i];
    const val = userRow[i];
    if (week && (!val || val === '0' || val === 0)) {
      missedWeeks.push(week);
    }
  }
  // Get iftikad data
  const iftikadResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${iftikadSheet}!A1:Z1000`,
  });
  const iftikadRows = iftikadResp.data.values || [];
  const iftikadHeaders = iftikadRows[0] || [];
  const nameIdx = iftikadHeaders.findIndex(h => h.trim() === 'الاسم');
  const weekIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الغياب');
  const calledIdx = iftikadHeaders.findIndex(h => h.trim() === 'تم الاتصال');
  const callDateIdx = iftikadHeaders.findIndex(h => h.trim() === 'تاريخ الاتصال');
  const notesIdx = iftikadHeaders.findIndex(h => h.trim() === 'ملاحظات');
  // For each missed week, get call status
  return missedWeeks.map(week => {
    const found = iftikadRows.find(row => row[nameIdx] === name && row[weekIdx] === week);
    return {
      week,
      called: found ? found[calledIdx] : 'لا',
      callDate: found ? found[callDateIdx] : '',
      notes: found ? found[notesIdx] : '',
    };
  });
}
