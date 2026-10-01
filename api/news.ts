// Vercel serverless function: proxies + caches the public ForexFactory weekly calendar feed.
// Cached at the CDN edge so the upstream is hit at most a few times per hour.
const FEEDS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
];

let memo: { at: number; events: unknown[] } | null = null;
const TTL = 30 * 60 * 1000;

async function load(url: string): Promise<unknown[]> {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (ICT Day Planner)' } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

export default async function handler(_req: unknown, res: {
  setHeader: (k: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => void };
}) {
  try {
    if (!memo || Date.now() - memo.at > TTL) {
      const results = await Promise.allSettled(FEEDS.map(load));
      const events = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (events.length === 0 && memo) {
        // upstream failing: serve stale
      } else if (events.length === 0) {
        throw new Error('no events');
      } else {
        memo = { at: Date.now(), events };
      }
    }
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json({ updated: memo!.at, source: 'ForexFactory', events: memo!.events });
  } catch (e) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(502).json({ error: String(e), events: [] });
  }
}
