import { Client } from 'pg';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Allow cross-origin EventSource connections (use carefully)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders?.();

  const channel = process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated';

  // API key handling for SSE: if client provides `token` or header, validate it.
  // Do NOT reject connection when token is missing to keep SSE broadly accessible
  // (POST endpoints remain protected by API_SECRET).
  const apiSecret = process.env.API_SECRET;
  const headerKey = (req.headers['x-api-key'] as string) || '';
  const urlToken = (req.query && (req.query as any).token) || '';
  if ((headerKey || urlToken) && apiSecret) {
    if ((headerKey && headerKey !== apiSecret) || (urlToken && urlToken !== apiSecret)) {
      return res.status(401).end('Unauthorized');
    }
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  client.on('notification', (msg) => {
    try {
      const payload = msg.payload || '';
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error('SSE notify write error', err);
    }
  });

  await client.query(`LISTEN ${channel}`);

  const onClose = async () => {
    try {
      await client.query(`UNLISTEN ${channel}`);
      await client.end();
    } catch {}
  };

  req.socket?.on('close', onClose);
}
