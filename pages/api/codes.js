import { getSheetData } from "../../utils/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const rows = await getSheetData();
    console.log('Sheet data:', rows); // Debug log

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    // Skip the header row and map the data
    const codes = rows.slice(1).map(row => ({
      id: row[0],
      code: row[1],
      name: row[2],
      class: row[3],
      team: row[4],
      score: row[5] || 0
    }));

    console.log('Processed codes:', codes); // Debug log
    return res.status(200).json(codes);
  } catch (error) {
    console.error("Error in /api/codes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
} 