export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    // Get access token
    const tokenResp = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.REACT_APP_IGDB_CLIENT_ID}&client_secret=${process.env.REACT_APP_IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'No IGDB access_token', tokenData });
    }
    // Query IGDB
    const igdbResp = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.REACT_APP_IGDB_CLIENT_ID,
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body: `search "${query}"; fields id,name,cover.url,first_release_date,genres.name,platforms.name,summary,involved_companies.company.name; limit 10;`,
    });
    const igdbText = await igdbResp.text();
    if (igdbResp.status !== 200) {
      return res.status(500).json({
        error: 'IGDB API error',
        status: igdbResp.status,
        body: igdbText,
      });
    }
    const igdbData = JSON.parse(igdbText);
    res.json({ results: igdbData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
