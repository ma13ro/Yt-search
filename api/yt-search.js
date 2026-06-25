// Vercel Serverless Function — YouTube Search Proxy v1
// /api/yt-search.js
//
// Forwards search queries to public Invidious instances.
// Tries each host in order until one responds successfully.
// Deploy alongside proxy.js in the same /api/ folder.
//
// Usage:
//   GET /api/yt-search?q=IVE+Eleven
//   Returns: JSON array of { videoId, title, author } objects

const INVIDIOUS_HOSTS = [
  'https://invidious.io',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.cdaut.de',
  'https://invidious.privacydev.net',
];

const FIELDS = 'videoId,title,author';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

  const path = `/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=${FIELDS}&page=1`;

  for (const host of INVIDIOUS_HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      // Return up to 8 results, only the fields we need
      const results = data.slice(0, 8).map(v => ({
        videoId: v.videoId || '',
        title:   v.title   || '',
        author:  v.author  || '',
      }));

      return res.status(200).json(results);

    } catch (_) {
      // Timeout or network error — try next host
      continue;
    }
  }

  // All hosts failed
  return res.status(502).json({ error: 'All search servers unreachable' });
}
