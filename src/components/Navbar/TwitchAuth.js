// TwitchAuth.js
import React, { useEffect, useState } from "react";

const TWITCH_CLIENT_ID = process.env.REACT_APP_TWITCH_CLIENT_ID;
const REDIRECT_URI =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/twitch-callback"
    : "https://tsuki-hub.vercel.app/twitch-callback";
const TWITCH_AUTH_URL =
  `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=token&scope=user:read:email`;

export default function TwitchAuthButton({ onLogin, user }) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    // Cargar el estado del modo desarrollador desde localStorage
    const saved = localStorage.getItem("developerMode");
    return saved === "true";
  });
  const avatarRef = React.useRef(null);

  // Constante para el ID del administrador
  const ADMIN_USER_ID = "173916175";
  const handleLogin = () => {
    window.location.href = TWITCH_AUTH_URL;
  }; // Función para alternar el modo desarrollador
  const toggleDeveloperMode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newMode = !isDeveloperMode;
    setIsDeveloperMode(newMode);
    localStorage.setItem("developerMode", newMode.toString());
    console.log(`Modo cambiado a: ${newMode ? "Developer" : "User"}`);

    // Recargar la página automáticamente para mostrar los cambios
    setTimeout(() => {
      window.location.reload();
    }, 100); // Pequeño delay para asegurar que localStorage se guarde
  };

  // Solo cierra el menú si el click NO es sobre el avatar ni el menú inline
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (
        avatarRef.current &&
        (avatarRef.current === e.target || avatarRef.current.contains(e.target))
      ) {
        // Click en el avatar: no cerrar
        return;
      }
      // Click en cualquier otro lado: cerrar
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    // Check for Twitch token in URL hash
    if (
      window.location.pathname === "/twitch-callback" &&
      window.location.hash
    ) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        setLoading(true);
        fetch("https://api.twitch.tv/helix/users", {
          headers: {
            "Client-ID": TWITCH_CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        })
          .then((res) => {
            if (!res.ok) throw new Error("Twitch API error");
            return res.json();
          })
          .then((data) => {
            if (data.data && data.data[0]) {
              const userObj = {
                name: data.data[0].display_name,
                image: data.data[0].profile_image_url,
                id: data.data[0].id,
                accessToken,
              };
              localStorage.setItem("twitchUser", JSON.stringify(userObj));
              if (typeof onLogin === "function") onLogin(userObj);
              // Redirige a la home usando window.location.assign para forzar recarga completa
              window.location.assign("/");
            } else {
              localStorage.removeItem("twitchUser");
              window.location.assign("/");
            }
          })
          .catch((err) => {
            localStorage.removeItem("twitchUser");
            window.location.assign("/");
          });
      }
    }
  }, [onLogin]);

  // Mostrar el botón de login SOLO si no hay usuario, no hay token en la URL y no está cargando
  if (!user && !window.location.hash && !loading) {
    return (
      <button
        className="twitch-login-button"
        onClick={handleLogin}
        disabled={loading}
      >
        <img
          src="/static/resources/twitch-icon.png"
          alt="Twitch"
          className="twitch-icon"
        />
        Iniciar sesión con Twitch
      </button>
    );
  }

  // Si está cargando (login en proceso), muestra un loader simple
  if (loading) {
    return (
      <span style={{ color: "#9147ff", fontWeight: "bold" }}>
        Conectando con Twitch...
      </span>
    );
  }

  // Si hay usuario (prop o localStorage), mostrarlo
  const userData =
    user ||
    (() => {
      const saved = localStorage.getItem("twitchUser");
      return saved ? JSON.parse(saved) : null;
    })();
  if (userData) {
    // Verificar si el usuario actual es el administrador
    const isAdmin = userData && String(userData.id) === ADMIN_USER_ID;

    return (
      <div className="twitch-inline-user" style={{ position: "relative" }}>
        <div ref={avatarRef} style={{ display: "flex", alignItems: "center" }}>
          <img
            src={userData.image}
            alt={userData.name}
            className="twitch-avatar twitch-avatar-only"
            style={{ cursor: "pointer" }}
            onClick={() => setMenuOpen((v) => !v)}
            tabIndex={0}
            aria-label="Mostrar menú de usuario"
          />{" "}
          {menuOpen && (
            <>
              <span className="twitch-inline-name">{userData.name}</span>{" "}
              {isAdmin && (
                <button
                  type="button"
                  className="admin-mode-toggle"
                  onClick={toggleDeveloperMode}
                  title={`Modo: ${
                    isDeveloperMode ? "Developer" : "User"
                  } - Click para cambiar`}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    marginLeft: "8px",
                    marginRight: "8px",
                    padding: "2px 4px",
                    borderRadius: "3px",
                    transition: "transform 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.background = "none";
                  }}
                >
                  {isDeveloperMode ? "⚙️" : "🧸"}
                </button>
              )}
              <button
                className="twitch-logout-inline"
                onClick={() => {
                  localStorage.removeItem("twitchUser");
                  if (typeof onLogin === "function") onLogin(null);
                  window.location.assign("/");
                }}
                title="Cerrar sesión"
              >
                ✖
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
