import { markAttendance } from "../../utils/sheets";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, date, sheet } = req.body;
  if (!name || !date) {
    return res.status(400).json({ message: "Name and date are required" });
  }
  try {
    const sheetName = sheet || 'الغياب';
    await markAttendance(sheetName, name, date);
    return res.status(200).json({ message: "Attendance marked" });
  } catch (error) {
    console.error("Error in /api/attendance:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
} 