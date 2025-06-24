// pages/api/submit.js
import { 
  appendRow, 
  getSheetData, 
  updateCell, 
  findRowByValue, 
  getHeaders, 
  getRowData,
  getFirstSheetName,
  updateRowScore
} from '../../utils/sheets';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check if required environment variables are set
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.SPREADSHEET_ID) {
    console.error('Missing required environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Missing required environment variables'
    });
  }

  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "Invalid updates format" });
  }

  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const { qrCode, selectedValue } = update;
      
      // Find the row for this code
      const rowData = await findRowByValue(qrCode);
      
      if (!rowData) {
        errors.push({
          code: qrCode,
          error: "Code not found"
        });
        continue;
      }

      // Get current score and add new points
      const currentScore = parseInt(rowData.row[5] || "0", 10);
      const newScore = currentScore + parseInt(selectedValue, 10);

      // Update the score
      await updateRowScore(rowData.rowIndex, newScore);

      results.push({
        code: qrCode,
        previousScore: currentScore,
        newScore: newScore,
        pointsAdded: selectedValue
      });
    } catch (error) {
      console.error(`Error processing update for code ${update.qrCode}:`, error);
      errors.push({
        code: update.qrCode,
        error: error.message
      });
    }
  }

  return res.status(200).json({
    success: true,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
}
