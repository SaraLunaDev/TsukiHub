// Express server replicating /api endpoints for local dev
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// Patch fetch for Node.js compatibility
const fetch =
  global.fetch ||
  ((...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args)));
const { google } = require("googleapis");

// Load .env variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Función para obtener usuarios autorizados desde Google Sheet UserData
const getAuthorizedUsers = async () => {
  try {
    const userDataUrl = process.env.REACT_APP_USERDATA_SHEET_URL;
    if (!userDataUrl) {
      throw new Error("REACT_APP_USERDATA_SHEET_URL not configured");
    }

    const response = await fetch(userDataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.text();
    const rows = data.split("\n");

    // Asumiendo que la primera columna contiene los IDs de usuario
    const authorizedUserIds = rows
      .slice(1) // Omitir header
      .map((row) => {
        const columns = row.split(",");
        return columns[0]?.trim(); // Primera columna = ID de usuario
      })
      .filter((id) => id && id !== ""); // Filtrar IDs vacíos

    console.log(
      `[getAuthorizedUsers] Found ${authorizedUserIds.length} authorized users:`,
      authorizedUserIds
    );
    return authorizedUserIds;
  } catch (error) {
    console.error("[getAuthorizedUsers] Error:", error);
    return [];
  }
};

// Función para validar si un usuario está autorizado
const isUserAuthorized = async (userId) => {
  if (!userId) return false;

  const authorizedUsers = await getAuthorizedUsers();
  const isAuthorized = authorizedUsers.includes(String(userId).trim());

  console.log(
    `[isUserAuthorized] Checking user ${userId}: ${
      isAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"
    }`
  );
  return isAuthorized;
};

// --- /api/igdb-search ---
app.post("/api/igdb-search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });
  try {
    const tokenResp = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.REACT_APP_IGDB_CLIENT_ID}&client_secret=${process.env.REACT_APP_IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "No IGDB access_token", tokenData });
    }
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
    const igdbText = await igdbResp.text();
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
    res.status(500).json({ error: e.message });
  }
});

// --- /api/add-recommendation ---
app.post("/api/add-recommendation", async (req, res) => {
  const { game, user } = req.body;
  if (!game || !user) return res.status(400).json({ error: "Missing data" });

  // VALIDACIÓN: Verificar si el usuario está autorizado en la base de datos UserData
  console.log(`[add-recommendation] Validating user: ${user}`);
  const authorized = await isUserAuthorized(user);

  if (!authorized) {
    console.log(
      `[add-recommendation] User ${user} is NOT AUTHORIZED to add recommendations`
    );
    return res.status(403).json({
      error: "User not authorized",
      message:
        "Solo usuarios registrados en la base de datos pueden añadir recomendaciones",
      userId: user,
    });
  }

  console.log(
    `[add-recommendation] User ${user} is AUTHORIZED, proceeding with recommendation`
  );

  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }
  const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
  const auth = new google.auth.JWT({ email, key: privateKey, scopes: SCOPES });
  const sheets = google.sheets({ version: "v4", auth });
  try {
    await new Promise((resolve, reject) => {
      auth.authorize((err, tokens) => {
        if (err) return reject(err);
        resolve(tokens);
      });
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Juegos!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            game.name || game.title || "",
            "Recomendado",
            "",
            "",
            "",
            "",
            "",
            game.cover && game.cover.url
              ? game.cover.url.startsWith("http")
                ? game.cover.url.replace("t_thumb", "t_cover_big")
                : `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
              : game.cover_url
              ? game.cover_url.replace("t_thumb", "t_cover_big")
              : "",
            game.first_release_date
              ? new Date(game.first_release_date * 1000)
                  .toISOString()
                  .split("T")[0]
              : game.release_date || "",
            game.genres && Array.isArray(game.genres)
              ? game.genres.map((g) => g.name.replace(/,/g, "-%-")).join("-%-")
              : game.genres_string || "",
            game.platforms && Array.isArray(game.platforms)
              ? game.platforms
                  .map((p) => p.name.replace(/,/g, "-%-"))
                  .join("-%-")
              : game.platforms_string || "",
            game.summary || game.description || "",
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
              : game.developers_string || "",
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
              : game.publishers_string || "",
            game.id || game.igdb_id || "",
            user,
          ],
        ],
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- /api/validate-user ---
app.post("/api/validate-user", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const authorized = await isUserAuthorized(userId);

    res.json({
      authorized,
      userId,
      message: authorized
        ? "Usuario autorizado para añadir recomendaciones"
        : "Usuario no autorizado. Solo usuarios registrados pueden añadir recomendaciones",
    });
  } catch (error) {
    console.error("[validate-user] Error:", error);
    res.status(500).json({
      error: "Error validating user",
      authorized: false,
      userId,
    });
  }
});

// --- Static files (for production build) ---
const path = require("path");
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
