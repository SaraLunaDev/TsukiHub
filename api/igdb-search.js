export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    // Get access token
    const tokenResp = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.REACT_APP_IGDB_CLIENT_ID}&client_secret=${process.env.REACT_APP_IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "No IGDB access_token", tokenData });
    }
    // Query IGDB
    // Pedir también los videos
    const igdbResp = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.REACT_APP_IGDB_CLIENT_ID,
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
        body: `search "${query}"; fields id,name,cover.url,first_release_date,genres.name,platforms.name,summary,involved_companies.company.name,videos.*; limit 10;`,
    });
    const igdbText = await igdbResp.text();
    if (igdbResp.status !== 200) {
      return res.status(500).json({
        error: "IGDB API error",
        status: igdbResp.status,
        body: igdbText,
      });
    }
    const igdbData = JSON.parse(igdbText);
    // Extraer el primer tráiler de YouTube si existe
    const resultsWithTrailer = igdbData.map(game => {
      let trailer = "";
      if (game.videos && Array.isArray(game.videos)) {
        const ytTrailer = game.videos.find(v => v.name && v.name.toLowerCase().includes("trailer"));
        if (ytTrailer) {
          trailer = `https://www.youtube.com/watch?v=${ytTrailer.video_id}`;
        } else if (game.videos.length > 0) {
          trailer = `https://www.youtube.com/watch?v=${game.videos[0].video_id}`;
        }
      }
      return { ...game, trailer };
    });
    res.json({ results: resultsWithTrailer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }

// IMPORTANTE: Si actualizas los campos de videos aquí, actualiza también en server.js para desarrollo local.
// ADAPTACIÓN JUL 2025: IGDB ya no permite pedir videos.site, videos.name, etc. Hay que pedir videos.*
}
