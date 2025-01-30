import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Pokedex.css";

function Pokedex() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPopupOpenPokemon, setIsPopupOpenPokemon] = useState(false);
  const [isGifVisible, setIsGifVisible] = useState(false);
  const sheetUrl = process.env.REACT_APP_POKEDEX_SHEET_URL;

  const getUserStats = () => {
    const userStats = users.map(([userId, userName]) => {
      const pokemonCount = pokemonList.filter(
        (pokemon) => pokemon.Usuario === userId
      ).length;
      return { userId, userName, pokemonCount };
    });

    return userStats.sort((a, b) => b.pokemonCount - a.pokemonCount); // Orden descendente por cantidad de Pokémon
  };

  const icons = ["🌸 ", "🏯 ", "🌊 ", "🗻 ", "🏢 ", "🗼 ", "🌴 ", "🏰 ", "🥘 "];

  const regions = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Teselia",
    "Kalos",
    "Alola",
    "Galar",
    "Paldea",
  ];

  const regionNames = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Teselia",
    "Kalos",
    "Alola",
    "Galar",
    "Paldea",
  ];

  const [pokemonList, setPokemonList] = useState([]);
  const [users, setUsers] = useState([]);
  const [userInput, setUserInput] = useState("");
  const { region } = useParams(); // Obtener el nombre de la región desde la URL
  const navigate = useNavigate();
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [moves, setMoves] = useState([]);

  const activeRegion = regions.find(
    (r) => r.toLowerCase() === region?.toLowerCase()
  );
  const activeGeneration = activeRegion ? regions.indexOf(activeRegion) + 1 : 1; // Default a Kanto si no es válido

  useEffect(() => {
    // Si la región es inválida, redirige a Kanto (por defecto)
    if (activeGeneration < 1 || activeGeneration > regions.length) {
      navigate("/pokedex/kanto");
    }
  }, [activeGeneration, navigate]);

  const getGeneration = (generation) => {
    const generationData = {
      1: { start: 1, end: 151 },
      2: { start: 152, end: 251 },
      3: { start: 252, end: 386 },
      4: { start: 387, end: 493 },
      5: { start: 494, end: 649 },
      6: { start: 650, end: 721 },
      7: { start: 722, end: 809 },
      8: { start: 810, end: 905 },
      9: { start: 906, end: 1025 },
    };

    return generationData[generation] || { start: 0, end: 0 };
  };

  const handleRegionClick = (regionName) => {
    navigate(`/pokedex/${regionName.toLowerCase()}`); // Cambia la URL al seleccionar una región
  };

  const handlePokemonClick = (pokemon) => {
    if (!pokemon.captured) return; // No hacer clic si no está capturado

    const userId = users.find(([id, name]) =>
      name.toLowerCase().includes(userInput.toLowerCase())
    )?.[0];

    const fullPokemon = pokemonList.find(
      (p) => p.id === pokemon.id && p.Usuario === userId
    );

    if (fullPokemon) {
      setSelectedPokemon(fullPokemon);
      setIsPopupOpenPokemon(true);
    }
  };

  const handleUserInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);

    // Si el usuario escribe un nombre válido, guárdalo en localStorage
    const matchedUser = users.find(([, name]) =>
      name.toLowerCase().includes(input.toLowerCase())
    );
    if (matchedUser) {
      localStorage.setItem("selectedUser", matchedUser[0]); // Guarda el ID del usuario
    }
  };

  const filteredPokemons = pokemonList.filter(
    (pokemon) =>
      userInput.trim()
        ? pokemon.Nombre?.toLowerCase().includes(userInput.toLowerCase()) // Filtra por el texto ingresado
        : pokemon.Usuario === "173916175" // Muestra los Pokémon del usuario con ID predeterminado
  );

  const getPokemonGifUrl = (pokemonId, shiny = false) => {
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
  };

  useEffect(() => {
    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    const loadCachedData = () => {
      const cachedData = localStorage.getItem("pokedexData");
      if (cachedData) {
        console.log("Cargando datos desde el caché...");
        const parsedData = JSON.parse(cachedData);
        setPokemonList(parsedData.pokemonList);
        setUsers(parsedData.users);
        return true;
      }
      return false;
    };

    const fetchDataFromSheet = async () => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();

        const rows = data.split("\n").slice(1); // Omitir headers
        const parsedData = [];
        const userMap = new Map();

        rows.forEach((row) => {
          const columns = row.split(",");
          const id = columns[0]?.trim();
          const nombre = columns[1]?.trim();
          const usuario = columns[2]?.trim();
          const pokemon = columns[3]?.trim();
          const tipo1 = columns[4]?.trim();
          const tipo2 = columns[5]?.trim();
          const shiny = columns[17]?.trim();
          const stats = {
            HP: columns[10]?.trim(),
            Ataque: columns[11]?.trim(),
            Defensa: columns[12]?.trim(),
            AtaqueEsp: columns[13]?.trim(),
            DefensaEsp: columns[14]?.trim(),
            Velocidad: columns[15]?.trim(),
            Experiencia: columns[16]?.trim(),
            Peso: columns[24]?.trim(),
            IVs: {
              HP: columns[18]?.trim(),
              Ataque: columns[19]?.trim(),
              Defensa: columns[20]?.trim(),
              AtaqueEsp: columns[21]?.trim(),
              DefensaEsp: columns[22]?.trim(),
              Velocidad: columns[23]?.trim(),
            },
          };

          const movimientos = {
            Movimiento1: columns[6]?.trim(),
            Movimiento2: columns[7]?.trim(),
            Movimiento3: columns[8]?.trim(),
            Movimiento4: columns[9]?.trim(),
          };

          parsedData.push({
            id,
            Nombre: nombre,
            Usuario: usuario,
            Pokemon: pokemon,
            Tipo1: tipo1,
            Tipo2: tipo2,
            Shiny: shiny,
            stats,
            movimientos,
          });

          if (usuario && nombre) {
            userMap.set(usuario, nombre);
          }
        });

        setPokemonList(parsedData);

        const uniqueUsers = Array.from(userMap.entries());
        setUsers(uniqueUsers);

        localStorage.setItem(
          "pokedexData",
          JSON.stringify({ pokemonList: parsedData, users: uniqueUsers })
        );

        console.log("Datos cargados y guardados en caché.");
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    if (!loadCachedData()) {
      fetchDataFromSheet();
    }
  }, [sheetUrl]);

  // Cargar el último usuario seleccionado cuando los usuarios estén disponibles
  useEffect(() => {
    if (users.length > 0) {
      const storedUserId = localStorage.getItem("selectedUser");
      const storedUserName = users.find(([id]) => id === storedUserId)?.[1];
      if (storedUserName) {
        setUserInput(storedUserName);
      }
    }
  }, [users]);

  const handleImageError = (e) => {
    // Si la imagen no se carga, revertimos a la imagen estática
    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
      e.target.dataset.shiny === "true" ? "shiny/" : ""
    }${e.target.dataset.pokemonId}.png`;
  };

  const getPokemonsForGeneration = (generation, start, end) => {
    const totalSlots = 160; // Total de huecos por generación
    const generationSize = end - start + 1;
    const userId = users.find(([id, name]) =>
      name.toLowerCase().includes(userInput.toLowerCase())
    )?.[0];

    const pokemonsInGeneration = Array.from(
      { length: totalSlots },
      (_, index) => {
        const id = start + index;

        if (index >= generationSize) {
          return { id: null, captured: false, shiny: false };
        }

        const matchedPokemon = pokemonList.find(
          (pokemon) =>
            parseInt(pokemon.id, 10) === id && pokemon.Usuario === userId
        );

        return {
          id: id.toString(),
          captured: Boolean(matchedPokemon),
          shiny: matchedPokemon?.Shiny?.toLowerCase() === "si",
        };
      }
    );

    const capturedCount = pokemonsInGeneration.filter((p) => p.captured).length;
    const shinyCount = pokemonsInGeneration.filter((p) => p.shiny).length;

    return {
      pokemonsInGeneration,
      capturedCount,
      shinyCount,
      totalPokemonsInGeneration: totalSlots,
    };
  };

  const { pokemonsInGeneration, capturedCount, shinyCount } =
    getPokemonsForGeneration(
      activeGeneration,
      getGeneration(activeGeneration).start,
      getGeneration(activeGeneration).end
    );

  const togglePopup = () => {
    setIsPopupOpen((prev) => !prev);
  };

  const togglePopupPokemon = () => {
    setIsPopupOpenPokemon((prev) => !prev);
  };

  // Manejar clic en un usuario
  const handleUserClick = (userName) => {
    setUserInput(userName); // Cambia el usuario actual
    localStorage.setItem(
      "selectedUser",
      users.find(([, name]) => name === userName)?.[0]
    ); // Guarda el ID en localStorage
    setIsPopupOpen(false); // Cierra el popup
  };

  // Función para obtener el tamaño de la imagen GIF
  const handleGifLoad = (e) => {
    const img = new Image();
    img.src = e.target.src;
    img.onload = () => {
      e.target.style.width = `${img.width * 0.65}px`; // Ajusta el tamaño del GIF
      e.target.style.height = `${img.height * 0.65}px`;
    };
  };

  const calcularNivel = (experiencia) => {
    return Math.floor(Math.cbrt(experiencia));
  };

  const handleMouseEnter = (e, pokemon) => {
    if (!pokemon.captured) return; // No hacer hover si no está capturado

    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.opacity = 0; // Solo cambiar opacidad si el Pokémon está capturado
      setTimeout(() => {
        img.src = getPokemonGifUrl(pokemon.id, pokemon.shiny); // Cambia la imagen al GIF
        img.style.opacity = 1; // Restaura la opacidad al 100%
      }, 0);
    }
  };

  const handleMouseLeave = (e, pokemon) => {
    if (!pokemon.captured) return; // No hacer hover si no está capturado

    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.opacity = 0; // Solo cambiar opacidad si el Pokémon está capturado
      setTimeout(() => {
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
          pokemon.shiny ? `shiny/${pokemon.id}` : pokemon.id
        }.png`; // Cambia la imagen de vuelta a la imagen estática
        img.style.opacity = 1; // Restaura la opacidad al 100%
      }, 0);
    }
  };

  function displayWeightInKilos(weightInGrams) {
    const weightInKilos = (weightInGrams / 10).toFixed(1); // Convierte a kilos con 2 decimales
    return `${weightInKilos} kg`;
  }

  useEffect(() => {
    // Cargar los movimientos desde moves.csv
    const loadMoves = async () => {
      const response = await fetch("/static/resources/pokemon/moves.csv");
      const data = await response.text();
      const rows = data.split("\n").slice(1); // Ignorar la primera fila (cabeceras)

      const moves = {};

      rows.forEach((row) => {
        const [name, type] = row.split(","); // Asumiendo que el CSV está separado por comas
        if (name && type) {
          moves[name.trim()] = type.trim();
        }
      });

      return moves;
    };

    loadMoves().then((moves) => {
      setMoves(moves);
    });
  }, []);

  useEffect(() => {
    // Forzar re-renderización al cambiar de usuario
    setPokemonList((prevList) => [...prevList]);
  }, [userInput]);

  return (
    <div className="pokedex-container">
      <div className="pokedex-header">
        <div className="header-left">
          <h1>
            {icons[activeGeneration - 1]} Pokedex{" "}
            {regions[activeGeneration - 1]} de{" "}
            <span className="user-name-pokedex" onClick={togglePopup}>
              {users.find(([, name]) =>
                name.toLowerCase().includes(userInput.toLowerCase())
              )?.[1] || "Usuario"}
            </span>
          </h1>
        </div>
        <div className="header-right">
          <p>
            Capturados: {capturedCount} /{" "}
            {getGeneration(activeGeneration).end -
              getGeneration(activeGeneration).start +
              1}
          </p>

          <p>Shiny: {shinyCount}</p>
        </div>
      </div>

      {isPopupOpen && (
        <div className="popup-overlay" onClick={togglePopup}>
          <div
            className="popup-content"
            onClick={(e) => e.stopPropagation()} // Evita que el popup se cierre al hacer clic en su contenido
          >
            <h2>Usuarios con Pokémon</h2>
            <div className="user-list-scroll">
              {getUserStats().map((user, index) => (
                <div
                  key={user.userId}
                  className="user-row"
                  onClick={() => handleUserClick(user.userName)} // Maneja el clic
                >
                  <span className="user-position">{index + 1}</span>
                  <span className="user-name-popup">{user.userName}</span>
                  <span className="user-pokemon-count">
                    {user.pokemonCount} Pokémon
                  </span>
                </div>
              ))}
            </div>
            <button className="close-button" onClick={togglePopup}>
              ✖
            </button>
          </div>
        </div>
      )}

      {/* Selector de usuario */}
      <div className="filters-container">
        <div className="user-selector">
          <div className="search-input-global">
            <img
              src="/static/resources/lupa.png"
              alt="Lupa"
              className="lupa-img"
            />
            <input
              id="user-input"
              type="text"
              value={userInput}
              onChange={handleUserInputChange}
              placeholder="Buscar usuario..."
              className="search-input"
            />
          </div>
        </div>

        {/* Botones de generación */}
        <div className="generation-buttons">
          {regions.map((regionName, index) => (
            <button
              key={index}
              className={`generation-button ${
                activeGeneration === index + 1 ? "active" : ""
              }`}
              onClick={() => handleRegionClick(regionName)}
            >
              {regionNames[index]}
            </button>
          ))}
        </div>
      </div>

      {/* Pokémon divididos por generación */}
      {[...Array(9)].map((_, genIndex) => {
        if (genIndex + 1 !== activeGeneration) return null;
        const { start, end } = getGeneration(genIndex + 1);

        const { pokemonsInGeneration: pokemons } = getPokemonsForGeneration(
          genIndex + 1,
          start,
          end
        );

        return (
          <div key={genIndex} className="generation-section">
            <div className="pokemon-grid">
              {pokemons.map((pokemon, index) => (
                <div
                  key={`${userInput}-${index}`} // Clave única basada en el usuario actual
                  className={`pokemon-card ${
                    pokemon.id
                      ? pokemon.captured
                        ? pokemon.shiny
                          ? "shiny"
                          : "captured"
                        : "default"
                      : "empty-slot"
                  }`}
                  onMouseEnter={(e) => handleMouseEnter(e, pokemon)} // Mover el mouse sobre la tarjeta
                  onMouseLeave={(e) => handleMouseLeave(e, pokemon)} // Mover el mouse fuera de la tarjeta
                  onClick={() => handlePokemonClick(pokemon)}
                >
                  {pokemon.id && (
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                        pokemon.shiny ? `shiny/${pokemon.id}` : pokemon.id
                      }.png`} // PNG por defecto
                      alt={`Pokemon ${pokemon.id}`}
                      data-pokemon-id={pokemon.id}
                      data-shiny={pokemon.shiny === "si"}
                      className={`pokemon-img ${isGifVisible ? "gif" : ""}`}
                      onError={handleImageError}
                      onLoad={handleGifLoad} // Ajuste de tamaño del GIF si es necesario
                    />
                  )}
                  {pokemon.shiny && <span className="shiny-icon">✨</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {isPopupOpenPokemon && selectedPokemon && (
        <div className="popup-overlay-pokemon" onClick={togglePopupPokemon}>
          <div
            className="popup-content-pokemon"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pokemon-details">
              <div className="pokemon-header">
                <div className="pokemon-header-left">
                  <h2 className="pokemon-name">{selectedPokemon.Pokemon}</h2>
                  <div className="pokemon-types">
                    {selectedPokemon.Tipo1 &&
                      selectedPokemon.Tipo1 !== "undefined" && (
                        <img
                          src={`/static/resources/pokemon/types/${selectedPokemon.Tipo1.toLowerCase()}.png`}
                          alt={selectedPokemon.Tipo1}
                          className="pokemon-type-icon"
                        />
                      )}
                    {selectedPokemon.Tipo2 &&
                      selectedPokemon.Tipo2 !== "undefined" && (
                        <img
                          src={`/static/resources/pokemon/types/${selectedPokemon.Tipo2.toLowerCase()}.png`}
                          alt={selectedPokemon.Tipo2}
                          className="pokemon-type-icon"
                        />
                      )}
                  </div>
                </div>
                <div className="pokemon-level">
                  Lv.{calcularNivel(selectedPokemon.stats.Experiencia)}
                </div>
              </div>
              <div className="pokemon-down">
                <div className="pokemon-left">
                  <div className="pokemon-footer">
                    <h3 className="table-header">Movimientos</h3>
                    <table>
                      <tbody>
                        <tr>
                          <td>
                            {selectedPokemon.movimientos.Movimiento1 && (
                              <div className="attack">
                                <img
                                  src={`/static/resources/pokemon/types/${moves[
                                    selectedPokemon.movimientos.Movimiento1.toLowerCase()
                                  ]?.toLowerCase()}.png`}
                                  alt={selectedPokemon.movimientos.Movimiento1}
                                  className="attack-icon"
                                />
                                <span>
                                  {selectedPokemon.movimientos.Movimiento1}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            {selectedPokemon.movimientos.Movimiento2 && (
                              <div className="attack">
                                <img
                                  src={`/static/resources/pokemon/types/${moves[
                                    selectedPokemon.movimientos.Movimiento2.toLowerCase()
                                  ]?.toLowerCase()}.png`}
                                  alt={selectedPokemon.movimientos.Movimiento2}
                                  className="attack-icon"
                                />
                                <span>
                                  {selectedPokemon.movimientos.Movimiento2}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            {selectedPokemon.movimientos.Movimiento3 && (
                              <div className="attack">
                                <img
                                  src={`/static/resources/pokemon/types/${moves[
                                    selectedPokemon.movimientos.Movimiento3.toLowerCase()
                                  ]?.toLowerCase()}.png`}
                                  alt={selectedPokemon.movimientos.Movimiento3}
                                  className="attack-icon"
                                />
                                <span>
                                  {selectedPokemon.movimientos.Movimiento3}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            {selectedPokemon.movimientos.Movimiento4 && (
                              <div className="attack">
                                <img
                                  src={`/static/resources/pokemon/types/${moves[
                                    selectedPokemon.movimientos.Movimiento4.toLowerCase()
                                  ]?.toLowerCase()}.png`}
                                  alt={selectedPokemon.movimientos.Movimiento4}
                                  className="attack-icon"
                                />
                                <span>
                                  {selectedPokemon.movimientos.Movimiento4}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                        {/* Repetir para los otros movimientos */}
                      </tbody>
                    </table>
                    <h3 className="table-header-2">Estadisticas</h3>
                    <table>
                      <tbody>
                        <tr>
                          <th>HP</th>
                          <td>{Math.round(selectedPokemon.stats.HP)}</td>
                          <td>
                            +
                            {Math.round(selectedPokemon.stats.IVs?.HP || "N/A")}
                          </td>
                        </tr>
                        <tr>
                          <th>Ataque</th>
                          <td>{Math.round(selectedPokemon.stats.Ataque)}</td>
                          <td>
                            +
                            {Math.round(
                              selectedPokemon.stats.IVs?.Ataque || "N/A"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th>Defensa</th>
                          <td>{Math.round(selectedPokemon.stats.Defensa)}</td>
                          <td>
                            +
                            {Math.round(
                              selectedPokemon.stats.IVs?.Defensa || "N/A"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th>Atq.Esp</th>
                          <td>{Math.round(selectedPokemon.stats.AtaqueEsp)}</td>
                          <td>
                            +
                            {Math.round(
                              selectedPokemon.stats.IVs?.AtaqueEsp || "N/A"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th>Def.Esp</th>
                          <td>
                            {Math.round(selectedPokemon.stats.DefensaEsp)}
                          </td>
                          <td>
                            +
                            {Math.round(
                              selectedPokemon.stats.IVs?.DefensaEsp || "N/A"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th>Rapidez</th>
                          <td>{Math.round(selectedPokemon.stats.Velocidad)}</td>
                          <td>
                            +
                            {Math.round(
                              selectedPokemon.stats.IVs?.Velocidad || "N/A"
                            )}
                          </td>
                        </tr>
                        {/* Repetir para otras stats */}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sección izquierda */}

                {/* Sección derecha */}
                <div className="pokemon-right">
                  <div className="pokemon-gif-container">
                    <img
                      src={getPokemonGifUrl(
                        selectedPokemon.id,
                        selectedPokemon.Shiny === "si"
                      )}
                      alt={selectedPokemon.Pokemon}
                      className="pokemon-gif-popup"
                    />
                  </div>
                  <p className="pokemon-weight">
                    {displayWeightInKilos(selectedPokemon.stats.Peso) ||
                      "Desconocido"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pokedex;
