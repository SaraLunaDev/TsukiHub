import React, { useState, useEffect } from "react";
import "./Inicio.css";

function Inicio() {
  // Estado para almacenar los datos de los usuarios
  const [userData, setUserData] = useState([]);
  // Estado para almacenar los encabezados de la hoja
  const [headers, setHeaders] = useState([]);
  // Estado para los filtros de búsqueda
  const [filter, setFilter] = useState({
    racha: "",
    mensajes: "",
    tickets: "",
    emotes: "",
  });
  // Estado paraa los datos filtrados
  const [filteredData, setFilteredData] = useState({});
  // Estado para los usuarios con logros
  const [achievementUsers, setAchievementUsers] = useState({});
  // Estado para el tooltip de hover
  const [hoverData, setHoverData] = useState({ message: "", position: null });

  // Lista de usuarios excluidos
  const EXCLUDED_USERS = ["StreamElements", "TsukiSoft", "TsukiwiChan"];

  // Calcula la edad a partir de la fecha de nacimiento
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

  // Edad de Sara
  const saraAge = calculateAge("2001-08-03");

  // Devuelve los datos filtrados según el tipo
  const getFilteredData = (type) => {
    if (!userData || userData.length === 0) return [];
    let filteredData = userData.filter(
      (user) =>
        user.nombre &&
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
        return bValue - aValue;
      });
    } else if (type === "emotes") {
      filteredData = filteredData.filter(
        (user) => user.emotes && user.emotes.length > 0
      );
      filteredData.sort((a, b) => b.emotes.length - a.emotes.length);
    } else {
      filteredData.sort((a, b) => b[type] - a[type]);
    }
    return filteredData.slice(0, 10);
  };

  // Carga y cachea los datos de la hoja de Google
  useEffect(() => {
    const sheetUrl = process.env.REACT_APP_USERDATA_SHEET_URL;

    if (!sheetUrl) {
      console.error("La URL del Google Sheet no está configurada en .env");
      return;
    }

    // Descarga y procesa los datos del sheet
    const fetchUserData = async () => {
      try {
        const response = await fetch(sheetUrl, { cache: "no-store" });
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

        // Guardar en cache local
        localStorage.setItem("userData", JSON.stringify(parsedData));
        localStorage.setItem(
          "achievementUsers",
          JSON.stringify(usersWithAchievements)
        );
        localStorage.setItem("userDataHeaders", JSON.stringify(headerRow));
        setUserData(parsedData);
        setAchievementUsers(usersWithAchievements);
        setHeaders(headerRow);
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    // Carga los datos desde el caché si existen, si no, los descarga
    const loadUserDataFromCache = () => {
      const cachedData = localStorage.getItem("userData");
      const cachedAchievements = localStorage.getItem("achievementUsers");
      const cachedHeaders = localStorage.getItem("userDataHeaders");
      if (cachedData && cachedAchievements && cachedHeaders) {
        setUserData(JSON.parse(cachedData));
        setAchievementUsers(JSON.parse(cachedAchievements));
        setHeaders(JSON.parse(cachedHeaders));
        // Siempre intenta actualizar en segundo plano
        fetchUserData();
      } else {
        fetchUserData();
      }
    };

    loadUserDataFromCache();
    // Eliminada la actualización periódica
  }, []);

  // Encabezados de logros
  const achievementHeaders = headers.filter((header) =>
    header.startsWith("l_")
  );

  // Detalles de cada logro
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

  // Filtra y ordena los datos según los filtros activos
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

  // Redirige a Twitch si se hace clic en una racha roja
  const handleRachaClick = (isRed) => {
    if (isRed) {
      window.location.href = "https://www.twitch.tv/tsukisoft";
    }
  };

  // Muestra el tooltip al hacer hover sobre la racha
  const handleRachaHover = (isRed, isBlue, event) => {
    const message = isRed
      ? "Escribe un mensaje para mantener tu racha"
      : isBlue
      ? "Usaste 25 tickets para congelar tu racha"
      : "";

    if (message) {
      const rect = event.target.getBoundingClientRect();
      setHoverData({
        message,
        position: {
          top: rect.top - 30,
          left: rect.left + rect.width / 2,
        },
      });
    }
  };

  // Oculta el tooltip al salir del hover
  const handleMouseLeave = () => {
    setHoverData({ message: "", position: null });
  };

  // Calcula el margen de superposición dinámico solo si es necesario
  const getUserIconOverlap = (userCount, iconSize = 40, maxWidth = 220) => {
    if (userCount * iconSize <= maxWidth) return null; // No solapar si caben
    // Calcular el margen negativo necesario para que todos quepan en maxWidth
    const overlap = (maxWidth - iconSize) / (userCount - 1) - iconSize;
    return `${overlap}px`;
  };

  // Renderizado principal del componente
  return (
    <div className="inicio-container">
      <div className="content-section">
        <div className="social-and-bio">
          <div className="social-links">
            <a
              href="https://www.youtube.com/@TsukiSoftYT/videos"
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
              href="https://x.com/TsukiSoft"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/static/resources/redes/x.png" alt="Twitter" />
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
              // Filtrar usuarios excluidos de los logros
              const users = (achievementUsers[key] || []).filter(
                (user) => user.nombre && !EXCLUDED_USERS.includes(user.nombre)
              );
              const overlapValue = getUserIconOverlap(users.length);
              const overlapClass = overlapValue ? " overlap" : "";
              const overlapStyle = overlapValue
                ? { "--user-icon-overlap": overlapValue }
                : {};
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
                            <div
                              className={`achievement-users${overlapClass}`}
                              style={overlapStyle}
                            >
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
                            <div
                              className={`achievement-users${overlapClass}`}
                              style={overlapStyle}
                            >
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
                      const isRed = user.racha?.startsWith("m_");
                      const isBlue = user.racha?.startsWith("f_");
                      const rachaValue = user.racha.replace(/^[mf]_/, "");

                      return (
                        <tr
                          key={user.id}
                          style={{ cursor: isRed ? "pointer" : "default" }}
                        >
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
                            onClick={() => handleRachaClick(isRed)}
                            onMouseEnter={(e) =>
                              handleRachaHover(isRed, isBlue, e)
                            }
                            onMouseLeave={handleMouseLeave}
                          >
                            {rachaValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {hoverData.message && hoverData.position && (
                  <div
                    className={`tooltip tooltip-visible`}
                    style={{
                      top: `${hoverData.position.top}px`,
                      left: `${hoverData.position.left}px`,
                    }}
                  >
                    {hoverData.message}
                  </div>
                )}
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
