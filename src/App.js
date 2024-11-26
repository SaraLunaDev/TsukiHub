import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Inicio from "./components/Inicio/Inicio";
import Juegos from "./components/Juegos/Juegos";
import "./App.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/juegos" element={<Juegos />} />
        <Route path="/tts" element={<h2>Sección TTS</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
