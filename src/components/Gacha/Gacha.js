import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Gacha.css";

function Gacha() {
  // Estado para almacenar los datos de cartas de todos los usuarios
  const [cardData, setCardData] = useState([]);
  // Estado para la lista de usuarios
  const [users, setUsers] = useState([]);
  // Estado para el banner activo
  const [activeBanner, setActiveBanner] = useState("Dragon Ball");
  // Estado para el input de usuario
  const [userInput, setUserInput] = useState("");
  // Estado para mostrar el popup de selección de usuario
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  // Estado para las cartas agrupadas por estrellas
  const [cardsByStars, setCardsByStars] = useState({});
  // URL de la hoja de Google para el gacha
  const sheetUrl = process.env.REACT_APP_GACHA_SHEET_URL;
  // Estado para controlar la carga inicial
  const [loading, setLoading] = useState(true);
  // Estado para la imagen seleccionada en el popup
  const [selectedImage, setSelectedImage] = useState(null);
  // Estado para el nombre del personaje seleccionado
  const [selectedCharacterName, setSelectedCharacterName] = useState(null);

  // Lista de banners disponibles
  const banners = [
    "Dragon Ball",
    "Monster Hunter",
    "Genshin",
    "One Piece",
    "Dark Souls",
  ];
  // Iconos para cada banner
  const bannerIcons = {
    "Dragon Ball": "🐲",
    "Monster Hunter": "🦖",
    Genshin: "🍙",
    "One Piece": "🌊",
    "Dark Souls": "🔥",
  };

  // Maneja el click en una imagen de carta para mostrar el popup
  const handleImageClick = (imageSrc, characterName) => {
    setSelectedImage(imageSrc);
    setSelectedCharacterName(characterName);
  };

  // Devuelve las estadísticas de cartas por usuario
  const getUserStats = () => {
    const userStats = users.map(([userId, userName]) => {
      const userCards = cardData.find((data) => data.id === userId);
      if (!userCards) return { userId, userName, totalCards: 0 };
      const totalCards = Object.keys(bannerFolders).reduce((acc, banner) => {
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
    // Ordena por número total de cartas descendente
    return userStats.sort((a, b) => b.totalCards - a.totalCards);
  };

  // Obtiene parámetros de la URL y navegación
  const { banner: starsLevel } = useParams();
  const navigate = useNavigate();

  // Mapeo de banners a carpetas
  const bannerFolders = {
    "Dragon Ball": "db",
    "Monster Hunter": "mh",
    Genshin: "gs",
    "One Piece": "op",
    "Dark Souls": "ds",
  };
  // Niveles de estrellas
  const stars = ["5 estrellas", "4 estrellas", "3 estrellas"];

  // Carga y cachea los datos de la hoja de Google
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
        // Compara con caché para evitar sobreescribir si no hay cambios
        const cachedData = localStorage.getItem("gachaData");
        const newData = JSON.stringify({
          cardData: parsedData,
          users: uniqueUsers,
        });
        if (newData !== cachedData) {
          localStorage.setItem("gachaData", newData);
          setCardData(parsedData);
          setUsers(uniqueUsers);
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };
    // Carga desde caché antes de hacer la petición
    const loadCachedData = () => {
      const cachedData = localStorage.getItem("gachaData");
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setCardData(parsedData.cardData);
        setUsers(parsedData.users);
      }
    };
    loadCachedData();
    fetchDataFromSheet();
    // Actualiza cada minuto
    const intervalId = setInterval(() => {
      fetchDataFromSheet(true);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [sheetUrl]);

  // Carga el usuario seleccionado desde localStorage o Twitch
  useEffect(() => {
    if (users.length > 0) {
      // 1. Si hay usuario de Twitch logueado y está en la lista, usarlo
      const twitchUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("twitchUser"));
        } catch {
          return null;
        }
      })();
      if (twitchUser && twitchUser.name) {
        const twitchUserName = users.find(
          ([, name]) => name.toLowerCase() === twitchUser.name.toLowerCase()
        );
        if (twitchUserName) {
          setUserInput(twitchUserName[1]);
          localStorage.setItem("selectedUser", twitchUserName[0]);
          return;
        }
      }
      // 2. Si hay usuario seleccionado en localStorage, usarlo
      const storedUser = localStorage.getItem("selectedUser");
      const matchingUser = users.find(([id]) => id === storedUser);
      if (matchingUser) {
        setUserInput(matchingUser[1]);
        return;
      }
      // 3. Si no, usar el primero
      setUserInput(users[0][1]);
      localStorage.setItem("selectedUser", users[0][0]);
    }
  }, [users]);

  // Cambia el banner activo según la URL
  useEffect(() => {
    if (!starsLevel) {
      navigate(`/gacha/Dragon-Ball`);
    } else {
      setActiveBanner(starsLevel.replace("-", " "));
    }
    setLoading(false);
  }, [starsLevel, navigate]);

  // Maneja el cambio de input de usuario
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

  // Carga las cartas de cada banner y las agrupa por estrellas
  useEffect(() => {
    const loadCardsByStars = async () => {
      const result = {};
      for (const [banner, folder] of Object.entries(bannerFolders)) {
        const response = await fetch(
          `/static/resources/gacha/${folder}/${folder}.csv`
        );
        const text = await response.text();
        const rows = text.split("\n").slice(1);
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

  // Pre-carga las imágenes de cartas de la siguiente y anterior categoría de estrellas para el banner activo
  useEffect(() => {
    if (!cardsByStars[activeBanner]) return;
    const starIndexes = stars.map((s, i) => i);
    const currentIndex = starIndexes.find(
      (i) => stars[i] === stars.find((s) => s === stars[0])
    );
    const preloadCards = (starLevel) => {
      const cards = cardsByStars[activeBanner]?.[starLevel] || [];
      cards.forEach((card) => {
        const img = new window.Image();
        img.src = `${process.env.PUBLIC_URL}/static/resources/gacha/${bannerFolders[activeBanner]}/low/${card.id}_low.webp`;
      });
    };
    // Pre-carga la siguiente categoría de estrellas
    if (cardsByStars[activeBanner][stars[1]]) preloadCards(stars[1]);
    if (cardsByStars[activeBanner][stars[2]]) preloadCards(stars[2]);
  }, [activeBanner, cardsByStars]);

  // Devuelve las cartas del usuario para un banner y nivel de estrellas
  const getUserCards = (banner, starLevel) => {
    const storedUser = localStorage.getItem("selectedUser");
    const searchQuery = userInput || storedUser || "";
    const userCards = cardData.find((data) =>
      data.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!userCards) {
      return [];
    }
    const column = `${bannerFolders[banner]}${starLevel.charAt(0)}`;
    const rawData = userCards[column] || "";
    const cards = rawData
      .split("/-/")
      .map((card) => card.trim().replace(/^"|"$/g, ""))
      .filter((card) => card);
    return cards;
  };

  // Alterna el popup de selección de usuario
  const togglePopup = () => {
    setIsPopupOpen((prev) => !prev);
  };

  // Cambia el usuario seleccionado al hacer clic en la lista
  const handleUserClick = (userName) => {
    setUserInput(userName);
    const selectedUserId = users.find(([, name]) => name === userName)?.[0];
    localStorage.setItem("selectedUser", selectedUserId);
    setIsPopupOpen(false);
  };

  // Renderizado principal del componente
  return (
    <div className="gacha-container">
      <div className="gacha-header">
        <div className="gacha-header-left">
          <h1>
            <span className="banner-icon">{bannerIcons[activeBanner]}</span>{" "}
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
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h2>Usuarios con más cartas</h2>
            <div className="user-list-scroll">
              {getUserStats().map((user, index) => (
                <div
                  key={user.userId}
                  className="user-row"
                  onClick={() => handleUserClick(user.userName)}
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
            setSelectedCharacterName(null);
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
              <p className="character-name-popup">{selectedCharacterName}</p>
            )}
            <button
              className="close-button"
              onClick={() => {
                setSelectedImage(null);
                setSelectedCharacterName(null);
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
                setActiveBanner(banner);
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
                <span className="nota-text nota-gacha">
                  {starLevel.charAt(0)}
                  <img
                    src="/static/resources/estrellas/star-filled.png"
                    alt="estrella"
                    className="nota-estrella"
                  />
                </span>
                <span className="star-count">
                  {userCards.length} / {cardsInCategory.length}{" "}
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
                                  card.name
                                )
                            : () => null
                        }
                      />
                      <span>{isCardOwned ? card.name : "???"}</span>{" "}
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
