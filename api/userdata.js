export default async function handler(req, res) {
  const sensitiveApiKey = process.env.USERDATA_SHEET_URL;
  
  // Realiza alguna operación con la API usando la variable sensible
  const response = await fetch(`https://api.example.com/data?apiKey=${sensitiveApiKey}`);
  const data = await response.json();

  // Devuelve los datos al frontend
  res.status(200).json(data);
}
