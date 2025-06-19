import { google } from "googleapis";

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
    const sheets = google.sheets({ version: "v4", auth });    // Determinar el tipo de contenido
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
    );

    // Log detallado de los datos recibidos para debugging
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
    console.log(`  - Caratula: ${formData.caratula}`);

    // Preparar datos para insertar según el NUEVO formato especificado:
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
    console.log("[add-movie] Array length:", values[0].length);
        cleanTextForCSV(content.original_title || ""), // B - Titulo_Original
        cleanTextForCSV(contentType), // C - Tipo (Película/Serie)
        cleanTextForCSV(formData.estado || "Planeo Ver"), // D - Estado
        cleanTextForCSV(convertISOToDate(formData.fecha || "")), // E - Fecha_Vista
        cleanTextForCSV(content.trailer_url || ""), // F - Trailer    // Insertar datos en la hoja de cálculo
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

    console.log("[add-movie] Response status:", response.status);
    console.log("[add-movie] Response data:", response.data);

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
    }} catch (error) {
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
