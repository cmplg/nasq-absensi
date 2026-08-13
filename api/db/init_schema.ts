import { Client } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // API key enforcement (optional): if API_SECRET is set, require matching header
  const apiSecret = process.env.API_SECRET;
  if (apiSecret) {
    const key = (req.headers['x-api-key'] as string) || '';
    if (!key || key !== apiSecret) return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        id TEXT PRIMARY KEY,
        data JSONB
      );
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        data JSONB
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        data JSONB
      );
    `);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Init schema error', err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    try { await client.end(); } catch {}
  }
}
