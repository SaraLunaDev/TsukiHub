import { google } from "googleapis";

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

// Función para validar si un usuario está autorizado (solo admin)
const isUserAuthorized = async (userId) => {
  if (!userId) return false;

  // Solo el admin puede editar películas
  const ADMIN_USER_ID = "173916175";
  const isAdmin = String(userId).trim() === ADMIN_USER_ID;

  console.log(
    `[isUserAuthorized] Checking user ${userId} for edit permissions: ${
      isAdmin ? "ADMIN (AUTHORIZED)" : "NOT ADMIN (NOT AUTHORIZED)"
    }`
  );
  return isAdmin;
};

// Función para limpiar texto para CSV (películas)
const cleanTextForCSVMovies = (text) => {
  if (!text) return "";
  return text
    .replace(/"/g, '""') // Escapar comillas dobles
    .replace(/[\r\n]/g, " ") // Reemplazar saltos de línea con espacios
    .replace(/,/g, "-%-") // Reemplazar comas
    .trim(); // Eliminar espacios al inicio y final
};

// Función para convertir fecha de ISO a formato dd/mm/yyyy
const convertISOToDateMovies = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Función para convertir separadores de comas a -%-
const convertCommasToSeparators = (text) => {
  if (!text) return "";
  return text.replace(/,\s*/g, "-%-");
};

export default async function handler(req, res) {
  console.log("[edit-movie.js] API endpoint called - VERCEL VERSION");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { movieData, userId, originalIdentifiers } = req.body;
  console.log("[edit-movie.js] Request body:", {
    movieData: movieData?.nombre,
    userId,
    originalIdentifiers,
  });

  if (!movieData || !userId || !originalIdentifiers) {
    console.log("[edit-movie.js] Missing required data");
    return res.status(400).json({ error: "Missing required data" });
  }

  // VALIDACIÓN: Solo el admin puede editar películas
  console.log(`[edit-movie] Validating user: ${userId}`);
  const authorized = await isUserAuthorized(userId);

  if (!authorized) {
    console.log(`[edit-movie] User ${userId} is NOT AUTHORIZED to edit movies`);
    return res.status(403).json({
      error: "User not authorized",
      message: "Solo el administrador puede editar películas",
      userId: userId,
    });
  }

  console.log(
    `[edit-movie] User ${userId} is AUTHORIZED, proceeding with movie edit`
  );

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
    // Autorizar con Google Sheets API
    await new Promise((resolve, reject) => {
      auth.authorize((err, tokens) => {
        if (err) return reject(err);
        resolve(tokens);
      });
    });

    // Primero, obtener todas las filas para encontrar la que corresponde a la película
    console.log(
      `[edit-movie] Searching for movie with identifiers:`,
      originalIdentifiers
    );
    
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Pelis!A:R", // Columnas A a R (18 columnas)
    });

    const rows = getResponse.data.values || [];
    console.log(`[edit-movie] Found ${rows.length} total rows`);

    // Buscar la fila que contiene la película original usando múltiples criterios
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowTitulo = row[0]?.trim() || "";
      const rowEstado = row[3]?.trim() || "";
      const rowFecha = row[4]?.trim() || "";
      const rowUsuario = row[15]?.trim() || "";

      // Verificar si coinciden todos los criterios identificadores
      const titleMatch = rowTitulo === originalIdentifiers.nombre?.trim();
      const estadoMatch =
        rowEstado.toLowerCase() === originalIdentifiers.estado?.toLowerCase();
      const fechaMatch = rowFecha === originalIdentifiers.fecha?.trim();
      const usuarioMatch = rowUsuario === originalIdentifiers.usuario?.trim();

      console.log(`[edit-movie] Row ${i + 1} comparison:`, {
        rowTitulo,
        expectedTitulo: originalIdentifiers.nombre,
        rowEstado,
        expectedEstado: originalIdentifiers.estado,
        rowFecha,
        expectedFecha: originalIdentifiers.fecha,
        rowUsuario,
        expectedUsuario: originalIdentifiers.usuario,
        matches: { titleMatch, estadoMatch, fechaMatch, usuarioMatch },
      });

      if (titleMatch && estadoMatch && fechaMatch && usuarioMatch) {
        targetRowIndex = i + 1; // +1 porque Google Sheets usa índices base 1
        console.log(`[edit-movie] Found matching movie at row ${targetRowIndex}`);
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.log(`[edit-movie] Movie not found with provided identifiers`);
      return res.status(404).json({ error: "Movie not found in sheet" });
    }

    // Preparar los datos actualizados
    // Estructura de columnas para películas:
    // A:Titulo, B:Titulo_Original, C:Tipo, D:Estado, E:Fecha_Vista, F:Trailer, G:URL, H:Caratula, I:Imagen, J:Duracion, K:Fecha_Salida, L:Director, M:Generos, N:Sinopsis, O:Nota, P:Usuario, Q:Comentario, R:Nota_Chat
    
    const updatedValues = [
      cleanTextForCSVMovies(movieData.nombre || ""), // A - Titulo
      cleanTextForCSVMovies(movieData.titulo_original || ""), // B - Titulo_Original
      cleanTextForCSVMovies(movieData.tipo || "Película"), // C - Tipo
      cleanTextForCSVMovies(movieData.estado || ""), // D - Estado
      cleanTextForCSVMovies(convertISOToDateMovies(movieData.fecha || "")), // E - Fecha_Vista
      cleanTextForCSVMovies(movieData.trailer || ""), // F - Trailer
      cleanTextForCSVMovies(movieData.url || ""), // G - URL
      cleanTextForCSVMovies(movieData.caratula || ""), // H - Caratula
      cleanTextForCSVMovies(movieData.imagen_fondo || ""), // I - Imagen
      cleanTextForCSVMovies(movieData.duracion || ""), // J - Duracion
      cleanTextForCSVMovies(convertISOToDateMovies(movieData.fecha_lanzamiento || "")), // K - Fecha_Salida
      cleanTextForCSVMovies(movieData.director || ""), // L - Director
      cleanTextForCSVMovies(convertCommasToSeparators(movieData.genero || "")), // M - Generos
      cleanTextForCSVMovies(movieData.resumen || ""), // N - Sinopsis
      cleanTextForCSVMovies(movieData.nota_tmdb ? movieData.nota_tmdb.toString() : ""), // O - Nota
      cleanTextForCSVMovies(movieData.usuario || ""), // P - Usuario
      cleanTextForCSVMovies(movieData.comentario || ""), // Q - Comentario
      cleanTextForCSVMovies(movieData.nota_chat || ""), // R - Nota_Chat
    ];

    console.log("[edit-movie] Updated values to write:", updatedValues);

    // Actualizar la fila específica
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Pelis!A${targetRowIndex}:R${targetRowIndex}`,
      valueInputOption: "RAW",
      resource: {
        values: [updatedValues],
      },
    });

    console.log("[edit-movie] Update response:", updateResponse.data);

    if (updateResponse.data.updatedCells > 0) {
      res.json({
        success: true,
        message: `Película "${movieData.nombre}" actualizada exitosamente`,
        updatedRow: targetRowIndex,
        updatedCells: updateResponse.data.updatedCells,
      });
    } else {
      res.status(500).json({
        error: "No se pudo actualizar la película",
        response: updateResponse.data,
      });
    }
  } catch (error) {
    console.error("[edit-movie] Error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
}
