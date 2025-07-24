// server.js
// Servidor de desarrollo para exponer las funciones de /api como endpoints locales

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cargar todas las funciones de /api como endpoints
const apiDir = path.join(__dirname, 'api');
fs.readdirSync(apiDir).forEach(file => {
  if (file.endsWith('.js')) {
    const route = '/api/' + file.replace('.js', '');
    const handler = require(path.join(apiDir, file));
    app.all(route, async (req, res) => {
      try {
        // Vercel serverless functions reciben (req, res), pero también pueden usar (req, res) como parámetros
        // Si el handler exporta una función default, usarla
        if (typeof handler === 'function') {
          await handler(req, res);
        } else if (typeof handler.default === 'function') {
          await handler.default(req, res);
        } else {
          res.status(500).json({ error: 'Handler inválido en ' + file });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Error interno' });
      }
    });
  }
});

// Servir archivos estáticos de build/ o public/
const staticDir = fs.existsSync(path.join(__dirname, 'build')) ? 'build' : 'public';
app.use(express.static(path.join(__dirname, staticDir)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de desarrollo escuchando en http://localhost:${PORT}`);
});
