export async function dbQuery(sql: string, params?: any[]) {
  const res = await fetch('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) throw new Error('DB query failed');
  return res.json();
}

export async function notifyRealtime(channel: string, payload: any) {
  const res = await fetch('/api/db/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, payload }),
  });
  if (!res.ok) throw new Error('Notify failed');
  return res.json();
}

export function initNeonRealtime(onMessage: (payload: string) => void, token?: string) {
  const sseUrl = token ? `/api/realtime/sse?token=${encodeURIComponent(token)}` : '/api/realtime/sse';
  const es = new EventSource(sseUrl);
  es.onmessage = (ev) => {
    onMessage(ev.data);
  };
  es.onerror = (err) => {
    console.warn('Neon SSE error', err);
  };
  return () => {
    es.close();
  };
}
