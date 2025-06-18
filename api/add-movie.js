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

  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }

  try {
    // Autenticación con Google Sheets
    const auth = new google.auth.JWT(email, null, privateKey, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);

    const sheets = google.sheets({ version: "v4", auth }); // Determinar el tipo de contenido
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
    console.log("[add-movie] Genres value:", content.genres); // Insertar datos en la hoja de cálculo
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
}
