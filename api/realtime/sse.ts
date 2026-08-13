import { Client } from 'pg';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const channel = process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated';

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
