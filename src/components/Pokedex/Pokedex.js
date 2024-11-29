import React, { useState, useEffect } from "react";
import "./Pokedex.css";

function Pokedex() {
  const [pokemonList, setPokemonList] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGeneration, setActiveGeneration] = useState(1);
  const [userInput, setUserInput] = useState("");
  const sheetUrl = process.env.REACT_APP_POKEDEX_SHEET_URL;

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
          const shiny = columns[18]?.trim();

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

  const getPokemonsForGeneration = (generation, start, end) => {
    let capturedCount = 0;
    let shinyCount = 0;

    const pokemonsInGeneration = Array.from({ length: 160 }, (_, index) => {
      const id = start + index;
      const matchedPokemon = filteredPokemons.find(
        (pokemon) => parseInt(pokemon.id, 10) === id
      );

      if (matchedPokemon) {
        capturedCount++;
        if (matchedPokemon.Shiny?.toLowerCase() === "si") {
          shinyCount++;
        }
      }

      return id <= end
        ? {
            id: id.toString(),
            captured: Boolean(matchedPokemon),
            shiny: matchedPokemon?.Shiny?.toLowerCase() === "si",
          }
        : null;
    });

    // Aquí ajustamos para que la cantidad máxima de Pokémon sea el total de la región, no 160
    const totalPokemonsInGeneration = end - start + 1;

    return {
      pokemonsInGeneration,
      capturedCount,
      shinyCount,
      totalPokemonsInGeneration,
    };
  };

  const {
    pokemonsInGeneration,
    capturedCount,
    shinyCount,
    totalPokemonsInGeneration,
  } = getPokemonsForGeneration(
    activeGeneration,
    getGeneration(activeGeneration).start,
    getGeneration(activeGeneration).end
  );

  return (
    <div className="pokedex-container">
      <div className="pokedex-header">
        <div className="header-left">
          <h1>
            {icons[activeGeneration - 1]} Pokedex{" "}
            {regions[activeGeneration - 1]} de{" "}
            {users.find(([, name]) =>
              name.toLowerCase().includes(userInput.toLowerCase())
            )?.[1] || "Usuario"}
          </h1>
        </div>
        <div className="header-right">
          <p>
            Capturados: {capturedCount} / {totalPokemonsInGeneration}
          </p>
          ;<p>Shiny: {shinyCount}</p>
        </div>
      </div>

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
              {pokemons.map((pokemon, index) =>
                pokemon ? (
                  <div
                    key={index}
                    className={`pokemon-card ${
                      pokemon.shiny
                        ? "shiny"
                        : pokemon.captured
                        ? "captured"
                        : "default"
                    }`}
                  >
                    <img
                      src={`https://resource.pokemon-home.com/battledata/img/pokei128/icon${formatPokemonId(
                        pokemon.id
                      )}_f00_s0.png`}
                      alt={`Pokemon ${pokemon.id}`}
                    />
                    {pokemon.shiny && <span className="shiny-icon">✨</span>}
                  </div>
                ) : (
                  <div key={index} className="pokemon-card empty-slot"></div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Pokedex;
