import React, { useState, useEffect } from "react";
import Stars from "../Stars Left/Stars";
import { useParams, useNavigate } from "react-router-dom";
import "./Gacha.css";

function Gacha() {
  const [cardData, setCardData] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeBanner, setActiveBanner] = useState("Dragon Ball");
  const [userInput, setUserInput] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [cardsByStars, setCardsByStars] = useState({});
  const sheetUrl = process.env.REACT_APP_GACHA_SHEET_URL;
  const [loading, setLoading] = useState(true); // Estado para controlar la carga inicial
  const [selectedImage, setSelectedImage] = useState(null); // Almacena la imagen seleccionada
  const [selectedCharacterName, setSelectedCharacterName] = useState(null);

  const banners = [
    "Dragon Ball",
    "Monster Hunter",
    "Genshin",
    "One Piece",
    "Dark Souls",
  ];
  const bannerIcons = {
    "Dragon Ball": "🐲",
    "Monster Hunter": "🦖",
    Genshin: "🍙",
    "One Piece": "🌊",
    "Dark Souls": "🔥",
  };

  const handleImageClick = (imageSrc, characterName) => {
    setSelectedImage(imageSrc);
    setSelectedCharacterName(characterName); // Almacena el nombre del personaje
  };

  const getUserStats = () => {
    // Mapear usuarios con su conteo total de cartas
    const userStats = users.map(([userId, userName]) => {
      const userCards = cardData.find((data) => data.id === userId);
      if (!userCards) return { userId, userName, totalCards: 0 };

      const totalCards = Object.keys(bannerFolders).reduce((acc, banner) => {
        // Sumar todas las cartas de este banner
        stars.forEach((starLevel) => {
          const column = `${bannerFolders[banner]}${starLevel.charAt(0)}`;
          const cards = (userCards[column] || "")
            .split("/-/")
            .filter((card) => card.trim());
          acc += cards.length;
        });
        return acc;
      }, 0);

      return { userId, userName, totalCards };
    });

    // Ordenar usuarios por número total de cartas en orden descendente
    return userStats.sort((a, b) => b.totalCards - a.totalCards);
  };

  const { banner: starsLevel } = useParams();
  const navigate = useNavigate();

  const bannerFolders = {
    "Dragon Ball": "db",
    "Monster Hunter": "mh",
    Genshin: "gs",
    "One Piece": "op",
    "Dark Souls": "ds",
  };

  const stars = ["5 estrellas", "4 estrellas", "3 estrellas"];

  useEffect(() => {
    const fetchDataFromSheet = async (silentUpdate = false) => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
  
        const rows = data.split("\n").slice(1);
        const parsedData = [];
        const userMap = new Map();
  
        rows.forEach((row) => {
          const columns = row.split(",");
          const id = columns[0]?.trim();
          const userName = columns[1]?.trim();
  
          const userCards = {
            id,
            userName,
            db3: columns[2]?.trim(),
            db4: columns[3]?.trim(),
            db5: columns[4]?.trim(),
            ds3: columns[5]?.trim(),
            ds4: columns[6]?.trim(),
            ds5: columns[7]?.trim(),
            gs3: columns[8]?.trim(),
            gs4: columns[9]?.trim(),
            gs5: columns[10]?.trim(),
            mh3: columns[11]?.trim(),
            mh4: columns[12]?.trim(),
            mh5: columns[13]?.trim(),
            op3: columns[14]?.trim(),
            op4: columns[15]?.trim(),
            op5: columns[16]?.trim(),
          };
  
          parsedData.push(userCards);
          if (id && userName) {
            userMap.set(id, userName);
          }
        });
  
        const uniqueUsers = Array.from(userMap.entries());
  
        // Comparar con caché para evitar sobreescribir si no hay cambios
        const cachedData = localStorage.getItem("gachaData");
        const newData = JSON.stringify({ cardData: parsedData, users: uniqueUsers });
  
        if (newData !== cachedData) {
          console.log("Se detectaron cambios en los datos. Actualizando...");
          localStorage.setItem("gachaData", newData);
          setCardData(parsedData);
          setUsers(uniqueUsers);
        } else if (!silentUpdate) {
          console.log("No hay cambios en los datos.");
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };
  
    const loadCachedData = () => {
      const cachedData = localStorage.getItem("gachaData");
      if (cachedData) {
        console.log("Cargando datos desde el caché...");
        const parsedData = JSON.parse(cachedData);
        setCardData(parsedData.cardData);
        setUsers(parsedData.users);
      }
    };
  
    // Cargar desde caché antes de hacer la petición
    loadCachedData();
  
    // Hacer una primera actualización desde el CSV
    fetchDataFromSheet();
  
    // Configurar actualización cada minuto
    const intervalId = setInterval(() => {
      fetchDataFromSheet(true);
    }, 60000);
  
    return () => clearInterval(intervalId); // Limpiar intervalo al desmontar
  }, [sheetUrl]);
  

  useEffect(() => {
    const storedUser = localStorage.getItem("selectedUser");

    if (storedUser) {
      const matchingUser = users.find(([id]) => id === storedUser);
      if (matchingUser) {
        setUserInput(matchingUser[1]); // Establece el nombre del usuario en el input
      }
    } else if (users.length > 0) {
      setUserInput(users[0][1]); // Si no hay usuario guardado, selecciona el primero
      localStorage.setItem("selectedUser", users[0][0]); // Guarda el primer usuario por defecto
    }
  }, [users]);

  useEffect(() => {
    if (!starsLevel) {
      navigate(`/gacha/Dragon-Ball`); // Redirige al banner predeterminado
    } else {
      setActiveBanner(starsLevel.replace("-", " "));
    }
    setLoading(false);
  }, [starsLevel, navigate]);

  const handleUserInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);

    const matchedUser = users.find(([, name]) =>
      name.toLowerCase().includes(input.toLowerCase())
    );

    if (matchedUser) {
      const selectedUserId = matchedUser[0];
      localStorage.setItem("selectedUser", selectedUserId);
    }
  };

  // Cargar cartas desde los CSV
  useEffect(() => {
    const loadCardsByStars = async () => {
      const result = {};

      for (const [banner, folder] of Object.entries(bannerFolders)) {
        const response = await fetch(
          `/static/resources/gacha/${folder}/${folder}.csv`
        );
        const text = await response.text();

        const rows = text.split("\n").slice(1); // Omite los headers
        rows.forEach((row) => {
          const [id, name, star] = row.split(",").map((col) => col.trim());
          const starKey = `${star} estrellas`;

          if (!result[banner]) result[banner] = {};
          if (!result[banner][starKey]) result[banner][starKey] = [];

          result[banner][starKey].push({ id, name });
        });
      }

      setCardsByStars(result);
    };

    loadCardsByStars();
  }, []);

  const getUserCards = (banner, starLevel) => {
    const storedUser = localStorage.getItem("selectedUser");
    const searchQuery = userInput || storedUser || ""; // Prioriza el input actual, luego el usuario almacenado

    const userCards = cardData.find((data) =>
      data.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!userCards) {
      console.log(`No se encontraron cartas para el usuario: ${searchQuery}`);
      return [];
    }

    const column = `${bannerFolders[banner]}${starLevel.charAt(0)}`;
    const rawData = userCards[column] || "";

    // Dividir las cartas por "/-/" y limpiar caracteres innecesarios
    const cards = rawData
      .split("/-/")
      .map((card) => card.trim().replace(/^"|"$/g, "")) // Elimina comillas dobles alrededor de los nombres
      .filter((card) => card); // Elimina elementos vacíos

    console.log(
      `Cartas del usuario "${searchQuery}" para el banner "${banner}" y categoría "${starLevel}":`,
      cards
    );

    return cards;
  };

  const togglePopup = () => {
    setIsPopupOpen((prev) => !prev);
  };

  const handleUserClick = (userName) => {
    setUserInput(userName);
    const selectedUserId = users.find(([, name]) => name === userName)?.[0];
    localStorage.setItem("selectedUser", selectedUserId); // Guarda el ID del usuario
    setIsPopupOpen(false);
  };

  return (
    <div className="gacha-container">
      <div className="gacha-header">
        <div className="gacha-header-left">
          <h1>
            <span className="banner-icon">{bannerIcons[activeBanner]}</span>{" "}
            {/* Ícono dinámico */}
            Gacha - {activeBanner} de{" "}
            <span className="user-name-gacha" onClick={togglePopup}>
              {users.find(([, name]) =>
                name.toLowerCase().includes(userInput.toLowerCase())
              )?.[1] || "Usuario"}
            </span>
          </h1>
        </div>
      </div>

      {isPopupOpen && (
        <div className="popup-overlay" onClick={togglePopup}>
          <div
            className="popup-content"
            onClick={(e) => e.stopPropagation()} // Evita cerrar el popup al hacer clic en su contenido
          >
            <h2>Usuarios con más cartas</h2>
            <div className="user-list-scroll">
              {getUserStats().map((user, index) => (
                <div
                  key={user.userId}
                  className="user-row"
                  onClick={() => handleUserClick(user.userName)} // Cambia el usuario seleccionado al hacer clic
                >
                  <span className="user-position">{index + 1}</span>
                  <span className="user-name-popup">{user.userName}</span>
                  <span className="user-card-count">
                    {user.totalCards} cartas
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

      {selectedImage && (
        <div
          className="image-popup-overlay"
          onClick={() => {
            setSelectedImage(null);
            setSelectedCharacterName(null); // Restablece el nombre del personaje al cerrar el popup
          }}
        >
          <div
            className="image-popup-content popup-animate"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Carta seleccionada"
              className="popup-image-gacha"
            />
            {selectedCharacterName && (
              <p className="character-name-popup">{selectedCharacterName}</p> // Muestra el nombre del personaje
            )}
            <button
              className="close-button"
              onClick={() => {
                setSelectedImage(null);
                setSelectedCharacterName(null); // Restablece el nombre del personaje al cerrar el popup
              }}
            >
              ✖
            </button>
          </div>
        </div>
      )}

      <div className="filters-container-gacha">
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

        <div className="banner-buttons">
          {banners.map((banner) => (
            <button
              key={banner}
              className={`banner-button ${
                activeBanner === banner ? "active" : ""
              }`}
              onClick={() => {
                // Primero, actualizamos el estado de activeBanner
                setActiveBanner(banner);

                // Luego, actualizamos la URL
                navigate(`/gacha/${banner.replace(" ", "-")}`);
              }}
            >
              {banner}
            </button>
          ))}
        </div>
      </div>

      <div className="banner-section">
        {stars.map((starLevel, index) => {
          const cardsInCategory = cardsByStars[activeBanner]?.[starLevel] || [];
          const userCards = getUserCards(activeBanner, starLevel);

          return (
            <div className="star-section" key={index}>
              <div className="star-header">
                <Stars
                  rating={Number(starLevel.charAt(0))}
                  className="stars-large"
                />

                {/* Renderizar estrellas */}
                <span className="star-count">
                  {userCards.length} / {cardsInCategory.length}{" "}
                  {/* Mostrar conteo */}
                </span>
              </div>
              <div className="card-grid">
                {cardsInCategory.map((card) => {
                  const isCardOwned = userCards.some(
                    (userCard) =>
                      userCard.toLowerCase() === card.name.toLowerCase()
                  );

                  return (
                    <div
                      key={card.id}
                      className={`card ${
                        isCardOwned ? "card-owned" : "card-unowned"
                      }`}
                    >
                      <img
                        src={`${process.env.PUBLIC_URL}/static/resources/gacha/${bannerFolders[activeBanner]}/low/${card.id}_low.webp`}
                        alt={card.name}
                        className={isCardOwned ? "colored" : "grayscale"}
                        onClick={
                          isCardOwned
                            ? () =>
                                handleImageClick(
                                  `/static/resources/gacha/${bannerFolders[activeBanner]}/high/${card.id}_high.webp`,
                                  card.name // Pasa el nombre del personaje al hacer clic
                                )
                            : () => null
                        }
                      />
                      <span>{isCardOwned ? card.name : "???"}</span>{" "}
                      {/* Modificado aquí */}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Gacha;
