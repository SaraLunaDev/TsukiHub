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

    return authorizedUserIds;
  } catch (error) {
    return [];
  }
};

const isUserAuthorized = async (userId) => {
  if (!userId) return false;
  const authorizedUsers = await getAuthorizedUsers();
  return authorizedUsers.includes(String(userId).trim());
};


// Función para limpiar texto para CSV (igual que add-movie.js)
const cleanTextForCSVMovies = (text) => {
  if (text === undefined || text === null) return "";
  const str = typeof text === "string" ? text : String(text);
  return str
    .replace(/"/g, '""')
    .replace(/[\r\n]/g, " ")
    .replace(/,/g, "-%-")
    .trim();
};

// Función para convertir fecha ISO a formato DD/MM/YYYY (igual que add-movie.js)
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

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  // Permitir ambos formatos: movie+user+comment o campos sueltos
  let movie = body.movie || body;
  let userId = body.userId || body.user || body.user_id || (body.user && body.user.id);
  let userName = body.userName || (body.user && body.user.name) || userId;
  let comentario = body.comentario || body.comment || "";

  // Si movie es un string, intentar parsear
  if (typeof movie === "string") {
    try {
      movie = JSON.parse(movie);
    } catch {}
  }

  // Si movie no es objeto, forzar objeto vacío
  if (!movie || typeof movie !== "object") movie = {};

  // Validar datos mínimos: solo requiere título y userId
  const titulo = movie.title || movie.nombre || movie.name || "";
  if (!titulo || !userId) {
    return res.status(400).json({ error: "Missing data" });
  }

  // VALIDACIÓN: Verificar si el usuario está autorizado en la base de datos UserData
  const authorized = await isUserAuthorized(userId);
  if (!authorized) {
    return res.status(403).json({
      error: "User not authorized",
      message:
        "Solo usuarios registrados en la base de datos pueden añadir recomendaciones",
      userId,
    });
  }


  // Normalización de campos igual que en add-movie.js
  const contentType = movie.media_type === "movie" || movie.tipo === "Película" ? "Película" : (movie.media_type === "tv" || movie.tipo === "Serie" ? "Serie" : "");
  // Trailer: buscar en movie.trailer_url, movie.trailer, movie.videos?.results, etc.
  let trailer = movie.trailer_url || movie.trailer || "";
  if (!trailer && movie.videos && Array.isArray(movie.videos.results)) {
    const yt = movie.videos.results.find(v => v.site === "YouTube" && v.type === "Trailer");
    if (yt) trailer = `https://www.youtube.com/watch?v=${yt.key}`;
  }
  // Imagen fondo
  const imagenFondo = movie.backdrop_path || movie.imagen || movie.imagen_fondo || "";
  // Duración (formato Xh Ym si es minutos)
  let duracion = movie.runtime || movie.duracion || movie.duration || "";
  if (typeof duracion === "number" || (/^\d+$/.test(duracion) && duracion !== "")) {
    const mins = parseInt(duracion, 10);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    duracion = (h > 0 ? `${h}h ` : "") + (m > 0 ? `${m}m` : h === 0 ? `${m}m` : "").trim();
  }
  // Fecha salida (siempre formateada DD/MM/YYYY)
  let fechaSalida = "";
  if (movie.release_date) {
    fechaSalida = convertISOToDateMovies(movie.release_date);
  } else if (movie.fecha_salida) {
    fechaSalida = convertISOToDateMovies(movie.fecha_salida);
  }
  // Director
  let director = movie.director || "";
  if (!director && movie.credits && Array.isArray(movie.credits.crew)) {
    const dir = movie.credits.crew.find(p => p.job === "Director");
    if (dir) director = dir.name;
  }
  // Géneros (idéntico a add-movie.js)
  let generos = "";
  if (movie.genres && Array.isArray(movie.genres)) {
    // Si es array de objetos, extraer nombres; si es string, usar tal cual
    if (typeof movie.genres[0] === "object" && movie.genres[0] !== null && movie.genres[0].name) {
      generos = movie.genres.map(g => g.name).join("-%-");
    } else {
      generos = movie.genres.join("-%-");
    }
  } else if (typeof movie.genres === "string") {
    generos = movie.genres;
  } else if (movie.genres_string) {
    generos = movie.genres_string;
  } else if (movie.generos) {
    generos = movie.generos;
  }
  // Carátula
  let caratula = "";
  if (movie.poster_path) {
    caratula = movie.poster_path.startsWith("http") ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  } else if (movie.caratula) {
    caratula = movie.caratula;
  }

  const row = [
    cleanTextForCSVMovies(titulo), // Titulo (A)
    cleanTextForCSVMovies(movie.titulo_original || movie.original_title || ""), // Titulo_Original (B)
    cleanTextForCSVMovies(contentType), // Tipo (C)
    "Recomendado", // Estado (D)
    "", // Fecha_Vista (E)
    cleanTextForCSVMovies(trailer), // Trailer (F)
    cleanTextForCSVMovies(movie.url || ""), // URL (G)
    cleanTextForCSVMovies(caratula), // Caratula (H)
    cleanTextForCSVMovies(imagenFondo), // Imagen_Fondo (I)
    cleanTextForCSVMovies(duracion), // Duracion (J)
    cleanTextForCSVMovies(fechaSalida), // Fecha_Salida (K)
    cleanTextForCSVMovies(director), // Director (L)
    cleanTextForCSVMovies(generos), // Generos (M)
    cleanTextForCSVMovies(movie.overview || movie.sinopsis || movie.resumen || ""), // Sinopsis (N)
    movie.nota || "", // Nota (O)
    userName || userId, // Usuario (P) (guardar nombre si está disponible)
    cleanTextForCSVMovies(comentario), // Comentario (Q)
    movie.nota_chat || "", // Nota_Chat (R)
  ];

  const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!privateKey || !email || !sheetId) {
    return res.status(500).json({ error: "Google credentials missing" });
  }
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
      range: "Pelis!A:R", // 18 columnas: A:Titulo hasta R:Nota_Chat
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
