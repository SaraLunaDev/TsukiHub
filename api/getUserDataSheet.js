export default function handler(req, res) {
  // Accede a la variable de entorno
  const sheetUrl = process.env.USERDATA_SHEET_URL;

  if (!sheetUrl) {
    return res
      .status(500)
      .json({ error: "USERDATA_SHEET_URL no está configurada" });
  }

  // Responde con el valor de la variable
  res.status(200).json({ sheetUrl });
}
