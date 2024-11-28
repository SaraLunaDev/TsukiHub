import React, { useState, useEffect } from "react";
import "./Pokedex.css";

function Pokedex() {
  const [pokemonList, setPokemonList] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGeneration, setActiveGeneration] = useState(1);
  const [userInput, setUserInput] = useState("");
  const sheetUrl = process.env.REACT_APP_POKEDEX_SHEET_URL;

  const getGeneration = (id) => {
    const numericId = parseInt(id, 10);
    if (numericId >= 1 && numericId <= 151)
      return { generation: 1, start: 1, end: 151 };
    if (numericId >= 152 && numericId <= 251)
      return { generation: 2, start: 152, end: 251 };
    if (numericId >= 252 && numericId <= 386)
      return { generation: 3, start: 252, end: 386 };
    if (numericId >= 387 && numericId <= 493)
      return { generation: 4, start: 387, end: 493 };
    if (numericId >= 494 && numericId <= 649)
      return { generation: 5, start: 494, end: 649 };
    if (numericId >= 650 && numericId <= 721)
      return { generation: 6, start: 650, end: 721 };
    if (numericId >= 722 && numericId <= 809)
      return { generation: 7, start: 722, end: 809 };
    if (numericId >= 810 && numericId <= 898)
      return { generation: 8, start: 810, end: 898 };
    if (numericId >= 899 && numericId <= 1010)
      return { generation: 9, start: 899, end: 1010 };
    return { generation: "Desconocida", start: 0, end: 0 };
  };

  const regions = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Unova",
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
        const rows = data.split("\n").slice(1);
        const parsedData = [];
        const userMap = new Map();

        rows.forEach((row) => {
          const [
            id,
            Nombre,
            Usuario,
            Pokemon,
            Tipo1,
            Tipo2,
            Movimiento1,
            Movimiento2,
            Movimiento3,
            Movimiento4,
            HP,
            Ataque,
            Defensa,
            AtaqueEsp,
            DefensaEsp,
            Velocidad,
            XP,
            Shiny,
            ivHP,
            ivAtaque,
            ivDefensa,
            ivAtaqueEsp,
            ivDefensaEsp,
            ivVelocidad,
            Peso,
          ] = row.split(",");

          parsedData.push({
            id: id?.trim(),
            Nombre: Nombre?.trim(),
            Usuario: Usuario?.trim(),
            Pokemon: Pokemon?.trim(),
            Tipo1: Tipo1?.trim(),
            Tipo2: Tipo2?.trim(),
          });

          if (Usuario?.trim() && Nombre?.trim()) {
            userMap.set(Usuario.trim(), Nombre.trim());
          }
        });

        setPokemonList(parsedData);

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
    const pokemonsInGeneration = Array.from({ length: 160 }, (_, index) => {
      const id = start + index;
      return id <= end
        ? {
            id: id.toString(),
            captured: filteredPokemons.some(
              (pokemon) => parseInt(pokemon.id, 10) === id
            ),
          }
        : null;
    });
    return pokemonsInGeneration;
  };

  return (
    <div className="pokedex-container">
      <h1>
        Pokedex de{" "}
        {users.find(([, name]) =>
          name.toLowerCase().includes(userInput.toLowerCase())
        )?.[1] || "Usuario"}
      </h1>

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
        const { start, end } = getGeneration((genIndex + 1) * 100);
        const pokemons = getPokemonsForGeneration(genIndex + 1, start, end);

        return (
          <div key={genIndex} className="generation-section">
            <div className="pokemon-grid">
              {pokemons.map((pokemon, index) =>
                pokemon ? (
                  <div
                    key={index}
                    className="pokemon-card"
                    style={{
                      filter: pokemon.captured ? "none" : "grayscale(100%)",
                    }}
                  >
                    <img
                      src={`https://resource.pokemon-home.com/battledata/img/pokei128/icon${formatPokemonId(
                        pokemon.id
                      )}_f00_s0.png`}
                      alt={`Pokemon ${pokemon.id}`}
                      style={{
                        opacity: pokemon.captured ? "1" : "0.25",
                      }}
                    />
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
