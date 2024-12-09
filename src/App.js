import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Inicio from "./components/Inicio/Inicio";
import Juegos from "./components/Juegos/Juegos";
import Pokedex from "./components/Pokedex/Pokedex";
import TTS from "./components/TTS/TTS";
import Gacha from "./components/Gacha/Gacha";
import "./App.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/juegos" element={<Juegos />} />
        <Route path="/pokedex" element={<Pokedex />} />
        <Route path="/pokedex/:region" element={<Pokedex />} />
        <Route path="/TTS" element={<TTS />} />
        <Route path="/Gacha" element={<Gacha />} />
        <Route path="/gacha/:banner" element={<Gacha />} />
        <Route path="/" element={<Gacha />} /> {/* Ruta por defecto */}
      </Routes>
    </Router>
  );
}

export default App;
