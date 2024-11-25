import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import TTS from "./components/TTS/TTS";


function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<h2>Página de Inicio</h2>} />
        <Route path="/juegos" element={<h2>Sección de Juegos</h2>} />
        <Route path="/tts" element={<TTS />} />
      </Routes>
    </Router>
  );
}

export default App;
