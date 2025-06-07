import React, { useState, useEffect, useRef } from "react";

import "./Juegos.css";

function Juegos() {
  // Estado principal: lista de todos los juegos
  const [games, setGames] = useState([]);
  // Listas separadas por estado del juego
  const [jugando, setJugando] = useState([]);
  const [planeoJugar, setPlaneoJugar] = useState([]);
  const [pasado, setPasado] = useState([]);
  // Controla la visibilidad de los filtros
  const [filterVisible, setFilterVisible] = useState(null);
  // Lista de juegos filtrados por búsqueda
  const [filteredGames, setFilteredGames] = useState([]);
  // Consulta de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  // Copia original de "planeo jugar" para restaurar si es necesario
  const [originalPlaneoJugar, setOriginalPlaneoJugar] = useState([]);
  // Filtros activos para cada categoría
  const [activeFilters, setActiveFilters] = useState({
    jugando: "name-asc",
    planeoJugar: "recently-added",
    pasado: "date-desc",
  });
  // Juegos visibles en el carrusel de "planeo jugar"
  const [visibleGames, setVisibleGames] = useState([]);
  // Índice de inicio para el carrusel
  const [startIndex, setStartIndex] = useState(0);
  // Referencia al contenedor del carrusel
  const containerRef = useRef(null);
  // Página actual de la paginación de "pasado"
  const [currentPage, setCurrentPage] = useState(1);
  // Número máximo de juegos por página
  const gamesPerPage = 18;
  // Juego seleccionado para mostrar en el popup
  const [selectedGame, setSelectedGame] = useState(null);

  // Maneja el click en un juego para mostrar el popup
  const handleGameClick = (game) => {
    setSelectedGame(game);
  };

  // Cierra el popup de detalles
  const closePopup = () => {
    setSelectedGame(null);
  };

  // Normaliza cadenas para búsquedas (elimina acentos y caracteres especiales)
  const normalizeString = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  };

  // Obtiene los juegos a mostrar en la página actual de "pasado"
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * gamesPerPage,
    currentPage * gamesPerPage
  );

  // Calcula el número total de páginas para la paginación
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

  // Avanza a la siguiente página en la paginación
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  // Retrocede a la página anterior en la paginación
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  // Reinicia la página al cambiar los juegos filtrados
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredGames]);

  // Filtra los juegos de "pasado" según la búsqueda
  useEffect(() => {
    const normalizedQuery = normalizeString(searchQuery);
    const filtered = pasado.filter((game) =>
      normalizeString(game.nombre).includes(normalizedQuery)
    );
    setFilteredGames(filtered);
    setCurrentPage(1);
  }, [searchQuery, pasado]); // Carrusel infinito y escalado para Planeo Jugar
  const CARRUSEL_SIZE = 9;
  const CENTER_INDEX = Math.floor(CARRUSEL_SIZE / 2);

  // Hook para detectar el tamaño de la pantalla
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Configuración responsive del carrusel
  const getCarruselConfig = () => {
    if (screenWidth <= 800) {
      return { containerWidth: 660, gameWidth: 100, edgeMargin: 0 }; // +140px total (520 + 140) CSS centering only
    } else if (screenWidth <= 1100) {
      return { containerWidth: 780, gameWidth: 120, edgeMargin: 0 }; // +140px total (640 + 140) CSS centering only
    } else {
      return { containerWidth: 900, gameWidth: 140, edgeMargin: 0 }; // +140px total (760 + 140) CSS centering only
    }
  };

  // Calcula los índices de los 7 juegos a mostrar, centrando el carrusel
  const getCarruselIndices = () => {
    if (planeoJugar.length === 0) return [];
    let indices = [];
    let base = startIndex;
    // Si hay menos de 7 juegos, repite para llenar
    if (planeoJugar.length < CARRUSEL_SIZE) {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        indices.push(i % planeoJugar.length);
      }
    } else {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % planeoJugar.length;
        if (idx < 0) idx += planeoJugar.length;
        indices.push(idx);
      }
    }
    return indices;
  };
  const carruselIndices = getCarruselIndices();  // Función para calcular la posición de un juego en el carrusel
  const calculateGamePosition = (index, containerWidth, gameWidth, edgeMargin) => {
    if (CARRUSEL_SIZE === 1) {
      return (containerWidth - gameWidth) / 2;
    }

    const totalAvailableWidth = containerWidth - 2 * edgeMargin - gameWidth;
    const baseSpacing = totalAvailableWidth / (CARRUSEL_SIZE - 1);

    if (index === 0) {
      return edgeMargin;
    } else if (index === CARRUSEL_SIZE - 1) {
      return containerWidth - edgeMargin - gameWidth;
    } else {
      const centerDistance = Math.abs(index - CENTER_INDEX);
      const maxCenterDistance = Math.floor(CARRUSEL_SIZE / 2);
      const normalizedDistance = centerDistance / maxCenterDistance;
      const spacingFactor = 1.8 - normalizedDistance * 0.8;

      const uniformPosition = edgeMargin + index * baseSpacing;
      let adjustment = 0;
      
      for (let k = 1; k <= Math.abs(index - CENTER_INDEX); k++) {
        const stepDistance = k / maxCenterDistance;
        const stepFactor = 1.8 - stepDistance * 0.8;
        const extraSpace = (stepFactor - 1.0) * baseSpacing * 0.2;

        if (index < CENTER_INDEX) {
          adjustment -= extraSpace;
        } else {
          adjustment += extraSpace;
        }
      }

      let position = uniformPosition + adjustment;

      // Aplicar superposición para carruseles grandes
      if (CARRUSEL_SIZE > 7) {
        const overlapFactor = Math.min((CARRUSEL_SIZE - 7) * 0.08, 0.4);
        const overlapAmount = (centerDistance / maxCenterDistance) * gameWidth * overlapFactor;

        if (index < CENTER_INDEX) {
          position += overlapAmount;
        } else if (index > CENTER_INDEX) {
          position -= overlapAmount;
        }
      }

      return position;
    }
  };
  // Función simple sin animación de desplazamiento
  const animateCarousel = (direction, callback) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setAnimationDirection(direction);
    
    // Ejecutar el cambio de índice directamente
    callback();
    
    // Resetear el estado después de un breve delay
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 100);
  };

  const handleNext = () => {
    animateCarousel('right', () => {
      setStartIndex((prev) => (prev + 1) % planeoJugar.length);
    });
  };
  
  const handlePrevious = () => {
    animateCarousel('left', () => {
      setStartIndex((prev) => (prev - 1 + planeoJugar.length) % planeoJugar.length);
    });
  };

  // URL del Google Sheet (debe estar en .env)
  const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;

  // Carga y cachea los datos de Google Sheet
  useEffect(() => {
    const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;
    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }
    // Descarga y procesa los datos del sheet
    const fetchGames = async (silentUpdate = false) => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const parsedData = rows.slice(1).map((row) => {
          const [
            nombre,
            estado,
            youtube,
            nota,
            horas,
            plataforma,
            fecha,
            caratula,
            fechaLanzamiento,
            géneros,
            plataformas,
            resumen,
            desarrolladores,
            publicadores,
            id,
            votos,
          ] = row.split(",");
          return {
            nombre: nombre?.trim(),
            estado: estado?.trim().toLowerCase(),
            youtube: youtube?.trim(),
            nota: nota?.trim(),
            horas: horas?.trim(),
            plataforma: plataforma?.trim(),
            fecha: fecha?.trim(),
            caratula: caratula?.trim(),
            "Fecha de Lanzamiento": fechaLanzamiento?.trim(),
            géneros: géneros?.trim(),
            plataformas: plataformas?.trim(),
            resumen: resumen?.trim(),
            desarrolladores: desarrolladores?.trim(),
            publicadores: publicadores?.trim(),
          };
        });
        const cachedData = localStorage.getItem("juegosData");
        const cachedParsedData = cachedData ? JSON.parse(cachedData) : null;
        if (JSON.stringify(parsedData) !== JSON.stringify(cachedParsedData)) {
          localStorage.setItem("juegosData", JSON.stringify(parsedData));
          setGames(parsedData);
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };
    // Carga los datos desde el caché si existen
    const loadGamesFromCache = () => {
      const cachedData = localStorage.getItem("juegosData");
      if (cachedData) {
        setGames(JSON.parse(cachedData));
      }
    };
    loadGamesFromCache();
    fetchGames();
    // Actualiza los datos cada minuto
    const intervalId = setInterval(() => {
      fetchGames(true);
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Separa los juegos en "planeo jugar" al cargar datos
  useEffect(() => {
    const planeoJugarGames = games.filter(
      (game) => game.estado === "planeo jugar"
    );
    setPlaneoJugar(planeoJugarGames);
    setOriginalPlaneoJugar(planeoJugarGames);
  }, [games]);

  // Separa y ordena los juegos en "jugando", "planeo jugar" y "pasado/dropeado"
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
        games.filter(
          (game) => game.estado === "pasado" || game.estado === "dropeado"
        ),
        false
      )
    );
  }, [games]);

  // Ordena una lista de juegos por nombre
  const sortByName = (list, ascending = true) => {
    return [...list].sort((a, b) =>
      ascending
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    );
  };

  // Devuelve la lista tal cual (para "recientemente añadidos")
  const sortByRecentlyAdded = (list) => {
    return [...list];
  };

  // Ordena una lista de juegos por fecha
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

  // Ordena una lista de juegos por duración
  const sortByDuration = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const durationA = parseFloat(a.horas) || 0;
      const durationB = parseFloat(b.horas) || 0;
      return ascending ? durationA - durationB : durationB - durationA;
    });
  };

  // Ordena una lista de juegos por nota
  const sortByRating = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const ratingA = parseFloat(a.nota) || 0;
      const ratingB = parseFloat(b.nota) || 0;
      return ascending ? ratingA - ratingB : ratingB - ratingA;
    });
  };

  // Aplica el filtro seleccionado a la lista de "pasado"
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
    setCurrentPage(1);
  };

  // Alterna el filtro activo para la lista de "pasado"
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
    handleFilter(filterType, "pasado");
  };

  // Pre-carga las imágenes de carátula de la siguiente y anterior página en Juegos Jugados
  useEffect(() => {
    // Solo ejecuta si estamos en la sección de Juegos Jugados
    if (!filteredGames || filteredGames.length === 0) return;
    const preloadImages = (games) => {
      games.forEach((game) => {
        if (game.caratula) {
          const img = new window.Image();
          img.src = game.caratula;
        }
      });
    };
    // Calcula los índices de la página siguiente y anterior
    const startNext = currentPage * gamesPerPage;
    const endNext = startNext + gamesPerPage;
    const startPrev = (currentPage - 2) * gamesPerPage;
    const endPrev = startPrev + gamesPerPage;
    // Pre-carga siguiente página
    if (startNext < filteredGames.length) {
      preloadImages(filteredGames.slice(startNext, endNext));
    }
    // Pre-carga anterior página
    if (startPrev >= 0) {
      preloadImages(filteredGames.slice(startPrev, endPrev));
    }
  }, [currentPage, filteredGames]);

  // Estado para el filtro avanzado de género
  const [selectedGenre, setSelectedGenre] = useState("");
  // Estado para el filtro avanzado de plataforma
  const [selectedPlatform, setSelectedPlatform] = useState("");
  // Estado para el filtro de rango de fechas
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Diccionario de traducción de géneros inglés -> español
  const GENRE_TRANSLATIONS = {
    "Role-playing (RPG)": "Rol",
    "Turn-based strategy (TBS)": "Estrategia por turnos",
    "Real Time Strategy (RTS)": "Estrategia tiempo real",
    "Hack and slash/Beat 'em up": "Hack and slash",
    "Card & Board Game": "Cartas y tablero",
    "Point-and-click": "Point & Click",
    Platform: "Plataformas",
    Adventure: "Aventura",
    Indie: "Indie",
    Strategy: "Estrategia",
    Puzzle: "Puzle",
    Simulator: "Simulación",
    Shooter: "Disparos",
    Fighting: "Lucha",
    Tactical: "Táctico",
    Music: "Música",
    Racing: "Carreras",
    Sport: "Deportes",
    MOBA: "MOBA",
    "Visual Novel": "Novela visual",
    Arcade: "Arcade",
    "Real Time Strategy": "Estrategia en tiempo real",
  };

  // Función para traducir un género (devuelve el original si no hay traducción)
  function translateGenre(genre) {
    const trimmed = genre.trim();
    return GENRE_TRANSLATIONS[trimmed] || trimmed;
  }

  // Calcula la lista única de géneros presentes en los juegos cargados
  const getUniqueGenres = (gamesList) => {
    const genreSet = new Set();
    gamesList.forEach((game) => {
      if (game.géneros) {
        game.géneros.split("-%-").forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    return Array.from(genreSet).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  };
  const uniqueGenres = getUniqueGenres(games);
  // Calcula la lista única de plataformas presentes en los juegos cargados
  const getUniquePlatforms = (gamesList) => {
    const platformSet = new Set();
    gamesList.forEach((game) => {
      if (game.plataforma) {
        game.plataforma.split("-%-").forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) platformSet.add(trimmed);
        });
      }
    });
    return Array.from(platformSet).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  };
  const uniquePlatforms = getUniquePlatforms(games);

  // Filtra los juegos de "pasado" según la búsqueda y el género/plataforma seleccionados y el rango de fechas
  useEffect(() => {
    const normalizedQuery = normalizeString(searchQuery);
    let filtered = pasado.filter((game) => {
      // Filtros de texto igual que Filtros Generales
      const nombreMatch = normalizeString(game.nombre).includes(
        normalizedQuery
      );
      const notaMatch =
        game.nota && game.nota.toLowerCase().includes(normalizedQuery);
      const horasMatch =
        game.horas && game.horas.toLowerCase().includes(normalizedQuery);
      const fechaMatch =
        game.fecha && game.fecha.toLowerCase().includes(normalizedQuery);
      const resumenMatch =
        game.resumen && normalizeString(game.resumen).includes(normalizedQuery);
      // Coincide si alguno de los campos coincide
      return (
        nombreMatch || notaMatch || horasMatch || fechaMatch || resumenMatch
      );
    });
    if (selectedGenre) {
      filtered = filtered.filter((game) => {
        if (!game.géneros) return false;
        return game.géneros
          .split("-%-")
          .map((g) => g.trim().toLowerCase())
          .includes(selectedGenre.trim().toLowerCase());
      });
    }
    if (selectedPlatform) {
      filtered = filtered.filter((game) => {
        if (!game.plataforma) return false;
        return game.plataforma
          .split("-%-")
          .map((p) => p.trim().toLowerCase())
          .includes(selectedPlatform.trim().toLowerCase());
      });
    }
    // Filtro por rango de fechas
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      filtered = filtered.filter((game) => {
        if (!game.fecha) return false;
        const [d, m, y] = game.fecha.split("/").map(Number);
        const gameDate = new Date(y, m - 1, d);
        return gameDate >= from && gameDate <= to;
      });
    }
    setFilteredGames(filtered);
    setCurrentPage(1);
  }, [searchQuery, pasado, selectedGenre, selectedPlatform, dateFrom, dateTo]);

  // Calcular fechas mínima y máxima de los juegos jugados
  useEffect(() => {
    if (pasado.length === 0) return;
    // Encuentra la fecha más antigua y la más reciente
    const fechas = pasado
      .map((g) => g.fecha)
      .filter(Boolean)
      .map((f) => {
        const [d, m, y] = f.split("/").map(Number);
        return new Date(y, m - 1, d);
      })
      .sort((a, b) => a - b);
    if (fechas.length > 0) {
      const min = fechas[0];
      const max = new Date();
      setDateFrom(min.toISOString().slice(0, 10));
      setDateTo(max.toISOString().slice(0, 10));
    }
  }, [pasado]);

  // Estado para el popup de añadir recomendación
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [searchIGDB, setSearchIGDB] = useState("");
  const [igdbResults, setIgdbResults] = useState([]);
  const [igdbLoading, setIgdbLoading] = useState(false);
  const [igdbError, setIgdbError] = useState("");
  const [selectedIGDB, setSelectedIGDB] = useState(null);
  const [addStatus, setAddStatus] = useState(""); // Nuevo: feedback para el usuario

  // Buscar en IGDB cuando cambia el input (con debounce de 5s)
  useEffect(() => {
    if (!showAddPopup) {
      setIgdbResults([]);
      setIgdbError("");
      return;
    }
    if (!searchIGDB.trim()) {
      setIgdbResults([]);
      setIgdbError("");
      return;
    }
    setIgdbLoading(true);
    setIgdbError("");
    setIgdbResults([]);
    // Mostrar puntos suspensivos mientras espera
    let loadingInterval = null;
    let loadingDots = 0;
    setIgdbError("Cargando");
    loadingInterval = setInterval(() => {
      loadingDots = (loadingDots + 1) % 4;
      setIgdbError("Cargando" + ".".repeat(loadingDots));
    }, 500);
    // Debounce de 5 segundos
    const handler = setTimeout(() => {
      fetch("/api/igdb-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchIGDB }),
      })
        .then((res) => res.json())
        .then((data) => {
          clearInterval(loadingInterval);
          setIgdbError("");
          if (data.error) {
            setIgdbError("Error al buscar en IGDB: " + data.error);
            setIgdbResults([]);
          } else {
            const results = (data.results || []).map((game) => ({
              id: game.id,
              name: game.name,
              coverUrl:
                game.cover?.url?.replace("t_thumb", "t_cover_big") ||
                "/static/resources/default_cover.png",
              releaseDate: game.first_release_date
                ? new Date(game.first_release_date * 1000).toLocaleDateString()
                : "",
              genres: game.genres?.map((g) => g.name).join(", ") || "",
              platforms: game.platforms?.map((p) => p.name).join(", ") || "",
              summary: game.summary || "",
              companies:
                game.involved_companies
                  ?.map((ic) => ic.company?.name)
                  .join(", ") || "",
              raw: game,
            }));
            setIgdbResults(results);
          }
          setIgdbLoading(false);
        })
        .catch(() => {
          clearInterval(loadingInterval);
          setIgdbError("Error al buscar en IGDB");
          setIgdbLoading(false);
        });
    }, 5000);
    return () => {
      clearTimeout(handler);
      clearInterval(loadingInterval);
    };
  }, [searchIGDB, showAddPopup]);
  // Función para centrar un juego específico del carrusel
  const handleCarouselGameClick = (clickedIndex, gameIndex) => {
    // Si es el juego central, abrir el popup de detalles
    if (clickedIndex === CENTER_INDEX) {
      const game = planeoJugar[gameIndex];
      handleGameClick(game);
    } else {
      // Calcular cuántas posiciones mover para centrar el juego clicado
      const positionsToMove = clickedIndex - CENTER_INDEX;
      
      // Determinar dirección de la animación
      const direction = positionsToMove > 0 ? 'right' : 'left';
      
      // Usar la función de animación para el cambio
      animateCarousel(direction, () => {
        setStartIndex((prev) => {
          let newIndex = prev + positionsToMove;

          // Aplicar wrapping circular
          if (newIndex < 0) {
            newIndex = planeoJugar.length + newIndex;
          } else if (newIndex >= planeoJugar.length) {
            newIndex = newIndex % planeoJugar.length;
          }

          return newIndex;
        });
      });
    }
  };

  // Estado para controlar las animaciones del carrusel
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(null); // 'left', 'right', 'click'

  // Renderizado principal del componente
  return (
    <div className="juegos-container">
      <div className="categories-row">
        <section className="category-jugando">
          <h2 className="header-juegos">Jugando</h2>
          <ul>
            {jugando.map((game, index) => (
              <li key={index}>
                <div className="cover-wrapper">
                  {game.caratula && (
                    <>
                      <img
                        src={game.caratula}
                        alt={`Carátula de ${game.nombre}`}
                        className="game-cover"
                      />
                      <div className="cover-gradient"></div>
                    </>
                  )}
                </div>
                <strong
                  onClick={() => handleGameClick(game)}
                  style={{ cursor: "pointer" }}
                >
                  {game.nombre}
                </strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="category-planeo-jugar">
          <div
            className="category-header"
            style={{
              display: "flex",
              alignItems: "top",
              justifyContent: "space-between",
            }}
          >
            <h2 className="header-juegos">Planeo Jugar</h2>
            {(() => {
              let twitchUser = null;
              try {
                twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
              } catch {}
              if (twitchUser && twitchUser.name) {
                return (
                  <button
                    className="add-recommendation-button"
                    onClick={() => setShowAddPopup(true)}
                  >
                    {" "}
                    + Recomendar
                  </button>
                );
              }
              return null;
            })()}
          </div>
          <div className="planeo-jugar-container" ref={containerRef}>
            <button
              onClick={handlePrevious}
              className="arrow-button"
              aria-label="Anterior"
            >
              ◀︎
            </button>{" "}
            <ul className="planeo-jugar-list">
              {carruselIndices.map((gameIdx, i) => {
                const game = planeoJugar[gameIdx];
                const distance = Math.abs(i - CENTER_INDEX);                // Configuración responsive del carrusel
                const { containerWidth, gameWidth, edgeMargin } =
                  getCarruselConfig(); 
                
                // Calcular posición usando la función centralizada
                const position = calculateGamePosition(i, containerWidth, gameWidth, edgeMargin);// Escala basada en distancia al centro con curva suave y progresiva
                const maxDistance = Math.floor(CARRUSEL_SIZE / 2);
                // Usar una función de easing más suave que preserve más el tamaño de los juegos cercanos al centro
                const normalizedDistance = distance / maxDistance; // 0 a 1
                const easedDistance = Math.pow(normalizedDistance, 2); // Curva más suave para reducción progresiva
                let scale = 1.0 - easedDistance * 0.25; // Reducción máxima del 25% para mayor contraste

                // Z-index basado en distancia al centro
                const zIndex = CARRUSEL_SIZE - distance;                // Clases CSS para opacidad
                let className = "carrusel-far";
                let targetOpacity = 0.7;
                if (distance === 0) {
                  className = "carrusel-center";
                  targetOpacity = 1;
                } else if (distance <= Math.ceil(CARRUSEL_SIZE / 4)) {
                  className = "carrusel-adjacent";
                  targetOpacity = 0.95;
                } else if (distance <= Math.ceil(CARRUSEL_SIZE / 2)) {
                  className = "carrusel-next";
                  targetOpacity = 0.85;
                }

                return (
                  <li
                    key={gameIdx + "-" + i}
                    className={className}
                    style={{
                      position: "absolute",
                      left: `${position}px`,
                      transform: `scale(calc(${scale} * var(--hover-scale, 1)))`,
                      transformOrigin: "center center",
                      zIndex: zIndex,                      cursor: "pointer",
                      width: `${gameWidth}px`,
                      // Solo transición para el hover de escala
                      transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                      // Variables CSS para animaciones
                      '--scale': scale,
                      '--target-opacity': targetOpacity,
                      '--current-opacity': targetOpacity,
                    }}
                    onClick={() => handleCarouselGameClick(i, gameIdx)}
                    onMouseEnter={() => {
                      // Aumentar escala al pasar el mouse
                      const gameElement = document.querySelector(
                        `.planeo-jugar-list li:nth-child(${i + 1})`
                      );
                      if (gameElement) {
                        gameElement.style.transform = `scale(calc(${scale} * 1.1))`;
                        gameElement.style.transition =
                          "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                    onMouseLeave={() => {
                      // Restablecer escala al quitar el mouse
                      const gameElement = document.querySelector(
                        `.planeo-jugar-list li:nth-child(${i + 1})`
                      );
                      if (gameElement) {
                        gameElement.style.transform = `scale(calc(${scale}))`;
                        gameElement.style.transition =
                          "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                  >
                    <div className="cover-wrapper">
                      {game.caratula && (
                        <>
                          <img
                            src={game.caratula}
                            alt={`Carátula de ${game.nombre}`}
                            className="game-cover"
                          />
                          <div className="cover-gradient"></div>
                        </>
                      )}
                    </div>
                    <strong>{game.nombre}</strong>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={handleNext}
              className="arrow-button"
              aria-label="Siguiente"
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
            <h1 className="header-filtros">Filtros Generales</h1>
            <div className="filter-buttons-row">
              <div className="filter-buttons">
                <button
                  onClick={() => handleFilterToggle("name")}
                  style={{
                    backgroundColor: activeFilters.pasado.includes("name")
                      ? "var(--selected-button-high)"
                      : "inherit",
                  }}
                >
                  Nombre{" "}
                  {activeFilters.pasado === "name-asc"
                    ? "ascendente"
                    : "descendente"}
                </button>
                <button
                  onClick={() => handleFilterToggle("date")}
                  style={{
                    backgroundColor: activeFilters.pasado.includes("date")
                      ? "var(--selected-button-high)"
                      : "inherit",
                  }}
                >
                  Fecha{" "}
                  {activeFilters.pasado === "date-asc"
                    ? "ascendente"
                    : "descendente"}
                </button>
                <button
                  onClick={() => handleFilterToggle("rating")}
                  style={{
                    backgroundColor: activeFilters.pasado.includes("rating")
                      ? "var(--selected-button-high)"
                      : "inherit",
                  }}
                >
                  Nota{" "}
                  {activeFilters.pasado === "rating-asc"
                    ? "ascendente"
                    : "descendente"}
                </button>
                <button
                  onClick={() => handleFilterToggle("duration")}
                  style={{
                    backgroundColor: activeFilters.pasado.includes("duration")
                      ? "var(--selected-button-high)"
                      : "inherit",
                  }}
                >
                  Duración{" "}
                  {activeFilters.pasado === "duration-asc"
                    ? "ascendente"
                    : "descendente"}
                </button>
              </div>
            </div>
            <h1 className="header-filtros">Filtros Avanzados</h1>
            <div className="filtros-avanzados-row">
              <div className="filtro-avanzado-col">
                <div className="filtro-avanzado-row">
                  <label
                    htmlFor="genre-select"
                    className="label-filtro-avanzado"
                  >
                    Género:
                  </label>
                  <select
                    id="genre-select"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="spinner-generos"
                  >
                    <option value="">Todos</option>
                    {uniqueGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {translateGenre(genre)}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className="filtro-avanzado-row"
                  style={{ marginTop: "8px" }}
                >
                  <label
                    htmlFor="platform-select"
                    className="label-filtro-avanzado"
                  >
                    Plataforma:
                  </label>
                  <select
                    id="platform-select"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="spinner-generos"
                  >
                    <option value="">Todas</option>
                    {uniquePlatforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className="filtro-avanzado-row filtro-fechas-row"
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    gap: 8,
                    flexDirection: "column",
                    display: "flex",
                  }}
                >
                  <div className="filtro-fechas-labels">
                    <span className="filtro-fecha-label filtro-fecha-label-desde">
                      Desde
                    </span>
                    <span className="filtro-fecha-label filtro-fecha-label-hasta">
                      Hasta
                    </span>
                  </div>
                  <div className="filtro-fechas-inputs">
                    <input
                      type="date"
                      id="date-from"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="spinner-generos filtro-fecha-input"
                    />
                    <input
                      type="date"
                      id="date-to"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="spinner-generos filtro-fecha-input"
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <section className="category-pasado">
          <h2 className="header-juegos">Juegos Jugados</h2>
          <ul>
            {paginatedGames.map((game, index) => {
              const showBadges =
                (game.horas && game.horas !== "") ||
                (game.nota && game.nota !== "");
              return (
                <li key={index}>
                  {/* Badges row y línea separadora */}
                  {showBadges && (
                    <>
                      <div className="badges-row">
                        <div className="badge-duracion">
                          {game.horas ? `⌛${game.horas}h` : ""}
                        </div>
                        <div className="badge-nota">
                          {game.nota && (
                            <>
                              <img
                                src="/static/resources/estrellas/star-filled.png"
                                alt="estrella"
                                className="nota-estrella"
                              />
                              {game.nota}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="linea-badges" />
                    </>
                  )}
                  <div className="cover-wrapper">
                    {game.estado === "dropeado" && (
                      <div className="dropeado-badge">DROPEADO</div>
                    )}
                    {game.fecha && (
                      <div className="game-date-hover">{game.fecha}</div>
                    )}
                    {game.caratula && (
                      <>
                        <img
                          src={game.caratula}
                          alt={`Carátula de ${game.nombre}`}
                          className={`game-cover${
                            game.youtube ? " has-youtube" : ""
                          }`}
                        />
                        <div className="cover-gradient"></div>
                      </>
                    )}
                    {game.youtube && (
                      <button
                        className="play-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            game.youtube,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                        tabIndex={0}
                        aria-label="Ver en YouTube"
                      >
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="20"
                            cy="20"
                            r="20"
                            fill="rgba(0,0,0,0.6)"
                          />
                          <polygon points="16,13 30,20 16,27" fill="#fff" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <strong
                    onClick={() => handleGameClick(game)}
                    style={{ cursor: "pointer" }}
                  >
                    {game.nombre}
                  </strong>
                </li>
              );
            })}
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
      {selectedGame && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closePopup}>
              ✖
            </button>
            <div className="popup-body">
              <div className="popup-image">
                <img
                  src={selectedGame.caratula.replace("t_cover_big", "t_1080p")}
                  alt={`Carátula de ${selectedGame.nombre}`}
                />
              </div>
              <div className="popup-info">
                <h2>{selectedGame.nombre}</h2>
                <div className="popup-columns">
                  {/* Columna de detalles principales */}
                  <div className="game-details-column">
                    {selectedGame.estado && (
                      <p>{selectedGame.estado.toUpperCase()}</p>
                    )}
                    {selectedGame.youtube && (
                      <p>
                        <a
                          href={selectedGame.youtube}
                          target="_blank"
                          rel="noreferrer"
                        >
                          YouTube
                        </a>
                      </p>
                    )}
                    {selectedGame.nota && (
                      <p className="popup-rating">
                        <img
                          src="/static/resources/estrellas/star-filled.png"
                          alt="estrella"
                          className="nota-estrella"
                        />
                        <span className="popup-rating-text">
                          {selectedGame.nota}
                        </span>
                      </p>
                    )}
                    {selectedGame.horas && (
                      <p>
                        <strong>⌛ </strong> {selectedGame.horas}
                        {" h"}
                      </p>
                    )}
                    {selectedGame.fecha && (
                      <p>
                        <strong>📅 </strong> {selectedGame.fecha}
                      </p>
                    )}
                  </div>
                  {/* Columna de metadatos */}
                  <div className="game-meta-column">
                    {selectedGame.desarrolladores && (
                      <p>
                        <strong>Desarrolladores:</strong>{" "}
                        <span>{selectedGame.desarrolladores}</span>
                      </p>
                    )}
                    {selectedGame.publicadores && (
                      <p>
                        <strong>Publicadores:</strong>{" "}
                        <span>{selectedGame.publicadores}</span>
                      </p>
                    )}
                    {selectedGame["Fecha de Lanzamiento"] && (
                      <p>
                        <strong>Lanzamiento:</strong>{" "}
                        <span>{selectedGame["Fecha de Lanzamiento"]}</span>
                      </p>
                    )}
                    <div className="game-meta-row">
                      <div className="game-meta-column-2">
                        {selectedGame.géneros && (
                          <p>
                            <strong>Géneros:</strong>
                            <br />
                            {selectedGame.géneros
                              .split("-%-")
                              .map((genero, index) => (
                                <span key={index}>
                                  {genero}
                                  <br />
                                </span>
                              ))}
                          </p>
                        )}
                      </div>
                      <div className="game-meta-column-2">
                        {selectedGame.plataformas && (
                          <p>
                            <strong>Plataformas:</strong>
                            <br />
                            {selectedGame.plataformas
                              .split("-%-")
                              .map((plataforma, index) => (
                                <span key={index}>
                                  {plataforma}
                                  <br />
                                </span>
                              ))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Resumen del juego */}
                {selectedGame.resumen && (
                  <div className="game-summary">
                    <p>{selectedGame.resumen.replace(/-%-/g, ", ")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Popup para añadir recomendación */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div
            className="popup-content popup-add-recommendation"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowAddPopup(false)}
            >
              ✖
            </button>
            <h2 className="popup-add-title"></h2>
            <div className="search-input-global popup-search-igdb">
              <img
                src="/static/resources/lupa.png"
                alt="Lupa"
                className="lupa-img"
              />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar juego en IGDB..."
                value={searchIGDB}
                onChange={(e) => setSearchIGDB(e.target.value)}
                autoFocus
              />
            </div>
            {igdbLoading && (
              <p className="popup-igdb-loading">{igdbError || "Buscando..."}</p>
            )}
            {igdbError && !igdbLoading && (
              <p className="popup-igdb-error">{igdbError}</p>
            )}
            <div className="popup-igdb-scroll">
              {igdbResults.map((game) => (
                <div
                  key={game.id}
                  className={`igdb-result${
                    selectedIGDB && selectedIGDB.id === game.id
                      ? " selected"
                      : ""
                  }`}
                  onClick={() => setSelectedIGDB(game)}
                >
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="igdb-result-cover"
                  />
                  <div className="igdb-result-info">
                    <div className="igdb-result-title">{game.name}</div>
                    <div className="igdb-result-date">{game.releaseDate}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="add-recommendation-confirm"
              disabled={!selectedIGDB}
              onClick={async () => {
                if (!selectedIGDB) return;
                setAddStatus("");
                let twitchUser = null;
                try {
                  twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
                } catch {}
                if (!twitchUser || !twitchUser.name) {
                  setAddStatus(
                    "Debes iniciar sesión con Twitch para recomendar."
                  );
                  return;
                }
                setAddStatus("Añadiendo...");
                try {
                  const res = await fetch("/api/add-recommendation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user: twitchUser.name,
                      game: selectedIGDB.raw,
                    }),
                  });
                  const data = await res.json();
                  if (data.error) {
                    setAddStatus("Error al añadir recomendación");
                  } else {
                    setAddStatus("¡Recomendación añadida!");
                    // Actualiza la lista de juegos recomendados
                    setTimeout(() => {
                      setShowAddPopup(false);
                      setSearchIGDB("");
                      setSelectedIGDB(null);
                      setIgdbResults([]);
                      setAddStatus("");
                    }, 2000);
                  }
                } catch (error) {
                  setAddStatus("Error al añadir recomendación");
                }
              }}
            >
              Confirmar recomendación
            </button>
            {addStatus && (
              <div
                className={
                  "popup-add-status " +
                  (addStatus.startsWith("¡") ? "success" : "error")
                }
              >
                {addStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Juegos;
