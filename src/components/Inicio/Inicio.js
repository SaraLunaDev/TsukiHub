import React, { useState, useEffect } from "react";
import "./Inicio.css";

function Inicio() {
  const [message, setMessage] = useState("");

  const handleLinkClick = () => {
    // Guarda un estado en localStorage
    localStorage.setItem("showWarning", "true");
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const shouldShowWarning = localStorage.getItem("showWarning");
        if (shouldShowWarning === "true") {
          setMessage("¡Te avisé! 😠");
          // Limpia el estado para que no aparezca siempre
          localStorage.removeItem("showWarning");
        }
      }
    };

    // Escucha cambios de visibilidad
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Limpia el listener cuando el componente se desmonta
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="inicio-container">
      <header>
        <h1>Que haces aqui, pirate</h1>
        <p>Por lo que sea no vayas a abrir este link vale? :3</p>
      </header>
      <main>
        {message && <div className="warning-message">{message}</div>}
        <a
          href="https://www.youtube.com/watch?v=x7Z86jQjG30"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
        >
          NO ABRIR
        </a>
      </main>
    </div>
  );
}

export default Inicio;
