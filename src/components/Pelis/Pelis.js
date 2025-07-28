import React, { useState, useEffect } from "react";
import "./Pelis.css";

function Pelis() {
  // --- UserData para mostrar nombre de recomendador ---
  const [userDataComplete, setUserDataComplete] = useState([]);
  useEffect(() => {
    const userDataSheetUrl = process.env.REACT_APP_USERDATA_SHEET_URL;
    if (!userDataSheetUrl) return;
    const fetchUserData = async () => {
      try {
        const response = await fetch(userDataSheetUrl);
        const text = await response.text();
        const rows = text.split("\n").slice(1).filter(Boolean);
        const users = rows.map(row => {
          const cols = row.split(",");
          return { id: cols[0]?.trim(), nombre: cols[1]?.trim() };
        });
        setUserDataComplete(users);
      } catch {}
    };
    fetchUserData();
  }, []);

  function getUserName(userId) {
    if (!userId) return "";
    const user = userDataComplete.find(u => u.id === userId);
    return user ? user.nombre : userId;
  }
  // Estados principales para películas/series
  const [movies, setMovies] = useState([]);
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const moviesPerPage = 18;
  // Estado para el reproductor de YouTube en hover
  const [showTrailerPlayer, setShowTrailerPlayer] = useState(false);
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    pasado: "date-desc", // Filtro por defecto: fecha descendente
  });
  // Estados para filtros avanzados
  const [selectedGenre, setSelectedGenre] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filteredMoviesAdvanced, setFilteredMoviesAdvanced] = useState([]);  // Estados para edición de películas
  const [editingMovie, setEditingMovie] = useState(null);
  const [showEditMoviePopup, setShowEditMoviePopup] = useState(false);
  const [editMovieFormData, setEditMovieFormData] = useState({});

  // Estados para el popup de añadir película/serie
  const [showAddMoviePopup, setShowAddMoviePopup] = useState(false);
  const [searchMovieTMDB, setSearchMovieTMDB] = useState("");
  const [selectedMovieTMDB, setSelectedMovieTMDB] = useState(null);
  const [movieTmdbResults, setMovieTmdbResults] = useState([]);
  const [addMovieStatus, setAddMovieStatus] = useState("");
  const [addMovieFormData, setAddMovieFormData] = useState({
    estado: "Planeo Ver",
    fecha: "",
    url: "",
    caratula: "",
    nota_chat: "",
  });

  // Estado para el modo desarrollador
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    const saved = localStorage.getItem("developerMode");
    return saved === "true";
  });

  // --- Carrusel de Planeo Ver ---
  const [planeoStartIndex, setPlaneoStartIndex] = useState(0);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Configuración responsive del carrusel
  const getCarruselConfig = () => {
    if (screenWidth <= 800) {
      return { containerWidth: 660, itemWidth: 100, edgeMargin: 0 };
    } else if (screenWidth <= 1100) {
      return { containerWidth: 780, itemWidth: 120, edgeMargin: 0 };
    } else {
      return { containerWidth: 900, itemWidth: 140, edgeMargin: 0 };
    }
  };


  // Estado para el pivote del carrusel
  const [planeoView, setPlaneoView] = useState("planeo ver");

  // Películas con estado "planeo ver"
  const planeoVerMovies = movies.filter(
    (m) => m.estado && m.estado.trim().toLowerCase() === "planeo ver"
  );
  // Películas con estado "recomendado"
  const recomendadoMovies = movies.filter(
    (m) => m.estado && m.estado.trim().toLowerCase() === "recomendado"
  );

  // Constantes del carrusel
  const CARRUSEL_SIZE = 9;
  const CENTER_INDEX = Math.floor(CARRUSEL_SIZE / 2);

  // Calcula los índices de los elementos a mostrar en el carrusel
  const getCarruselIndices = () => {
    if (planeoVerMovies.length === 0) return [];
    let indices = [];
    let base = planeoStartIndex;
    if (planeoVerMovies.length < CARRUSEL_SIZE) {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % planeoVerMovies.length;
        if (idx < 0) idx += planeoVerMovies.length;
        indices.push(idx);
      }
    } else {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % planeoVerMovies.length;
        if (idx < 0) idx += planeoVerMovies.length;
        indices.push(idx);
      }
    }
    return indices;
  };
  const carruselIndices = getCarruselIndices();

  // Calcula la posición de cada elemento
  const calculateItemPosition = (index, containerWidth, itemWidth, edgeMargin) => {
    if (CARRUSEL_SIZE === 1) {
      return (containerWidth - itemWidth) / 2;
    }
    const totalAvailableWidth = containerWidth - 2 * edgeMargin - itemWidth;
    const baseSpacing = totalAvailableWidth / (CARRUSEL_SIZE - 1);
    if (index === 0) {
      return edgeMargin;
    } else if (index === CARRUSEL_SIZE - 1) {
      return containerWidth - edgeMargin - itemWidth;
    } else {
      const centerDistance = Math.abs(index - CENTER_INDEX);
      const maxCenterDistance = Math.floor(CENTER_INDEX);
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
      // Superposición para carruseles grandes
      if (CARRUSEL_SIZE > 7) {
        const overlapFactor = Math.min((CARRUSEL_SIZE - 7) * 0.08, 0.4);
        const overlapAmount = (centerDistance / maxCenterDistance) * itemWidth * overlapFactor;
        if (index < CENTER_INDEX) {
          position += overlapAmount;
        } else if (index > CENTER_INDEX) {
          position -= overlapAmount;
        }
      }
      return position;
    }
  };

  // Navegación del carrusel
  const handleNext = () => {
    if (!planeoVerMovies.length) return;
    setPlaneoStartIndex((prev) => (prev + 1) % planeoVerMovies.length);
  };
  const handlePrevious = () => {
    if (!planeoVerMovies.length) return;
    setPlaneoStartIndex((prev) => (prev - 1 + planeoVerMovies.length) % planeoVerMovies.length);
  };
  // URL del Google Sheet (debe estar en .env)
  const sheetUrl = process.env.REACT_APP_PELIS_SHEET_URL;

  // Función de hash simple compatible con Unicode
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

  // Función para obtener géneros únicos de las películas cargadas
  const getUniqueGenres = (moviesList) => {
    const genreSet = new Set();
    moviesList.forEach((movie) => {
      if (movie.generos) {
        movie.generos.split(",").forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    return Array.from(genreSet).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  };

  const uniqueGenres = getUniqueGenres(movies);

  // Cargar datos al montar el componente con sistema de cache
  useEffect(() => {
    if (!sheetUrl) {
      console.error(
        "La URL del Google Sheet de películas no está configurada en .env"
      );
      return;
    }

    // Función simple para cargar datos desde el sheet
    const fetchMovies = async () => {
      try {
        console.log("[fetchMovies] Fetching data from sheet");

        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");

        const parsedData = rows
          .slice(1)
          .map((row) => {
            if (!row.trim()) return null; // Skip empty rows

            const [
              titulo,
              titulo_original,
              tipo,
              estado,
              fecha_vista,
              trailer,
              url,
              caratula,
              imagen,
              duracion,
              fecha_salida,
              director,
              generos, // Nueva columna M
              sinopsis,
              nota,
              usuario,
              comentario,
              nota_chat,
            ] = row.split(",");

            return {
              nombre: titulo?.trim(),
              titulo_original: titulo_original?.trim(),
              tipo: tipo?.trim(),
              estado: estado?.trim().toLowerCase(),
              fecha: fecha_vista?.trim(),
              trailer: trailer?.trim(),
              url: url?.trim(),
              caratula: caratula?.trim(),
              imagen: imagen?.trim(),
              duracion: duracion?.trim(),
              fecha_lanzamiento: fecha_salida?.trim(),
              director: director?.trim(),
              generos: generos?.trim(), // Nueva propiedad
              resumen: sinopsis?.trim(),
              nota: nota?.trim(),
              usuario: usuario?.trim(),
              comentario: comentario?.trim(),
              nota_chat: nota_chat?.trim(),
            };
          })
          .filter((movie) => movie !== null);

        // Crear hash simple para comparar cambios
        const currentHash = createSimpleHash(parsedData);

        // Guardar en cache
        const cacheData = {
          movies: parsedData,
          hash: currentHash,
          lastUpdate: Date.now(),
        };

        localStorage.setItem("pelisData", JSON.stringify(cacheData));

        // Actualizar estado
        setMovies(parsedData);

        console.log(
          `[fetchMovies] Data loaded and cached - ${parsedData.length} movies/series`
        );
      } catch (error) {
        console.error("Error al cargar los datos de películas:", error);
      }
    };

    // Cargar desde cache si existe, sino crear cache
    const loadFromCacheOrCreate = () => {
      const cachedData = localStorage.getItem("pelisData");

      if (cachedData) {
        try {
          const cache = JSON.parse(cachedData);
          if (cache.movies) {
            console.log("[loadFromCacheOrCreate] Loading from cache");
            setMovies(cache.movies);

            // Verificar cambios en segundo plano
            checkForUpdatesInBackground();
          } else {
            throw new Error("Invalid cache format");
          }
        } catch (error) {
          console.log("[loadFromCacheOrCreate] Cache invalid, creating new");
          localStorage.removeItem("pelisData");
          fetchMovies();
        }
      } else {
        console.log("[loadFromCacheOrCreate] No cache exists, creating new");
        fetchMovies();
      }
    };

    // Verificar cambios en segundo plano
    const checkForUpdatesInBackground = async () => {
      try {
        console.log("[checkForUpdatesInBackground] Checking for updates");

        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split("\n");
        const currentData = rows
          .slice(1)
          .map((row) => {
            if (!row.trim()) return null;

            const [
              titulo,
              titulo_original,
              tipo,
              estado,
              fecha_vista,
              trailer,
              url,
              caratula,
              imagen,
              duracion,
              fecha_salida,
              director,
              generos, // Nueva columna M en handleAddMovie
              sinopsis,
              nota,
              usuario,
              comentario,
              nota_chat,
            ] = row.split(",");

            return {
              nombre: titulo?.trim(),
              titulo_original: titulo_original?.trim(),
              tipo: tipo?.trim(),
              estado: estado?.trim().toLowerCase(),
              fecha: fecha_vista?.trim(),
              trailer: trailer?.trim(),
              url: url?.trim(),
              caratula: caratula?.trim(),
              imagen: imagen?.trim(),
              duracion: duracion?.trim(),
              fecha_lanzamiento: fecha_salida?.trim(),
              director: director?.trim(),
              generos: generos?.trim(), // Nueva propiedad
              resumen: sinopsis?.trim(),
              nota: nota?.trim(),
              usuario: usuario?.trim(),
              comentario: comentario?.trim(),
              nota_chat: nota_chat?.trim(),
            };
          })
          .filter((movie) => movie !== null);

        const newHash = createSimpleHash(currentData);
        const cachedData = JSON.parse(localStorage.getItem("pelisData"));
        if (cachedData.hash !== newHash) {
          console.log(
            "[checkForUpdatesInBackground] Changes detected, updating cache and data"
          );

          const updatedCache = {
            movies: currentData.map((movie) => ({
              ...movie,
              generos: movie.generos || "", // Asegurar que generos existe
            })),
            hash: newHash,
            lastUpdate: Date.now(),
          };

          localStorage.setItem("pelisData", JSON.stringify(updatedCache));
          setMovies(currentData);
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
  }, [sheetUrl]); // Filtrar películas/series vistas cuando cambien los datos
  useEffect(() => {
    console.log("[Movies Debug] Total movies:", movies.length);
    console.log("[Movies Debug] Movies data:", movies);

    let watched = movies.filter((movie) => movie.estado === "visto");
    console.log(
      "[Movies Debug] Watched movies before filters:",
      watched.length
    ); // Aplicar filtro de búsqueda
    if (searchQuery.trim()) {
      watched = watched.filter((movie) =>
        movie.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Aplicar filtro de ordenamiento
    switch (activeFilters.pasado) {
      case "name-asc":
      case "name-desc":
        watched = sortByName(watched, activeFilters.pasado === "name-asc");
        break;
      case "date-asc":
      case "date-desc":
        watched = sortByDate(watched, activeFilters.pasado === "date-asc");
        break;
      case "rating-asc":
      case "rating-desc":
        watched = sortByRating(watched, activeFilters.pasado === "rating-asc");
        break;
      case "duration-asc":
      case "duration-desc":
        watched = sortByDuration(
          watched,
          activeFilters.pasado === "duration-asc"
        );
        break;
      default:
        // Por defecto: fecha descendente
        watched = sortByDate(watched, false);
        break;
    }
    console.log("[Movies Debug] Watched movies after filters:", watched.length);
    setWatchedMovies(watched);
  }, [movies, searchQuery, activeFilters.pasado]);

  // Filtros avanzados aplicados sobre watchedMovies
  useEffect(() => {
    let filtered = [...watchedMovies];

    // Filtro por género
    if (selectedGenre) {
      filtered = filtered.filter((movie) => {
        if (!movie.generos) return false;
        return movie.generos
          .split(",")
          .map((g) => g.trim().toLowerCase())
          .includes(selectedGenre.trim().toLowerCase());
      });
    }

    // Filtro por rango de fechas
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      filtered = filtered.filter((movie) => {
        if (!movie.fecha) return false;
        const [d, m, y] = movie.fecha.split("/").map(Number);
        const movieDate = new Date(y, m - 1, d);
        return movieDate >= from && movieDate <= to;
      });
    }

    setFilteredMoviesAdvanced(filtered);
    setCurrentPage(1); // Reset página al cambiar filtros
  }, [watchedMovies, selectedGenre, dateFrom, dateTo]);

  // Calcular fechas mínima y máxima de las películas vistas
  useEffect(() => {
    if (watchedMovies.length === 0) return;
    // Encuentra la fecha más antigua y la más reciente
    const fechas = watchedMovies
      .map((m) => m.fecha)
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
  }, [watchedMovies]);

  // Manejar click en una película/serie para mostrar el popup
  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
  };
  // Cerrar el popup de detalles
  const closeMoviePopup = () => {
    setSelectedMovie(null);
    setShowTrailerPlayer(false); // Resetear el estado del reproductor
  };

  // Función auxiliar para limpiar los separadores -%-
  const cleanSeparators = (str) => {
    return str ? str.replace(/-%-/g, ", ") : "";
  };

  // Función para convertir fecha DD/MM/YYYY a formato ISO
  const convertDateToISO = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return dateString;
  };
  // Función para manejar la edición de películas
  const handleEditMovie = (movie) => {
    setEditingMovie(movie);
    
    setEditMovieFormData({
      nombre: movie.nombre || "",
      titulo_original: movie.titulo_original || "",
      tipo: movie.tipo || "Película",
      estado: movie.estado || "",
      fecha: convertDateToISO(movie.fecha || ""),
      trailer: movie.trailer || "",
      url: movie.url || "",
      caratula: movie.caratula || "",
      imagen_fondo: movie.imagen_fondo || "",
      duracion: movie.duracion || "",
      fecha_lanzamiento: convertDateToISO(movie.fecha_lanzamiento || ""),
      director: movie.director || "",
      genero: cleanSeparators(movie.genero || ""),
      resumen: cleanSeparators(movie.resumen || ""),
      nota_tmdb: movie.nota_tmdb || "",
      usuario: movie.usuario || "",
      comentario: cleanSeparators(movie.comentario || ""),
      nota_chat: movie.nota_chat || "",
      // Campos para identificación única de la fila
      originalNombre: movie.nombre || "",
      originalEstado: movie.estado || "",
      originalFecha: movie.fecha || "",
      originalUsuario: movie.usuario || "",
    });

    setShowEditMoviePopup(true);
  };
  // Función para cerrar el popup de edición
  const handleCloseEditMoviePopup = () => {
    setShowEditMoviePopup(false);
    setEditingMovie(null);
    setEditMovieFormData({});
  };

  // Función para manejar cambios en el formulario de edición
  const handleEditMovieFormChange = (field, value) => {
    setEditMovieFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calcular películas paginadas (usando filtros avanzados si están activos)
  const moviesToPaginate =
    filteredMoviesAdvanced.length > 0 || selectedGenre || (dateFrom && dateTo)
      ? filteredMoviesAdvanced
      : watchedMovies;

  const paginatedMovies = moviesToPaginate.slice(
    (currentPage - 1) * moviesPerPage,
    currentPage * moviesPerPage
  );

  // Calcular número total de páginas
  const totalPages = Math.ceil(moviesToPaginate.length / moviesPerPage);

  // Escuchar cambios en el localStorage para el modo desarrollador
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("developerMode");
      setIsDeveloperMode(saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Escuchar evento de la navbar para abrir el popup de añadir película/serie
  useEffect(() => {
    const handleOpenAddMoviePopup = () => {
      if (isDeveloperMode) {
        setShowAddMoviePopup(true);
      }
    };

    window.addEventListener("openAddMoviePopup", handleOpenAddMoviePopup);
    return () => {
      window.removeEventListener("openAddMoviePopup", handleOpenAddMoviePopup);
    };
  }, [isDeveloperMode]);

  // Función para cerrar el popup de añadir película/serie y limpiar estados
  const handleCloseAddMoviePopup = () => {
    setShowAddMoviePopup(false);
    setSearchMovieTMDB("");
    setSelectedMovieTMDB(null);
    setMovieTmdbResults([]);
    setAddMovieStatus("");
    setAddMovieFormData({
      estado: "Planeo Ver",
      fecha: "",
      url: "",
      caratula: "",
      nota_chat: "",
    });
  };

  // Manejar cambios en el formulario de añadir película/serie
  const handleAddMovieFormChange = (field, value) => {
    setAddMovieFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Función para manejar la selección de una película/serie de TMDB
  const handleMovieTMDBSelection = (content) => {
    setSelectedMovieTMDB(content);

    // Poblar fecha de hoy y URL de carátula de TMDB
    const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

    setAddMovieFormData((prev) => ({
      ...prev,
      fecha: today,
      caratula: content.poster_path || "",
    }));
  };

  // Buscar en TMDB cuando cambia el término de búsqueda
  useEffect(() => {
    const searchTMDB = async () => {
      if (!searchMovieTMDB.trim() || !showAddMoviePopup) {
        setMovieTmdbResults([]);
        return;
      }

      try {
        const response = await fetch("/api/tmdb-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchMovieTMDB,
            type: "multi", // Buscar películas y series
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMovieTmdbResults(data.results || []);
        } else {
          console.error("Error en búsqueda TMDB");
          setMovieTmdbResults([]);
        }
      } catch (error) {
        console.error("Error al buscar en TMDB:", error);
        setMovieTmdbResults([]);
      }
    };

    const timeoutId = setTimeout(searchTMDB, 300);
    return () => clearTimeout(timeoutId);
  }, [searchMovieTMDB, showAddMoviePopup]);

  // Función para obtener el texto del botón según el estado
  const getAddButtonText = () => {
    if (!selectedMovieTMDB) return "Selecciona contenido";

    const contentType =
      selectedMovieTMDB?.media_type === "movie" ? "Película" : "Serie";

    switch (addMovieStatus) {
      case "adding":
        return `Añadiendo ${contentType}...`;
      case "success":
        return `✓ ${contentType} Añadida`;
      case "error":
        return `Error al añadir ${contentType}`;
      default:
        return `Añadir ${contentType}`;
    }
  };

  const handleAddMovie = async () => {
    if (!selectedMovieTMDB) {
      setAddMovieStatus("error");
      return;
    }

    setAddMovieStatus("adding");

    try {
      const response = await fetch("/api/add-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectedMovieTMDB,
          formData: addMovieFormData,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setAddMovieStatus("success");

        // Invalidar cache y refrescar datos
        console.log("[handleAddMovie] Forcing immediate data refresh");
        localStorage.removeItem("pelisData");

        try {
          const refreshResponse = await fetch(sheetUrl);
          const refreshData = await refreshResponse.text();
          const refreshRows = refreshData.split("\n");
          const parsedData = refreshRows
            .slice(1)
            .map((row) => {
              if (!row.trim()) return null;

              const [
                titulo,
                titulo_original,
                tipo,
                estado,
                fecha_vista,
                trailer,
                url,
                caratula,
                imagen,
                duracion,
                fecha_salida,
                director,
                generos, // Nueva columna M en handleAddMovie
                sinopsis,
                nota,
                usuario,
                comentario,
                nota_chat,
              ] = row.split(",");

              return {
                nombre: titulo?.trim(),
                titulo_original: titulo_original?.trim(),
                tipo: tipo?.trim(),
                estado: estado?.trim().toLowerCase(),
                fecha: fecha_vista?.trim(),
                trailer: trailer?.trim(),
                url: url?.trim(),
                caratula: caratula?.trim(),
                imagen: imagen?.trim(),
                duracion: duracion?.trim(),
                fecha_lanzamiento: fecha_salida?.trim(),
                director: director?.trim(),
                resumen: sinopsis?.trim(),
                nota: nota?.trim(),
                usuario: usuario?.trim(),
                comentario: comentario?.trim(),
                nota_chat: nota_chat?.trim(),
              };
            })
            .filter((movie) => movie !== null);

          const currentHash = createSimpleHash(parsedData);
          const cacheData = {
            movies: parsedData,
            hash: currentHash,
            lastUpdate: Date.now(),
          };

          localStorage.setItem("pelisData", JSON.stringify(cacheData));
          setMovies(parsedData);

          console.log(
            `[handleAddMovie] Successfully refreshed data - ${parsedData.length} movies loaded`
          );
        } catch (error) {
          console.error("[handleAddMovie] Error refreshing data:", error);
        }

        setTimeout(handleCloseAddMoviePopup, 2000);
      } else {
        const error = await response.json();
        setAddMovieStatus("error");
      }
    } catch (error) {
      console.error("Error al añadir:", error);
      setAddMovieStatus("error");
    }
  };

  // Funciones de ordenamiento para películas/series
  const sortByName = (list, ascending = true) => {
    return [...list].sort((a, b) =>
      ascending
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    );
  };

  const sortByDate = (list, ascending = true) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
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

  const sortByRating = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const ratingA = parseFloat(a.nota_chat) || 0;
      const ratingB = parseFloat(b.nota_chat) || 0;
      return ascending ? ratingA - ratingB : ratingB - ratingA;
    });
  };

  const sortByDuration = (list, ascending = true) => {
    return [...list].sort((a, b) => {
      const durationA = parseFloat(a.duracion) || 0;
      const durationB = parseFloat(b.duracion) || 0;
      return ascending ? durationA - durationB : durationB - durationA;
    });
  };
  // Aplica el filtro seleccionado a la lista de películas vistas
  const handleFilter = (filterType) => {
    setActiveFilters((prev) => ({ ...prev, pasado: filterType }));
    setCurrentPage(1);
  };
  // Alterna el filtro activo
  const handleFilterToggle = (type) => {
    let filterType;

    // Obtener la dirección actual (asc/desc)
    const currentDirection = activeFilters.pasado.includes("-asc")
      ? "asc"
      : "desc";

    switch (type) {
      case "name":
        // Si ya está activo el filtro de nombre, alternar dirección
        if (activeFilters.pasado.includes("name")) {
          filterType =
            activeFilters.pasado === "name-asc" ? "name-desc" : "name-asc";
        } else {
          // Si no está activo, usar la dirección actual
          filterType = `name-${currentDirection}`;
        }
        break;
      case "date":
        // Si ya está activo el filtro de fecha, alternar dirección
        if (activeFilters.pasado.includes("date")) {
          filterType =
            activeFilters.pasado === "date-asc" ? "date-desc" : "date-asc";
        } else {
          // Si no está activo, usar la dirección actual
          filterType = `date-${currentDirection}`;
        }
        break;
      case "rating":
        // Si ya está activo el filtro de nota, alternar dirección
        if (activeFilters.pasado.includes("rating")) {
          filterType =
            activeFilters.pasado === "rating-asc"
              ? "rating-desc"
              : "rating-asc";
        } else {
          // Si no está activo, usar la dirección actual
          filterType = `rating-${currentDirection}`;
        }
        break;
      case "duration":
        // Si ya está activo el filtro de duración, alternar dirección
        if (activeFilters.pasado.includes("duration")) {
          filterType =
            activeFilters.pasado === "duration-asc"
              ? "duration-desc"
              : "duration-asc";
        } else {
          // Si no está activo, usar la dirección actual
          filterType = `duration-${currentDirection}`;
        }
        break;
      default:
        return;
    }
    handleFilter(filterType);
  };
  // Exponer funciones de debug para cache management (solo en desarrollo)
  if (typeof window !== "undefined") {
    window.pelisDebug = {
      getCacheInfo: () => {
        const cached = localStorage.getItem("pelisData");
        console.log("=== PELIS CACHE INFO ===");
        console.log({
          hasCachedData: !!cached,
          lastUpdate: cached ? JSON.parse(cached).lastUpdate : "Never",
          cacheSize: cached
            ? (cached.length / 1024).toFixed(2) + " KB"
            : "0 KB",
          moviesCount: movies.length,
        });
      },
      forceRefresh: () => {
        console.log("[DEBUG] Forcing cache refresh");
        localStorage.removeItem("pelisData");
        window.location.reload();
      },
    };
  }

  // Función para extraer el ID de YouTube de una URL
  const extractYouTubeID = (url) => {
    if (!url) return null;

    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    return match && match[2].length === 11 ? match[2] : null;
  };

  // Función para verificar si una URL de YouTube es válida
  const isValidYouTubeURL = (url) => {
    return url && extractYouTubeID(url) !== null;
  };


  // Estado para el carrusel de Próximamente (debe ir fuera del render)
  const [proxStartIndex, setProxStartIndex] = React.useState(0);

  // Películas con estado "proximamente"
  const proximamenteMovies = movies.filter(
    (m) => m.estado && m.estado.trim().toLowerCase() === "proximamente"
  );

  // Carrusel de Próximamente
  const proxCarruselIndices = (() => {
    if (proximamenteMovies.length === 0) return [];
    let indices = [];
    let base = proxStartIndex;
    if (proximamenteMovies.length < CARRUSEL_SIZE) {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % proximamenteMovies.length;
        if (idx < 0) idx += proximamenteMovies.length;
        indices.push(idx);
      }
    } else {
      for (let i = 0; i < CARRUSEL_SIZE; i++) {
        let idx = (base + i) % proximamenteMovies.length;
        if (idx < 0) idx += proximamenteMovies.length;
        indices.push(idx);
      }
    }
    return indices;
  })();
  const handleProxNext = () => {
    if (!proximamenteMovies.length) return;
    setProxStartIndex((prev) => (prev + 1) % proximamenteMovies.length);
  };
  const handleProxPrevious = () => {
    if (!proximamenteMovies.length) return;
    setProxStartIndex((prev) => (prev - 1 + proximamenteMovies.length) % proximamenteMovies.length);
  };

  // Estado para el popup de recomendar
  const [showRecommendPopup, setShowRecommendPopup] = useState(false);
  const [recommendSearch, setRecommendSearch] = useState("");
  const [recommendResults, setRecommendResults] = useState([]);
  const [selectedRecommend, setSelectedRecommend] = useState(null);
  const [recommendComment, setRecommendComment] = useState("");
  const [recommendStatus, setRecommendStatus] = useState("");

  // Estado para animación de puntos en 'Cargando...'
  const [loadingDots, setLoadingDots] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Animación de puntos suspensivos
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setLoadingDots((dots) => (dots + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Buscar pelis/series en TMDB para recomendar
  useEffect(() => {
    if (!showRecommendPopup || !recommendSearch.trim()) {
      setRecommendResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const searchTMDB = async () => {
      try {
        const response = await fetch("/api/tmdb-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: recommendSearch, type: "multi" }),
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendResults(data.results || []);
        } else {
          setRecommendResults([]);
        }
      } catch {
        setRecommendResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(searchTMDB, 300);
    return () => clearTimeout(timeoutId);
  }, [recommendSearch, showRecommendPopup]);

  // Validar usuario antes de recomendar
  const isUserValid = (() => {
    let twitchUser = null;
    try {
      twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
    } catch {}
    return twitchUser && twitchUser.id && twitchUser.name;
  })();

  // Manejar submit de recomendación
  const handleRecommend = async () => {
    if (!selectedRecommend || !recommendComment.trim() || !isUserValid) {
      setRecommendStatus("error");
      return;
    }
    let twitchUser = null;
    try {
      twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
    } catch {}
    if (!twitchUser || !twitchUser.id) {
      setRecommendStatus("error");
      return;
    }
    setRecommendStatus("adding");
    try {
      const response = await fetch("/api/add-movie-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie: selectedRecommend,
          userId: twitchUser.id,
          userName: twitchUser.name,
          comentario: recommendComment,
        }),
      });
      if (response.ok) {
        setRecommendStatus("success");
        setTimeout(() => {
          setShowRecommendPopup(false);
          setSelectedRecommend(null);
          setRecommendComment("");
          setRecommendStatus("");
          setRecommendSearch("");
        }, 1200);
      } else {
        setRecommendStatus("error");
      }
    } catch {
      setRecommendStatus("error");
    }
  };

  return (
    <div className="pelis-container">
      <div className="categories-row">
        <section className="category-proximamente">
          <h2 className="header-juegos">Próximamente</h2>
          <ul>
            {proximamenteMovies.map((movie, index) => (
              <li key={index}>
                <div className="cover-wrapper">
                  {movie.caratula && (
                    <>
                      <img
                        src={movie.caratula}
                        alt={`Carátula de ${movie.nombre}`}
                        className="game-cover"
                        onError={e => {
                          e.target.src = "/static/resources/default_cover.png";
                        }}
                      />
                      <div className="cover-gradient"></div>
                    </>
                  )}
                </div>
                <strong
                  onClick={() => handleMovieClick(movie)}
                  style={{ cursor: "pointer" }}
                >
                  {movie.nombre}
                </strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="category-planeo-ver">
          <div className="category-header">
            <div className="header-spacer" />
            <h2
              className="header-juegos toggle-header-btn"
              style={{ flex: 1, textAlign: "center", margin: 0, cursor: "pointer", userSelect: "none" }}
              onClick={() => setPlaneoView((prev) => prev === "planeo ver" ? "recomendado" : "planeo ver")}
              title={planeoView === "planeo ver" ? "Ver Recomendaciones" : "Ver Planeo Ver"}
            >
              {planeoView === "planeo ver" ? "Planeo Ver" : "Recomendaciones"}
            </h2>
            {planeoView === "recomendado" ? (() => {
              let twitchUser = null;
              try {
                twitchUser = JSON.parse(localStorage.getItem("twitchUser"));
              } catch {}
              if (twitchUser && twitchUser.name) {
                return (
                  <button
                    className="add-recommendation-button"
                    style={{ width: 140, minWidth: 140, maxWidth: 140 }}
                    onClick={() => setShowRecommendPopup(true)}
                  >
                    + Recomendar
                  </button>
                );
              } else {
                // Espaciador igual al ancho del botón
                return <div className="header-spacer" style={{ width: 140, minWidth: 140, maxWidth: 140 }} />;
              }
            })() : <div className="header-spacer" style={{ width: 140, minWidth: 140, maxWidth: 140 }} />}
          </div>
          <div className="planeo-ver-carrusel-container">
            <button
              onClick={handlePrevious}
              className="arrow-button"
              aria-label="Anterior"
              style={{ position: "relative", zIndex: 2 }}
            >
              ◀︎
            </button>
            <ul className="planeo-ver-carrusel-list">
              {(planeoView === "planeo ver"
                ? carruselIndices
                : (() => {
                    // Carrusel para recomendaciones
                    const recLength = recomendadoMovies.length;
                    let indices = [];
                    let base = planeoStartIndex;
                    for (let i = 0; i < CARRUSEL_SIZE; i++) {
                      if (recLength === 0) continue;
                      let idx = (base + i) % recLength;
                      if (idx < 0) idx += recLength;
                      indices.push(idx);
                    }
                    return indices;
                  })()
              ).map((movieIdx, i) => {
                const movie = planeoView === "planeo ver"
                  ? planeoVerMovies.length > 0 ? planeoVerMovies[movieIdx % planeoVerMovies.length] : null
                  : recomendadoMovies.length > 0 ? recomendadoMovies[movieIdx % recomendadoMovies.length] : null;
                if (!movie) return null;
                const distance = Math.abs(i - CENTER_INDEX);
                const { containerWidth, itemWidth, edgeMargin } = getCarruselConfig();
                const position = calculateItemPosition(i, containerWidth, itemWidth, edgeMargin);
                const maxDistance = Math.floor(CENTER_INDEX);
                const normalizedDistance = distance / maxDistance;
                const easedDistance = Math.pow(normalizedDistance, 2);
                let scale = 1.0 - easedDistance * 0.25;
                const zIndex = CARRUSEL_SIZE - distance;
                const distanceOpacity = distance === 0 ? 0 : Math.min((distance / maxDistance) * 0.5, 0.5);
                const className = distance === 0 ? "carrusel-center" : "carrusel-distant";
                return (
                  <li
                    key={movieIdx + "-" + i}
                    className={className}
                    style={{
                      position: "absolute",
                      left: `${position}px`,
                      transform: `scale(calc(${scale} * var(--hover-scale, 1)))`,
                      transformOrigin: "center center",
                      zIndex: zIndex,
                      cursor: "pointer",
                      width: `${itemWidth}px`,
                      transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                      "--scale": scale,
                    }}
                    onClick={() => handleMovieClick(movie)}
                    onMouseEnter={e => {
                      const el = e.currentTarget;
                      if (el) {
                        el.style.transform = `scale(calc(${scale} * 1.1))`;
                        el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      if (el) {
                        el.style.transform = `scale(calc(${scale}))`;
                        el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
                      }
                    }}
                  >
                    <div className="cover-wrapper">
                      {movie.caratula && (
                        <>
                          <img
                            src={movie.caratula}
                            alt={`Carátula de ${movie.nombre}`}
                            className="game-cover"
                            onError={e => {
                              e.target.src = "/static/resources/default_cover.png";
                            }}
                          />
                          <div className="cover-gradient"></div>
                        </>
                      )}
                    </div>
                    <div className="distance-overlay" style={{ opacity: distanceOpacity }}></div>
                    <strong>{movie.nombre}</strong>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={handleNext}
              className="arrow-button"
              aria-label="Siguiente"
              style={{ position: "relative", zIndex: 2 }}
            >
              ▶︎
            </button>
          </div>
        </section>
      </div>
      <div className="pelis-wrapper">
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
                placeholder="Buscar película o serie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>{" "}
            <h1 className="header-filtros">Filtros Generales</h1>
            {/* Filtros de ordenamiento */}{" "}
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
                  {" "}
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
                        {genre}
                      </option>
                    ))}
                  </select>{" "}
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
          <h2 className="header-juegos">Películas y Series Vistas</h2>
          <ul>
            {paginatedMovies.map((movie, index) => {
              const showBadges =
                (movie.duracion && movie.duracion !== "") ||
                (movie.nota_chat && movie.nota_chat !== "");
              return (
                <li key={index}>
                  {/* Botón de edición en modo desarrollador */}
                  {isDeveloperMode && (
                    <button
                      className="edit-game-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMovie(movie);
                      }}
                      title="Editar película/serie"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Badges row y línea separadora */}
                  {showBadges && (
                    <>
                      <div className="badges-row">
                        <div className="badge-duracion">
                          {movie.duracion ? `⌛${movie.duracion}` : ""}
                        </div>
                        <div className="badge-nota">
                          {movie.nota_chat && (
                            <>
                              <img
                                src="/static/resources/estrellas/star-filled.png"
                                alt="estrella"
                                className="nota-estrella"
                              />
                              {movie.nota_chat}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="linea-badges" />
                    </>
                  )}
                  <div className="cover-wrapper">
                    {movie.fecha && (
                      <div className="game-date-hover">{movie.fecha}</div>
                    )}
                    {movie.caratula && (
                      <>
                        <img
                          src={movie.caratula}
                          alt={`Carátula de ${movie.nombre}`}
                          className={`game-cover${
                            movie.url ? " has-youtube" : ""
                          }`}
                          onError={(e) => {
                            e.target.src =
                              "/static/resources/default_cover.png";
                          }}
                        />
                        <div className="cover-gradient"></div>
                      </>
                    )}
                    {movie.url && (
                      <button
                        className="play-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            movie.url,
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
                    onClick={() => handleMovieClick(movie)}
                    style={{ cursor: "pointer" }}
                  >
                    {movie.nombre}
                  </strong>
                </li>
              );
            })}
          </ul>
          <div className="pagination-container">
            <button
              className="arrow-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ◀︎
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="arrow-button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              ▶︎
            </button>{" "}
          </div>
        </section>
      </div>{" "}
      {/* Close pelis-wrapper */}
      {/* Popup de detalles de película/serie */}
      {selectedMovie && (
        <div className="popup-overlay" onClick={closeMoviePopup}>
          <div
            className="popup-content popup-movie-details"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <button className="close-button" onClick={closeMoviePopup}>
              ✖
            </button>
            <>
              {/* Layout normal - carátula + información */}
              {!showTrailerPlayer && (
                <div className="popup-movie-header">
                  {" "}
                  <div className="popup-movie-cover">
                    <img
                      src={
                        selectedMovie.caratula ||
                        "/static/resources/default_cover.png"
                      }
                      alt={`Carátula de ${selectedMovie.nombre}`}
                      onError={(e) => {
                        e.target.src = "/static/resources/default_cover.png";
                      }}
                    />

                    {/* Botón de play para trailer */}
                    {selectedMovie.trailer &&
                      isValidYouTubeURL(selectedMovie.trailer) && (
                        <button
                          className="popup-play-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTrailerPlayer(true);
                          }}
                          tabIndex={0}
                          aria-label="Reproducir trailer"
                          title="Click para reproducir trailer"
                        >
                          <svg
                            width="50"
                            height="50"
                            viewBox="0 0 50 50"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle
                              cx="25"
                              cy="25"
                              r="25"
                              fill="rgba(0,0,0,0.7)"
                            />
                            <polygon points="20,16 37,25 20,34" fill="#fff" />
                          </svg>
                        </button>
                      )}
                  </div>
                  {/* Información de la película - se oculta cuando se reproduce trailer */}
                  {!showTrailerPlayer && (
                    <div className="popup-movie-info">
                      <h2>{selectedMovie.nombre}</h2>
                      <div className="movie-meta">
                        {selectedMovie.tipo && (
                          <p>
                            <strong>Tipo:</strong> {selectedMovie.tipo}
                          </p>
                        )}
                        {selectedMovie.estado && (
                          <p>
                            <strong>Estado:</strong>{" "}
                            {selectedMovie.estado.toUpperCase()}
                          </p>
                        )}
                        {selectedMovie.url && (
                          <p>
                            <a
                              href={selectedMovie.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver en YouTube
                            </a>
                          </p>
                        )}
                        {selectedMovie.nota_chat && (
                          <p className="popup-rating">
                            <img
                              src="/static/resources/estrellas/star-filled.png"
                              alt="estrella"
                              className="nota-estrella"
                            />
                            <span className="popup-rating-text">
                              {selectedMovie.nota_chat}
                            </span>
                          </p>
                        )}
                        {selectedMovie.duracion && (
                          <p>
                            <strong>⌛ Duración:</strong>{" "}
                            {selectedMovie.duracion}
                          </p>
                        )}
                        {selectedMovie.director && (
                          <p>
                            <strong>🎬 Director:</strong>{" "}
                            {selectedMovie.director}
                          </p>
                        )}
                        {selectedMovie.genero && (
                          <p>
                            <strong>🎭 Género:</strong> {selectedMovie.genero}
                          </p>
                        )}
                        {selectedMovie.fecha_lanzamiento && (
                          <p>
                            <strong>📅 Fecha de lanzamiento:</strong>{" "}
                            {selectedMovie.fecha_lanzamiento}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Layout reproductor - reemplaza completamente el header */}
              {showTrailerPlayer && selectedMovie.trailer && (
                <div className="trailer-player-expanded">
                  <div className="trailer-controls">
                    <button
                      className="close-trailer-button"
                      onClick={() => setShowTrailerPlayer(false)}
                    >
                      ← Volver
                    </button>
                  </div>
                  <div className="trailer-video-container">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${extractYouTubeID(
                        selectedMovie.trailer
                      )}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                      title="Trailer"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
              {/* Resumen - solo visible cuando no se reproduce trailer */}
              {!showTrailerPlayer && selectedMovie.resumen && (
                <div className="movie-summary">
                  <p>{selectedMovie.resumen.replace(/-%-/g, ", ")}</p>
                </div>
              )}
              {/* Sinopsis siempre visible cuando se reproduce trailer */}{" "}
              {showTrailerPlayer && selectedMovie.resumen && (
                <div className="movie-summary trailer-synopsis">
                  <h3>Sinopsis</h3>
                  <p>{selectedMovie.resumen.replace(/-%-/g, ", ")}</p>
                </div>
              )}
            </>
          </div>
        </div>
      )}
      {/* Popup para añadir película/serie */}
      {showAddMoviePopup && (
        <div
          className="add-movie-popup-overlay"
          onClick={handleCloseAddMoviePopup}
        >
          <div className="add-movie-popup" onClick={(e) => e.stopPropagation()}>
            <div className="add-movie-popup-header">
              <h2>Añadir Película o Serie</h2>
              <button
                className="close-popup-button"
                onClick={handleCloseAddMoviePopup}
              >
                ×
              </button>
            </div>

            <div className="add-movie-popup-content">
              {/* Búsqueda TMDB */}
              <div className="search-section">
                <input
                  type="text"
                  value={searchMovieTMDB}
                  onChange={(e) => setSearchMovieTMDB(e.target.value)}
                  placeholder="Buscar Peli/Serie en TMDB..."
                />
              </div>
              {/* Resultados de búsqueda */}
              {movieTmdbResults.length > 0 && (
                <div className="search-results">
                  <h3>Resultados:</h3>
                  <div className="results-list">
                    {movieTmdbResults.slice(0, 10).map((content) => (
                      <div
                        key={content.id}
                        className={`result-item ${
                          selectedMovieTMDB?.id === content.id ? "selected" : ""
                        }`}
                        onClick={() => handleMovieTMDBSelection(content)}
                      >
                        <img
                          src={
                            content.poster_path ||
                            "/static/resources/default_cover.png"
                          }
                          alt={content.name}
                          onError={(e) => {
                            e.target.src =
                              "/static/resources/default_cover.png";
                          }}
                        />
                        <div className="result-info">
                          <h4>{content.name}</h4>
                          <p className="content-type">
                            {content.media_type === "movie"
                              ? "Película"
                              : "Serie"}
                            {content.release_date &&
                              ` (${new Date(
                                content.release_date
                              ).getFullYear()})`}
                          </p>
                          <p className="overview">
                            {content.overview
                              ? content.overview.substring(0, 150) + "..."
                              : "Sin descripción"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Formulario de datos adicionales */}
              {selectedMovieTMDB && (
                <div className="form-section">
                  <h3>Información adicional:</h3>

                  {/* Mostrar información obtenida de TMDB */}
                  <div className="tmdb-info">
                    <p>
                      <strong>Duración:</strong>{" "}
                      {selectedMovieTMDB.duration || "No disponible"}
                    </p>{" "}
                    <p>
                      <strong>Director:</strong>{" "}
                      {selectedMovieTMDB.director || "No disponible"}
                    </p>
                    <p>
                      <strong>Géneros:</strong>{" "}
                      {selectedMovieTMDB.genres || "No disponible"}
                    </p>
                    <p>
                      <strong>Fecha de salida:</strong>{" "}
                      {selectedMovieTMDB.release_date
                        ? new Date(
                            selectedMovieTMDB.release_date
                          ).toLocaleDateString("es-ES")
                        : "No disponible"}
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Estado:</label>
                        <select
                          value={addMovieFormData.estado}
                          onChange={(e) =>
                            handleAddMovieFormChange("estado", e.target.value)
                          }
                        >
                          <option value="Planeo Ver">Planeo Ver</option>
                          <option value="Recomendado">Recomendado</option>
                          <option value="Visto">Visto</option>
                          <option value="Proximamente">Próximamente</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Fecha vista:</label>
                        <input
                          type="date"
                          value={addMovieFormData.fecha}
                          onChange={(e) =>
                            handleAddMovieFormChange("fecha", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label>URL YouTube:</label>
                      <input
                        type="url"
                        value={addMovieFormData.url}
                        onChange={(e) =>
                          handleAddMovieFormChange("url", e.target.value)
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>URL Carátula:</label>
                      <input
                        type="url"
                        value={addMovieFormData.caratula}
                        onChange={(e) =>
                          handleAddMovieFormChange("caratula", e.target.value)
                        }
                        placeholder="https://image.tmdb.org/t/p/w500/..."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Nota del chat (0-10):</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={addMovieFormData.nota_chat}
                        onChange={(e) =>
                          handleAddMovieFormChange("nota_chat", e.target.value)
                        }
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Botones de acción */}
              <div className="popup-actions">
                <button
                  className={`add-recommendation-confirm ${
                    addMovieStatus === "adding" ? "loading" : ""
                  } ${addMovieStatus === "success" ? "success" : ""} ${
                    addMovieStatus === "error" ? "error" : ""
                  }`}
                  onClick={handleAddMovie}
                  disabled={!selectedMovieTMDB || addMovieStatus === "adding"}
                >
                  {getAddButtonText()}
                </button>
              </div>
            </div>
          </div>        </div>
      )}

      {/* Popup para editar película/serie */}
      {showEditMoviePopup && (
        <div className="popup-overlay" onClick={handleCloseEditMoviePopup}>
          <div
            className="popup-content popup-edit-movie"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-button" onClick={handleCloseEditMoviePopup}>
              ✖
            </button>
            <h2 className="popup-edit-title">Editar Película/Serie</h2>
            <div className="edit-form-container">
              {/* Primera fila: Nombre y Estado */}
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={editMovieFormData.nombre || ""}
                    onChange={(e) => handleEditMovieFormChange("nombre", e.target.value)}
                  />
                </div>
                <div className="edit-form-field">
                  <label>Estado</label>
                  <select
                    value={editMovieFormData.estado || ""}
                    onChange={(e) => handleEditMovieFormChange("estado", e.target.value)}
                  >
                    <option value="Visto">Visto</option>
                    <option value="Viendo">Viendo</option>
                    <option value="Planeo Ver">Planeo Ver</option>
                    <option value="Abandonado">Abandonado</option>
                  </select>
                </div>
              </div>

              {/* Segunda fila: Tipo y Fecha Vista */}
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Tipo</label>
                  <select
                    value={editMovieFormData.tipo || "Película"}
                    onChange={(e) => handleEditMovieFormChange("tipo", e.target.value)}
                  >
                    <option value="Película">Película</option>
                    <option value="Serie">Serie</option>
                  </select>
                </div>
                <div className="edit-form-field">
                  <label>Fecha Vista</label>
                  <input
                    type="date"
                    value={editMovieFormData.fecha || ""}
                    onChange={(e) => handleEditMovieFormChange("fecha", e.target.value)}
                  />
                </div>
              </div>

              {/* Tercera fila: Nota Chat y URL */}
              <div className="edit-form-row">
                <div className="edit-form-field">
                  <label>Nota Chat</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editMovieFormData.nota_chat || ""}
                    onChange={(e) => handleEditMovieFormChange("nota_chat", e.target.value)}
                  />
                </div>
                <div className="edit-form-field">
                  <label>URL YouTube</label>
                  <input
                    type="url"
                    value={editMovieFormData.url || ""}
                    onChange={(e) => handleEditMovieFormChange("url", e.target.value)}
                  />
                </div>
              </div>

              {/* Cuarta fila: Carátula */}
              <div className="edit-form-row">
                <div className="edit-form-field edit-form-field-full">
                  <label>URL Carátula</label>
                  <input
                    type="url"
                    value={editMovieFormData.caratula || ""}
                    onChange={(e) => handleEditMovieFormChange("caratula", e.target.value)}
                  />
                </div>
              </div>

              {/* Quinta fila: Comentario */}
              <div className="edit-form-row">
                <div className="edit-form-field edit-form-field-full">
                  <label>Comentario</label>
                  <textarea
                    value={editMovieFormData.comentario || ""}
                    onChange={(e) => handleEditMovieFormChange("comentario", e.target.value)}
                    rows="3"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="edit-form-actions">
                <button
                  className="edit-cancel-button"
                  onClick={handleCloseEditMoviePopup}
                >
                  Cancelar
                </button>
                <button
                  className="edit-save-button"
                  onClick={() => {
                    // TODO: Implementar función de guardar
                    console.log("Saving movie:", editMovieFormData);
                    handleCloseEditMoviePopup();
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup Recomendar */}
      {showRecommendPopup && (
        <div className="add-movie-popup-overlay" onClick={() => setShowRecommendPopup(false)}>
          <div className="add-movie-popup" onClick={e => e.stopPropagation()}>
            <div className="add-movie-popup-header">
              <h2>Recomendar Peli o Serie</h2>
              <button className="close-popup-button" onClick={() => setShowRecommendPopup(false)}>×</button>
            </div>
            <div className="add-movie-popup-content">
              <div className="search-section">
                <input
                  type="text"
                  value={recommendSearch}
                  onChange={e => {
                    setRecommendSearch(e.target.value);
                    setSelectedRecommend(null);
                  }}
                  placeholder="Buscar peli o serie en TMDB..."
                />
                {isSearching && (
                  <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4, minHeight: 20 }}>
                    Cargando{'.'.repeat(loadingDots)}
                  </div>
                )}
              </div>
              {recommendResults.length > 0 && (
                <div className="search-results">
                  <h3>Selecciona una peli o serie:</h3>
                  <div className="results-list">
                    {recommendResults.slice(0, 10).map((content) => (
                      <div
                        key={content.id}
                        className={`result-item${selectedRecommend && selectedRecommend.id === content.id ? " selected" : ""}`}
                        onClick={() => setSelectedRecommend(content)}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={content.poster_path || "/static/resources/default_cover.png"}
                          alt={content.title || content.name}
                          onError={e => { e.target.src = "/static/resources/default_cover.png"; }}
                        />
                        <div className="result-info">
                          <h4>{content.title || content.name}</h4>
                          <p className="content-type">
                            {content.media_type === "movie" ? "Película" : "Serie"}
                            {content.release_date &&
                              ` (${new Date(content.release_date).getFullYear()})`}
                          </p>
                          <p className="overview">
                            {content.overview
                              ? content.overview.substring(0, 150) + "..."
                              : "Sin descripción"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecommend && (
                <div className="form-section" style={{ marginTop: 16 }}>
                  <textarea
                    className="popup-comment-textarea"
                    value={recommendComment}
                    onChange={e => setRecommendComment(e.target.value)}
                    rows={4}
                    placeholder="Algo que me quieras decir sobre esta peli o serie..."
                    disabled={!selectedRecommend}
                  />
                </div>
              )}
              <div className="popup-actions">
                <button
                  className={`add-recommendation-confirm${recommendStatus === "adding" ? " loading" : ""}${recommendStatus === "success" ? " success" : ""}${recommendStatus === "error" ? " error" : ""}`}
                  onClick={handleRecommend}
                                   disabled={
                    recommendStatus === "adding" ||
                    !recommendComment.trim() ||
                    !selectedRecommend ||
                    !isUserValid
                  }
                  title={!isUserValid ? "Debes iniciar sesión para recomendar" : undefined}
                >
                  {recommendStatus === "adding"
                    ? "Recomendando..."
                    : recommendStatus === "success"
                    ? "¡Recomendado!"
                    : "Recomendar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pelis;
