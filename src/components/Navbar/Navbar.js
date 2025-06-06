import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import TwitchAuthButton from "./TwitchAuth";

function Navbar() {
  // Estado para controlar el modo oscuro
  const [darkMode, setDarkMode] = useState(false);

  // Alterna entre modo claro y oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode");
  };

  // Estado de usuario de Twitch, persistente
  const [twitchUser, setTwitchUser] = useState(() => {
    const saved = localStorage.getItem("twitchUser");
    return saved ? JSON.parse(saved) : null;
  });

  // Sincroniza el usuario de Twitch con localStorage al cargar
  useEffect(() => {
    const saved = localStorage.getItem("twitchUser");
    if (saved && !twitchUser) {
      setTwitchUser(JSON.parse(saved));
    }
  }, []);

  const handleTwitchLogin = (user) => {
    setTwitchUser(user);
    localStorage.setItem("twitchUser", JSON.stringify(user));
  };

  // Renderizado principal del componente
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img src="/static/resources/logo.png" alt="Logo" />
          </Link>

          <ul className="navbar-links">
            <li>
              <Link to="/juegos">Juegos</Link>
            </li>
            <li>
              <Link to="/pokedex/kanto">Pokedex</Link>
            </li>
            <li>
              <Link to="/Gacha/Dragon-Ball">Gacha</Link>
            </li>
            <li>
              <Link to="/TTS">TTS</Link>
            </li>
          </ul>
        </div>
        <div className="navbar-right">
          <button className="theme-button" onClick={toggleDarkMode}>
            <img
              src={
                darkMode
                  ? "/static/resources/sun.png"
                  : "/static/resources/moon.png"
              }
              alt="Cambiar tema"
            />
          </button>
          <TwitchAuthButton onLogin={handleTwitchLogin} user={twitchUser} />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
