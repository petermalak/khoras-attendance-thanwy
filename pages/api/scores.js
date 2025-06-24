import { getSheetData } from '../../utils/sheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.error('Missing required environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      });
    }

    const data = await getSheetData();
    
    // Skip the header row and transform the data
    const scores = data.slice(1).map((row, index) => ({
      id: index + 1,
      code: row[1] || '', // CodeValue is in column B
      name: row[2] || '', // Name is in column C
      class: row[3] || '', // Class is in column D
      team: row[4] || '', // Team is in column E
      score: parseInt(row[5] || '0', 10), // Score is in column F
    }));

    // Sort by score in descending order
    scores.sort((a, b) => b.score - a.score);

    res.status(200).json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scores',
      details: error.message
    });
  }
} 