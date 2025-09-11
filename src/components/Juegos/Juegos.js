
import React, { useState, useEffect, useRef } from "react";
import "./Juegos.css";

function Juegos() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  function getTrailerEmbedUrl(trailerUrl) {
    if (!trailerUrl) return "";
    const ytMatch = trailerUrl.match(/(?:youtu.be\/|youtube.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    if (trailerUrl.match(/\.(mp4|webm)$/)) return trailerUrl;
    return trailerUrl;
  }
  useEffect(() => { if (!selectedGame) setShowTrailer(false); }, [selectedGame]);
  const [games, setGames] = useState([]);
  const [jugando, setJugando] = useState([]);
  const [planeoJugar, setPlaneoJugar] = useState([]);
  const [pasado, setPasado] = useState([]);
  const [filterVisible, setFilterVisible] = useState(null);
  const [filteredGames, setFilteredGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [originalPlaneoJugar, setOriginalPlaneoJugar] = useState([]);
  const [activeFilters, setActiveFilters] = useState({ jugando: "name-asc", planeoJugar: "recently-added", pasado: "date-desc" });
  const [visibleGames, setVisibleGames] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const containerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 18;
  const [planeoView, setPlaneoView] = useState("planeo jugar");
  const [users, setUsers] = useState([]);
  const [userDataComplete, setUserDataComplete] = useState([]);
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => { const saved = localStorage.getItem("developerMode"); return saved === "true"; });
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [playedPlatforms, setPlayedPlatforms] = useState([]);

  const refreshGameData = async (source = "manual") => {
    try {
      localStorage.removeItem("juegosData");
      const response = await fetch(process.env.REACT_APP_JUEGOS_SHEET_URL);
      const data = await response.text();
      const rows = data.split("\n");
      const userMap = new Map();
      const parsedData = rows.slice(1).map((row) => {
        const [nombre, estado, youtube, trailer, nota, horas, plataforma, fecha, caratula, fechaLanzamiento, géneros, plataformas, resumen, desarrolladores, publicadores, igdbId, usuario, comentario] = row.split(",");
        const trimmedUsuario = usuario?.trim();
        if (trimmedUsuario && trimmedUsuario !== "" && !userMap.has(trimmedUsuario)) {
          userMap.set(trimmedUsuario, trimmedUsuario);
        }
        return {
          nombre: nombre?.trim(),
          estado: estado?.trim().toLowerCase(),
          youtube: youtube?.trim(),
          trailer: trailer?.trim(),
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
          igdbId: igdbId?.trim(),
          usuario: trimmedUsuario,
          comentario: comentario?.trim(),
        };
      });
      const uniqueUsers = Array.from(userMap.entries());
      const currentHash = createSimpleHash(parsedData);
      const cacheData = {
        games: parsedData,
        users: uniqueUsers,
        hash: currentHash,
        lastUpdate: Date.now(),
      };
      localStorage.setItem("juegosData", JSON.stringify(cacheData));
      setGames(parsedData);
      setUsers(uniqueUsers);
      return true;
    } catch (error) {
      return false;
    }
  };




  const paginatedGames = filteredGames.slice((currentPage - 1) * gamesPerPage, currentPage * gamesPerPage);
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage((prevPage) => prevPage + 1); };
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage((prevPage) => prevPage - 1); };
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
    setCurrentPage((prevPage) => {
      if (prevPage > totalPages) return totalPages;
      if (prevPage < 1) return 1;
      return prevPage;
    });
  }, [filteredGames, gamesPerPage]);

  // Filtra los juegos de "pasado" según la búsqueda (ELIMINADO - duplicado)


  function normalizeString(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\w\s]/gi, "").trim();
  }
  function getUserName(userId) {
    if (!userId) return "";
    const user = userDataComplete.find((u) => u.id === userId || u.nombre === userId);
    return user ? user.nombre : userId;
  }
  function getUserAvatar(userId) {
    if (!userId) return "";
    const user = userDataComplete.find((u) => u.id === userId || u.nombre === userId);
    return user && user.avatar ? user.avatar : null;
  }


  function handleGameClick(game) {
    setSelectedGame(game);
    setShowEditPopup(false);
  }
  function closePopup() {
    setSelectedGame(null);
    setShowEditPopup(false);
    setEditingGame(null);
  }

  const CARRUSEL_SIZE = 9;
  const CENTER_INDEX = Math.floor(CARRUSEL_SIZE / 2);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const getCarruselConfig = () => {
    if (screenWidth <= 800) return { containerWidth: 660, gameWidth: 100, edgeMargin: 0 };
    else if (screenWidth <= 1100) return { containerWidth: 780, gameWidth: 120, edgeMargin: 0 };
    else return { containerWidth: 900, gameWidth: 140, edgeMargin: 0 };
  };
  const getCarruselIndices = () => {
    const gamesList = planeoView === "planeo jugar" ? planeoJugar : games.filter((g) => g.estado === "recomendado");
    if (gamesList.length === 0) return [];
    let indices = [];
    let base = startIndex;
    if (gamesList.length < CARRUSEL_SIZE) {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % gamesList.length;
        if (idx < 0) idx += gamesList.length;
        indices.push(idx);
      }
    } else {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % gamesList.length;
        if (idx < 0) idx += gamesList.length;
        indices.push(idx);
      }
    }
    return indices;
  };
  const carruselIndices = getCarruselIndices();
  const calculateGamePosition = (index, containerWidth, gameWidth, edgeMargin) => {
    if (CARRUSEL_SIZE === 1) return (containerWidth - gameWidth) / 2;
    const totalAvailableWidth = containerWidth - 2 * edgeMargin - gameWidth;
    const baseSpacing = totalAvailableWidth / (CARRUSEL_SIZE - 1);
    if (index === 0) return edgeMargin;
    else if (index === CARRUSEL_SIZE - 1) return containerWidth - edgeMargin - gameWidth;
    else {
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
        if (index < CENTER_INDEX) adjustment -= extraSpace;
        else adjustment += extraSpace;
      }
      let position = uniformPosition + adjustment;
      if (CARRUSEL_SIZE > 7) {
        const overlapFactor = Math.min((CARRUSEL_SIZE - 7) * 0.08, 0.4);
        const overlapAmount = (centerDistance / maxCenterDistance) * gameWidth * overlapFactor;
        if (index < CENTER_INDEX) position += overlapAmount;
        else if (index > CENTER_INDEX) position -= overlapAmount;
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
    const gamesList =
      planeoView === "planeo jugar"
        ? planeoJugar
        : games.filter((g) => g.estado === "recomendado");
    console.log(
      "handleNext called - planeoView:",
      planeoView,
      "gamesList.length:",
      gamesList.length
    );
    if (!gamesList.length) return;
    console.log("Moving to next game, current startIndex:", startIndex);
    animateCarousel("right", () => {
      setStartIndex((prev) => (prev + 1) % gamesList.length);
    });
  };
  const handlePrevious = () => {
    const gamesList =
      planeoView === "planeo jugar"
        ? planeoJugar
        : games.filter((g) => g.estado === "recomendado");
    console.log(
      "handlePrevious called - planeoView:",
      planeoView,
      "gamesList.length:",
      gamesList.length
    );
    if (!gamesList.length) return;
    console.log("Moving to previous game, current startIndex:", startIndex);
    animateCarousel("left", () => {
      setStartIndex((prev) => (prev - 1 + gamesList.length) % gamesList.length);
    });
  };
  // URL del Google Sheet (debe estar en .env)
  const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;
  const userDataSheetUrl = process.env.REACT_APP_USERDATA_SHEET_URL;


  useEffect(() => {
    if (!userDataSheetUrl) return;
    const fetchUserData = async () => {
      try {
        const response = await fetch(userDataSheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const headerRow = rows[0].split(",");
        const bodyRows = rows.slice(1);
        const parsedUserData = bodyRows.map((row) => {
          const columns = row.split(",");
          const obj = {};
          headerRow.forEach((header, index) => { obj[header] = columns[index] || ""; });
          return obj;
        });
        setUserDataComplete(parsedUserData);
        localStorage.setItem("userData", JSON.stringify(parsedUserData));
      } catch (error) {}
    };
    fetchUserData();
    const intervalId = setInterval(fetchUserData, 300000);
    return () => clearInterval(intervalId);
  }, [userDataSheetUrl]);
  const createSimpleHash = (data) => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };


  useEffect(() => {
    const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;
    if (!sheetUrl) return;
    const fetchGames = async () => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const userMap = new Map();
        const parsedData = rows.slice(1).map((row) => {
          const [nombre, estado, youtube, trailer, nota, horas, plataforma, fecha, caratula, fechaLanzamiento, géneros, plataformas, resumen, desarrolladores, publicadores, igdbId, usuario, comentario] = row.split(",");
          const trimmedUsuario = usuario?.trim();
          if (trimmedUsuario && trimmedUsuario !== "" && !userMap.has(trimmedUsuario)) {
            userMap.set(trimmedUsuario, trimmedUsuario);
          }
          return {
            nombre: nombre?.trim(),
            estado: estado?.trim().toLowerCase(),
            youtube: youtube?.trim(),
            trailer: trailer?.trim(),
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
            igdbId: igdbId?.trim(),
            usuario: trimmedUsuario,
            comentario: comentario?.trim(),
          };
        });
        const uniqueUsers = Array.from(userMap.entries());
        const currentHash = createSimpleHash(parsedData);
        const cacheData = {
          games: parsedData,
          users: uniqueUsers,
          hash: currentHash,
          lastUpdate: Date.now(),
        };
        localStorage.setItem("juegosData", JSON.stringify(cacheData));
        setGames(parsedData);
        setUsers(uniqueUsers);
      } catch (error) {}
    };
    const loadFromCacheOrCreate = () => {
      const cachedData = localStorage.getItem("juegosData");
      if (cachedData) {
        try {
          const cache = JSON.parse(cachedData);
          if (cache.games && cache.users) {
            setGames(cache.games);
            setUsers(cache.users);
            checkForUpdatesInBackground();
          } else {
            throw new Error("Invalid cache format");
          }
        } catch (error) {
          localStorage.removeItem("juegosData");
          fetchGames();
        }
      } else {
        fetchGames();
      }
    };
    const checkForUpdatesInBackground = async () => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const currentData = rows.slice(1).map((row) => {
          const [nombre, estado, youtube, trailer, nota, horas, plataforma, fecha, caratula, fechaLanzamiento, géneros, plataformas, resumen, desarrolladores, publicadores, igdbId, usuario, comentario] = row.split(",");
          return {
            nombre: nombre?.trim(),
            estado: estado?.trim().toLowerCase(),
            youtube: youtube?.trim(),
            trailer: trailer?.trim(),
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
            igdbId: igdbId?.trim(),
            usuario: usuario?.trim(),
            comentario: comentario?.trim(),
          };
        });
        const newHash = createSimpleHash(currentData);
        const cachedData = JSON.parse(localStorage.getItem("juegosData"));
        if (cachedData.hash !== newHash) {
          const userMap = new Map();
          currentData.forEach((game) => {
            if (game.usuario && !userMap.has(game.usuario)) {
              userMap.set(game.usuario, game.usuario);
            }
          });
          const uniqueUsers = Array.from(userMap.entries());
          const updatedCache = {
            games: currentData,
            users: uniqueUsers,
            hash: newHash,
            lastUpdate: Date.now(),
          };
          localStorage.setItem("juegosData", JSON.stringify(updatedCache));
          setGames(currentData);
          setUsers(uniqueUsers);
        }
      } catch (error) {}
    };
    loadFromCacheOrCreate();
  }, []);

  // Separa y ordena los juegos en todas las categorías al cargar datos

  useEffect(() => {
    if (!games || games.length === 0) return;
    setJugando(sortByName(games.filter((game) => game.estado === "jugando"), true));
    const planeoJugarGames = games.filter((game) => game.estado === "planeo jugar");
    const sortedPlaneoJugar = sortByRecentlyAdded(planeoJugarGames);
    setPlaneoJugar(sortedPlaneoJugar);
    setOriginalPlaneoJugar(planeoJugarGames);
    const pasadoGames = games.filter((game) => game.estado === "pasado" || game.estado === "dropeado");
    const sortedPasadoGames = sortByDate(pasadoGames, false);
    setPasado(sortedPasadoGames);
  }, [games]);


  const sortByName = (list, ascending = true) => [...list].sort((a, b) => ascending ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre));
  const sortByRecentlyAdded = (list) => [...list];
  const sortByDate = (list, ascending = true) => {
    const parseDate = (dateStr) => {
      if (!dateStr || dateStr.trim() === "") return new Date(0);
      try {
        const parts = dateStr.split("/");
        if (parts.length !== 3) return new Date(0);
        const [day, month, year] = parts.map((num) => parseInt(num, 10));
        if (isNaN(day) || isNaN(month) || isNaN(year)) return new Date(0);
        return new Date(year, month - 1, day);
      } catch (error) { return new Date(0); }
    };
    return [...list].sort((a, b) => ascending ? parseDate(a.fecha) - parseDate(b.fecha) : parseDate(b.fecha) - parseDate(a.fecha));
  };
  const sortByDuration = (list, ascending = true) => [...list].sort((a, b) => { const durationA = parseFloat(a.horas) || 0; const durationB = parseFloat(b.horas) || 0; return ascending ? durationA - durationB : durationB - durationA; });
  const sortByRating = (list, ascending = true) => [...list].sort((a, b) => { const ratingA = parseFloat(a.nota) || 0; const ratingB = parseFloat(b.nota) || 0; return ascending ? ratingA - ratingB : ratingB - ratingA; });


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
    if (category === "pasado") setPasado(sortedList);
    setActiveFilters((prev) => ({ ...prev, [category]: filterType }));
    setCurrentPage(1);
  };
  const handleFilterToggle = (type) => {
    let filterType;
    const currentDirection = activeFilters.pasado.includes("-asc") ? "asc" : "desc";
    switch (type) {
      case "name":
        if (activeFilters.pasado.includes("name")) filterType = activeFilters.pasado === "name-asc" ? "name-desc" : "name-asc";
        else filterType = `name-${currentDirection}`;
        break;
      case "date":
        if (activeFilters.pasado.includes("date")) filterType = activeFilters.pasado === "date-asc" ? "date-desc" : "date-asc";
        else filterType = `date-${currentDirection}`;
        break;
      case "rating":
        if (activeFilters.pasado.includes("rating")) filterType = activeFilters.pasado === "rating-asc" ? "rating-desc" : "rating-asc";
        else filterType = `rating-${currentDirection}`;
        break;
      case "duration":
        if (activeFilters.pasado.includes("duration")) filterType = activeFilters.pasado === "duration-asc" ? "duration-desc" : "duration-asc";
        else filterType = `duration-${currentDirection}`;
        break;
      default:
        return;
    }
    handleFilter(filterType, "pasado");
  };
  useEffect(() => {
    if (!filteredGames || filteredGames.length === 0) return;
    const preloadImages = (games) => {
      games.forEach((game) => {
        if (game.caratula) {
          const img = new window.Image();
          img.src = game.caratula;
        }
      });
    };
    const startNext = currentPage * gamesPerPage;
    const endNext = startNext + gamesPerPage;
    const startPrev = (currentPage - 2) * gamesPerPage;
    const endPrev = startPrev + gamesPerPage;
    if (startNext < filteredGames.length) preloadImages(filteredGames.slice(startNext, endNext));
    if (startPrev >= 0) preloadImages(filteredGames.slice(startPrev, endPrev));
  }, [currentPage, filteredGames]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
  function translateGenre(genre) {
    const trimmed = genre.trim();
    return GENRE_TRANSLATIONS[trimmed] || trimmed;
  }
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
    return Array.from(genreSet).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  };
  const uniqueGenres = getUniqueGenres(games);
  const getUniquePlatforms = (gamesList) => {
    const platformSet = new Set();
    gamesList.forEach((game) => {
      if (game.plataformas) {
        game.plataformas.split("-%-").forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) platformSet.add(trimmed);
        });
      }
    });
    return Array.from(platformSet).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  };
  const uniquePlatforms = getUniquePlatforms(games);


  useEffect(() => {
    const normalizedQuery = normalizeString(searchQuery);
    let filtered = pasado.filter((game) => {
      if (!searchQuery || searchQuery.trim() === "") return true;
      const nombreMatch = normalizeString(game.nombre).includes(normalizedQuery);
      const notaMatch = game.nota && normalizeString(game.nota).includes(normalizedQuery);
      const horasMatch = game.horas && normalizeString(game.horas).includes(normalizedQuery);
      const fechaMatch = game.fecha && normalizeString(game.fecha).includes(normalizedQuery);
      const resumenMatch = game.resumen && normalizeString(game.resumen).includes(normalizedQuery);
      return nombreMatch || notaMatch || horasMatch || fechaMatch || resumenMatch;
    });
    if (selectedGenre) {
      filtered = filtered.filter((game) => {
        if (!game.géneros) return false;
        return game.géneros.split("-%-").map((g) => g.trim().toLowerCase()).includes(selectedGenre.trim().toLowerCase());
      });
    }
    if (selectedPlatform) {
      filtered = filtered.filter((game) => {
        if (!game.plataforma) return false;
        return game.plataforma.split("-%-").map((p) => p.trim().toLowerCase()).includes(selectedPlatform.trim().toLowerCase());
      });
    }
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((game) => {
        if (!game.fecha) return true;
        try {
          const [d, m, y] = game.fecha.split("/").map(Number);
          if (!d || !m || !y || isNaN(d) || isNaN(m) || isNaN(y)) return true;
          const gameDate = new Date(y, m - 1, d);
          return gameDate >= from && gameDate <= to;
        } catch (error) {
          return true;
        }
      });
    }
    setFilteredGames(filtered);
    setCurrentPage(1);
  }, [searchQuery, pasado, selectedGenre, selectedPlatform, dateFrom, dateTo]);
  useEffect(() => {
    if (pasado.length === 0) return;
    const fechas = pasado
      .map((g) => g.fecha)
      .filter((fecha) => fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha))
      .map((f) => {
        const [d, m, y] = f.split("/").map(Number);
        return new Date(y, m - 1, d);
      })
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a - b);
    if (fechas.length > 0) {
      const min = fechas[0];
      const max = fechas[fechas.length - 1];
      setDateFrom(min.toISOString().slice(0, 10));
      const maxIncluido = new Date(max);
      maxIncluido.setDate(maxIncluido.getDate() + 1);
      setDateTo(maxIncluido.toISOString().slice(0, 10));
    }
  }, [pasado]);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [searchIGDB, setSearchIGDB] = useState("");
  const [igdbResults, setIgdbResults] = useState([]);
  const [igdbLoading, setIgdbLoading] = useState(false);
  const [igdbError, setIgdbError] = useState("");
  const [selectedIGDB, setSelectedIGDB] = useState(null);
  const [addStatus, setAddStatus] = useState(""); // Nuevo: feedback para el usuario
  const [commentText, setCommentText] = useState(""); // Estado para el comentario
  // Estados para validación de usuario autorizado
  const [userValidated, setUserValidated] = useState(false);
  const [userValidating, setUserValidating] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Estados para el popup de añadir juego (desarrolladores)
  const [showAddGamePopup, setShowAddGamePopup] = useState(false);
  const [searchGameIGDB, setSearchGameIGDB] = useState("");
  const [gameIgdbResults, setGameIgdbResults] = useState([]);
  const [gameIgdbLoading, setGameIgdbLoading] = useState(false);
  const [gameIgdbError, setGameIgdbError] = useState("");
  const [selectedGameIGDB, setSelectedGameIGDB] = useState(null);
  const [addGameStatus, setAddGameStatus] = useState("");
  const [addGameFormData, setAddGameFormData] = useState({
    estado: "Planeo Jugar", // Estado por defecto con mayúsculas correctas
    nota: "",
    horas: "",
    fecha: "",
    youtube: "",
    trailer: "",
    caratula: "", // Campo para la carátula
    plataforma: "",
  });
  const [availableGamePlatforms, setAvailableGamePlatforms] = useState([]); // Plataformas disponibles del juego seleccionado
  // Función para validar si el usuario actual está autorizado
  const validateCurrentUser = async () => {
    let twitchUser = null;
    try {
      twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
    } catch {}

    if (!twitchUser || !twitchUser.id) {
      setErrorMessage(
        "Debes iniciar sesión con Twitch para recomendar juegos."
      );
      setShowErrorPopup(true);
      return false;
    }

    setUserValidating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/validate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: twitchUser.id }),
      });

      const data = await response.json();

      if (data.authorized) {
        setUserValidated(true);
        setErrorMessage("");
        return true;
      } else {
        setErrorMessage(
          data.message || "Usuario no autorizado para añadir recomendaciones."
        );
        setShowErrorPopup(true);
        return false;
      }
    } catch (error) {
      console.error("[validateCurrentUser] Error:", error);
      setErrorMessage("Error al validar usuario. Inténtalo de nuevo.");
      setShowErrorPopup(true);
      return false;
    } finally {
      setUserValidating(false);
    }
  };
  // Función modificada para abrir el popup con validación
  const handleOpenAddPopup = async () => {
    const isValid = await validateCurrentUser();
    if (isValid) {
      setShowAddPopup(true);
    }
  };
  // Función para cerrar el popup y limpiar estados
  const handleCloseAddPopup = () => {
    setShowAddPopup(false);
    setSearchIGDB("");
    setSelectedIGDB(null);
    setIgdbResults([]);
    setAddStatus("");
    setCommentText("");
    setUserValidated(false);
    setErrorMessage("");
  };
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

  // ===============================
  // FUNCIONES PARA AÑADIR JUEGO (DESARROLLADORES)
  // ===============================

  // Escuchar evento de la navbar para abrir el popup de añadir juego
  useEffect(() => {
    const handleOpenAddGamePopup = () => {
      if (isDeveloperMode) {
        setShowAddGamePopup(true);
      }
    };

    window.addEventListener("openAddGamePopup", handleOpenAddGamePopup);
    return () => {
      window.removeEventListener("openAddGamePopup", handleOpenAddGamePopup);
    };
  }, [isDeveloperMode]); // Función para cerrar el popup de añadir juego y limpiar estados
  const handleCloseAddGamePopup = () => {
    setShowAddGamePopup(false);
    setSearchGameIGDB("");
    setSelectedGameIGDB(null);
    setGameIgdbResults([]);
    setAddGameStatus("");
    setAvailableGamePlatforms([]);
    setAddGameFormData({
      estado: "Planeo Jugar",
      nota: "",
      horas: "",
      fecha: "",
      youtube: "",
      caratula: "",
      plataforma: "",
    });
  };

  // Manejar cambios en el formulario de añadir juego
  const handleAddGameFormChange = (field, value) => {
    setAddGameFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  // Función para manejar la selección de un juego de IGDB
  const handleGameIGDBSelection = (game) => {
    setSelectedGameIGDB(game);

    // Poblar automáticamente los campos con datos de IGDB
    const platforms = game.platforms ? game.platforms.split(", ") : [];
    setAvailableGamePlatforms(platforms);

    // Preseleccionar la primera plataforma o una plataforma preferida
    const preferredPlatforms = [
      "Nintendo Switch",
      "PlayStation 5",
      "Xbox Series X/S",
      "PC",
      "PlayStation 4",
      "Xbox One",
    ];

    const selectedPlatform =
      preferredPlatforms.find((pref) =>
        platforms.some((p) => p.includes(pref))
      ) ||
      platforms[0] ||
      "";

    setAddGameFormData((prev) => ({
      ...prev,
      caratula: game.coverUrl || "",
      plataforma: selectedPlatform,
      trailer: game.trailer || "",
    }));
  };

  // Buscar en IGDB para añadir juego cuando cambia el input (con debounce de 5s)
  useEffect(() => {
    if (!showAddGamePopup) {
      setGameIgdbResults([]);
      setGameIgdbError("");
      return;
    }
    if (!searchGameIGDB.trim()) {
      setGameIgdbResults([]);
      setGameIgdbError("");
      return;
    }
    setGameIgdbLoading(true);
    setGameIgdbError("");
    setGameIgdbResults([]);
    // Mostrar puntos suspensivos mientras espera
    let loadingInterval = null;
    let loadingDots = 0;
    setGameIgdbError("Cargando");
    loadingInterval = setInterval(() => {
      loadingDots = (loadingDots + 1) % 4;
      setGameIgdbError("Cargando" + ".".repeat(loadingDots));
    }, 500);
    // Debounce de 5 segundos
    const handler = setTimeout(() => {
      fetch("/api/igdb-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchGameIGDB }),
      })
        .then((res) => res.json())
        .then((data) => {
          clearInterval(loadingInterval);
          setGameIgdbError("");
          if (data.error) {
            setGameIgdbError("Error al buscar en IGDB: " + data.error);
            setGameIgdbResults([]);
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
            setGameIgdbResults(results);
          }
          setGameIgdbLoading(false);
        })
        .catch(() => {
          clearInterval(loadingInterval);
          setGameIgdbError("Error al buscar en IGDB");
          setGameIgdbLoading(false);
        });
    }, 5000);
    return () => {
      clearTimeout(handler);
      clearInterval(loadingInterval);
    };
  }, [searchGameIGDB, showAddGamePopup]);
  // Función para centrar un juego específico del carrusel
  const handleCarouselGameClick = (clickedIndex, gameIndex) => {
    console.log(
      "handleCarouselGameClick called - clickedIndex:",
      clickedIndex,
      "gameIndex:",
      gameIndex,
      "CENTER_INDEX:",
      CENTER_INDEX
    );
    // Usar la lista de juegos apropiada según el estado actual
    const gamesList =
      planeoView === "planeo jugar"
        ? planeoJugar
        : games.filter((g) => g.estado === "recomendado");
    console.log(
      "gamesList.length:",
      gamesList.length,
      "planeoView:",
      planeoView
    );

    // Si es el juego central, abrir el popup de detalles
    if (clickedIndex === CENTER_INDEX) {
      const game = gamesList[gameIndex];
      console.log("Opening popup for game:", game?.nombre);
      handleGameClick(game);
    } else {
      // Calcular cuántas posiciones mover para centrar el juego clicado
      const positionsToMove = clickedIndex - CENTER_INDEX;
      console.log(
        "Moving",
        positionsToMove,
        "positions to center the clicked game"
      );

      // Determinar dirección de la animación
      const direction = positionsToMove > 0 ? "right" : "left";

      // Usar la función de animación para el cambio
      animateCarousel(direction, () => {
        setStartIndex((prev) => {
          let newIndex = prev + positionsToMove;

          // Aplicar wrapping circular usando la longitud correcta de la lista
          if (newIndex < 0) {
            newIndex = gamesList.length + newIndex;
          } else if (newIndex >= gamesList.length) {
            newIndex = newIndex % gamesList.length;
          }

          console.log("New startIndex:", newIndex);
          return newIndex;
        });
      });
    }
  };
  // Estado para controlar las animaciones del carrusel
  const [isAnimating, setIsAnimating] = useState(false); // Estado para controlar animaciones
  const [animationDirection, setAnimationDirection] = useState(null); // 'left', 'right', 'click'
  // Corrige startIndex si la lista activa cambia de tamaño o está vacía
  useEffect(() => {
    const gamesList =
      planeoView === "planeo jugar"
        ? planeoJugar
        : games.filter((g) => g.estado === "recomendado");
    if (!gamesList.length) {
      setStartIndex(0);
      return;
    }
    if (startIndex >= gamesList.length || startIndex < 0 || isNaN(startIndex)) {
      setStartIndex(0);
    }
  }, [planeoView, planeoJugar, games, startIndex]);
  // Función auxiliar para convertir fecha de DD/MM/YYYY a YYYY-MM-DD
  const convertDateToISO = (dateStr) => {
    if (!dateStr) return "";
    // Si ya está en formato ISO (YYYY-MM-DD), devolverlo tal como está
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    // Si está en formato DD/MM/YYYY, convertirlo
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return dateStr;
  };

  // Función auxiliar para limpiar los separadores -%-
  const cleanSeparators = (str) => {
    return str ? str.replace(/-%-/g, ", ") : "";
  }; // Funciones para manejar la edición de juegos
  const handleEditGame = (game) => {
    setEditingGame(game);

    const platformsString = cleanSeparators(game.plataformas || "");
    const selectedPlatforms = getSelectedItems(platformsString);

    // Determinar la plataforma a preseleccionar
    let selectedPlatform = game.plataforma || "";

    // Si la plataforma actual no está en las plataformas disponibles o está vacía,
    // intentar preseleccionar una plataforma válida
    if (!selectedPlatform || !selectedPlatforms.includes(selectedPlatform)) {
      // Priorizar ciertas plataformas si están disponibles
      const preferredPlatforms = [
        "Wii",
        "Nintendo Switch",
        "PlayStation 5",
        "Xbox Series X/S",
        "PC",
      ];
      selectedPlatform =
        preferredPlatforms.find((platform) =>
          selectedPlatforms.includes(platform)
        ) ||
        selectedPlatforms[0] ||
        "";
    }

    setEditFormData({
      nombre: game.nombre || "",
      estado: game.estado || "",
      nota: game.nota || "",
      horas: game.horas || "",
      fecha: convertDateToISO(game.fecha || ""),
      youtube: game.youtube || "",
      caratula: game.caratula || "",
      resumen: cleanSeparators(game.resumen || ""),
      géneros: cleanSeparators(game.géneros || ""),
      plataformas: platformsString,
      plataforma: selectedPlatform, // Usar la plataforma inteligentemente seleccionada
      desarrolladores: cleanSeparators(game.desarrolladores || ""),
      publicadores: cleanSeparators(game.publicadores || ""),
      "Fecha de Lanzamiento": convertDateToISO(
        game["Fecha de Lanzamiento"] || ""
      ),
      comentario: cleanSeparators(game.comentario || ""),
      usuario: game.usuario || "",
      // Campos para identificación única de la fila
      originalNombre: game.nombre || "",
      originalEstado: game.estado || "",
      originalFecha: game.fecha || "",
      originalUsuario: game.usuario || "",
    }); // Las plataformas disponibles ya están configuradas con las plataformas jugadas
    // No necesitamos sobrescribirlas aquí

    setShowEditPopup(true);
  };
  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingGame(null);
    setEditFormData({});
    // No limpiar availablePlatforms ya que contiene las plataformas jugadas
    closeAllDropdowns();
  };

  // Helper functions for multi-select genres and platforms
  const getSelectedItems = (itemsString) => {
    if (!itemsString) return [];
    return itemsString
      .split(", ")
      .map((item) => item.trim())
      .filter((item) => item);
  };
  const handleItemToggle = (field, item, isSelected) => {
    const currentItems = getSelectedItems(editFormData[field] || "");
    let newItems;

    if (isSelected) {
      // Remove item
      newItems = currentItems.filter((currentItem) => currentItem !== item);
    } else {
      // Add item
      newItems = [...currentItems, item];
    }
    const newValue = newItems.join(", ");
    handleEditFormChange(field, newValue);
  };

  // State for dropdown visibility
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [dropdownName]: !prev[dropdownName],
    }));
  };

  const closeAllDropdowns = () => {
    setOpenDropdowns({});
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSaveEdit = async () => {
    const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;

    try {
      // Validar que el usuario esté autorizado (solo admin)
      let twitchUser = null;
      try {
        twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
      } catch {}

      if (!twitchUser || !twitchUser.id) {
        setErrorMessage("Debes iniciar sesión con Twitch para editar juegos.");
        setShowErrorPopup(true);
        return;
      }

      // Solo el admin puede editar
      const ADMIN_USER_ID = "173916175";
      if (String(twitchUser.id).trim() !== ADMIN_USER_ID) {
        setErrorMessage("Solo el administrador puede editar juegos.");
        setShowErrorPopup(true);
        return;
      }

      console.log("Guardando cambios:", editFormData);

      // Mostrar indicador de carga
      const originalText =
        document.querySelector(".edit-save-button")?.textContent;
      const saveButton = document.querySelector(".edit-save-button");
      if (saveButton) {
        saveButton.textContent = "Guardando...";
        saveButton.disabled = true;
      } // Enviar datos al API
      console.log("[handleSaveEdit] Sending request to /api/edit-game");
      console.log("[handleSaveEdit] Request data:", {
        gameData: editFormData,
        userId: twitchUser.id,
        originalIdentifiers: {
          nombre: editFormData.originalNombre,
          estado: editFormData.originalEstado,
          fecha: editFormData.originalFecha,
          usuario: editFormData.originalUsuario,
        },
      });

      const response = await fetch("/api/edit-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameData: editFormData,
          userId: twitchUser.id,
          originalIdentifiers: {
            nombre: editFormData.originalNombre,
            estado: editFormData.originalEstado,
            fecha: editFormData.originalFecha,
            usuario: editFormData.originalUsuario,
          },
        }),
      });

      console.log("[handleSaveEdit] Response status:", response.status);
      console.log("[handleSaveEdit] Response ok:", response.ok);

      const data = await response.json();
      console.log("[handleSaveEdit] Response data:", data);
      if (response.ok && data.success) {
        // Éxito - actualizar datos locales
        console.log("Juego actualizado exitosamente:", data);

        // Cerrar popup inmediatamente
        handleCloseEditPopup();

        // Limpiar cache para forzar actualización
        localStorage.removeItem("juegosData");

        // Forzar actualización inmediata de datos sin recargar la página
        console.log("[handleSaveEdit] Forcing immediate data refresh");

        // Ejecutar fetchGames para obtener datos frescos
        setTimeout(async () => {
          const success = await refreshGameData("EDIT_GAME");
          if (!success) {
            console.error("[handleSaveEdit] Failed to refresh data");
          }
        }, 500); // Small delay to ensure Google Sheets has processed the update
      } else {
        // Error del servidor
        console.error("Error al guardar:", data);
        console.error("Response status:", response.status);
        console.error("Response statusText:", response.statusText);

        let errorMessage = "Error al guardar los cambios";
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (response.status === 403) {
          errorMessage =
            "Acceso denegado - Solo el administrador puede editar juegos";
        } else if (response.status === 404) {
          errorMessage = "Juego no encontrado en la base de datos";
        } else if (response.status === 500) {
          errorMessage =
            "Error del servidor - " +
            (data.details || data.error || "Error interno");
        }

        setErrorMessage(errorMessage);
        setShowErrorPopup(true);
      }
    } catch (error) {
      console.error("Error en handleSaveEdit:", error);
      setErrorMessage("Error de conexión al guardar los cambios");
      setShowErrorPopup(true);
    } finally {
      // Restaurar botón
      const saveButton = document.querySelector(".edit-save-button");
      if (saveButton) {
        saveButton.textContent = "Guardar Cambios";
        saveButton.disabled = false;
      }
    }
  };

  useEffect(() => {
    if (games.length > 0) {
      const uniquePlatforms = [
        ...new Set(
          games
            .map((game) => game.plataforma)
            .filter((platform) => platform && platform.trim() !== "")
            .map((platform) => platform.trim())
        ),
      ].sort();
      setPlayedPlatforms(uniquePlatforms);
    }
  }, [games]);
  useEffect(() => {
    if (playedPlatforms.length > 0) setAvailablePlatforms(playedPlatforms);
  }, [playedPlatforms]);

  // Renderizado principal del componente
  return (
    <div className="juegos-container">
      <div className="categories-row">
        <section className="category-jugando">
          <h2 className="header-juegos">Jugando</h2>{" "}
          <ul>
            {jugando.map((game, index) => (
              <li key={index}>
                {/* Botón de edición en modo desarrollador */}
                {isDeveloperMode && (
                  <button
                    className="edit-game-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditGame(game);
                    }}
                    title="Editar juego"
                  >
                    ✏️
                  </button>
                )}{" "}
                <div className="cover-wrapper">
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
                        <circle cx="20" cy="20" r="20" fill="rgba(0,0,0,0.6)" />
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
            {(() => {
              let twitchUser = null;
              try {
                twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
              } catch {}
              // Div invisible a la izquierda
              const leftSpacer = <div className="header-spacer" />;
              // Div invisible a la derecha (ocupa el lugar del botón si no está visible)
              const rightSpacer = <div className="header-spacer" />; // Botón Recomendar (solo si logueado y en planeo jugar)
              const recommendBtn =
                planeoView === "recomendado" &&
                twitchUser &&
                twitchUser.name ? (
                  <button
                    className="add-recommendation-button"
                    onClick={handleOpenAddPopup}
                    disabled={userValidating}
                  >
                    {userValidating ? "Validando..." : "+ Recomendar"}
                  </button>
                ) : (
                  rightSpacer
                );
              // Layout: [spacer] [header] [recomendar o spacer]
              return (
                <>
                  {leftSpacer}
                  <h2
                    className="header-juegos toggle-header-btn"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      margin: 0,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() =>
                      setPlaneoView((prev) =>
                        prev === "planeo jugar" ? "recomendado" : "planeo jugar"
                      )
                    }
                    title={
                      planeoView === "planeo jugar"
                        ? "Ver Recomendaciones"
                        : "Ver Planeo Jugar"
                    }
                  >
                    {planeoView === "planeo jugar"
                      ? "Planeo Jugar"
                      : "Recomendaciones"}
                  </h2>
                  {recommendBtn}
                </>
              );
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
              {" "}
              {carruselIndices.map((gameIdx, i) => {
                // Mostrar juegos según el estado seleccionado
                const gamesList =
                  planeoView === "planeo jugar"
                    ? planeoJugar
                    : games.filter((g) => g.estado === "recomendado");
                if (!gamesList.length) return null;
                const game = gamesList[gameIdx % gamesList.length];
                const distance = Math.abs(i - CENTER_INDEX); // Configuración responsive del carrusel
                const { containerWidth, gameWidth, edgeMargin } =
                  getCarruselConfig();

                // Calcular posición usando la función centralizada
                const position = calculateGamePosition(
                  i,
                  containerWidth,
                  gameWidth,
                  edgeMargin
                ); // Escala basada en distancia al centro con curva suave y progresiva
                const maxDistance = Math.floor(CARRUSEL_SIZE / 2);
                // Usar una función de easing más suave que preserve más el tamaño de los juegos cercanos al centro
                const normalizedDistance = distance / maxDistance; // 0 a 1
                const easedDistance = Math.pow(normalizedDistance, 2); // Curva más suave para reducción progresiva
                let scale = 1.0 - easedDistance * 0.25; // Reducción máxima del 25% para mayor contraste                // Z-index basado en distancia al centro
                const zIndex = CARRUSEL_SIZE - distance;

                // Calcular opacidad dinámicamente basada en la distancia al centro
                // Función matemática: opacity = distance / maxDistance * 0.99
                // Centro (distance = 0) = opacity 0, Más lejano (distance = maxDistance) = opacity 0.99
                const distanceOpacity =
                  distance === 0
                    ? 0
                    : Math.min((distance / maxDistance) * 0.5, 0.5);

                // Simplificar className - solo necesitamos identificar si es centro o no
                const className =
                  distance === 0 ? "carrusel-center" : "carrusel-distant";

                return (
                  <li
                    key={gameIdx + "-" + i}
                    className={className}
                    style={{
                      position: "absolute",
                      left: `${position}px`,
                      transform: `scale(calc(${scale} * var(--hover-scale, 1)))`,
                      transformOrigin: "center center",
                      zIndex: zIndex,
                      cursor: "pointer",
                      width: `${gameWidth}px`,
                      // Solo transición para el hover de escala
                      transition:
                        "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                      // Variables CSS para animaciones
                      "--scale": scale,
                    }}
                    onClick={() => handleCarouselGameClick(i, gameIdx)}
                    onMouseEnter={(e) => {
                      // Aumentar escala al pasar el mouse
                      const gameElement = e.currentTarget;
                      if (gameElement) {
                        gameElement.style.transform = `scale(calc(${scale} * 1.1))`;
                        gameElement.style.transition =
                          "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      // Restablecer escala al quitar el mouse
                      const gameElement = e.currentTarget;
                      if (gameElement) {
                        gameElement.style.transform = `scale(calc(${scale}))`;
                        gameElement.style.transition =
                          "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                  >
                    {" "}
                    {/* Botón de edición en modo desarrollador */}
                    {isDeveloperMode && (
                      <button
                        className="edit-game-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditGame(game);
                        }}
                        title="Editar juego"
                      >
                        ✏️
                      </button>
                    )}{" "}
                    <div className="cover-wrapper">
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
                      {/* Mostrar avatar y nombre del recomendador si estamos en recomendaciones */}
                      {(() => {
                        if (planeoView !== "recomendado" || !game.usuario)
                          return null;

                        const userId = game.usuario;
                        const userName = getUserName(userId);
                        const avatar = getUserAvatar(userId);

                        // Solo mostrar overlay si tenemos avatar válido O nombre válido (no igual al ID)
                        const hasValidAvatar = avatar !== null;
                        const hasValidUsername =
                          userName && userName !== String(userId).trim();

                        if (!hasValidAvatar && !hasValidUsername) {
                          return null; // Ocultar completamente si no hay datos válidos
                        }

                        return (
                          <div className="recomendador-name-overlay">
                            {hasValidAvatar && (
                              <img
                                src={avatar}
                                alt={`Avatar de ${userName}`}
                                className="recomendador-avatar"
                              />
                            )}
                            <span className="recomendador-username">
                              {userName}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div
                      className="distance-overlay"
                      style={{ opacity: distanceOpacity }}
                    ></div>
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
            <h1 className="header-filtros">Filtros Generales</h1>{" "}
            <div className="filter-buttons-row">
              <div className="filter-buttons">
                <button
                  onClick={() => handleFilterToggle("name")}
                  style={{
                    paddingLeft: activeFilters.pasado.includes("name")
                      ? "40px"
                      : "30px",
                    fontWeight: activeFilters.pasado.includes("name")
                      ? "bold"
                      : "normal",
                    color: activeFilters.pasado.includes("name")
                      ? "var(--color-mid)"
                      : "var(--text-2)",
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
                    paddingLeft: activeFilters.pasado.includes("date")
                      ? "40px"
                      : "30px",
                    fontWeight: activeFilters.pasado.includes("date")
                      ? "bold"
                      : "normal",
                    color: activeFilters.pasado.includes("date")
                      ? "var(--color-mid)"
                      : "var(--text-2)",
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
                    paddingLeft: activeFilters.pasado.includes("rating")
                      ? "40px"
                      : "30px",
                    fontWeight: activeFilters.pasado.includes("rating")
                      ? "bold"
                      : "normal",
                    color: activeFilters.pasado.includes("rating")
                      ? "var(--color-mid)"
                      : "var(--text-2)",
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
                    paddingLeft: activeFilters.pasado.includes("duration")
                      ? "40px"
                      : "30px",
                    fontWeight: activeFilters.pasado.includes("duration")
                      ? "bold"
                      : "normal",
                    color: activeFilters.pasado.includes("duration")
                      ? "var(--color-mid)"
                      : "var(--text-2)",
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
                  </label>{" "}
                  <select
                    id="platform-select"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="spinner-generos"
                  >
                    <option value="">Todas</option>
                    {playedPlatforms.map((platform) => (
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
            {(() => {
              console.log('[DEBUG] Juegos en página actual:', paginatedGames.map(g => g.nombre));
              return paginatedGames;
            })().map((game, index) => {
              const showBadges =
                (game.horas && game.horas !== "") ||
                (game.nota && game.nota !== "");
              return (
                <li key={index}>
                  {/* Botón de edición en modo desarrollador */}
                  {isDeveloperMode && (
                    <button
                      className="edit-game-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditGame(game);
                      }}
                      title="Editar juego"
                    >
                      ✏️
                    </button>
                  )}
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
                <div className="popup-game-cover">
                  {showTrailer ? (
                    // Contenedor del trailer a pantalla completa
                    <div className="popup-trailer-fullscreen">
                      <iframe
                        width="100%"
                        height="100%"
                        src={getTrailerEmbedUrl(selectedGame.trailer)}
                        title="Trailer"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                      <button
                        className="popup-close-trailer-fullscreen"
                        onClick={() => setShowTrailer(false)}
                        aria-label="Cerrar trailer"
                      >
                        ✖
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={selectedGame.caratula.replace("t_cover_big", "t_1080p")}
                        alt={`Carátula de ${selectedGame.nombre}`}
                        style={{ cursor: selectedGame.trailer ? 'pointer' : 'default' }}
                        onClick={() => selectedGame.trailer && setShowTrailer(true)}
                      />
                      {selectedGame.trailer && (
                        <button
                          className="popup-play-button"
                          tabIndex={0}
                          aria-label="Ver trailer"
                          onClick={() => setShowTrailer(true)}
                        >
                          <svg
                            width="56"
                            height="56"
                            viewBox="0 0 56 56"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="28" cy="28" r="28" fill="rgba(0,0,0,0.6)" />
                            <polygon points="22,18 40,28 22,38" fill="#fff" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="popup-info">
                <h2>{selectedGame.nombre}</h2>
                <div className="popup-columns">
                  
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
                    )}{" "}
                    {selectedGame.fecha && (
                      <p>
                        <strong>📅 </strong> {selectedGame.fecha}
                      </p>
                    )}
                    
                    {selectedGame.comentario &&
                      selectedGame.comentario.trim() !== "" &&
                      selectedGame.usuario && (
                        <div className="recommender-comment-section">
                          <p>
                            <strong>
                              💬 {getUserName(selectedGame.usuario)}:
                            </strong>
                          </p>
                          <p className="recommender-comment">
                            {selectedGame.comentario.replace(/-%-/g, ", ")}
                          </p>
                        </div>
                      )}
                  </div>
                  
                  <div className="game-meta-column">
                    {" "}
                    {selectedGame.desarrolladores && (
                      <p>
                        <strong>Desarrolladores:</strong>{" "}
                        <span>
                          {selectedGame.desarrolladores.replace(/-%-/g, ", ")}
                        </span>
                      </p>
                    )}
                    {selectedGame.publicadores && (
                      <p>
                        <strong>Publicadores:</strong>{" "}
                        <span>
                          {selectedGame.publicadores.replace(/-%-/g, ", ")}
                        </span>
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
      
      {showAddPopup && (
        <div className="popup-overlay" onClick={handleCloseAddPopup}>
          <div
            className="popup-content popup-add-recommendation"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <button className="close-button" onClick={handleCloseAddPopup}>
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
              ))}{" "}
            </div>
            
            {selectedIGDB && (
              <div className="popup-comment-section">
                <textarea
                  className="popup-comment-textarea"
                  placeholder="Algo que me quieras decir sobre este juego..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            )}{" "}
            <button
              className={`add-recommendation-confirm ${
                addStatus.includes("Error")
                  ? "error"
                  : addStatus.includes("¡")
                  ? "success"
                  : addStatus.includes("Añadiendo")
                  ? "loading"
                  : ""
              }`}
              disabled={!selectedIGDB || addStatus.includes("Añadiendo")}
              onClick={async () => {
                if (!selectedIGDB) return;
                setAddStatus("");
                let twitchUser = null;
                try {
                  twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
                } catch {}
                if (!twitchUser || !twitchUser.id) {
                  setAddStatus("Inicia sesión con Twitch");
                  setTimeout(() => setAddStatus(""), 3000);
                  return;
                }
                setAddStatus("Añadiendo...");
                try {
                  const res = await fetch("/api/add-recommendation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user: twitchUser.id,
                      game: selectedIGDB.raw,
                      comment: commentText.trim(), // Enviar comentario
                    }),
                  });
                  const data = await res.json();
                  if (data.error) {
                    setAddStatus("Error al recomendar");
                    setTimeout(() => setAddStatus(""), 3000);
                  } else {
                    setAddStatus("¡Recomendado!");

                    // Actualizar el mapeo de usuarios con el nuevo usuario
                    if (twitchUser.id && twitchUser.name) {
                      setUsers((prevUsers) => {
                        const userExists = prevUsers.find(
                          ([id]) => id === twitchUser.id
                        );
                        if (!userExists) {
                          return [
                            ...prevUsers,
                            [twitchUser.id, twitchUser.name],
                          ];
                        }
                        return prevUsers;
                      });
                    } // Actualiza la lista de juegos recomendados
                    setTimeout(() => {
                      handleCloseAddPopup();
                    }, 2000);
                  }
                } catch (error) {
                  setAddStatus("Error al recomendar");
                  setTimeout(() => setAddStatus(""), 3000);
                }
              }}
            >
              {addStatus.includes("Añadiendo")
                ? "Añadiendo..."
                : addStatus.includes("¡")
                ? "¡Recomendado!"
                : addStatus.includes("Error")
                ? "Error al recomendar"
                : addStatus.includes("Inicia")
                ? "Inicia sesión con Twitch"
                : "Confirmar recomendación"}{" "}
            </button>
          </div>
        </div>
      )}

      
      {showEditPopup && (
        <div className="popup-overlay" onClick={handleCloseEditPopup}>
          <div
            className="popup-content popup-edit-game"
            onClick={(e) => {
              e.stopPropagation();
              // Close dropdowns when clicking outside them but inside the popup
              if (!e.target.closest(".edit-multiselect-spinner")) {
                closeAllDropdowns();
              }
            }}
          >
            <button className="close-button" onClick={handleCloseEditPopup}>
              ✖
            </button>
            <h2 className="popup-edit-title">Editar Juego</h2>
            <div className="edit-form-container">
              
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Nombre</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.nombre || ""}
                    onChange={(e) =>
                      handleEditFormChange("nombre", e.target.value)
                    }
                  />
                </div>{" "}
                <div className="edit-form-field">
                  <label>Estado</label>{" "}
                  <select
                    className="edit-select"
                    value={editFormData.estado || ""}
                    onChange={(e) =>
                      handleEditFormChange("estado", e.target.value)
                    }
                  >
                    <option value="jugando">Jugando</option>
                    <option value="planeo jugar">Planeo Jugar</option>
                    <option value="pasado">Pasado</option>
                    <option value="dropeado">Dropeado</option>
                    <option value="recomendado">Recomendado</option>
                  </select>
                </div>
              </div>{" "}
              
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Nota ({editFormData.nota || "0"})</label>
                  <input
                    type="range"
                    className="edit-slider"
                    min="0"
                    max="10"
                    step="0.5"
                    value={editFormData.nota || "0"}
                    onChange={(e) =>
                      handleEditFormChange("nota", e.target.value)
                    }
                  />
                </div>
                <div className="edit-form-field">
                  <label>Horas</label>
                  <input
                    type="number"
                    className="edit-input"
                    min="0"
                    step="0.1"
                    value={editFormData.horas || ""}
                    onChange={(e) =>
                      handleEditFormChange("horas", e.target.value)
                    }
                  />
                </div>
              </div>
              
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Fecha</label>
                  <input
                    type="date"
                    className="edit-input"
                    value={editFormData.fecha || ""}
                    onChange={(e) =>
                      handleEditFormChange("fecha", e.target.value)
                    }
                  />
                </div>
                <div className="edit-form-field">
                  <label>Fecha de Lanzamiento</label>
                  <input
                    type="date"
                    className="edit-input"
                    value={editFormData["Fecha de Lanzamiento"] || ""}
                    onChange={(e) =>
                      handleEditFormChange(
                        "Fecha de Lanzamiento",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>{" "}
              
              <div className="edit-form-field-full">
                <label>YouTube</label>
                <input
                  type="url"
                  className="edit-input"
                  value={editFormData.youtube || ""}
                  onChange={(e) =>
                    handleEditFormChange("youtube", e.target.value)
                  }
                />
              </div>
              
              <div className="edit-form-field-full">
                <label>Carátula (URL)</label>
                <input
                  type="url"
                  className="edit-input"
                  value={editFormData.caratula || ""}
                  onChange={(e) =>
                    handleEditFormChange("caratula", e.target.value)
                  }
                />
              </div>{" "}
              
              <div className="edit-form-field-full">
                <label>Plataforma Jugada</label>
                <select
                  className="edit-select"
                  value={editFormData.plataforma || ""}
                  onChange={(e) =>
                    handleEditFormChange("plataforma", e.target.value)
                  }
                >
                  {availablePlatforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="edit-form-row">
                {" "}
                <div className="edit-form-field">
                  <label>Géneros</label>
                  <div
                    className={`edit-multiselect-spinner ${
                      openDropdowns.genres ? "open" : ""
                    }`}
                  >
                    <div
                      className="edit-spinner-display"
                      onClick={() => toggleDropdown("genres")}
                    >
                      {getSelectedItems(editFormData.géneros || "").length > 0
                        ? `${
                            getSelectedItems(editFormData.géneros || "").length
                          } seleccionados`
                        : "Seleccionar géneros..."}
                      <span className="edit-spinner-arrow">▼</span>
                    </div>
                    <div className="edit-spinner-dropdown">
                      {uniqueGenres.map((genre) => {
                        const selectedGenres = getSelectedItems(
                          editFormData.géneros || ""
                        );
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <label key={genre} className="edit-spinner-option">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleItemToggle("géneros", genre, isSelected)
                              }
                            />
                            <span className="edit-option-label">
                              {translateGenre(genre)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="edit-form-field">
                  <label>Plataformas</label>
                  <div
                    className={`edit-multiselect-spinner ${
                      openDropdowns.platforms ? "open" : ""
                    }`}
                  >
                    <div
                      className="edit-spinner-display"
                      onClick={() => toggleDropdown("platforms")}
                    >
                      {getSelectedItems(editFormData.plataformas || "").length >
                      0
                        ? `${
                            getSelectedItems(editFormData.plataformas || "")
                              .length
                          } seleccionados`
                        : "Seleccionar plataformas..."}
                      <span className="edit-spinner-arrow">▼</span>
                    </div>{" "}
                    <div className="edit-spinner-dropdown">
                      {uniquePlatforms.map((platform) => {
                        const selectedPlatforms = getSelectedItems(
                          editFormData.plataformas || ""
                        );
                        const isSelected = selectedPlatforms.includes(platform);
                        return (
                          <label key={platform} className="edit-spinner-option">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleItemToggle(
                                  "plataformas",
                                  platform,
                                  isSelected
                                )
                              }
                            />
                            <span className="edit-option-label">
                              {platform}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>{" "}
              
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Desarrolladores</label>
                  <input
                    type="text"
                    className="edit-input"
                    placeholder="Separar con comas"
                    value={editFormData.desarrolladores || ""}
                    onChange={(e) =>
                      handleEditFormChange("desarrolladores", e.target.value)
                    }
                  />
                </div>
                <div className="edit-form-field">
                  <label>Publicadores</label>
                  <input
                    type="text"
                    className="edit-input"
                    placeholder="Separar con comas"
                    value={editFormData.publicadores || ""}
                    onChange={(e) =>
                      handleEditFormChange("publicadores", e.target.value)
                    }
                  />
                </div>
              </div>{" "}
              
              <div className="edit-form-field-full">
                <label>Resumen</label>
                <textarea
                  className="edit-textarea"
                  rows={6}
                  value={editFormData.resumen || ""}
                  onChange={(e) =>
                    handleEditFormChange("resumen", e.target.value)
                  }
                />
              </div>
              
              <div className="edit-form-buttons">
                <button
                  type="button"
                  className="edit-cancel-button"
                  onClick={handleCloseEditPopup}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="edit-save-button"
                  onClick={handleSaveEdit}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {showErrorPopup && (
        <div className="popup-overlay" onClick={() => setShowErrorPopup(false)}>
          <div
            className="popup-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "400px",
              textAlign: "center",
              padding: "32px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                color: "#ff4444",
                marginBottom: "16px",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                color: "#ff4444",
                marginBottom: "16px",
                fontSize: "20px",
              }}
            >
              Acceso Denegado
            </h2>
            <p
              style={{
                marginBottom: "24px",
                lineHeight: "1.5",
                color: "var(--text)",
              }}
            >
              {errorMessage}
            </p>{" "}
            <button
              className="add-recommendation-confirm"
              onClick={() => setShowErrorPopup(false)}
              style={{
                background: "#ff4444",
                width: "120px",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      
      {showAddGamePopup && (
        <div className="popup-overlay" onClick={handleCloseAddGamePopup}>
          <div
            className="popup-content popup-add-game"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-button" onClick={handleCloseAddGamePopup}>
              ✖
            </button>
            <h2 className="popup-add-title">Añadir Juego</h2>
            
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
                value={searchGameIGDB}
                onChange={(e) => setSearchGameIGDB(e.target.value)}
                autoFocus
              />
            </div>
            
            {gameIgdbLoading && (
              <p className="popup-igdb-loading">
                {gameIgdbError || "Buscando..."}
              </p>
            )}
            {gameIgdbError && !gameIgdbLoading && (
              <p className="popup-igdb-error">{gameIgdbError}</p>
            )}
            
            <div className="popup-igdb-scroll">
              {gameIgdbResults.map((game) => (
                <div
                  key={game.id}
                  className={`igdb-result${
                    selectedGameIGDB && selectedGameIGDB.id === game.id
                      ? " selected"
                      : ""
                  }`}
                  onClick={() => handleGameIGDBSelection(game)}
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
            
            {selectedGameIGDB && (
              <div className="add-game-form-section">
                <div className="edit-form-container">
                  
                  <div className="edit-form-row">
                    <div className="edit-form-field">
                      <label>Estado</label>
                      <select
                        className="edit-select"
                        value={addGameFormData.estado}
                        onChange={(e) =>
                          handleAddGameFormChange("estado", e.target.value)
                        }
                      >
                        <option value="Jugando">Jugando</option>
                        <option value="Planeo Jugar">Planeo Jugar</option>
                        <option value="Pasado">Pasado</option>
                        <option value="Dropeado">Dropeado</option>
                      </select>
                    </div>
                    <div className="edit-form-field">
                      <label>Nota ({addGameFormData.nota || "0"})</label>
                      <input
                        type="range"
                        className="edit-slider"
                        min="0"
                        max="10"
                        step="0.1"
                        value={addGameFormData.nota || "0"}
                        onChange={(e) =>
                          handleAddGameFormChange("nota", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  
                  <div className="edit-form-row">
                    <div className="edit-form-field">
                      <label>Horas</label>
                      <input
                        type="number"
                        className="edit-input"
                        min="0"
                        step="0.1"
                        value={addGameFormData.horas}
                        onChange={(e) =>
                          handleAddGameFormChange("horas", e.target.value)
                        }
                        placeholder="Ej: 15.5"
                      />
                    </div>
                    <div className="edit-form-field">
                      <label>Fecha</label>
                      <input
                        type="date"
                        className="edit-input"
                        value={addGameFormData.fecha}
                        onChange={(e) =>
                          handleAddGameFormChange("fecha", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  
                  <div className="edit-form-row">
                    <div className="edit-form-field">
                      <label>YouTube</label>
                      <input
                        type="url"
                        className="edit-input"
                        value={addGameFormData.youtube}
                        onChange={(e) =>
                          handleAddGameFormChange("youtube", e.target.value)
                        }
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="edit-form-field">
                      <label>Trailer</label>
                      <input
                        type="url"
                        className="edit-input"
                        value={addGameFormData.trailer}
                        readOnly
                        placeholder="https://youtube.com/..."
                        style={{ background: addGameFormData.trailer ? '#e9ecef' : undefined }}
                      />
                    </div>
                    <div className="edit-form-field">
                      <label>Carátula (URL)</label>
                      <input
                        type="url"
                        className="edit-input"
                        value={addGameFormData.caratula}
                        onChange={(e) =>
                          handleAddGameFormChange("caratula", e.target.value)
                        }
                        placeholder="URL de la carátula..."
                      />
                    </div>
                  </div>

                  
                  <div className="edit-form-row">
                    <div className="edit-form-field">
                      <label>Plataforma Principal</label>
                      {availableGamePlatforms.length > 0 ? (
                        <select
                          className="edit-select"
                          value={addGameFormData.plataforma}
                          onChange={(e) =>
                            handleAddGameFormChange(
                              "plataforma",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Seleccionar plataforma...</option>
                          {availableGamePlatforms.map((platform) => (
                            <option key={platform} value={platform}>
                              {platform}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="edit-input"
                          value={addGameFormData.plataforma}
                          onChange={(e) =>
                            handleAddGameFormChange(
                              "plataforma",
                              e.target.value
                            )
                          }
                          placeholder="Ej: Nintendo Switch"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}{" "}
            
            <button
              className={`add-recommendation-confirm ${
                addGameStatus.includes("Error")
                  ? "error"
                  : addGameStatus.includes("¡")
                  ? "success"
                  : addGameStatus.includes("Añadiendo")
                  ? "loading"
                  : ""
              }`}
              disabled={
                !selectedGameIGDB || addGameStatus.includes("Añadiendo")
              }
              onClick={async () => {
                if (!selectedGameIGDB) return;
                setAddGameStatus("Añadiendo...");

                try {
                  const response = await fetch("/api/add-game", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      game: selectedGameIGDB.raw,
                      formData: addGameFormData,
                    }),
                  });

                  const data = await response.json();
                  if (data.error) {
                    setAddGameStatus("Error al añadir");
                    setTimeout(() => setAddGameStatus(""), 3000);
                  } else {
                    setAddGameStatus("¡Añadido!");
                    console.log("[ADD GAME] Game added successfully, refreshing data...");
                    
                    // Esperar un momento y luego recargar datos
                    setTimeout(async () => {
                      const success = await refreshGameData("ADD GAME");
                      if (success) {
                        handleCloseAddGamePopup();
                      } else {
                        // Si falla la actualización, hacer reload como fallback
                        console.log("[ADD GAME] Fallback: doing full page reload");
                        handleCloseAddGamePopup();
                        window.location.reload();
                      }
                    }, 2000);
                  }
                } catch (error) {
                  setAddGameStatus("Error al añadir");
                  setTimeout(() => setAddGameStatus(""), 3000);
                }
              }}
            >
              {addGameStatus.includes("Añadiendo")
                ? "Añadiendo..."
                : addGameStatus.includes("¡")
                ? "¡Añadido!"
                : addGameStatus.includes("Error")
                ? "Error al añadir"
                : "Añadir al Catálogo"}{" "}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Juegos;
