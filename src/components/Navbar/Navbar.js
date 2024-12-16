import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode");
  };

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

        <button className="theme-button" onClick={toggleDarkMode}>
          <img
            src={
              darkMode
                ? "/static/resources/sun.png"
                : "/static/resources/moon.png"
            }
            alt="Toggle Dark Mode"
          />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
