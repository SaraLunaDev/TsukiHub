import React from "react";
import "./Inicio.css";

function Inicio() {
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
              Soy Sara también conocida en internet como Tsuki. Soy una chica de
              23 añitos que se divierte jugando jueguitos y compartiendo esa
              experiencia con vosotros.
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
    </div>
  );
}

export default Inicio;
