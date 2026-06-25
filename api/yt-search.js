// Vercel Serverless Function — YouTube Search Proxy v2
// /api/yt-search.js
//
// Uses YouTube Data API v3 for reliable search.
// API key stored in Vercel environment variable: YT_API_KEY
//
// Usage:
//   GET /api/yt-search?q=IVE+Eleven
//   Returns: JSON array of { videoId, title, author } objects

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

  const apiKey = process.env.YT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(q)}&key=${apiKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!r.ok) {
      const err = await r.json();
      return res.status(r.status).json({ error: err?.error?.message || 'YouTube API error' });
    }

    const data = await r.json();
    const decode = s => s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');

    const results = (data.items || []).map(item => ({
      videoId: item.id?.videoId || '',
      title:   decode(item.snippet?.title || ''),
      author:  decode(item.snippet?.channelTitle || ''),
    })).filter(v => v.videoId);

    return res.status(200).json(results);

  } catch (err) {
    return res.status(502).json({ error: 'Search request failed' });
  }
}
