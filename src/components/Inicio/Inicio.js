import React from "react";
import "./Inicio.css";

function Inicio() {
  return (
    <div className="inicio-container">
      <header>
        <h1>Bienvenido a mi Página</h1>
      </header>
      <main>
        <section>
          <h2>Introducción</h2>
          <p>Esta es la página principal de mi proyecto web. Explora las secciones de Juegos y TTS para más información.</p>
        </section>
      </main>
      <footer>
        <p>Creado por [Tu Nombre]</p>
      </footer>
    </div>
  );
}

export default Inicio;
