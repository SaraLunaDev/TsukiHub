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
  // Estado para alternar entre Planeo Jugar y Recomendaciones
  const [planeoView, setPlaneoView] = useState("planeo jugar"); // "planeo jugar" o "recomendado"  // Estado para mapeo de usuarios (ID -> nombre)
  const [users, setUsers] = useState([]);
  // Estado para datos completos de usuarios desde UserData
  const [userDataComplete, setUserDataComplete] = useState([]);
  // Estado para el modo desarrollador
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    const saved = localStorage.getItem("developerMode");
    return saved === "true";
  }); // Estados para el popup de edición de juegos
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editFormData, setEditFormData] = useState({}); // Estado para plataformas disponibles para el spinner de plataforma
  const [availablePlatforms, setAvailablePlatforms] = useState([]);

  // DEBUG: Agregar log para verificar el estado del modo desarrollador
  useEffect(() => {
    console.log("isDeveloperMode:", isDeveloperMode);
  }, [isDeveloperMode]);

  // Escuchar cambios en el localStorage para el modo desarrollador
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("developerMode");
      setIsDeveloperMode(saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Resetea el startIndex al cambiar de vista para evitar desbordes
  useEffect(() => {
    console.log(
      "planeoView changed to:",
      planeoView,
      "resetting startIndex to 0"
    );
    setStartIndex(0);
  }, [planeoView]);

  // Debug: Log when startIndex changes
  useEffect(() => {
    console.log(
      "startIndex changed to:",
      startIndex,
      "planeoView:",
      planeoView
    );
  }, [startIndex]);

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
  }; // Obtiene el nombre de usuario a partir del ID desde UserData
  const getUserName = (userId) => {
    if (!userId) return "";

    // Normalizar el ID para comparación (convertir a string)
    const normalizedUserId = String(userId).trim();

    // Buscar en los datos completos de UserData primero
    const userFromUserData = userDataComplete.find(
      (user) => String(user.id).trim() === normalizedUserId
    );

    if (userFromUserData && userFromUserData.nombre) {
      return userFromUserData.nombre;
    }

    // Fallback al mapeo de usuarios del sheet de juegos
    const user = users.find(([id]) => String(id).trim() === normalizedUserId);
    const userName = user ? user[1] : normalizedUserId;

    return userName; // Si no encuentra el nombre, muestra el ID
  };
  // Genera un avatar por defecto con las iniciales del usuario
  const generateDefaultAvatar = (initials, userId) => {
    // Generar un color basado en el user ID para que sea consistente
    const hash = userId.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash) % 360;

    // Crear un avatar simple con SVG
    const svg = `
      <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="hsl(${hue}, 60%, 60%)"/>
        <text x="14" y="19" font-family="Arial, sans-serif" font-size="11" 
              fill="white" text-anchor="middle" font-weight="bold">${initials}</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }; // Obtiene el avatar de usuario a partir del ID desde UserData
  const getUserAvatar = (userId) => {
    if (!userId) return null;

    // Normalizar el ID para comparación (convertir a string)
    const normalizedUserId = String(userId).trim();

    // Buscar en los datos completos de UserData primero
    const userFromUserData = userDataComplete.find(
      (user) => String(user.id).trim() === normalizedUserId
    );

    if (userFromUserData && userFromUserData.pfp) {
      return userFromUserData.pfp;
    }

    // Fallback: intentar desde datos de Twitch en localStorage
    try {
      const twitchUser = JSON.parse(localStorage.getItem("twitchUser") || "{}");
      if (
        String(twitchUser.id).trim() === normalizedUserId &&
        twitchUser.image
      ) {
        return twitchUser.image;
      }
    } catch (error) {
      // Silently handle localStorage errors
    }

    // Fallback: intentar desde cache de userData de otros componentes
    try {
      const cachedUserData = localStorage.getItem("userData");
      if (cachedUserData) {
        const userData = JSON.parse(cachedUserData);
        const matchingUser = userData.find(
          (user) => String(user.id).trim() === normalizedUserId
        );
        if (matchingUser) {
          // Intentar diferentes propiedades para el avatar
          const avatar =
            matchingUser.pfp ||
            matchingUser.avatar ||
            matchingUser.image ||
            matchingUser.profilePicture;
          if (avatar) {
            return avatar;
          }
        }
      }
    } catch (error) {
      // Silently handle localStorage errors
    }

    // Generar avatar por defecto usando las iniciales del nombre de usuario
    const userName = getUserName(normalizedUserId);
    if (userName && userName !== normalizedUserId) {
      // Si tenemos un nombre real, generar avatar con iniciales
      const initials = userName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const avatarUrl = generateDefaultAvatar(initials, normalizedUserId);
      return avatarUrl;
    }

    // Si no se encuentra avatar ni nombre, retornar null
    return null;
  };

  /**
   * SISTEMA DE MAPEO DE USUARIOS:
   * - Los IDs de usuario de Twitch se almacenan en la columna P del Google Sheet
   * - Se crea un mapeo [userId, userName] para convertir IDs a nombres legibles
   * - Se intenta obtener nombres desde:
   *   1. Usuario de Twitch logueado actualmente
   *   2. Cache de userData de otros componentes
   *   3. Como fallback, se muestra el ID directamente
   * - Al hacer nuevas recomendaciones, se actualiza el mapeo automáticamente
   */

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
  }, []);

  // Configuración responsive del carrusel
  const getCarruselConfig = () => {
    if (screenWidth <= 800) {
      return { containerWidth: 660, gameWidth: 100, edgeMargin: 0 }; // +140px total (520 + 140) CSS centering only
    } else if (screenWidth <= 1100) {
      return { containerWidth: 780, gameWidth: 120, edgeMargin: 0 }; // +140px total (640 + 140) CSS centering only
    } else {
      return { containerWidth: 900, gameWidth: 140, edgeMargin: 0 }; // +140px total (760 + 140) CSS centering only
    }
  }; // Calcula los índices de los 7 juegos a mostrar, centrando el carrusel
  const getCarruselIndices = () => {
    // Usar la lista de juegos apropiada según el estado actual
    const gamesList =
      planeoView === "planeo jugar"
        ? planeoJugar
        : games.filter((g) => g.estado === "recomendado");

    if (gamesList.length === 0) return [];
    let indices = [];
    let base = startIndex;
    console.log(
      "getCarruselIndices - planeoView:",
      planeoView,
      "startIndex:",
      startIndex,
      "gamesList.length:",
      gamesList.length
    );
    // Si hay menos de 9 juegos, repite para llenar pero respeta el startIndex
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
    console.log("getCarruselIndices - calculated indices:", indices);
    return indices;
  };
  const carruselIndices = getCarruselIndices(); // Función para calcular la posición de un juego en el carrusel
  const calculateGamePosition = (
    index,
    containerWidth,
    gameWidth,
    edgeMargin
  ) => {
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
        const overlapAmount =
          (centerDistance / maxCenterDistance) * gameWidth * overlapFactor;

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

  // Carga y cachea los datos del UserData Sheet
  useEffect(() => {
    if (!userDataSheetUrl) {
      console.error("La URL del UserData Sheet no está configurada en .env");
      return;
    }

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
          headerRow.forEach((header, index) => {
            obj[header] = columns[index] || "";
          });
          return obj;
        });

        console.log(
          `[fetchUserData] Loaded ${parsedUserData.length} users from UserData`
        );
        setUserDataComplete(parsedUserData);

        // Actualizar cache en localStorage para otros componentes
        localStorage.setItem("userData", JSON.stringify(parsedUserData));
      } catch (error) {
        console.error("Error al cargar datos del UserData:", error);
      }
    };

    fetchUserData();
    // Actualizar cada 5 minutos
    const intervalId = setInterval(fetchUserData, 300000);
    return () => clearInterval(intervalId);
  }, [userDataSheetUrl]); // Carga y cachea los datos de Google Sheet con sistema de cache simplificado  // Función de hash simple compatible con Unicode
  const createSimpleHash = (data) => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  useEffect(() => {
    const sheetUrl = process.env.REACT_APP_JUEGOS_SHEET_URL;
    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    // Función simple para cargar datos desde el sheet
    const fetchGames = async () => {
      try {
        console.log("[fetchGames] Fetching data from sheet");

        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const userMap = new Map();

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
            igdbId,
            usuario,
            comentario,
          ] = row.split(",");

          // Construir mapeo de usuarios
          const trimmedUsuario = usuario?.trim();
          if (
            trimmedUsuario &&
            trimmedUsuario !== "" &&
            !userMap.has(trimmedUsuario)
          ) {
            userMap.set(trimmedUsuario, trimmedUsuario);
          }

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
            igdbId: igdbId?.trim(),
            usuario: trimmedUsuario,
            comentario: comentario?.trim(),
          };
        });
        const uniqueUsers = Array.from(userMap.entries());

        // Crear hash simple para comparar cambios (compatible con Unicode)
        const currentHash = createSimpleHash(parsedData);

        // Guardar en cache
        const cacheData = {
          games: parsedData,
          users: uniqueUsers,
          hash: currentHash,
          lastUpdate: Date.now(),
        };

        localStorage.setItem("juegosData", JSON.stringify(cacheData));

        // Actualizar estado
        setGames(parsedData);
        setUsers(uniqueUsers);

        console.log(
          `[fetchGames] Data loaded and cached - ${parsedData.length} games`
        );
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    // Cargar desde cache si existe, sino crear cache
    const loadFromCacheOrCreate = () => {
      const cachedData = localStorage.getItem("juegosData");

      if (cachedData) {
        try {
          const cache = JSON.parse(cachedData);
          if (cache.games && cache.users) {
            console.log("[loadFromCacheOrCreate] Loading from cache");
            setGames(cache.games);
            setUsers(cache.users);

            // Verificar cambios en segundo plano
            checkForUpdatesInBackground();
          } else {
            throw new Error("Invalid cache format");
          }
        } catch (error) {
          console.log("[loadFromCacheOrCreate] Cache invalid, creating new");
          localStorage.removeItem("juegosData");
          fetchGames();
        }
      } else {
        console.log("[loadFromCacheOrCreate] No cache exists, creating new");
        fetchGames();
      }
    };

    // Verificar cambios en segundo plano
    const checkForUpdatesInBackground = async () => {
      try {
        console.log("[checkForUpdatesInBackground] Checking for updates");

        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");

        const currentData = rows.slice(1).map((row) => {
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
            igdbId,
            usuario,
            comentario,
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
            igdbId: igdbId?.trim(),
            usuario: usuario?.trim(),
            comentario: comentario?.trim(),
          };
        });
        const newHash = createSimpleHash(currentData);
        const cachedData = JSON.parse(localStorage.getItem("juegosData"));

        if (cachedData.hash !== newHash) {
          console.log(
            "[checkForUpdatesInBackground] Changes detected, updating cache and data"
          );

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
        } else {
          console.log("[checkForUpdatesInBackground] No changes detected");
        }
      } catch (error) {
        console.error(
          "[checkForUpdatesInBackground] Error checking for updates:",
          error
        );
      }
    };

    loadFromCacheOrCreate();
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
    ); // Debug: Log recommended games
    const recomendados = games.filter((g) => g.estado === "recomendado");
    console.log("Total games:", games.length);
    console.log("Recommended games found:", recomendados.length);
    console.log(
      "Recommended games:",
      recomendados.map((g) => g.nombre)
    );
    console.log(
      "Recommended games with users:",
      recomendados.map((g) => ({
        nombre: g.nombre,
        usuario: g.usuario,
        igdbId: g.igdbId,
      }))
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
  const uniqueGenres = getUniqueGenres(games); // Calcula la lista única de plataformas presentes en los juegos cargados
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
  }, [pasado]); // Estado para el popup de añadir recomendación
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
    });

    // Inicializar plataformas disponibles
    setAvailablePlatforms(selectedPlatforms);

    setShowEditPopup(true);
  };
  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingGame(null);
    setEditFormData({});
    setAvailablePlatforms([]);
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

    // Si se modifican las plataformas, actualizar las plataformas disponibles
    if (field === "plataformas") {
      updateAvailablePlatforms(newValue);
    }
  };
  // Función para actualizar las plataformas disponibles para el spinner de plataforma
  const updateAvailablePlatforms = (platformsString) => {
    const selectedPlatforms = getSelectedItems(platformsString);
    setAvailablePlatforms(selectedPlatforms);

    // Si la plataforma actual no está en las plataformas seleccionadas, aplicar lógica inteligente
    const currentPlatform = editFormData.plataforma || "";
    if (currentPlatform && !selectedPlatforms.includes(currentPlatform)) {
      // Aplicar la misma lógica inteligente que en handleEditGame
      const preferredPlatforms = [
        "Wii",
        "Nintendo Switch",
        "PlayStation 5",
        "Xbox Series X/S",
        "PC",
      ];
      const newSelectedPlatform =
        preferredPlatforms.find((platform) =>
          selectedPlatforms.includes(platform)
        ) ||
        selectedPlatforms[0] ||
        "";
      handleEditFormChange("plataforma", newSelectedPlatform);
    }
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
          try {
            const response = await fetch(sheetUrl);
            const data = await response.text();
            const rows = data.split("\n");
            const userMap = new Map();

            const parsedData = rows
              .slice(1)
              .map((row) => {
                if (!row.trim()) return null; // Skip empty rows

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
                  igdbId,
                  usuario,
                  comentario,
                ] = row.split(",");

                const trimmedUsuario = usuario?.trim();
                if (
                  trimmedUsuario &&
                  trimmedUsuario !== "" &&
                  !userMap.has(trimmedUsuario)
                ) {
                  userMap.set(trimmedUsuario, trimmedUsuario);
                }

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
                  igdbId: igdbId?.trim(),
                  usuario: trimmedUsuario,
                  comentario: comentario?.trim(),
                };
              })
              .filter((game) => game !== null);
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

            console.log(
              `[handleSaveEdit] Successfully refreshed data - ${parsedData.length} games loaded`
            );
          } catch (error) {
            console.error("[handleSaveEdit] Error refreshing data:", error);
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
  }; // Función para exponer gestión de cache (útil para debugging)
  window.debugJuegosCache = {
    clear: () => {
      console.log("[DEBUG] Clearing games cache");
      localStorage.removeItem("juegosData");
      window.location.reload();
    },
    info: () => {
      const cached = localStorage.getItem("juegosData");
      console.log("[DEBUG] Cache info:", {
        hasCachedData: !!cached,
        lastUpdate: cached ? JSON.parse(cached).lastUpdate : "Never",
        cacheSize: cached ? (cached.length / 1024).toFixed(2) + " KB" : "0 KB",
        gamesCount: games.length,
        usersCount: users.length,
      });
    },
    forceRefresh: () => {
      console.log("[DEBUG] Forcing cache refresh");
      localStorage.removeItem("juegosData");
      window.location.reload();
    },
  };

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
                    )}{" "}
                    {selectedGame.fecha && (
                      <p>
                        <strong>📅 </strong> {selectedGame.fecha}
                      </p>
                    )}
                    {/* Mostrar comentario del recomendador si existe */}
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
                  {/* Columna de metadatos */}
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
            {/* Campo de comentario - solo visible si hay un juego seleccionado */}
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
            )}
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
                if (!twitchUser || !twitchUser.id) {
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
                      user: twitchUser.id,
                      game: selectedIGDB.raw,
                      comment: commentText.trim(), // Enviar comentario
                    }),
                  });
                  const data = await res.json();
                  if (data.error) {
                    setAddStatus("Error al añadir recomendación");
                  } else {
                    setAddStatus("¡Recomendación añadida!");

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
            )}{" "}
          </div>
        </div>
      )}

      {/* Popup para editar juego */}
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
              {/* Primera fila: Nombre y Estado */}
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
              {/* Segunda fila: Nota y Horas */}
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
              {/* Tercera fila: Fecha */}
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
              {/* Cuarta fila: URL de YouTube */}
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
              {/* Quinta fila: Carátula */}
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
              {/* Spinner de Plataforma (selección única) */}
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
              {/* Sexta fila: Géneros y Plataformas */}
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
                    </div>
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
              {/* Séptima fila: Desarrolladores y Publicadores */}
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
              {/* Resumen */}
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
              {/* Botones */}
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

      {/* Popup de error de validación */}
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

      {/* Popup para añadir juego (desarrolladores) */}
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

            {/* Búsqueda IGDB */}
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

            {/* Estados de carga y error */}
            {gameIgdbLoading && (
              <p className="popup-igdb-loading">
                {gameIgdbError || "Buscando..."}
              </p>
            )}
            {gameIgdbError && !gameIgdbLoading && (
              <p className="popup-igdb-error">{gameIgdbError}</p>
            )}

            {/* Resultados IGDB */}
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
            {/* Formulario de datos adicionales - solo visible si hay un juego seleccionado */}
            {selectedGameIGDB && (
              <div className="add-game-form-section">
                <div className="edit-form-container">
                  {/* Primera fila: Estado y Nota */}
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

                  {/* Segunda fila: Horas y Fecha */}
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

                  {/* Tercera fila: YouTube y Carátula */}
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

                  {/* Cuarta fila: Plataforma Principal */}
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
            )}

            {/* Botón de confirmación */}
            <button
              className="add-recommendation-confirm"
              disabled={!selectedGameIGDB}
              onClick={async () => {
                if (!selectedGameIGDB) return;
                setAddGameStatus("");
                setAddGameStatus("Añadiendo juego...");

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
                    setAddGameStatus("Error al añadir juego");
                  } else {
                    setAddGameStatus("¡Juego añadido al catálogo!");
                    // Recargar datos después de 2 segundos
                    setTimeout(() => {
                      handleCloseAddGamePopup();
                      window.location.reload();
                    }, 2000);
                  }
                } catch (error) {
                  setAddGameStatus("Error al añadir juego");
                }
              }}
            >
              Añadir al Catálogo
            </button>

            {/* Estado de la operación */}
            {addGameStatus && (
              <div
                className={
                  "popup-add-status " +
                  (addGameStatus.startsWith("¡") ? "success" : "error")
                }
              >
                {addGameStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Juegos;
