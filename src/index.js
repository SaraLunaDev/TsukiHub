import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Estilos principales de la aplicacion
import App from "./App"; // Componente principal de la aplicacion

// Vinculacion de React con el contenedor principal en el DOM
const root = ReactDOM.createRoot(document.getElementById("root"));

// Renderizado del componente raiz de la aplicacion
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
