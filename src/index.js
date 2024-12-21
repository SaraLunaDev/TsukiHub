import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Estilos principales para la aplicacion
import App from "./App"; // Componente principal de la aplicacion

// Crear la raiz de React vinculada al contenedor con el id 'root'
const root = ReactDOM.createRoot(document.getElementById("root"));

// Renderizar la aplicacion en modo estricto para destacar posibles problemas
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
