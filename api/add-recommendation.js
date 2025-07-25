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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { game, user, comment } = req.body;
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
            cleanTextForCSV(game.name || game.title || ""), // Nombre (A)
            "Recomendado", // Estado (B)
            "", // Youtube (C)
            game.trailer || "", // Trailer (D)
            "", // Nota (E)
            "", // Horas (F)
            "", // Plataforma (G)
            "", // Fecha (H) - se deja vacío para recomendados
            // Carátula (I)
            game.cover && game.cover.url
              ? game.cover.url.startsWith("http")
                ? game.cover.url.replace("t_thumb", "t_cover_big")
                : `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
              : game.cover_url
              ? game.cover_url.replace("t_thumb", "t_cover_big")
              : "",
            // Fecha de Lanzamiento (J)
            game.first_release_date
              ? new Date(game.first_release_date * 1000)
                  .toISOString()
                  .split("T")[0]
              : game.release_date || "",
            // Géneros (K)
            game.genres && Array.isArray(game.genres)
              ? game.genres
                  .map((g) => cleanTextForCSV(g.name).replace(/-%-/g, " "))
                  .join("-%-")
              : cleanTextForCSV(game.genres_string || ""),
            // Plataformas (L)
            game.platforms && Array.isArray(game.platforms)
              ? game.platforms
                  .map((p) => cleanTextForCSV(p.name).replace(/-%-/g, " "))
                  .join("-%-")
              : cleanTextForCSV(game.platforms_string || ""),
            // Resumen (M)
            cleanTextForCSV(game.summary || game.description || ""),
            // Desarrolladores (N)
            game.involved_companies && Array.isArray(game.involved_companies)
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
            // Publicadores (O)
            game.involved_companies && Array.isArray(game.involved_companies)
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
            // IGDBID (P)
            game.id || game.igdb_id || "",
            // Usuario (Q)
            user,
            // Comentario (R)
            cleanTextForCSV(comment || ""), // Añadir comentario limpio como nueva columna
          ],
        ],
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
