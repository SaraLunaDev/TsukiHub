import React, { useState, useEffect } from "react";
import Stars from "../Stars Left/Stars";
import "./Gacha.css";

function Gacha() {
  const [cardData, setCardData] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeBanner, setActiveBanner] = useState("Dragon Ball");
  const [userInput, setUserInput] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [cardsByStars, setCardsByStars] = useState({});
  const sheetUrl = process.env.REACT_APP_GACHA_SHEET_URL;
  const [selectedImage, setSelectedImage] = useState(null); // Almacena la imagen seleccionada
  const banners = ["Dragon Ball", "Monster Hunter", "Genshin", "One Piece"];
  const bannerIcons = {
    "Dragon Ball": "🐲",
    "Monster Hunter": "🦖",
    Genshin: "🍙",
    "One Piece": "🌊",
  };

  const handleImageClick = (imageSrc) => {
    setSelectedImage(imageSrc);
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

  const handleUserInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);

    const matchedUser = users.find(([, name]) =>
      name.toLowerCase().includes(input.toLowerCase())
    );

    if (matchedUser) {
      const selectedUserId = matchedUser[0]; // Obtiene el ID del usuario coincidente
      localStorage.setItem("selectedUser", selectedUserId); // Guarda el ID del usuario en localStorage
    }
  };

  const bannerFolders = {
    "Dragon Ball": "db",
    "Monster Hunter": "mh",
    Genshin: "gs",
    "One Piece": "op",
  };

  const stars = ["5 estrellas", "4 estrellas", "3 estrellas"];

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
          const id = columns[0]?.trim();
          const userName = columns[1]?.trim();

          const userCards = {
            id,
            userName,
            db3: columns[2]?.trim(),
            db4: columns[3]?.trim(),
            db5: columns[4]?.trim(),
            mh3: columns[5]?.trim(),
            mh4: columns[6]?.trim(),
            mh5: columns[7]?.trim(),
            gs3: columns[8]?.trim(),
            gs4: columns[9]?.trim(),
            gs5: columns[10]?.trim(),
            op3: columns[11]?.trim(),
            op4: columns[12]?.trim(),
            op5: columns[13]?.trim(),
          };

          parsedData.push(userCards);
          if (id && userName) {
            userMap.set(id, userName);
          }
        });

        setCardData(parsedData);

        const uniqueUsers = Array.from(userMap.entries());
        setUsers(uniqueUsers);

        // Calcular el usuario con más cartas
        const userStats = uniqueUsers.map(([userId, userName]) => {
          const userCards = parsedData.find((data) => data.id === userId);
          if (!userCards) return { userId, userName, totalCards: 0 };

          const totalCards = Object.keys(bannerFolders).reduce(
            (acc, banner) => {
              stars.forEach((starLevel) => {
                const column = `${bannerFolders[banner]}${starLevel.charAt(0)}`;
                const cards = (userCards[column] || "")
                  .split("/-/")
                  .filter((card) => card.trim());
                acc += cards.length;
              });
              return acc;
            },
            0
          );

          return { userId, userName, totalCards };
        });

        const topUser = userStats.sort(
          (a, b) => b.totalCards - a.totalCards
        )[0]; // Usuario con más cartas

        // Establecer usuario predeterminado
        if (storedUser) {
          const storedUserName = uniqueUsers.find(
            ([id]) => id.toLowerCase() === storedUser.toLowerCase()
          )?.[1];
          setUserInput(storedUserName || "");
        } else if (topUser) {
          localStorage.setItem("selectedUser", topUser.userId); // Guardar usuario con más cartas en memoria
          setUserInput(topUser.userName); // Establecer como predeterminado
        } else {
          setUserInput(uniqueUsers[0]?.[1] || ""); // Si no hay usuarios, seleccionar el primero disponible
        }
      })
      .catch((error) => console.error("Error al cargar los datos:", error));
  }, [sheetUrl]);

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
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="image-popup-content popup-animate"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Carta seleccionada"
              className="popup-image"
            />
            <button
              className="close-button"
              onClick={() => setSelectedImage(null)}
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
              onClick={() => setActiveBanner(banner)}
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
                                  `/static/resources/gacha/${bannerFolders[activeBanner]}/high/${card.id}_high.webp`
                                )
                            : null // No hace nada si la carta no está poseída
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
