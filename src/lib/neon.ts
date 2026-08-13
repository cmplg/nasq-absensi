export async function dbQuery(sql: string, params?: any[]) {
  const apiKey = (typeof window !== 'undefined' && (window as any).__NASQ_API_KEY) || (import.meta as any).env?.VITE_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch('/api/db/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) throw new Error('DB query failed');
  return res.json();
}

export async function notifyRealtime(channel: string, payload: any) {
  const apiKey = (typeof window !== 'undefined' && (window as any).__NASQ_API_KEY) || (import.meta as any).env?.VITE_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch('/api/db/notify', {
    method: 'POST',
    headers,
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
