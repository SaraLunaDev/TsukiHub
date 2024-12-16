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
    const fetchUserData = async () => {
      try {
        // Solicita la URL de la hoja de datos desde la Serverless Function
        const apiResponse = await fetch("/api/getUserDataSheet");
        const apiData = await apiResponse.json();

        if (!apiData.sheetUrl) {
          throw new Error("No se pudo obtener la URL de la hoja de datos.");
        }

        // Ahora, realiza una solicitud a la hoja de cálculo directamente
        const sheetResponse = await fetch(apiData.sheetUrl);
        const sheetData = await sheetResponse.text();

        // Procesa los datos del CSV
        const rows = sheetData.split("\n");
        const headerRow = rows[0].split(",");
        const bodyRows = rows.slice(1);

        console.log("Cabeceras del CSV:", headerRow);

        const parsedData = bodyRows.map((row) => {
          const columns = row.split(",");
          const obj = {};
          headerRow.forEach((header, index) => {
            obj[header.trim()] = columns[index]?.trim() || ""; // Asegura que no haya valores undefined
          });
          return obj;
        });

        // Guarda los datos en el estado
        setHeaders(headerRow); // Cabeceras
        setUserData(parsedData); // Datos procesados
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    fetchUserData(); // Llama a la función asíncrona
  }, []);

  const achievementHeaders = headers.filter((header) =>
    header.startsWith("l_")
  );

  const achievementDetails = {
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
    return userData
      .filter(
        (user) =>
          !EXCLUDED_USERS.includes(user.nombre) && // Excluir usuarios
          user.nombre.toLowerCase().includes(filter[type].toLowerCase())
      )
      .sort((a, b) => {
        if (type === "racha") {
          const rachaA = a.racha.startsWith("m_")
            ? +a.racha.substring(2)
            : +a.racha;
          const rachaB = b.racha.startsWith("m_")
            ? +b.racha.substring(2)
            : +b.racha;
          return rachaB - rachaA; // Ordena de mayor a menor
        }
        return b[type] - a[type]; // Para tickets, asegura que es numérico
      })
      .slice(0, 10);
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
          <h2 className="logros-header">Logros</h2>
          <div className="achievements-container">
            {achievementHeaders.map((header) => {
              const achievement = achievementDetails[header];
              if (!achievement) return null;

              return (
                <div className="achievement-item" key={header}>
                  <h2 className="header-logro">{achievement.name}</h2>
                  <div className="achievement-content">
                    {/* Iconos e información normal */}
                    <div className="achievement-icons">
                      <div className="achievement-row">
                        {/* Icono del logro */}
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
                        {/* Iconos de usuario */}
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
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                    {/* Descripción (invisible inicialmente) */}
                    <div className="achievement-description">
                      <p>{achievement.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="stats-section-global">
          {/* New Section */}
          <div className="user-stats-section">
            {["racha", "mensajes", "tickets"].map((type) => (
              <div className={`stats-section ${type}`} key={type}>
                <h2>{type.charAt(0).toUpperCase() + type.slice(1)}</h2>
                <div className="search-input-global">
                  <img
                    src="/static/resources/lupa.png"
                    alt="Lupa"
                    className="lupa-img"
                  />
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={filter[type]}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                    className="search-input"
                  ></input>
                </div>
                <table>
                  <tbody>
                    {getFilteredData(type).map((user) => (
                      <tr key={user.id}>
                        <td>
                          <img
                            src={user.pfp}
                            alt={user.nombre}
                            className="profile-pic"
                          />
                        </td>
                        <td>{user.nombre}</td>
                        <td className="user-data-text">
                          {type === "racha" ? (
                            user.racha.startsWith("m_") ? (
                              <span className="racha-special">
                                {user.racha.substring(2)}{" "}
                                {/* Elimina el prefijo m_ */}
                              </span>
                            ) : (
                              user.racha
                            )
                          ) : (
                            user[type]
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inicio;
