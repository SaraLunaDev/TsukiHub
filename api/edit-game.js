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

  // Solo el admin puede editar juegos
  const ADMIN_USER_ID = "173916175";
  const isAdmin = String(userId).trim() === ADMIN_USER_ID;

  console.log(
    `[isUserAuthorized] Checking user ${userId} for edit permissions: ${
      isAdmin ? "ADMIN (AUTHORIZED)" : "NOT ADMIN (NOT AUTHORIZED)"
    }`
  );
  return isAdmin;
};

// Función para limpiar texto para CSV (eliminar saltos de línea y reemplazar comas)
const cleanTextForCSV = (text) => {
  if (!text) return "";
  return text
    .replace(/\r\n/g, " ") // Reemplazar saltos de línea Windows
    .replace(/\n/g, " ") // Reemplazar saltos de línea Unix
    .replace(/\r/g, " ") // Reemplazar retornos de carro
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
};

export default async function handler(req, res) {
  console.log("[edit-game.js] API endpoint called - VERCEL VERSION");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { gameData, userId, originalIdentifiers } = req.body;
  console.log("[edit-game.js] Request body:", {
    gameData: gameData?.nombre,
    userId,
    originalIdentifiers,
  });

  if (!gameData || !userId || !originalIdentifiers) {
    console.log("[edit-game.js] Missing required data");
    return res.status(400).json({ error: "Missing required data" });
  }

  // VALIDACIÓN: Solo el admin puede editar juegos
  console.log(`[edit-game] Validating user: ${userId}`);
  const authorized = await isUserAuthorized(userId);

  if (!authorized) {
    console.log(`[edit-game] User ${userId} is NOT AUTHORIZED to edit games`);
    return res.status(403).json({
      error: "User not authorized",
      message: "Solo el administrador puede editar juegos",
      userId: userId,
    });
  }

  console.log(
    `[edit-game] User ${userId} is AUTHORIZED, proceeding with game edit`
  );

  // Carga las variables de entorno
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
    }); // Primero, obtener todas las filas para encontrar la que corresponde al juego
    console.log(
      `[edit-game] Searching for game with identifiers:`,
      originalIdentifiers
    );
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Juegos!A:Q", // Columnas A a Q (hasta comentario)
    });

    const rows = getResponse.data.values || [];
    console.log(`[edit-game] Found ${rows.length} total rows`);

    // Buscar la fila que contiene el juego original usando múltiples criterios
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = row[0]?.trim() || "";
      const rowEstado = row[1]?.trim() || "";
      const rowFecha = row[6]?.trim() || "";
      const rowUsuario = row[15]?.trim() || "";

      // Verificar si coinciden los criterios identificadores, ignorando los vacíos
      const nameMatch = rowName === (originalIdentifiers.nombre?.trim() || "");
      const estadoMatch = rowEstado.toLowerCase() === (originalIdentifiers.estado?.toLowerCase() || "");
      const fechaMatch = !originalIdentifiers.fecha || rowFecha === originalIdentifiers.fecha?.trim();
      const usuarioMatch = !originalIdentifiers.usuario || rowUsuario === originalIdentifiers.usuario?.trim();

      console.log(`[edit-game] Row ${i + 1} comparison:`, {
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
        targetRowIndex = i + 1; // +1 porque Google Sheets usa índices base 1
        console.log(`[edit-game] Found matching game at row ${targetRowIndex}`);
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.log(`[edit-game] Game not found with provided identifiers`);
      return res.status(404).json({ error: "Game not found in sheet" });
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
    const updatedRow = [
      cleanTextForCSV(gameData.nombre || ""), // A - Nombre
      normalizedEstado, // B - Estado
      gameData.youtube || "", // C - Youtube
      gameData.trailer || "", // D - Trailer
      gameData.nota || "", // E - Nota
      gameData.horas || "", // F - Horas
      gameData.plataforma || "", // G - Plataforma (del spinner)
      convertISOToDate(gameData.fecha), // H - Fecha
      gameData.caratula || "", // I - Carátula
      convertISOToDate(gameData["Fecha de Lanzamiento"]), // J - Fecha de Lanzamiento
      convertCommasToSeparators(cleanTextForCSV(gameData.géneros || "")), // K - Géneros
      convertCommasToSeparators(cleanTextForCSV(gameData.plataformas || "")), // L - Plataformas
      convertCommasToSeparators(cleanTextForCSV(gameData.resumen || "")), // M - Resumen
      convertCommasToSeparators(
        cleanTextForCSV(gameData.desarrolladores || "")
      ), // N - Desarrolladores
      convertCommasToSeparators(cleanTextForCSV(gameData.publicadores || "")), // O - Publicadores
      gameData.igdbId || "", // P - IGDBID
      gameData.usuario || "", // Q - Usuario
      convertCommasToSeparators(cleanTextForCSV(gameData.comentario || "")), // R - Comentario
    ];

    console.log(
      `[edit-game] Updating row ${targetRowIndex} with data:`,
      updatedRow
    );

    // Actualizar la fila específica
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Juegos!A${targetRowIndex}:R${targetRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log(
      `[edit-game] Successfully updated game "${gameData.nombre}" at row ${targetRowIndex}`
    );
    res.json({
      success: true,
      message: `Juego "${gameData.nombre}" actualizado correctamente`,
      rowIndex: targetRowIndex,
    });
  } catch (error) {
    console.error("[edit-game] Error:", error);
    res.status(500).json({
      error: "Error updating game",
      details: error.message,
    });
  }
}
