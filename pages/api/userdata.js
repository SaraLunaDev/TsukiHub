export default async function handler(req, res) {
  const sheetUrl = process.env.USERDATA_SHEET_URL; // Usando la variable de entorno
  console.log(process.env.USERDATA_SHEET_URL);

  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error("Error al obtener los datos del sheet");

    const data = await response.text(); // Si es CSV, lo tratamos como texto
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en la API:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
