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
    });  } catch (error) {
    console.error("[validate-user] Error:", error);
    res.status(500).json({
      error: "Error validating user",
      authorized: false,
      userId,
    });
  }
});

// --- /api/add-game ---
app.post("/api/add-game", async (req, res) => {
  console.log("[server.js] API endpoint /api/add-game called - LOCAL SERVER VERSION");
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { game, formData } = req.body;
  if (!game || !formData) {
    return res.status(400).json({ error: "Missing data" });
  }

  console.log(`[add-game] Adding game: ${game.name || game.title || "Unknown"}`);

  // Función para limpiar texto para CSV
  const cleanTextForCSV = (text) => {
    if (!text) return "";
    return text
      .replace(/"/g, '""') // Escapar comillas dobles
      .replace(/[\r\n]/g, " ") // Reemplazar saltos de línea con espacios
      .replace(/,/g, "-%-") // Reemplazar comas
      .trim(); // Eliminar espacios al inicio y final
  };

  // Función para convertir fecha ISO a formato DD/MM/YYYY
  const convertISOToDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Preparar los datos del juego para insertar
  const gameData = {
    nombre: cleanTextForCSV(game.name || game.title || ""),
    estado: formData.estado || "planeo jugar",
    youtube: formData.youtube || "",
    nota: formData.nota || "",
    horas: formData.horas || "",
    plataforma: formData.plataforma || "",
    fecha: convertISOToDate(formData.fecha) || "",
    caratula: game.cover && game.cover.url
      ? game.cover.url.startsWith("http")
        ? game.cover.url.replace("t_thumb", "t_cover_big")
        : `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
      : game.cover_url
      ? game.cover_url.replace("t_thumb", "t_cover_big")
      : "",
    fechaLanzamiento: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : game.release_date || "",
    géneros: game.genres && Array.isArray(game.genres)
      ? game.genres
          .map((g) => cleanTextForCSV(g.name).replace(/-%-/g, " "))
          .join("-%-")
      : cleanTextForCSV(game.genres_string || ""),
    plataformas: game.platforms && Array.isArray(game.platforms)
      ? game.platforms
          .map((p) => cleanTextForCSV(p.name).replace(/-%-/g, " "))
          .join("-%-")
      : cleanTextForCSV(game.platforms_string || ""),
    resumen: cleanTextForCSV(game.summary || game.description || ""),
    desarrolladores: game.involved_companies && Array.isArray(game.involved_companies)
      ? game.involved_companies.some((c) => c.developer)
        ? game.involved_companies
            .filter((c) => c.developer && c.company?.name)
            .map((c) =>
              cleanTextForCSV(c.company.name).replace(/-%-/g, " ")
            )
            .join("-%-")
        : game.involved_companies
            .map((c) =>
              c.company?.name
                ? cleanTextForCSV(c.company.name).replace(/-%-/g, " ")
                : ""
            )
            .filter(Boolean)
            .join("-%-")
      : cleanTextForCSV(game.developers_string || ""),
    publicadores: game.involved_companies && Array.isArray(game.involved_companies)
      ? game.involved_companies.some((c) => c.publisher)
        ? game.involved_companies
            .filter((c) => c.publisher && c.company?.name)
            .map((c) =>
              cleanTextForCSV(c.company.name).replace(/-%-/g, " ")
            )
            .join("-%-")
        : game.involved_companies
            .map((c) =>
              c.company?.name
                ? cleanTextForCSV(c.company.name).replace(/-%-/g, " ")
                : ""
            )
            .filter(Boolean)
            .join("-%-")
      : cleanTextForCSV(game.publishers_string || ""),
    igdbId: game.id || game.igdb_id || "",
    usuario: "", // No hay usuario para juegos añadidos por desarrolladores
    comentario: "", // No hay comentario para juegos añadidos por desarrolladores
  };

  // Cargar las variables de entorno
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }

  const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Autorizar
    await new Promise((resolve, reject) => {
      auth.authorize((err, tokens) => {
        if (err) return reject(err);
        resolve(tokens);
      });
    });

    console.log(`[add-game] Prepared game data:`, gameData);

    // Insertar el juego en Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Juegos!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            gameData.nombre, // A - Nombre
            gameData.estado, // B - Estado
            gameData.youtube, // C - YouTube
            gameData.nota, // D - Nota
            gameData.horas, // E - Horas
            gameData.plataforma, // F - Plataforma
            gameData.fecha, // G - Fecha
            gameData.caratula, // H - Carátula
            gameData.fechaLanzamiento, // I - Fecha de Lanzamiento
            gameData.géneros, // J - Géneros
            gameData.plataformas, // K - Plataformas
            gameData.resumen, // L - Resumen
            gameData.desarrolladores, // M - Desarrolladores
            gameData.publicadores, // N - Publicadores
            gameData.igdbId, // O - IGDBID
            gameData.usuario, // P - Usuario
            gameData.comentario, // Q - Comentario
          ],
        ],
      },
    });

    console.log(`[add-game] Game added successfully: ${gameData.nombre}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[add-game] Error:", error);
    res.status(500).json({ error: error.message });
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
