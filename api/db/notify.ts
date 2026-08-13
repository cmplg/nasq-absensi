import { Client } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_CHANNELS = ['nasq_data_updated'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { channel, payload } = req.body || {};
  if (!channel || !ALLOWED_CHANNELS.includes(channel)) return res.status(400).json({ error: 'Invalid channel' });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    // Use parameterized payload to avoid injection; channel validated above.
    await client.query(`NOTIFY ${channel}, $1`, [typeof payload === 'string' ? payload : JSON.stringify(payload || {})]);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Notify error', err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
