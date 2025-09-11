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
  if (
    typeof dateInput === "string" &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)
  ) {
    return dateInput;
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { editData, originalIdentifiers, userId } = req.body;
  if (!editData || !originalIdentifiers || !userId) {
    return res.status(400).json({ error: "Missing data" });
  }

  // Solo el admin puede editar películas
  const ADMIN_USER_ID = "173916175";
  if (String(userId).trim() !== ADMIN_USER_ID) {
    return res.status(403).json({ error: "User not authorized" });
  }

  // Cargar las variables de entorno
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }

  try {
    const auth = new google.auth.JWT({
      email: email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Obtener todas las filas para buscar la película original
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Pelis!A:R", // 18 columnas
    });
    const rows = getResponse.data.values || [];
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowTitle = (row[0]?.trim() || "").toLowerCase();
      const rowTipo = (row[2]?.trim() || "").toLowerCase();
      const rowEstado = (row[3]?.trim() || "").toLowerCase();
      const rowFechaVista = row[4]?.trim() || "";
      // Coincidencia por nombre, tipo, estado y fecha vista (nombre/tipo/estado en minúsculas)
      const titleMatch = rowTitle === (originalIdentifiers.nombre?.trim().toLowerCase() || "");
      const tipoMatch = rowTipo === (originalIdentifiers.tipo?.trim().toLowerCase() || "");
      const estadoMatch = rowEstado === (originalIdentifiers.estado?.trim().toLowerCase() || "");
      const fechaMatch = !originalIdentifiers.fecha || rowFechaVista === originalIdentifiers.fecha?.trim();
      if (titleMatch && tipoMatch && estadoMatch && fechaMatch) {
        targetRowIndex = i + 1; // +1 porque la hoja es base 1 y tiene header
        break;
      }
    }
    if (targetRowIndex === -1) {
      return res.status(404).json({ error: "Movie not found in sheet" });
    }

    // Preparar los datos actualizados (A:R)
    const updatedRow = [
      cleanTextForCSVMovies(editData.nombre || ""), // A: Titulo
      cleanTextForCSVMovies(editData.titulo_original || ""), // B: Titulo_Original
      cleanTextForCSVMovies(editData.tipo || "Película"), // C: Tipo
      cleanTextForCSVMovies(
        (editData.estado || "Planeo Ver").charAt(0).toUpperCase() + (editData.estado || "Planeo Ver").slice(1).toLowerCase()
      ), // D: Estado (primera mayúscula, resto minúscula)
      cleanTextForCSVMovies(convertISOToDateMovies(editData.fecha || "")), // E: Fecha_Vista (siempre DD/MM/YYYY)
      cleanTextForCSVMovies(editData.trailer || ""), // F: Trailer
      cleanTextForCSVMovies(editData.url || ""), // G: URL
      cleanTextForCSVMovies(editData.caratula || ""), // H: Caratula
      cleanTextForCSVMovies(editData.imagen_fondo || ""), // I: Imagen_Fondo
      cleanTextForCSVMovies(editData.duracion || ""), // J: Duracion
      cleanTextForCSVMovies(convertISOToDateMovies(editData.fecha_lanzamiento || "")), // K: Fecha_Salida (siempre DD/MM/YYYY)
      cleanTextForCSVMovies(editData.director || ""), // L: Director
      cleanTextForCSVMovies(editData.genero || ""), // M: Generos
      cleanTextForCSVMovies(editData.resumen || ""), // N: Sinopsis
      cleanTextForCSVMovies(editData.puntuacion_promedio?.toString() || ""), // O: Puntuacion_Promedio
      cleanTextForCSVMovies(editData.usuario || ""), // P: Usuario
      cleanTextForCSVMovies(editData.comentario || ""), // Q: Comentario
      cleanTextForCSVMovies(editData.nota_chat || ""), // R: Nota_Chat
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Pelis!A${targetRowIndex}:R${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [updatedRow],
      },
    });

    res.json({
      success: true,
      message: `Película/Serie "${editData.nombre}" actualizada correctamente`,
      rowIndex: targetRowIndex,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error updating movie",
      details: error.message,
    });
  }
}
