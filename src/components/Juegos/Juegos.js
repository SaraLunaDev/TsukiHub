import React, { useState, useEffect } from "react";
import "./Juegos.css";

function Juegos() {
  const [games, setGames] = useState([]);

  // URL del Google Sheet en formato CSV
  const sheetUrl = process.env.REACT_APP_SHEET_URL;

  useEffect(() => {
    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    // Fetch data del Google Sheet
    fetch(sheetUrl)
      .then((response) => response.text())
      .then((data) => {
        const rows = data.split("\n");
        const parsedData = rows
          .slice(1) // Ignorar encabezado principal
          .map((row) => {
            const [
              nombre,
              estado,
              youtube,
              twitch,
              nota,
              horas,
              fecha,
            ] = row.split(",");
            return { nombre, estado, youtube, twitch, nota, horas, fecha };
          })
          .filter((game) => {
            // Filtrar solo filas válidas
            return ["Jugando", "Planeo Jugar", "Pasado"].includes(
              game.estado?.trim()
            );
          });
        setGames(parsedData);
      })
      .catch((error) =>
        console.error("Error al cargar los datos del Google Sheet:", error)
      );
  }, [sheetUrl]);

  // Separar juegos por estado
  const jugando = games.filter((game) => game.estado === "Jugando");
  const planeoJugar = games.filter((game) => game.estado === "Planeo Jugar");
  const pasado = games.filter((game) => game.estado === "Pasado");

  return (
    <div className="juegos-container">
      <h1>Mis Juegos</h1>

      <section>
        <h2>Jugando</h2>
        <ul>
          {jugando.map((game, index) => (
            <li key={index}>
              <strong>{game.nombre}</strong> - {game.horas} horas
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Planeo Jugar</h2>
        <ul>
          {planeoJugar.map((game, index) => (
            <li key={index}>
              <strong>{game.nombre}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Pasado</h2>
        <ul>
          {pasado.map((game, index) => (
            <li key={index}>
              <strong>{game.nombre}</strong> - {game.fecha} - Nota: {game.nota}
              <br />
              {game.youtube && (
                <a href={game.youtube} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              )}
              {game.twitch && (
                <a href={game.twitch} target="_blank" rel="noreferrer">
                  Twitch
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Juegos;
