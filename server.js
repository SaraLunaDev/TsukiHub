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

// --- /api/edit-game ---
app.post("/api/edit-game", async (req, res) => {
  console.log("[server.js] API endpoint called - LOCAL SERVER VERSION");
  const { gameData, userId, originalIdentifiers } = req.body;
  console.log("[server.js] Request body:", {
    gameData: gameData?.nombre,
    userId,
    originalIdentifiers,
  });

  if (!gameData || !userId || !originalIdentifiers) {
    console.log("[server.js] Missing required data");
    return res.status(400).json({ error: "Missing required data" });
  }

  // VALIDACIÓN: Verificar si el usuario está autorizado (solo admin puede editar)
  console.log(`[server.js] Validating user: ${userId}`);
  const ADMIN_USER_ID = "173916175"; // El ID del administrador
  if (String(userId).trim() !== ADMIN_USER_ID) {
    console.log(
      `[server.js] User ${userId} is NOT AUTHORIZED to edit games (not admin)`
    );
    return res.status(403).json({
      error: "User not authorized",
      message: "Solo el administrador puede editar juegos",
      userId: userId,
    });
  }

  console.log(
    `[server.js] User ${userId} is AUTHORIZED (admin), proceeding with edit`
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
    // Autorizar con Google Sheets
    await new Promise((resolve, reject) => {
      auth.authorize((err, tokens) => {
        if (err) return reject(err);
        resolve(tokens);
      });
    }); // Función para limpiar texto para CSV
    const cleanTextForCSV = (text) => {
      if (!text) return "";
      return String(text)
        .replace(/"/g, '""') // Escapar comillas dobles
        .replace(/,/g, "-%-") // Reemplazar comas
        .trim(); // Eliminar espacios al inicio y final
    };

    // Función para convertir fecha de ISO a formato dd/mm/yyyy
    const convertISOToDate = (isoDate) => {
      if (!isoDate) return "";
      try {
        const date = new Date(isoDate);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error("Error converting date:", error);
        return "";
      }
    };

    // Función para convertir separadores de comas a -%-
    const convertCommasToSeparators = (text) => {
      if (!text) return "";
      return text.replace(/,\s*/g, "-%-");
    }; // Buscar la fila del juego a editar
    const range = "Juegos!A:Q"; // Rango completo para buscar (hasta columna Q)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values || [];
    let targetRowIndex = -1;

    // Buscar la fila que corresponde al juego usando múltiples criterios
    console.log(
      `[server.js] Searching for game with identifiers:`,
      originalIdentifiers
    );
    for (let i = 1; i < rows.length; i++) {
      // Empezar desde 1 para saltar headers
      const row = rows[i];
      const rowName = row[0]?.trim() || "";
      const rowEstado = row[1]?.trim() || "";
      const rowFecha = row[6]?.trim() || "";
      const rowUsuario = row[15]?.trim() || "";

      // Verificar si coinciden todos los criterios identificadores
      const nameMatch = rowName === originalIdentifiers.nombre?.trim();
      const estadoMatch =
        rowEstado.toLowerCase() === originalIdentifiers.estado?.toLowerCase();
      const fechaMatch = rowFecha === originalIdentifiers.fecha?.trim();
      const usuarioMatch = rowUsuario === originalIdentifiers.usuario?.trim();

      console.log(`[server.js] Row ${i + 1} comparison:`, {
        rowName,
        expectedName: originalIdentifiers.nombre,
        rowEstado,
        expectedEstado: originalIdentifiers.estado,
        rowFecha,
        expectedFecha: originalIdentifiers.fecha,
        rowUsuario,
        expectedUsuario: originalIdentifiers.usuario,
        matches: { nameMatch, estadoMatch, fechaMatch, usuarioMatch },
      });

      if (nameMatch && estadoMatch && fechaMatch && usuarioMatch) {
        targetRowIndex = i + 1; // +1 porque Google Sheets usa indexación basada en 1
        console.log(`[server.js] Found matching game at row ${targetRowIndex}`);
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.log(`[server.js] Game not found with provided identifiers`);
      return res.status(404).json({ error: "Game not found in spreadsheet" });
    } // Preparar los datos actualizados
    // Estructura de columnas correcta:
    // [Nombre, Estado, Youtube, Nota, Horas, Plataforma, Fecha, Carátula, Fecha de Lanzamiento, Géneros, Plataformas, Resumen, Desarrolladores, Publicadores, IGDBID, Usuario, Comentario]

    // Normalizar el estado a los valores correctos con mayúsculas
    let normalizedEstado = gameData.estado || "";
    switch (normalizedEstado.toLowerCase()) {
      case "completado":
      case "pasado":
        normalizedEstado = "Pasado";
        break;
      case "jugando":
        normalizedEstado = "Jugando";
        break;
      case "dropeado":
        normalizedEstado = "Dropeado";
        break;
      case "planeo jugar":
        normalizedEstado = "Planeo Jugar";
        break;
      case "recomendado":
        normalizedEstado = "Recomendado";
        break;
      default:
        normalizedEstado = gameData.estado || "";
    }
    const updatedValues = [
      cleanTextForCSV(gameData.nombre || ""), // A - Nombre
      normalizedEstado, // B - Estado
      gameData.youtube || "", // C - Youtube
      gameData.nota || "", // D - Nota
      gameData.horas || "", // E - Horas
      gameData.plataforma || "", // F - Plataforma (del spinner)
      convertISOToDate(gameData.fecha), // G - Fecha
      gameData.caratula || "", // H - Carátula
      convertISOToDate(gameData["Fecha de Lanzamiento"]), // I - Fecha de Lanzamiento
      convertCommasToSeparators(cleanTextForCSV(gameData.géneros || "")), // J - Géneros
      convertCommasToSeparators(cleanTextForCSV(gameData.plataformas || "")), // K - Plataformas
      convertCommasToSeparators(cleanTextForCSV(gameData.resumen || "")), // L - Resumen
      convertCommasToSeparators(
        cleanTextForCSV(gameData.desarrolladores || "")
      ), // M - Desarrolladores
      convertCommasToSeparators(cleanTextForCSV(gameData.publicadores || "")), // N - Publicadores
      gameData.igdbId || "", // O - IGDBID
      gameData.usuario || "", // P - Usuario
      convertCommasToSeparators(cleanTextForCSV(gameData.comentario || "")), // Q - Comentario
    ]; // Actualizar la fila específica
    const updateRange = `Juegos!A${targetRowIndex}:Q${targetRowIndex}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedValues],
      },
    });
    console.log(
      `[server.js] Successfully updated game "${gameData.nombre}" at row ${targetRowIndex}`
    );
    res.json({
      success: true,
      message: `Juego "${gameData.nombre}" actualizado correctamente`,
      updatedRow: targetRowIndex,
    });
  } catch (error) {
    console.error("[server.js] Error:", error);
    res.status(500).json({
      error: "Error updating game",
      details: error.message,
    });
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

// --- /api/tmdb-search ---
app.post("/api/tmdb-search", async (req, res) => {
  const { query, type = "multi" } = req.body; // type can be 'movie', 'tv', or 'multi'

  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TMDB API key missing" });
    }

    console.log(`[tmdb-search] Searching for: ${query} (type: ${type})`);

    // Search TMDB
    const tmdbResp = await fetch(
      `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(
        query
      )}&language=es-ES&page=1`
    );

    if (!tmdbResp.ok) {
      return res.status(500).json({
        error: "TMDB API error",
        status: tmdbResp.status,
      });
    }

    const tmdbData = await tmdbResp.json();
    console.log(`[tmdb-search] Found ${tmdbData.results.length} results`);

    // Transform results and get additional details for each item
    const transformedResults = await Promise.all(
      tmdbData.results.slice(0, 10).map(async (item) => {
        // Get detailed information for each movie/TV show
        const detailType =
          item.media_type || (type === "movie" ? "movie" : "tv"); // Get detail data and videos separately using specific endpoints
        const detailUrlES = `https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`;
        const detailUrlEN = `https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${apiKey}&language=en-US&append_to_response=credits`;
        const videosUrlES = `https://api.themoviedb.org/3/${detailType}/${item.id}/videos?api_key=${apiKey}&language=es-ES`;
        const videosUrlEN = `https://api.themoviedb.org/3/${detailType}/${item.id}/videos?api_key=${apiKey}&language=en-US`;

        console.log(
          `[tmdb-search] Fetching details for ${item.title || item.name} (ID: ${
            item.id
          })`
        );
        let detailData = {};
        let detailDataEN = {};
        let videosDataES = {};
        let videosDataEN = {};

        try {
          // Get Spanish version
          const detailResp = await fetch(detailUrlES);
          if (detailResp.ok) {
            detailData = await detailResp.json();
            console.log(
              `[tmdb-search] Spanish detail data received for ${
                item.title || item.name
              }`
            );
          }

          // Get English version for comparison
          const detailRespEN = await fetch(detailUrlEN);
          if (detailRespEN.ok) {
            detailDataEN = await detailRespEN.json();
            console.log(
              `[tmdb-search] English detail data received for ${
                item.title || item.name
              }`
            );
          }

          // Get videos in Spanish first
          const videosRespES = await fetch(videosUrlES);
          if (videosRespES.ok) {
            videosDataES = await videosRespES.json();
            console.log(
              `[tmdb-search] Spanish videos data received for ${
                item.title || item.name
              }: ${videosDataES.results?.length || 0} videos`
            );
          }

          // Get videos in English as backup
          const videosRespEN = await fetch(videosUrlEN);
          if (videosRespEN.ok) {
            videosDataEN = await videosRespEN.json();
            console.log(
              `[tmdb-search] English videos data received for ${
                item.title || item.name
              }: ${videosDataEN.results?.length || 0} videos`
            );
          }
        } catch (e) {
          console.error("Error fetching details for:", item.id, e);
        } // Log videos data for debugging
        if (videosDataES.results && videosDataES.results.length > 0) {
          console.log(
            `[tmdb-search] Found ${
              videosDataES.results.length
            } Spanish videos for ${item.title || item.name}`
          );
          videosDataES.results.forEach((video, index) => {
            console.log(
              `[tmdb-search] Spanish Video ${index + 1}: ${video.type} (${
                video.site
              }) - ${video.iso_639_1} - Key: ${video.key}`
            );
          });
        }

        if (videosDataEN.results && videosDataEN.results.length > 0) {
          console.log(
            `[tmdb-search] Found ${
              videosDataEN.results.length
            } English videos for ${item.title || item.name}`
          );
          videosDataEN.results.forEach((video, index) => {
            console.log(
              `[tmdb-search] English Video ${index + 1}: ${video.type} (${
                video.site
              }) - ${video.iso_639_1} - Key: ${video.key}`
            );
          });
        }

        // Format runtime/duration
        let duration = "";
        if (detailType === "movie" && detailData.runtime) {
          const hours = Math.floor(detailData.runtime / 60);
          const minutes = detailData.runtime % 60;
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else if (
          detailType === "tv" &&
          detailData.episode_run_time &&
          detailData.episode_run_time.length > 0
        ) {
          const avgRuntime = detailData.episode_run_time[0];
          const hours = Math.floor(avgRuntime / 60);
          const minutes = avgRuntime % 60;
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }

        // Get director (for movies) or creator (for TV shows)
        let director = "";
        let directorEN = "";

        // Get director from Spanish version
        if (detailData.credits) {
          console.log(
            `[tmdb-search] Spanish credits data available for ${
              item.title || item.name
            }`
          );
          console.log(
            `[tmdb-search] Spanish credits crew length: ${
              detailData.credits.crew?.length || 0
            }`
          );

          if (detailType === "movie") {
            const directorCredit = detailData.credits.crew?.find(
              (person) => person.job === "Director"
            );
            director = directorCredit ? directorCredit.name : "";
            console.log(`[tmdb-search] Spanish director found: "${director}"`);
          } else if (detailType === "tv") {
            director =
              detailData.created_by
                ?.map((creator) => creator.name)
                .join(", ") || "";
            console.log(
              `[tmdb-search] Spanish TV creator found: "${director}"`
            );
          }
        } else {
          console.log(
            `[tmdb-search] No Spanish credits data for ${
              item.title || item.name
            }`
          );
        }

        // Get director from English version for comparison
        if (detailDataEN.credits) {
          console.log(
            `[tmdb-search] English credits data available for ${
              item.title || item.name
            }`
          );

          if (detailType === "movie") {
            const directorCreditEN = detailDataEN.credits.crew?.find(
              (person) => person.job === "Director"
            );
            directorEN = directorCreditEN ? directorCreditEN.name : "";
            console.log(
              `[tmdb-search] English director found: "${directorEN}"`
            );
          } else if (detailType === "tv") {
            directorEN =
              detailDataEN.created_by
                ?.map((creator) => creator.name)
                .join(", ") || "";
            console.log(
              `[tmdb-search] English TV creator found: "${directorEN}"`
            );
          }
        }

        // Use English director if Spanish director contains non-Latin characters (Japanese, Chinese, Korean)
        const finalDirector =
          director &&
          /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(
            director
          )
            ? directorEN
            : director || directorEN;
        console.log(
          `[tmdb-search] Final director choice: "${finalDirector}" (Spanish: "${director}", English: "${directorEN}")`
        );

        // Get genres - prioritize Spanish, fallback to English
        let genresString = "";
        let genresES = [];
        let genresEN = [];

        // Get genres from Spanish data
        if (detailData.genres && Array.isArray(detailData.genres)) {
          genresES = detailData.genres
            .map((genre) => genre.name)
            .filter((name) => name);
          console.log(
            `[tmdb-search] Spanish genres found for ${
              item.title || item.name
            }: ${genresES.join(", ")}`
          );
        }

        // Get genres from English data as fallback
        if (detailDataEN.genres && Array.isArray(detailDataEN.genres)) {
          genresEN = detailDataEN.genres
            .map((genre) => genre.name)
            .filter((name) => name);
          console.log(
            `[tmdb-search] English genres found for ${
              item.title || item.name
            }: ${genresEN.join(", ")}`
          );
        }

        // Use Spanish genres if available, otherwise English
        if (genresES.length > 0) {
          genresString = genresES.join(", ");
          console.log(`[tmdb-search] Using Spanish genres: ${genresString}`);
        } else if (genresEN.length > 0) {
          genresString = genresEN.join(", ");
          console.log(
            `[tmdb-search] Using English genres (fallback): ${genresString}`
          );
        } else {
          console.log(
            `[tmdb-search] No genres found for ${item.title || item.name}`
          );
        }

        // Get trailer URL - PRIORIZAR ESPAÑOL SIEMPRE
        let trailerUrl = "";
        console.log(
          `[tmdb-search] Starting trailer search for ${item.title || item.name}`
        );

        // Paso 1: Buscar trailer en español EXPLÍCITAMENTE
        let spanishTrailer = null;
        if (videosDataES.results && videosDataES.results.length > 0) {
          console.log(
            `[tmdb-search] Searching Spanish trailers in ${videosDataES.results.length} Spanish videos`
          );

          spanishTrailer = videosDataES.results.find((video) => {
            const isTrailer = video.type === "Trailer";
            const isYoutube = video.site === "YouTube";
            const isSpanish = video.iso_639_1 === "es";

            console.log(
              `[tmdb-search] Checking Spanish video: ${video.type} (${video.site}) - ${video.iso_639_1} - isTrailer:${isTrailer}, isYoutube:${isYoutube}, isSpanish:${isSpanish}`
            );

            return isTrailer && isYoutube && isSpanish;
          });

          if (spanishTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${spanishTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND SPANISH TRAILER: ${trailerUrl}`
            );
          } else {
            console.log(
              `[tmdb-search] ❌ No Spanish trailer found in Spanish videos`
            );
          }
        }

        // Paso 2: Solo si NO hay trailer en español, buscar en inglés
        if (
          !trailerUrl &&
          videosDataEN.results &&
          videosDataEN.results.length > 0
        ) {
          console.log(
            `[tmdb-search] No Spanish trailer found, searching English trailers in ${videosDataEN.results.length} English videos`
          );

          const englishTrailer = videosDataEN.results.find((video) => {
            const isTrailer = video.type === "Trailer";
            const isYoutube = video.site === "YouTube";
            const isEnglish = video.iso_639_1 === "en";

            console.log(
              `[tmdb-search] Checking English video: ${video.type} (${video.site}) - ${video.iso_639_1} - isTrailer:${isTrailer}, isYoutube:${isYoutube}, isEnglish:${isEnglish}`
            );

            return isTrailer && isYoutube && isEnglish;
          });

          if (englishTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${englishTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ENGLISH TRAILER (fallback): ${trailerUrl}`
            );
          } else {
            console.log(`[tmdb-search] ❌ No English trailer found either`);
          }
        }

        // Paso 3: Como último recurso, buscar cualquier trailer sin importar idioma
        if (!trailerUrl) {
          console.log(
            `[tmdb-search] No trailers found in specific languages, searching any language`
          );

          const allVideos = [
            ...(videosDataES.results || []),
            ...(videosDataEN.results || []),
          ];

          const anyTrailer = allVideos.find(
            (video) => video.type === "Trailer" && video.site === "YouTube"
          );

          if (anyTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${anyTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ANY TRAILER (last resort): ${trailerUrl} (${anyTrailer.iso_639_1})`
            );
          } else {
            console.log(
              `[tmdb-search] ❌ No trailers found at all, trying teasers/clips`
            );

            // Buscar teaser o clip como último recurso
            const teaser = allVideos.find(
              (video) => video.type === "Teaser" && video.site === "YouTube"
            );

            const clip = allVideos.find(
              (video) => video.type === "Clip" && video.site === "YouTube"
            );

            if (teaser) {
              trailerUrl = `https://www.youtube.com/watch?v=${teaser.key}`;
              console.log(
                `[tmdb-search] ✅ Using teaser as trailer: ${trailerUrl} (${teaser.iso_639_1})`
              );
            } else if (clip) {
              trailerUrl = `https://www.youtube.com/watch?v=${clip.key}`;
              console.log(
                `[tmdb-search] ✅ Using clip as trailer: ${trailerUrl} (${clip.iso_639_1})`
              );
            } else {
              console.log(`[tmdb-search] ❌ No videos found at all`);
            }
          }
        }

        console.log(
          `[tmdb-search] Final trailer result for ${item.title || item.name}: ${
            trailerUrl || "NONE"
          }`
        ); // Get poster and backdrop - prioritize Spanish, fallback to English, then search result
        let posterPath = null;
        let backdropPath = null;

        // Priorizar carátula en español, luego inglés, luego resultado de búsqueda
        if (detailData.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${detailData.poster_path}`;
          console.log(
            `[tmdb-search] Using Spanish poster for ${item.title || item.name}`
          );
        } else if (detailDataEN.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${detailDataEN.poster_path}`;
          console.log(
            `[tmdb-search] Using English poster (fallback) for ${
              item.title || item.name
            }`
          );
        } else if (item.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
          console.log(
            `[tmdb-search] Using search result poster for ${
              item.title || item.name
            }`
          );
        }

        // Priorizar imagen de fondo en español, luego inglés, luego resultado de búsqueda
        if (detailData.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${detailData.backdrop_path}`;
          console.log(
            `[tmdb-search] Using Spanish backdrop for ${
              item.title || item.name
            }`
          );
        } else if (detailDataEN.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${detailDataEN.backdrop_path}`;
          console.log(
            `[tmdb-search] Using English backdrop (fallback) for ${
              item.title || item.name
            }`
          );
        } else if (item.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
          console.log(
            `[tmdb-search] Using search result backdrop for ${
              item.title || item.name
            }`
          );
        }

        const result = {
          id: item.id,
          name: item.title || item.name,
          title: item.title || item.name,
          original_title: item.original_title || item.original_name || "",
          overview: item.overview || detailData.overview || "",
          release_date: item.release_date || item.first_air_date,
          poster_path: posterPath,
          backdrop_path: backdropPath,
          vote_average: item.vote_average || 0,
          vote_count: item.vote_count,
          genre_ids: item.genre_ids,
          original_language: item.original_language,
          popularity: item.popularity,
          media_type: detailType,
          adult: item.adult || false, // Additional detailed information
          duration: duration,
          director: finalDirector,
          trailer_url: trailerUrl,
          genres: genresString, // Add genres to result
          // TV specific fields
          first_air_date: item.first_air_date,
          origin_country: item.origin_country,
          original_name: item.original_name,
          number_of_seasons: detailData.number_of_seasons,
          number_of_episodes: detailData.number_of_episodes,
          // Movie specific fields
          original_title: item.original_title,
          video: item.video,
          runtime: detailData.runtime,
        };

        console.log(
          `[tmdb-search] Returning result for ${item.title || item.name}:`,
          {
            director: result.director,
            trailer_url: result.trailer_url,
            original_title: result.original_title,
            vote_average: result.vote_average,
          }
        );

        return result;
      })
    );

    console.log(`[tmdb-search] Processed ${transformedResults.length} results`);
    res.json({ results: transformedResults });
  } catch (e) {
    console.error("TMDB search error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Función para limpiar texto para CSV (movies)
const cleanTextForCSVMovies = (text) => {
  if (!text) return "";
  return text
    .replace(/"/g, '""') // Escapar comillas dobles
    .replace(/[\r\n]/g, " ") // Reemplazar saltos de línea con espacios
    .replace(/,/g, "-%-") // Reemplazar comas
    .trim(); // Eliminar espacios al inicio y final
};

// Función para convertir fecha ISO a formato DD/MM/YYYY (movies)
const convertISOToDateMovies = (dateInput) => {
  if (!dateInput) return "";

  // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
  if (
    typeof dateInput === "string" &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)
  ) {
    return dateInput;
  }

  // Si está en formato ISO (YYYY-MM-DD), convertirlo
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// --- /api/add-movie ---
app.post("/api/add-movie", async (req, res) => {
  const { content, formData } = req.body;
  if (!content || !formData) {
    return res.status(400).json({ error: "Missing data" });
  }

  console.log(
    `[add-movie] Adding content: ${content.name || content.title || "Unknown"}`
  );

  // Cargar las variables de entorno
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }
  try {
    // Autenticación con Google Sheets
    const auth = new google.auth.JWT({
      email: email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth }); // Determinar el tipo de contenido
    const contentType = content.media_type === "movie" ? "Película" : "Serie";

    // Formatear fecha de salida
    const fechaSalida = content.release_date
      ? convertISOToDateMovies(content.release_date)
      : "";

    // Debug de fechas
    console.log("[add-movie] Date processing:");
    console.log(`  - Release date (raw): ${content.release_date}`);
    console.log(`  - Fecha salida (processed): ${fechaSalida}`);
    console.log(`  - Fecha vista (raw): ${formData.fecha}`);
    console.log(
      `  - Fecha vista (processed): ${convertISOToDateMovies(
        formData.fecha || ""
      )}`
    ); // Log detallado de los datos recibidos para debugging
    console.log("[add-movie] Content data received:");
    console.log(`  - Title: ${content.name || content.title}`);
    console.log(`  - Original title: ${content.original_title}`);
    console.log(`  - Trailer URL: ${content.trailer_url}`);
    console.log(`  - Director: ${content.director}`);
    console.log(`  - Genres: ${content.genres}`);
    console.log(`  - Vote average: ${content.vote_average}`);
    console.log(`  - Backdrop path: ${content.backdrop_path}`);

    console.log("[add-movie] Form data received:");
    console.log(`  - Estado: ${formData.estado}`);
    console.log(`  - Fecha vista (raw): ${formData.fecha}`);
    console.log(
      `  - Fecha vista (processed): ${convertISOToDateMovies(
        formData.fecha || ""
      )}`
    );
    console.log(`  - Trailer: ${formData.trailer}`);
    console.log(`  - URL: ${formData.url}`);
    console.log(`  - Nota chat: ${formData.nota_chat}`);
    console.log(`  - Caratula: ${formData.caratula}`); // Preparar datos para insertar según el NUEVO formato especificado:
    // A:Titulo, B:Titulo_Original, C:Tipo, D:Estado, E:Fecha_Vista, F:Trailer, G:URL, H:Caratula, I:Imagen_Fondo, J:Duracion, K:Fecha_Salida, L:Director, M:Generos, N:Sinopsis, O:Puntuacion_Promedio, P:Usuario, Q:Comentario, R:Nota_Chat
    const values = [
      [
        cleanTextForCSVMovies(content.name || content.title), // A: Titulo
        cleanTextForCSVMovies(content.original_title || ""), // B: Titulo_Original (NUEVO)
        cleanTextForCSVMovies(contentType), // C: Tipo (Película/Serie)
        cleanTextForCSVMovies(formData.estado || "Planeo Ver"), // D: Estado
        cleanTextForCSVMovies(convertISOToDateMovies(formData.fecha || "")), // E: Fecha_Vista
        cleanTextForCSVMovies(content.trailer_url || ""), // F: Trailer (NUEVO)
        cleanTextForCSVMovies(formData.url || ""), // G: URL (YouTube personalizada)
        cleanTextForCSVMovies(formData.caratula || content.poster_path || ""), // H: Caratula (modificable)
        cleanTextForCSVMovies(content.backdrop_path || ""), // I: Imagen_Fondo (NUEVO)
        cleanTextForCSVMovies(content.duration || ""), // J: Duracion (de TMDB, formateada)
        cleanTextForCSVMovies(fechaSalida), // K: Fecha_Salida (de TMDB)
        cleanTextForCSVMovies(content.director || ""), // L: Director (de TMDB, en romanji)
        cleanTextForCSVMovies(content.genres || ""), // M: Generos (de TMDB)
        cleanTextForCSVMovies(content.overview || ""), // N: Sinopsis (de TMDB)
        cleanTextForCSVMovies(content.vote_average?.toString() || ""), // O: Puntuacion_Promedio (NUEVO)
        "", // P: Usuario (se poblará solo si se añade como recomendación)
        "", // Q: Comentario (se poblará solo si se añade como recomendación)
        cleanTextForCSVMovies(formData.nota_chat || ""), // R: Nota_Chat (establecida por el usuario)
      ],
    ];

    console.log("[add-movie] Values to insert:", values[0]);
    console.log("[add-movie] Critical field values:");
    console.log(`  - E (Fecha_Vista): "${values[0][4]}"`);
    console.log(`  - F (Trailer): "${values[0][5]}"`);
    console.log(`  - G (URL): "${values[0][6]}"`);
    console.log(`  - K (Fecha_Salida): "${values[0][10]}"`);
    console.log(`  - R (Nota_Chat): "${values[0][17]}"`);
    console.log("[add-movie] Array length:", values[0].length); // Insertar datos en la hoja de cálculo
    const request = {
      spreadsheetId: sheetId,
      range: "Pelis!A:R", // 18 columnas: A:Titulo hasta R:Nota_Chat
      valueInputOption: "RAW", // Cambiar de USER_ENTERED a RAW para evitar conversiones automáticas
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: values,
      },
    };

    console.log("[add-movie] Making append request...");
    const response = await sheets.spreadsheets.values.append(request);

    console.log("[add-movie] Response:", response.data);

    if (response.data.updates && response.data.updates.updatedRows > 0) {
      res.json({
        success: true,
        message: `${contentType} "${
          content.name || content.title
        }" agregado exitosamente`,
        data: response.data,
      });
    } else {
      res.status(500).json({
        error: "No se pudo agregar el contenido",
        response: response.data,
      });
    }
  } catch (error) {
    console.error("[add-movie] Error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
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
