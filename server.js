// server.js
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

// DEBUG: log Google credentials for troubleshooting
console.log(
  "GOOGLE_SERVICE_ACCOUNT_EMAIL:",
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
);

// Limpieza robusta de la private key
let privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey?.replace(/\\n/g, "\n");
console.log(
  "GOOGLE_PRIVATE_KEY length:",
  privateKey?.length,
  "starts with:",
  privateKey?.slice(0, 30),
  "ends with:",
  privateKey?.slice(-30)
);
console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID);

const app = express();
app.use(cors());
app.use(express.json());

console.log("privateKey (depuración):", privateKey);
console.log("typeof privateKey:", typeof privateKey);
console.log(
  "typeof process.env.GOOGLE_PRIVATE_KEY:",
  typeof process.env.GOOGLE_PRIVATE_KEY
);
console.log(
  "Valor process.env.GOOGLE_PRIVATE_KEY:",
  process.env.GOOGLE_PRIVATE_KEY
);
if (!privateKey) {
  throw new Error(
    "GOOGLE_PRIVATE_KEY no está definida. Revisa tu .env y reinicia el servidor."
  );
}
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: "v4", auth });

app.post("/api/add-recommendation", async (req, res) => {
  const { game, user } = req.body;
  if (!game || !user) return res.status(400).json({ error: "Missing data" });

  try {
    // Log para depuración de los datos recibidos
    console.log(
      "Datos recibidos en /api/add-recommendation:",
      JSON.stringify(game, null, 2)
    );
    // Autoriza el JWT antes de usar Sheets
    await new Promise((resolve, reject) => {
      auth.authorize((err, tokens) => {
        if (err) return reject(err);
        resolve(tokens);
      });
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Juegos!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            game.name || game.title || "", // Nombre
            "Recomendado", // Estado
            "", // Youtube
            "", // Nota
            "", // Horas
            "", // Plataforma
            "", // Fecha
            game.cover && game.cover.url
              ? game.cover.url.startsWith("http")
                ? game.cover.url
                : `https:${game.cover.url}`
              : game.cover_url || "", // Carátula (URL completa)
            game.first_release_date
              ? new Date(game.first_release_date * 1000)
                  .toISOString()
                  .split("T")[0]
              : game.release_date || "", // Fecha de Lanzamiento (YYYY-MM-DD)
            game.genres && Array.isArray(game.genres)
              ? game.genres.map((g) => g.name.replace(/,/g, "-%-")).join("-%-")
              : game.genres_string || "", // Géneros
            game.platforms && Array.isArray(game.platforms)
              ? game.platforms
                  .map((p) => p.name.replace(/,/g, "-%-"))
                  .join("-%-")
              : game.platforms_string || "", // Plataformas
            game.summary || game.description || "", // Resumen
            game.involved_companies && Array.isArray(game.involved_companies)
              ? game.involved_companies.some((c) => c.developer)
                ? game.involved_companies
                    .filter((c) => c.developer && c.company?.name)
                    .map((c) => c.company.name.replace(/,/g, " "))
                    .join("-%-")
                : game.involved_companies
                    .map((c) => c.company?.name?.replace(/,/g, " "))
                    .filter(Boolean)
                    .join("-%-")
              : game.developers_string || "", // Desarrolladores
            game.involved_companies && Array.isArray(game.involved_companies)
              ? game.involved_companies.some((c) => c.publisher)
                ? game.involved_companies
                    .filter((c) => c.publisher && c.company?.name)
                    .map((c) => c.company.name.replace(/,/g, " "))
                    .join("-%-")
                : game.involved_companies
                    .map((c) => c.company?.name?.replace(/,/g, " "))
                    .filter(Boolean)
                    .join("-%-")
              : game.publishers_string || "", // Publicadores
            game.id || game.igdb_id || "", // IGDBID
            user, // Usuario
          ],
        ],
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// IGDB search endpoint (proxy)
app.post("/api/igdb-search", async (req, res) => {
  const { query } = req.body;
  console.log("IGDB SEARCH endpoint hit. Query:", query);
  if (!query) return res.status(400).json({ error: "Missing query" });
  try {
    // Get access token
    const tokenResp = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.REACT_APP_IGDB_CLIENT_ID}&client_secret=${process.env.REACT_APP_IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    );
    const tokenData = await tokenResp.json();
    console.log("IGDB token response:", tokenData);
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "No IGDB access_token", tokenData });
    }
    // Query IGDB
    const igdbResp = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.REACT_APP_IGDB_CLIENT_ID,
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: `search "${query}"; fields id,name,cover.url,first_release_date,genres.name,platforms.name,summary,involved_companies.company.name; limit 10;`,
    });
    console.log("IGDB API status:", igdbResp.status);
    const igdbText = await igdbResp.text();
    console.log("IGDB API response:", igdbText);
    if (igdbResp.status !== 200) {
      return res.status(500).json({
        error: "IGDB API error",
        status: igdbResp.status,
        body: igdbText,
      });
    }
    const igdbData = JSON.parse(igdbText);
    res.json({ results: igdbData });
  } catch (e) {
    console.error("IGDB SEARCH error:", e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
