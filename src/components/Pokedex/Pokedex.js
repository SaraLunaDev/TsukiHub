import React, { useState, useEffect } from "react";
import "./Pokedex.css";

function Pokedex() {
  const [pokemonList, setPokemonList] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGeneration, setActiveGeneration] = useState(1);
  const [userInput, setUserInput] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
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

  const formatPokemonId = (id) => id.toString().padStart(4, "0");

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
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${pokemonId}.gif`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`;
  };

  useEffect(() => {
    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    const storedUser = localStorage.getItem("selectedUser");

    fetch(sheetUrl)
      .then((response) => response.text())
      .then((data) => {
        const rows = data.split("\n").slice(1); // Omite los headers
        const parsedData = [];
        const userMap = new Map();

        rows.forEach((row) => {
          const columns = row.split(",");

          // Usa índices para acceder a los datos
          const id = columns[0]?.trim();
          const nombre = columns[1]?.trim();
          const usuario = columns[2]?.trim();
          const pokemon = columns[3]?.trim();
          const tipo1 = columns[4]?.trim();
          const tipo2 = columns[5]?.trim();
          const shiny = columns[17]?.trim();

          parsedData.push({
            id,
            Nombre: nombre,
            Usuario: usuario,
            Pokemon: pokemon,
            Tipo1: tipo1,
            Tipo2: tipo2,
            Shiny: shiny,
          });

          if (usuario && nombre) {
            userMap.set(usuario, nombre); // Guarda el último nombre por usuario
          }
        });

        setPokemonList(parsedData);
        console.log(parsedData.map((p) => ({ id: p.id, Shiny: p.Shiny })));

        const uniqueUsers = Array.from(userMap.entries());
        setUsers(uniqueUsers);

        // Si hay un usuario almacenado, establece el input
        if (storedUser) {
          const storedUserName = uniqueUsers.find(
            ([id]) => id === storedUser
          )?.[1];
          if (storedUserName) setUserInput(storedUserName);
          setUserInput(storedUserName || "");
        } else {
          setUserInput("");
          setUserInput(uniqueUsers[0]?.[1] || ""); // Establece el nombre del primer usuario
        }
      })
      .catch((error) => console.error("Error al cargar los datos:", error));
  }, [sheetUrl]);

  const handleImageError = (e) => {
    // Si la imagen no se carga, revertimos a la imagen estática
    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
      e.target.dataset.shiny === "true" ? "shiny/" : ""
    }${e.target.dataset.pokemonId}.png`;
  };

  const getPokemonsForGeneration = (generation, start, end) => {
    const totalSlots = 160; // Total de huecos por generación
    const generationSize = end - start + 1; // Total de Pokémon reales en la generación
    const emptySlots = totalSlots - generationSize; // Huecos vacíos necesarios al final

    const pokemonsInGeneration = Array.from(
      { length: totalSlots },
      (_, index) => {
        const id = start + index; // Calcula el ID del Pokémon en esta posición

        // Si el ID está fuera del rango de la generación, deja el hueco vacío
        if (index >= generationSize) {
          return { id: null, captured: false, shiny: false };
        }

        const matchedPokemon = filteredPokemons.find(
          (pokemon) => parseInt(pokemon.id, 10) === id
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

  // Manejar clic en un usuario
  const handleUserClick = (userName) => {
    setUserInput(userName); // Cambia el usuario actual
    localStorage.setItem(
      "selectedUser",
      users.find(([, name]) => name === userName)?.[0]
    ); // Guarda el ID en localStorage
    setIsPopupOpen(false); // Cierra el popup
  };

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
          {regions.map((region, index) => (
            <button
              key={index}
              className={`generation-button ${
                activeGeneration === index + 1 ? "active" : ""
              }`}
              onClick={() => setActiveGeneration(index + 1)}
            >
              {region}
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
                  key={index}
                  className={`pokemon-card ${
                    pokemon.id
                      ? pokemon.shiny
                        ? "shiny"
                        : pokemon.captured
                        ? "captured"
                        : "default"
                      : "empty-slot" // Clase para los huecos vacíos
                  }`}
                >
                  {pokemon.id && (
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                        pokemon.shiny ? `shiny/${pokemon.id}` : pokemon.id
                      }.png`}
                      alt={`Pokemon ${pokemon.id}`}
                      data-pokemon-id={pokemon.id}
                      data-shiny={pokemon.shiny === "si"}
                      className={`pokemon-img ${isGifVisible ? "gif" : ""}`} // Agrega la clase "gif" solo cuando es necesario
                      onError={handleImageError}
                      onMouseEnter={(e) => {
                        e.target.timer = setTimeout(() => {
                          const isShiny =
                            pokemon.shiny === "si" || pokemon.shiny === true;
                          e.target.src = getPokemonGifUrl(pokemon.id, isShiny);
                          e.target.classList.add("gif"); // Aplica la clase "gif" para el tamaño adecuado
                        }, 1000);
                      }}
                      onMouseLeave={(e) => {
                        clearTimeout(e.target.timer);
                        e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                          pokemon.shiny ? `shiny/${pokemon.id}` : pokemon.id
                        }.png`;
                        e.target.classList.remove("gif"); // Remueve la clase "gif" cuando vuelve a la imagen estática
                      }}
                    />
                  )}
                  {pokemon.shiny && <span className="shiny-icon">✨</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Pokedex;
