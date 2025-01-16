import React, { useState, useEffect } from "react";
import "./Inicio.css";

function Inicio() {
  const [userData, setUserData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filter, setFilter] = useState({
    racha: "",
    mensajes: "",
    tickets: "",
  });

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

  useEffect(() => {
    fetch(process.env.REACT_APP_USERDATA_SHEET_URL)
      .then((response) => response.text())
      .then((data) => {
        const rows = data.split("\n");
        const headerRow = rows[0].split(",");
        const bodyRows = rows.slice(1);

        // Imprimir las cabeceras para ver cómo están
        console.log("Header Row:", headerRow);

        const parsedData = bodyRows.map((row) => {
          const columns = row.split(",");
          console.log("Columns for row:", columns); // Verifica cómo están estructuradas las columnas

          const obj = {};
          headerRow.forEach((header, index) => {
            obj[header] = columns[index] || ""; // Asegura que no haya valores undefined
          });

          // Verificar si existe 'tickets' u otro nombre similar
          const ticketIndex = headerRow.findIndex((header) =>
            header.toLowerCase().includes("ticket")
          );
          if (ticketIndex !== -1) {
            const ticketValue = columns[ticketIndex];
            console.log("Ticket Value: ", ticketValue); // Verifica el valor de tickets
            obj.tickets = !isNaN(ticketValue) ? +ticketValue : 0;
          } else {
            console.log("No column related to 'tickets' found.");
          }

          // Procesa los emotes
          const emotesIndex = headerRow.findIndex((header) =>
            header.toLowerCase().includes("emotes")
          );
          if (emotesIndex !== -1) {
            const emoteValue = columns[emotesIndex]?.trim(); // Asegúrate de eliminar espacios extra
            obj.emotes = emoteValue ? emoteValue.split(" ") : []; // Si está vacío, devuelve un array vacío
          }

          return obj;
        });

        setHeaders(headerRow); // Guarda los headers
        setUserData(parsedData); // Guarda los datos procesados
      })
      .catch((error) => console.error("Error fetching data:", error));
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

  const getFilteredData = (type) => {
    if (!userData || userData.length === 0) return [];

    // Filtra por el nombre y otros filtros generales (no afectará a "emotes")
    let filteredData = userData.filter(
      (user) =>
        user.nombre && // Asegura que user.nombre no es undefined
        !EXCLUDED_USERS.includes(user.nombre) &&
        user.nombre.toLowerCase().includes(filter[type]?.toLowerCase() || "")
    );

    if (type === "emotes") {
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
            {achievementHeaders.map((header) => {
              const achievement = achievementDetails[header];
              if (!achievement) return null;

              if (header === "l_platino") {
                return (
                  <div className="achievement-item" key={header}>
                    <div class="achievement-header">
                      <h2 className="header-platino">{achievement.name}</h2>
                      <div className="achievement-content">
                        <div className="achievement-icons">
                          <div className="achievement-row">
                            <div className="achievement-icon">
                              <img
                                src={`/static/resources/logros/${header.replace(
                                  "l_",
                                  ""
                                )}.png`}
                                alt={achievement.name}
                                className="achievement-icon-img"
                              />
                            </div>
                            <div className="achievement-users">
                              {userData
                                .filter(
                                  (user) => user[header]?.toLowerCase() === "si"
                                )
                                .map((user) => (
                                  <div className="user-icon" key={user.id}>
                                    <img
                                      src={user.pfp}
                                      alt={user.nombre}
                                      className="profile-pic-small"
                                    />
                                    <div className="user-name">
                                      {user.nombre}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                        <div className="achievement-description">
                          <p>{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <h2 className="logros-header">Logros</h2>
            {achievementHeaders.map((header) => {
              const achievement = achievementDetails[header];
              if (!achievement || header === "l_platino") return null;

              return (
                <div className="achievement-item" key={header}>
                  <div class="achievement-header">
                    <h2 className="header-logro">{achievement.name}</h2>
                    <div className="achievement-content">
                      <div className="achievement-icons">
                        <div className="achievement-row">
                          <div className="achievement-icon">
                            <img
                              src={`/static/resources/logros/${header.replace(
                                "l_",
                                ""
                              )}.png`}
                              alt={achievement.name}
                              className="achievement-icon-img"
                            />
                          </div>
                          <div className="achievement-users">
                            {userData
                              .filter(
                                (user) => user[header]?.toLowerCase() === "si"
                              )
                              .map((user) => (
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
                        <p>{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
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
                    {getFilteredData("racha").map((user) => (
                      <tr key={user.id}>
                        <td>
                          <img
                            src={user.pfp}
                            alt={user.nombre}
                            className="profile-pic"
                          />
                        </td>
                        <td>{user.nombre}</td>
                        <td>{user.racha}</td>
                      </tr>
                    ))}
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
