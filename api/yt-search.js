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

// Piped is an open YouTube frontend with a public API
// that is more reliably accessible from server/cloud IPs than Invidious.
const PIPED_HOSTS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.smnz.de',
  'https://piped-api.garudalinux.org',
  'https://api.piped.yt',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

  for (const host of PIPED_HOSTS) {
    try {
      const response = await fetch(
        `${host}/search?q=${encodeURIComponent(q)}&filter=videos`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(7000),
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const items = data.items || data.results || data;
      if (!Array.isArray(items) || items.length === 0) continue;

      // Piped returns url like "/watch?v=VIDEO_ID"
      const results = items.slice(0, 8).map(v => ({
        videoId: (v.url || '').replace('/watch?v=', '') || v.videoId || '',
        title:   v.title  || '',
        author:  v.uploaderName || v.author || '',
      })).filter(v => v.videoId.length === 11);

      if (results.length === 0) continue;
      return res.status(200).json(results);

    } catch (_) {
      continue;
    }
  }

  return res.status(502).json({ error: 'All search servers unreachable' });
}
