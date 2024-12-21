import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar"; // Barra de navegacion
import Inicio from "./components/Inicio/Inicio"; // Pagina de inicio
import Juegos from "./components/Juegos/Juegos"; // Pagina de juegos
import Pokedex from "./components/Pokedex/Pokedex"; // Pagina de Pokedex
import TTS from "./components/TTS/TTS"; // Pagina de Texto a voz
import Gacha from "./components/Gacha/Gacha"; // Pagina de Gacha
import "./App.css"; // Estilos globales de la aplicacion

function App() {
  return (
    <Router>
      <Navbar /> {/* Componente de navegacion visible en todas las paginas */}
      <Routes>
        <Route path="/" element={<Inicio />} /> {/* Ruta principal */}
        <Route path="/juegos" element={<Juegos />} />{" "}
        {/* Ruta para la seccion de juegos */}
        <Route path="/pokedex" element={<Pokedex />} />{" "}
        {/* Ruta principal de Pokedex */}
        <Route path="/pokedex/:region" element={<Pokedex />} />{" "}
        {/* Ruta dinamica para Pokedex por region */}
        <Route path="/TTS" element={<TTS />} />{" "}
        {/* Ruta para la funcionalidad de texto a voz */}
        <Route path="/Gacha" element={<Gacha />} />{" "}
        {/* Ruta principal de Gacha */}
        <Route path="/gacha/:banner" element={<Gacha />} />{" "}
        {/* Ruta dinamica para Gacha por banner */}
        <Route path="/" element={<Gacha />} /> {/* Ruta por defecto */}
      </Routes>
    </Router>
  );
}

export default App;
