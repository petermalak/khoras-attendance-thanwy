import { markAsCalled } from '../../utils/sheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { name, week } = req.body;
  if (!name || !week) {
    return res.status(400).json({ error: 'Missing name or week' });
  }
  try {
    await markAsCalled(name, week);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 