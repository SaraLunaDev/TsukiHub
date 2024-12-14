import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const sheets = google.sheets({
      version: "v4",
      auth: process.env.GOOGLE_API_KEY,
    });

    // Accede a la variable sensible
    const spreadsheetId = process.env.USERDATA_SHEET_URL; // La URL o ID de tu hoja de Google

    // Obtener los datos de la hoja de cálculo
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C", // Ajusta el rango según necesites
    });

    const data = response.data.values;

    // Devuelve los datos en formato JSON
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener los datos de la hoja:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener los datos de la hoja.",
    });
  }
}
