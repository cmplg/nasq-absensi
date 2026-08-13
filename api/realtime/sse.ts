import { Client } from 'pg';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const channel = process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated';

  // API key enforcement for SSE: if API_SECRET is set, allow connection only when
  // client provides matching header `x-api-key` OR query param `token`.
  const apiSecret = process.env.API_SECRET;
  if (apiSecret) {
    const headerKey = (req.headers['x-api-key'] as string) || '';
    const urlToken = (req.query && (req.query as any).token) || '';
    if (!headerKey && !urlToken) return res.status(401).end('Unauthorized');
    if ((headerKey && headerKey !== apiSecret) || (urlToken && urlToken !== apiSecret))
      return res.status(401).end('Unauthorized');
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
