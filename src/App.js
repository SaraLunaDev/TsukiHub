import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Inicio from "./components/Inicio/Inicio";
import Juegos from "./components/Juegos/Juegos";
import Pelis from "./components/Pelis/Pelis";
import Pokedex from "./components/Pokedex/Pokedex";
import TTS from "./components/TTS/TTS";
import Gacha from "./components/Gacha/Gacha";
import "./App.css";

function App() {
  return (
    <Router>
      <Navbar /> {}{" "}
      <Routes>
        <Route path="/" element={<Inicio />} /> {/* Pagina de inicio */}
        <Route path="/juegos" element={<Juegos />} /> {/* Seccion de juegos */}
        <Route path="/pelis" element={<Pelis />} /> {/* Seccion de películas */}
        <Route path="/pokedex" element={<Pokedex />} />{" "}
        {/* Seccion Pokedex principal */}
        <Route path="/pokedex/:region" element={<Pokedex />} />{" "}
        {/* Seccion Pokedex por region */}
        <Route path="/TTS" element={<TTS />} /> {/* Seccion TTS */}
        <Route path="/Gacha" element={<Gacha />} /> {/* Seccion de Gacha */}
        <Route path="/gacha/:banner" element={<Gacha />} />{" "}
        {/* Seccion Gacha por banner */}
      </Routes>
    </Router>
  );
}

export default App;
