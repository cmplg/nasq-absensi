import { Client } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sql, params } = req.body || {};
  if (!sql) return res.status(400).json({ error: 'Missing sql in body' });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(sql, params || []);
    return res.status(200).json({ rows: result.rows });
  } catch (err: any) {
    console.error('DB query error', err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
