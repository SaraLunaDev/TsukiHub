require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// Rutas para la autenticación de Twitch
app.post("/auth/twitch", async (req, res) => {
  const { code } = req.body;
  try {
    const tokenResponse = await axios.post(
      "https://id.twitch.tv/oauth2/token",
      null,
      {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: process.env.TWITCH_REDIRECT_URI,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Llamada para obtener los datos del usuario
    const userResponse = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID,
      },
    });

    const user = userResponse.data.data[0];
    // Aquí puedes almacenar los datos en Google Sheets
    await storeUserInGoogleSheets(user);

    res.json(user); // Responde con los datos del usuario
  } catch (error) {
    console.error("Error durante el proceso de autenticación:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Función para almacenar los datos del usuario en Google Sheets
const storeUserInGoogleSheets = async (userData) => {
  try {
    const sheets = google.sheets("v4");
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, "credentials", "google-credentials.json"), // Ruta segura
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = "UserLoginData!A1"; // Ajusta el rango según necesites
    const values = [
      [
        userData.id,
        userData.login,
        userData.display_name,
        userData.profile_image_url,
      ],
    ];

    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    console.log("Datos del usuario guardados en Google Sheets");
  } catch (error) {
    console.error("Error guardando en Google Sheets:", error);
  }
};

// Servir archivos estáticos si es necesario
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "build", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
