import { google } from "googleapis";

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

// Función para convertir comas separadas en formato -%-
const convertCommasToSeparators = (text) => {
  if (!text) return "";
  return text.replace(/,\s*/g, "-%-");
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { game, formData } = req.body;
  if (!game || !formData) {
    return res.status(400).json({ error: "Missing data" });
  }

  console.log(`[add-game] Adding game: ${game.name || game.title || "Unknown"}`);

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
    });    // Preparar los datos del juego para insertar
    const gameData = {
      nombre: cleanTextForCSV(game.name || game.title || ""),
      estado: formData.estado || "Planeo Jugar",
      youtube: formData.youtube || "",
      nota: formData.nota || "",
      horas: formData.horas || "",
      plataforma: formData.plataforma || "",
      fecha: convertISOToDate(formData.fecha) || "",
      caratula: formData.caratula || 
        (game.cover && game.cover.url
          ? game.cover.url.startsWith("http")
            ? game.cover.url.replace("t_thumb", "t_cover_big")
            : `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
          : game.cover_url
          ? game.cover_url.replace("t_thumb", "t_cover_big")
          : ""),
      "Fecha de Lanzamiento": game.first_release_date
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
            gameData["Fecha de Lanzamiento"], // I - Fecha de Lanzamiento
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
}
