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

  console.log("[add-movie] Environment check:");
  console.log("- Email present:", !!email);
  console.log("- Sheet ID present:", !!sheetId);
  console.log("- Private key present:", !!privateKey);
  console.log("- Private key length:", privateKey?.length);

  if (!privateKey || !email || !sheetId) {
    console.error("[add-movie] Missing credentials:", {
      hasPrivateKey: !!privateKey,
      hasEmail: !!email,
      hasSheetId: !!sheetId
    });
    return res.status(500).json({ 
      error: "Google credentials missing",
      details: {
        hasPrivateKey: !!privateKey,
        hasEmail: !!email,
        hasSheetId: !!sheetId
      }
    });
  }  try {
    // Autenticación con Google Sheets (usar el mismo formato que add-game.js)
    console.log("[add-movie] Creating JWT authentication...");
    const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: SCOPES,
    });

    console.log("[add-movie] Creating sheets client...");
    const sheets = google.sheets({ version: "v4", auth });// Determinar el tipo de contenido
    const contentType = content.media_type === "movie" ? "Película" : "Serie";

    // Formatear fecha de salida
    const fechaSalida = content.release_date
      ? convertISOToDate(content.release_date)
      : ""; // Preparar datos para insertar según el formato especificado:
    // A:Titulo, B:Titulo_Original, C:Tipo, D:Estado, E:Fecha_Vista, F:Trailer, G:URL, H:Caratula, I:Imagen_Fondo, J:Duracion, K:Fecha_Salida, L:Director, M:Generos, N:Sinopsis, O:Puntuacion_Promedio, P:Usuario, Q:Comentario, R:Nota_Chat
    const values = [
      [
        cleanTextForCSV(content.name || content.title), // A - Titulo
        cleanTextForCSV(content.original_title || ""), // B - Titulo_Original
        cleanTextForCSV(contentType), // C - Tipo (Película/Serie)        cleanTextForCSV(formData.estado || "Planeo Ver"), // D - Estado
        cleanTextForCSV(convertISOToDate(formData.fecha || "")), // E - Fecha_Vista
        cleanTextForCSV(content.trailer_url || ""), // F - Trailer
        cleanTextForCSV(formData.url || ""), // G - URL (YouTube)
        cleanTextForCSV(formData.caratula || content.poster_path || ""), // H - Caratula (modificable)
        cleanTextForCSV(content.backdrop_path || ""), // I - Imagen_Fondo        cleanTextForCSV(content.duration || ""), // J - Duracion (de TMDB, formateada)
        cleanTextForCSV(fechaSalida), // K - Fecha_Salida (de TMDB)
        cleanTextForCSV(content.director || ""), // L - Director (de TMDB)
        cleanTextForCSV(content.genres || ""), // M - Generos (de TMDB)
        cleanTextForCSV(content.overview || ""), // N - Sinopsis (de TMDB)
        cleanTextForCSV(
          content.vote_average ? content.vote_average.toString() : ""
        ), // O - Puntuacion_Promedio
        "", // P - Usuario (se poblará solo si se añade como recomendación)
        "", // Q - Comentario (se poblará solo si se añade como recomendación)
        cleanTextForCSV(formData.nota_chat || ""), // R - Nota_Chat (establecida por el usuario)
      ],
    ];
    console.log("[add-movie] Values to insert:", values[0]);
    console.log("[add-movie] Director value:", content.director);
    console.log("[add-movie] Trailer URL value:", content.trailer_url);
    console.log("[add-movie] Original title value:", content.original_title);
    console.log("[add-movie] Vote average value:", content.vote_average);
    console.log("[add-movie] Genres value:", content.genres);    // Insertar datos en la hoja de cálculo (formato idéntico a add-game.js)
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Pelis!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values,
      },
    });

    console.log(`[add-movie] Movie added successfully: ${content.name || content.title}`);
    res.json({ 
      success: true,
      message: `${contentType} "${content.name || content.title}" agregado exitosamente`
    });} catch (error) {
    console.error("[add-movie] Error details:");
    console.error("- Error type:", error.constructor.name);
    console.error("- Error message:", error.message);
    console.error("- Error code:", error.code);
    console.error("- Error stack:", error.stack);
    
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
      type: error.constructor.name,
      code: error.code
    });
  }
}
