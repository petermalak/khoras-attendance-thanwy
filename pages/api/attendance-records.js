import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { name } = req.body;
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.SHEET_ID;
      const range = 'الغياب!A:Z';

      // First get current data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      let rows = response.data.values;
      let headers = rows[0];
      const giftColumnIndex = headers.indexOf('كام مره اخد هدية');
      const rewardedDatesColumnIndex = headers.indexOf('تواريخ_الهدايا');
      
      // If gift columns don't exist, create them
      if (giftColumnIndex === -1 || rewardedDatesColumnIndex === -1) {
        let newHeaders = [...headers];
        if (giftColumnIndex === -1) {
          newHeaders.push('كام مره اخد هدية');
        }
        if (rewardedDatesColumnIndex === -1) {
          newHeaders.push('تواريخ_الهدايا');
        }
        
        const lastColumn = String.fromCharCode(65 + newHeaders.length - 1);
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `الغياب!A1:${lastColumn}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [newHeaders],
          },
        });

        // Initialize columns with empty values
        const emptyColumns = rows.slice(1).map(() => ['0', '']);
        for (let i = headers.length; i < newHeaders.length; i++) {
          const column = String.fromCharCode(65 + i);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `الغياب!${column}2:${column}${rows.length}`,
            valueInputOption: 'RAW',
            resource: {
              values: emptyColumns.map(col => [col[i - headers.length]]),
            },
          });
        }

        // Refresh data after creating new columns
        const updatedResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });
        rows = updatedResponse.data.values;
        headers = rows[0];
      }

      // Find the row with the given name
      const nameColumnIndex = headers.indexOf('الاسم');
      const rowIndex = rows.findIndex((row, index) => index > 0 && row[nameColumnIndex] === name);
      
      if (rowIndex === -1) {
        return res.status(404).json({ message: 'Name not found' });
      }

      // Calculate consecutive attendance periods
      const dateColumns = headers.filter(h => /[\d/]/.test(h));
      const dateIndices = dateColumns.map(h => headers.indexOf(h));
      
      let consecutivePeriods = [];
      let currentPeriod = [];
      
      dateIndices.forEach((colIndex, i) => {
        if (rows[rowIndex][colIndex] === '1') {
          currentPeriod.push(headers[colIndex]);
          if (currentPeriod.length === 3) {
            consecutivePeriods.push([...currentPeriod]);
            currentPeriod.shift(); // Remove first date to start tracking next period
          }
        } else {
          currentPeriod = [];
        }
      });

      // Get already rewarded dates
      const rewardedDates = (rows[rowIndex][rewardedDatesColumnIndex] || '').split(',').filter(Boolean);
      
      // Find first unrewarded period
      const unrewardedPeriod = consecutivePeriods.find(period => 
        !period.some(date => rewardedDates.includes(date))
      );

      if (!unrewardedPeriod) {
        return res.status(400).json({ 
          message: 'لا توجد فترة حضور متتالية جديدة تستحق هدية' 
        });
      }

      // Update gift count
      const currentGiftCount = parseInt(rows[rowIndex][giftColumnIndex] || '0');
      const newGiftCount = currentGiftCount + 1;
      
      // Update rewarded dates
      const newRewardedDates = [...rewardedDates, ...unrewardedPeriod].join(',');

      // Update both columns
      const giftColumn = String.fromCharCode(65 + giftColumnIndex);
      const rewardedDatesColumn = String.fromCharCode(65 + rewardedDatesColumnIndex);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `الغياب!${giftColumn}${rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[newGiftCount.toString()]],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `الغياب!${rewardedDatesColumn}${rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[newRewardedDates]],
        },
      });

      return res.status(200).json({ message: 'Gift count updated successfully' });
    } catch (error) {
      console.error('Error updating gift count:', error);
      return res.status(500).json({ message: 'Error updating gift count', error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.SHEET_ID;
      const range = 'الغياب!A:Z';

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.status(200).json({ headers: [], data: [] });
      }

      let headers = [...rows[0]];
      
      // Add gift count column if it doesn't exist
      if (!headers.includes('كام مره اخد هدية')) {
        headers.push('كام مره اخد هدية');
      }

      // Filter out the تواريخ_الهدايا column from headers
      headers = headers.filter(h => h !== 'تواريخ_الهدايا');

      const data = rows.slice(1).map(row => {
        const record = {};
        
        headers.forEach((header, index) => {
          if (header === 'مجموع الحضور') {
            // Calculate total from all date columns that have '1'
            const total = row.filter((cell, i) => {
              const headerText = rows[0][i];
              return /\d{1,2} [A-Za-z]{3} \d{4}/.test(headerText) && cell === '1';
            }).length;
            record[header] = total;
          } else if (header === 'كام مره اخد هدية') {
            record[header] = row[headers.indexOf(header)] || '0';
          } else {
            record[header] = row[index] || '';
          }
        });

        // Calculate consecutive attendance
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        let currentPeriod = [];
        let hasUnrewardedConsecutive = false;
        const rewardedDates = (row[rows[0].indexOf('تواريخ_الهدايا')] || '').split(',').filter(Boolean);

        headers.forEach((header, index) => {
          if (/\d{1,2} [A-Za-z]{3} \d{4}/.test(header)) {
            if (row[index] === '1') {
              currentConsecutive++;
              currentPeriod.push(header);
              if (currentConsecutive >= 3) {
                const periodDates = currentPeriod.slice(-3);
                if (!periodDates.some(d => rewardedDates.includes(d))) {
                  hasUnrewardedConsecutive = true;
                }
              }
              maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            } else {
              currentConsecutive = 0;
              currentPeriod = [];
            }
          }
        });

        record['consecutive_attendance'] = maxConsecutive;
        record['has_unrewarded_consecutive'] = hasUnrewardedConsecutive;

        return record;
      });

      res.status(200).json({
        headers,
        data,
      });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      res.status(500).json({ 
        message: 'Error fetching attendance records',
        error: error.message 
      });
    }
  }
} 