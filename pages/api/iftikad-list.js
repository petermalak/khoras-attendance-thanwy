import { getAbsenteesForWeek, getAttendanceSheetStructure } from '../../utils/sheets';

export default async function handler(req, res) {
  try {
    const { week, allWeeks } = req.query;
    if (allWeeks) {
      // Return all week headers (date columns) from the attendance sheet
      const { headers, nameColIndex } = await getAttendanceSheetStructure('الغياب');
      // Weeks are all headers after name and phone columns
      const weeks = headers.slice(nameColIndex + 2).filter(Boolean);
      return res.status(200).json({ weeks });
    }
    const absentees = await getAbsenteesForWeek(week);
    res.status(200).json({ absentees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 