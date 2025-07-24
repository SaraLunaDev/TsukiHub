// Script temporal para rellenar IGDBID y trailer en Google Sheets de juegos
// Ejecutar con: node scripts/fill-igdbid-and-trailer.js

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { google } = require('googleapis');

const ADMIN_USER_ID = '173916175'; // Solo el admin puede editar
const SHEET_RANGE = 'Juegos!A:Q'; // Columnas A-Q

async function getSheetRows(auth, sheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
  });
  return res.data.values || [];
}

async function updateGameRow(auth, sheetId, rowIndex, updatedRow) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Juegos!A${rowIndex}:Q${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  });
}

async function searchIGDB({ name, summary, releaseDate }) {
  // Busca por nombre y año, y filtra por resumen y fecha
  const query = name;
  const resp = await fetch('http://localhost:5000/api/igdb-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await resp.json();
  if (!data.results) return null;
  // Normaliza resumen y fecha para comparar
  const clean = (txt) => (txt || '').replace(/-%-/g, ',').replace(/\s+/g, ' ').trim().toLowerCase();
  const cleanDate = (d) => d ? d.split('-').reverse().join('/') : '';
  for (const game of data.results) {
    // IGDB: summary, first_release_date (timestamp)
    const igdbSummary = clean(game.summary);
    const igdbDate = game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
      : '';
    if (
      igdbSummary && clean(summary) && igdbSummary.includes(clean(summary)) &&
      (!releaseDate || cleanDate(igdbDate) === releaseDate)
    ) {
      return game;
    }
  }
  // Si no hay match exacto, devuelve el primero
  return data.results[0] || null;
}

async function main() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!privateKey || !email || !sheetId) throw new Error('Faltan credenciales Google');
  const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  await new Promise((resolve, reject) => auth.authorize((err) => err ? reject(err) : resolve()));

  const rows = await getSheetRows(auth, sheetId);
  const header = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = row[0]?.trim();
    const estado = row[1]?.trim();
    const youtube = row[2]?.trim();
    let trailer = row[3]?.trim();
    const nota = row[4]?.trim();
    const horas = row[5]?.trim();
    const plataforma = row[6]?.trim();
    const fecha = row[7]?.trim();
    const caratula = row[8]?.trim();
    const fechaLanz = row[9]?.trim();
    const generos = row[10]?.trim();
    const plataformas = row[11]?.trim();
    const resumen = row[12]?.trim();
    const desarrolladores = row[13]?.trim();
    const publicadores = row[14]?.trim();
    let igdbId = row[15]?.trim();
    const usuario = row[16]?.trim();
    const comentario = row[17]?.trim();

    // Si falta IGDBID, buscarlo
    if (!igdbId) {
      const igdbGame = await searchIGDB({ name: nombre, summary: resumen, releaseDate: fechaLanz });
      if (igdbGame && igdbGame.id) {
        igdbId = igdbGame.id;
        row[15] = igdbId;
        console.log(`Añadido IGDBID a "${nombre}": ${igdbId}`);
        await updateGameRow(auth, sheetId, i + 1, row);
      } else {
        console.log(`No se encontró IGDBID para "${nombre}"`);
        continue;
      }
    }
    // Si falta trailer, buscarlo por nombre y filtrar por IGDBID
    if (!trailer) {
      const resp = await fetch('http://localhost:5000/api/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nombre }),
      });
      const data = await resp.json();
      // Buscar el juego correcto por IGDBID
      const found = data.results?.find(g => String(g.id) === String(igdbId));
      if (found && found.trailer) {
        row[3] = found.trailer;
        console.log(`Añadido trailer a "${nombre}": ${found.trailer}`);
        await updateGameRow(auth, sheetId, i + 1, row);
      } else {
        console.log(`No se encontró trailer para "${nombre}" (IGDBID: ${igdbId})`);
      }
    }
  }
  console.log('Script completado.');
}

main().catch(e => { console.error(e); process.exit(1); });
