import { getUserAbsenceHistory } from '../../utils/sheets';

export default async function handler(req, res) {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const history = await getUserAbsenceHistory(name);
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 