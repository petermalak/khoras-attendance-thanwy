import { getAttendanceSheetStructure } from "../../utils/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Use the correct sheet name for attendance
    const sheetName = req.query.sheet || 'الغياب';
    const { headers, names } = await getAttendanceSheetStructure(sheetName);
    return res.status(200).json({ headers, names });
  } catch (error) {
    console.error("Error in /api/codes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
} 