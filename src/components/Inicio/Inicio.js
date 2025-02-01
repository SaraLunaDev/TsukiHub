import React, { useState, useEffect } from "react";
import "./Inicio.css";

function Inicio() {
  const [userData, setUserData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filter, setFilter] = useState({
    racha: "",
    mensajes: "",
    tickets: "",
    emotes: "",
  });
  const [filteredData, setFilteredData] = useState({});
  const [achievementUsers, setAchievementUsers] = useState({});

  const EXCLUDED_USERS = ["StreamElements", "TsukiSoft"];

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const saraAge = calculateAge("2001-08-03");

  // **Move the getFilteredData function here, before JSX**
  const getFilteredData = (type) => {
    if (!userData || userData.length === 0) return [];

    // Filtra por el nombre y otros filtros generales (no afectará a "emotes")
    let filteredData = userData.filter(
      (user) =>
        user.nombre && // Asegura que user.nombre no es undefined
        !EXCLUDED_USERS.includes(user.nombre) &&
        user.nombre.toLowerCase().includes(filter[type]?.toLowerCase() || "")
    );

    if (type === "racha") {
      filteredData.sort((a, b) => {
        const aValue =
          a[type].startsWith("m_") || a[type].startsWith("f_")
            ? parseInt(a[type].slice(2), 10)
            : parseInt(a[type], 10);
        const bValue =
          b[type].startsWith("m_") || b[type].startsWith("f_")
            ? parseInt(b[type].slice(2), 10)
            : parseInt(b[type], 10);
        return bValue - aValue; // Orden descendente
      });
    } else if (type === "emotes") {
      // Filtra solo usuarios con emotes
      filteredData = filteredData.filter(
        (user) => user.emotes && user.emotes.length > 0
      );

      // Ordena por la cantidad de emotes (de mayor a menor)
      filteredData.sort((a, b) => b.emotes.length - a.emotes.length);
    } else {
      // Si no es "emotes", realiza un orden general para los otros tipos
      filteredData.sort((a, b) => b[type] - a[type]);
    }

    return filteredData.slice(0, 10);
  };

  useEffect(() => {
    const sheetUrl = process.env.REACT_APP_USERDATA_SHEET_URL;

    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    const fetchUserData = async (silentUpdate = false) => {
      try {
        const response = await fetch(sheetUrl);
        const data = await response.text();

        const rows = data.split("\n");
        const headerRow = rows[0].split(",");
        const bodyRows = rows.slice(1);

        const parsedData = bodyRows.map((row) => {
          const columns = row.split(",");
          const obj = {};
          headerRow.forEach((header, index) => {
            obj[header] = columns[index] || "";
          });

          // Procesar tickets
          const ticketIndex = headerRow.findIndex((header) =>
            header.toLowerCase().includes("ticket")
          );
          if (ticketIndex !== -1) {
            const ticketValue = columns[ticketIndex];
            obj.tickets = !isNaN(ticketValue) ? +ticketValue : 0;
          }

          // Procesar emotes
          const emotesIndex = headerRow.findIndex((header) =>
            header.toLowerCase().includes("emotes")
          );
          if (emotesIndex !== -1) {
            const emoteValue = columns[emotesIndex]?.trim();
            obj.emotes = emoteValue ? emoteValue.split(" ") : [];
          }

          return obj;
        });

        // Filtrar usuarios por logros
        const achievements = headerRow.filter((header) =>
          header.startsWith("l_")
        );
        const usersWithAchievements = {};

        achievements.forEach((achievement) => {
          usersWithAchievements[achievement] = parsedData.filter(
            (user) => user[achievement]?.toLowerCase() === "si"
          );
        });

        // Usuarios con todos los logros
        usersWithAchievements["l_platino"] = parsedData.filter((user) =>
          achievements.every(
            (achievement) => user[achievement]?.toLowerCase() === "si"
          )
        );

        const cachedData = localStorage.getItem("userData");
        const cachedAchievements = localStorage.getItem("achievementUsers");

        // Comparar con el caché para evitar actualizaciones innecesarias
        if (
          JSON.stringify(parsedData) !== cachedData ||
          JSON.stringify(usersWithAchievements) !== cachedAchievements
        ) {
          console.log("Se detectaron cambios en los datos. Actualizando...");
          localStorage.setItem("userData", JSON.stringify(parsedData));
          localStorage.setItem(
            "achievementUsers",
            JSON.stringify(usersWithAchievements)
          );
          setUserData(parsedData);
          setAchievementUsers(usersWithAchievements);
          setHeaders(headerRow);
        } else if (!silentUpdate) {
          console.log("No hay cambios en los datos.");
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    const loadUserDataFromCache = () => {
      const cachedData = localStorage.getItem("userData");
      const cachedAchievements = localStorage.getItem("achievementUsers");

      if (cachedData && cachedAchievements) {
        console.log("Cargando datos desde el caché...");
        setUserData(JSON.parse(cachedData));
        setAchievementUsers(JSON.parse(cachedAchievements));
      }
    };

    // Cargar primero desde el caché
    loadUserDataFromCache();

    // Hacer un fetch inicial para obtener datos nuevos
    fetchUserData();

    // Configurar el intervalo para actualizar cada minuto
    const intervalId = setInterval(() => {
      fetchUserData(true); // Hacer un fetch silencioso cada minuto
    }, 60000); // 60000 ms = 1 minuto

    // Limpia el intervalo al desmontar el componente
    return () => clearInterval(intervalId);
  }, []);

  const achievementHeaders = headers.filter((header) =>
    header.startsWith("l_")
  );

  const achievementDetails = {
    l_platino: {
      name: "Platino",
      description: "Conseguir todos los Logros",
    },
    l_racha: {
      name: "Vigía Octogenario",
      description:
        "Escribir al menos un mensaje durante 80 directos consecutivos",
    },
    l_mensajes: {
      name: "Eminencia de la Mensajería",
      description: "Llegar a los 10 mil mensajes enviados",
    },
    l_pokedex: {
      name: "Ápice de Kanto",
      description: "Consigue capturar todos los Pokemons de la región de Kanto",
    },
    l_eevees: {
      name: "Leyenda Evolutiva",
      description: "Consigue capturar todos los eevees disponibles",
    },
    l_gacha: {
      name: "La Tengu Implacable",
      description: "Consigue a Sara del banner Genshin en el Gacha",
    },
  };

  useEffect(() => {
    const filterData = (type) => {
      if (!userData || userData.length === 0) return [];

      let filtered = userData.filter(
        (user) =>
          user.nombre &&
          !EXCLUDED_USERS.includes(user.nombre) &&
          user.nombre.toLowerCase().includes(filter[type]?.toLowerCase() || "")
      );

      if (type === "emotes") {
        filtered = filtered.filter(
          (user) => user.emotes && user.emotes.length > 0
        );
        filtered.sort((a, b) => b.emotes.length - a.emotes.length);
      } else {
        filtered.sort((a, b) => b[type] - a[type]);
      }

      return filtered.slice(0, 10);
    };

    setFilteredData({
      racha: filterData("racha"),
      mensajes: filterData("mensajes"),
      tickets: filterData("tickets"),
      emotes: filterData("emotes"),
    });
  }, [userData, filter]);

  return (
    <div className="inicio-container">
      <div className="content-section">
        <div className="social-and-bio">
          <div className="social-links">
            <a
              href="https://www.youtube.com/@TsukiSoftRsb/videos"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/static/resources/redes/youtube.png" alt="YouTube" />
            </a>
            <a
              href="https://www.twitch.tv/tsukisoft"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/static/resources/redes/twitch.png" alt="Twitch" />
            </a>
            <a
              href="https://discord.gg/ed4ZPAqrXe"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/static/resources/redes/discord.png" alt="Discord" />
            </a>
            <a
              href="https://bsky.app/profile/tsukisoft.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/static/resources/redes/bluesky.png" alt="Bluesky" />
            </a>
            <a
              href="https://www.instagram.com/tsukisoft_/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/static/resources/redes/instagram.png"
                alt="Instagram"
              />
            </a>
          </div>
          <div className="bio-section">
            <div className="inicio-header">
              <h1>Holiwi!</h1>
              <img src="/static/resources/howody.webp" alt="Saludo"></img>
            </div>
            <p>
              Soy Sara también conocida en internet como Tsuki. Soy una chica de{" "}
              {saraAge} añitos que se divierte jugando jueguitos y compartiendo
              esa experiencia con vosotros.
            </p>
            <p>
              Suelo programar muchas cositas interactivas para vosotros y los
              streams, así que esta web nos va a servir para recopilar todas
              esas cositas en un sitio 🥰.
            </p>
          </div>
        </div>
        <div className="images-section">
          <img
            src="/static/resources/twitch.png"
            alt="Canal de Twitch"
            className="twitch-image"
          />
        </div>
      </div>
      <div className="achievements-and-stats">
        <div className="achievements-section">
          <div className="achievements-container">
            {Object.entries(achievementDetails).map(([key, details]) => {
              const users = achievementUsers[key] || [];
              return (
                <React.Fragment key={key}>
                  {/* Sección de Platino */}
                  {key === "l_platino" && (
                    <div className="achievement-item">
                      <h2 className="header-platino">{details.name}</h2>
                      <div className="achievement-content">
                        <div className="achievement-icons">
                          <div className="achievement-row">
                            {/* Icono de Platino */}
                            <div className="achievement-icon">
                              <img
                                src={`/static/resources/logros/${key.slice(
                                  2
                                )}.png`}
                                alt={details.name}
                                className="achievement-icon-img"
                              />
                            </div>

                            {/* Usuarios con el logro Platino */}
                            <div className="achievement-users">
                              {users.map((user) => (
                                <div className="user-icon" key={user.id}>
                                  <img
                                    src={user.pfp}
                                    alt={user.nombre}
                                    className="profile-pic-small"
                                  />
                                  <div className="user-name">{user.nombre}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="achievement-description">
                          <p>{details.description}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {key === "l_platino" && (
                    <h2 className="header-logros-global">Logros</h2>
                  )}

                  {/* Otras categorías de logros */}
                  {key !== "l_platino" && (
                    <div className="achievement-item">
                      <h2 className="header-logro">{details.name}</h2>
                      <div className="achievement-content">
                        <div className="achievement-icons">
                          <div className="achievement-row">
                            <div className="achievement-icon">
                              <img
                                src={`/static/resources/logros/${key.slice(
                                  2
                                )}.png`}
                                alt={details.name}
                                className="achievement-icon-img"
                              />
                            </div>

                            {/* Usuarios con el logro */}
                            <div className="achievement-users">
                              {users.map((user) => (
                                <div className="user-icon" key={user.id}>
                                  <img
                                    src={user.pfp}
                                    alt={user.nombre}
                                    className="profile-pic-small"
                                  />
                                  <div className="user-name">{user.nombre}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="achievement-description">
                          <p>{details.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="stats-section-global">
          <div className="user-stats-section">
            <div className="user-stats-container">
              <div className="stats-section racha">
                <h2>Racha</h2>
                <div className="search-input-global">
                  <img
                    src="/static/resources/lupa.png"
                    alt="Lupa"
                    className="lupa-img"
                  />
                  <input
                    type="text"
                    placeholder="Buscar Racha..."
                    value={filter.racha}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, racha: e.target.value }))
                    }
                    className="search-input"
                  />
                </div>
                <table>
                  <tbody>
                    {getFilteredData("racha").map((user) => {
                      // Eliminar prefijos y determinar el color
                      let rachaValue = user.racha;
                      const hasPrefix =
                        user.racha?.startsWith("m_") ||
                        user.racha?.startsWith("f_");
                      const isRed = user.racha?.startsWith("m_");
                      const isBlue = user.racha?.startsWith("f_");

                      // Si tiene prefijo, eliminarlo
                      if (hasPrefix) {
                        rachaValue = user.racha.slice(2);
                      }

                      return (
                        <tr key={user.id}>
                          <td>
                            <img
                              src={user.pfp}
                              alt={user.nombre}
                              className="profile-pic"
                            />
                          </td>
                          <td>{user.nombre}</td>
                          <td
                            style={{
                              color: isRed
                                ? "rgb(182, 38, 38)"
                                : isBlue
                                ? "rgb(38, 148, 182)"
                                : "var(--text-2)",
                            }}
                          >
                            {rachaValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="stats-section mensajes">
                <h2>Mensajes</h2>
                <div className="search-input-global">
                  <img
                    src="/static/resources/lupa.png"
                    alt="Lupa"
                    className="lupa-img"
                  />
                  <input
                    type="text"
                    placeholder="Buscar Mensajes..."
                    value={filter.mensajes}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        mensajes: e.target.value,
                      }))
                    }
                    className="search-input"
                  />
                </div>
                <table>
                  <tbody>
                    {getFilteredData("mensajes").map((user) => (
                      <tr key={user.id}>
                        <td>
                          <img
                            src={user.pfp}
                            alt={user.nombre}
                            className="profile-pic"
                          />
                        </td>
                        <td>{user.nombre}</td>
                        <td>{user.mensajes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="stats-section tickets">
                  <h2>Tickets</h2>
                  <div className="search-input-global">
                    <img
                      src="/static/resources/lupa.png"
                      alt="Lupa"
                      className="lupa-img"
                    />
                    <input
                      type="text"
                      placeholder="Buscar Tickets..."
                      value={filter.tickets}
                      onChange={(e) =>
                        setFilter((prev) => ({
                          ...prev,
                          tickets: e.target.value,
                        }))
                      }
                      className="search-input"
                    />
                  </div>
                  <div className="table-container">
                    <table>
                      <tbody>
                        {getFilteredData("tickets").map((user) => (
                          <tr key={user.id}>
                            <td>
                              <img
                                src={user.pfp}
                                alt={user.nombre}
                                className="profile-pic"
                              />
                            </td>
                            <td>{user.nombre}</td>
                            <td>{user.tickets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="stats-section emotes">
                  <h2>Emotes</h2>
                  <div className="search-input-global">
                    <img
                      src="/static/resources/lupa.png"
                      alt="Lupa"
                      className="lupa-img"
                    />
                    <input
                      type="text"
                      placeholder="Buscar Emotes..."
                      value={filter.emotes}
                      onChange={(e) =>
                        setFilter((prev) => ({
                          ...prev,
                          emotes: e.target.value,
                        }))
                      }
                      className="search-input"
                    />
                  </div>
                  <div className="table-container">
                    <table>
                      <tbody>
                        {getFilteredData("emotes").map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="user-profile-pic">
                                <img
                                  src={user.pfp}
                                  alt={user.nombre}
                                  className="profile-pic"
                                />
                              </div>
                            </td>
                            <div></div>
                            <td className="emotes-user-name">{user.nombre}</td>
                            <td className="emotes-section-table">
                              {user.emotes.length > 0
                                ? user.emotes.map((emoteId, index) => (
                                    <img
                                      key={index}
                                      src={`https://cdn.7tv.app/emote/${emoteId}/4x.avif`}
                                      alt={`Emote ${index}`}
                                      className="emote-img"
                                    />
                                  ))
                                : "No emotes"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inicio;
