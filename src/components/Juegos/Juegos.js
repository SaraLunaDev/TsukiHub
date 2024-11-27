import React, { useState, useEffect, useRef } from "react";

import "./Juegos.css";
import Stars from "../Stars/Stars";

function Juegos() {
  const [games, setGames] = useState([]);
  // Separar juegos por estado
  const [jugando, setJugando] = useState([]);
  const [planeoJugar, setPlaneoJugar] = useState([]);
  const [pasado, setPasado] = useState([]);
  const [filterVisible, setFilterVisible] = useState(null);
  const [filteredGames, setFilteredGames] = useState([]); // Juegos filtrados por búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [originalPlaneoJugar, setOriginalPlaneoJugar] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    jugando: "name-asc", // Por nombre ascendente
    planeoJugar: "recently-added", // Por último añadido
    pasado: "date-desc", // Por fecha descendente
  });
  const [visibleGames, setVisibleGames] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const containerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 18; // Número máximo de juegos por página

  const normalizeString = (str) => {
    return str
      .normalize("NFD") // Descompone los caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // Elimina las marcas de acento
      .replace(/[^a-zA-Z0-9]/g, "") // Elimina cualquier carácter no alfanumérico
      .toLowerCase(); // Convierte a minúsculas
  };

  // Calcular los juegos a mostrar en la página actual
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * gamesPerPage,
    currentPage * gamesPerPage
  );

  // Calcular el número total de páginas basado en los juegos filtrados
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  // Efecto para actualizar las páginas cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1); // Reinicia a la primera página cuando se actualiza la búsqueda
  }, [filteredGames]);

  useEffect(() => {
    const normalizedQuery = normalizeString(searchQuery); // Normaliza la búsqueda
    const filtered = pasado.filter(
      (game) => normalizeString(game.nombre).includes(normalizedQuery) // Normaliza el nombre del juego
    );
    setFilteredGames(filtered);
    setCurrentPage(1); // Resetear a la primera página
  }, [searchQuery, pasado]);

  const calculateVisibleGames = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth; // Ancho del contenedor
      const gameWidth = 275; // Ancho estimado de cada tarjeta (ajusta según diseño)
      const maxVisible = Math.floor(containerWidth / gameWidth); // Máximo número de juegos visibles
      setVisibleGames(
        planeoJugar.slice(startIndex, startIndex + maxVisible) // Ajusta los juegos visibles
      );
    }
  };

  useEffect(() => {
    // Recalcular al cargar juegos o cambiar el tamaño de la ventana
    calculateVisibleGames();
    window.addEventListener("resize", calculateVisibleGames);
    return () => window.removeEventListener("resize", calculateVisibleGames);
  }, [startIndex, planeoJugar]);

  const handleNext = () => {
    if (startIndex + visibleGames.length < planeoJugar.length) {
      setStartIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 1);
    }
  };

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
          .slice(1)
          .map((row) => {
            const [
              nombre,
              estado,
              youtube,
              twitch,
              nota,
              horas,
              fecha,
              caratula,
            ] = row.split(",");
            return {
              nombre: nombre?.trim(),
              estado: estado?.trim().toLowerCase(),
              youtube: youtube?.trim(),
              twitch: twitch?.trim(),
              nota: nota?.trim(),
              horas: horas?.trim(),
              fecha: fecha?.trim(),
              caratula: caratula?.trim(),
            };
          })
          .filter((game) =>
            ["jugando", "planeo jugar", "pasado"].includes(game.estado)
          );
        setGames(parsedData);
      })
      .catch((error) => console.error("Error al cargar los datos:", error));
  }, [sheetUrl]);

  useEffect(() => {
    const planeoJugarGames = games.filter(
      (game) => game.estado === "planeo jugar"
    );
    setPlaneoJugar(planeoJugarGames);
    setOriginalPlaneoJugar(planeoJugarGames);
  }, [games]);

  useEffect(() => {
    setJugando(
      sortByName(
        games.filter((game) => game.estado === "jugando"),
        true
      )
    );
    setPlaneoJugar(
      sortByRecentlyAdded(
        games.filter((game) => game.estado === "planeo jugar")
      )
    );
    setPasado(
      sortByDate(
        games.filter((game) => game.estado === "pasado"),
        false
      )
    );
  }, [games]);

  const sortByName = (list, ascending = true) => {
    return [...list].sort((a, b) =>
      ascending
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    );
  };

  const sortByRecentlyAdded = (list) => {
    return [...list];
  };

  const sortByDate = (list, ascending = true) => {
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr
        .split("/")
        .map((num) => parseInt(num, 10));
      return new Date(year, month - 1, day);
    };

    return [...list].sort((a, b) =>
      ascending
        ? parseDate(a.fecha) - parseDate(b.fecha)
        : parseDate(b.fecha) - parseDate(a.fecha)
    );
  };

  const sortByDuration = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const durationA = parseFloat(a.horas) || 0; // Convierte la duración a número o usa 0
      const durationB = parseFloat(b.horas) || 0;
      return ascending ? durationA - durationB : durationB - durationA;
    });
  };

  const sortByRating = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const ratingA = parseFloat(a.nota) || 0; // Convierte la nota a número o usa 0
      const ratingB = parseFloat(b.nota) || 0;
      return ascending ? ratingA - ratingB : ratingB - ratingA;
    });
  };

  const toggleFilter = (category) => {
    setFilterVisible((prev) => (prev === category ? null : category));
  };

  const handleFilter = (filterType, category) => {
    let sortedList;

    switch (filterType) {
      case "name-asc":
      case "name-desc":
        sortedList = sortByName(pasado, filterType === "name-asc");
        break;
      case "date-asc":
      case "date-desc":
        sortedList = sortByDate(pasado, filterType === "date-asc");
        break;
      case "rating-asc":
      case "rating-desc":
        sortedList = sortByRating(pasado, filterType === "rating-asc");
        break;
      case "duration-asc":
      case "duration-desc":
        sortedList = sortByDuration(pasado, filterType === "duration-asc");
        break;
      default:
        return;
    }

    if (category === "pasado") {
      setPasado(sortedList);
    }

    setActiveFilters((prev) => ({ ...prev, [category]: filterType }));
    setCurrentPage(1); // Reinicia a la primera página al cambiar filtro
  };

  const handleFilterToggle = (type) => {
    let filterType;

    switch (type) {
      case "name":
        filterType =
          activeFilters.pasado === "name-asc" ? "name-desc" : "name-asc";
        break;
      case "date":
        filterType =
          activeFilters.pasado === "date-asc" ? "date-desc" : "date-asc";
        break;
      case "rating":
        filterType =
          activeFilters.pasado === "rating-asc" ? "rating-desc" : "rating-asc";
        break;
      case "duration":
        filterType =
          activeFilters.pasado === "duration-asc"
            ? "duration-desc"
            : "duration-asc";
        break;
      default:
        return;
    }

    handleFilter(filterType, "pasado"); // Llama al filtro con el nuevo tipo
  };

  return (
    <div className="juegos-container">
      <div className="categories-row">
        <section className="category-jugando">
          <h2>Jugando</h2>
          <ul>
            {jugando.map((game, index) => (
              <li key={index}>
                {game.caratula && (
                  <img
                    src={game.caratula}
                    alt={`Carátula de ${game.nombre}`}
                    className="game-cover"
                  />
                )}
                <strong>{game.nombre}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="category-planeo-jugar">
          <div className="category-header">
            <h2>Planeo Jugar</h2>
          </div>
          <div className="planeo-jugar-container" ref={containerRef}>
            <button
              onClick={handlePrevious}
              className="arrow-button"
              disabled={startIndex === 0}
            >
              ◀︎
            </button>
            <ul className="planeo-jugar-list">
              {visibleGames.map((game, index) => (
                <li key={index}>
                  {game.caratula && (
                    <img
                      src={game.caratula}
                      alt={`Carátula de ${game.nombre}`}
                      className="game-cover"
                    />
                  )}
                  <strong>{game.nombre}</strong>
                </li>
              ))}
            </ul>
            <button
              onClick={handleNext}
              className="arrow-button"
              disabled={startIndex + visibleGames.length >= planeoJugar.length}
            >
              ▶︎
            </button>
          </div>
        </section>
      </div>

      <div className="juegos-wrapper">
        <div className="div-section">
          <div className="filtros-section">
            <div className="search-input-global">
              <img
                src="/static/resources/lupa.png"
                alt="Lupa"
                className="lupa-img"
              />
              <input
                type="text"
                placeholder="Buscar juego..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              ></input>
            </div>
            <h1 className="header-filtros">Filtros</h1>
            <div className="filter-buttons">
              <button
                onClick={() => handleFilterToggle("name")}
                style={{
                  backgroundColor: activeFilters.pasado.includes("name")
                    ? "var(--selected-button-high)"
                    : "inherit",
                }}
              >
                Nombre {activeFilters.pasado === "name-asc" ? "ascendente" : "descendente"}
              </button>
              <button
                onClick={() => handleFilterToggle("date")}
                style={{
                  backgroundColor: activeFilters.pasado.includes("date")
                    ? "var(--selected-button-high)"
                    : "inherit",
                }}
              >
                Fecha {activeFilters.pasado === "date-asc" ? "ascendente" : "descendente"}
              </button>
              <button
                onClick={() => handleFilterToggle("rating")}
                style={{
                  backgroundColor: activeFilters.pasado.includes("rating")
                    ? "var(--selected-button-high)"
                    : "inherit",
                }}
              >
                Nota {activeFilters.pasado === "rating-asc" ? "ascendente" : "descendente"}
              </button>
              <button
                onClick={() => handleFilterToggle("duration")}
                style={{
                  backgroundColor: activeFilters.pasado.includes("duration")
                    ? "var(--selected-button-high)"
                    : "inherit",
                }}
              >
                Duración {activeFilters.pasado === "duration-asc" ? "ascendente" : "descendente"}
              </button>
            </div>
          </div>
        </div>

        <section className="category-pasado">
          <h2>Juegos Jugados</h2>
          <ul>
            {paginatedGames.map((game, index) => (
              <li key={index}>
                {game.caratula && (
                  <img
                    src={game.caratula}
                    alt={`Carátula de ${game.nombre}`}
                    className="game-cover"
                  />
                )}
                <strong>{game.nombre}</strong>
                <div className="game-extra">
                  <Stars rating={parseInt(game.nota, 10)} />
                  <div className="game-details">
                    <span className="game-duration">
                      {game.horas ? `⌛ ${game.horas}h` : "N/A"}
                    </span>
                    <span className="game-date">📆 {game.fecha}</span>
                  </div>
                  <div className="game-buttons">
                    {game.youtube && (
                      <a
                        href={game.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="game-button"
                      >
                        <img
                          src="/static/resources/youtube-icon.png"
                          alt="YouTube"
                          className="game-icon"
                        />
                      </a>
                    )}
                    {game.twitch && (
                      <a
                        href={game.twitch}
                        target="_blank"
                        rel="noreferrer"
                        className="game-button"
                      >
                        <img
                          src="/static/resources/twitch-icon.png"
                          alt="Twitch"
                          className="game-icon"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="pagination-container">
            <button
              className="arrow-button"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              ◀︎
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="arrow-button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              ▶︎
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Juegos;
