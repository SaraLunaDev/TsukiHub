import React, { useState, useEffect } from "react";
import "./TTS.css";

function TTS() {
  const [voices, setVoices] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [textEditorContent, setTextEditorContent] = useState("");
  const [characterLimit] = useState(500);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/credits");
      const data = await response.json();
      return data.availablePercentage || 0;
    } catch (error) {
      console.error("Error al obtener los créditos:", error);
      return 0;
    }
  };

  const fetchData = async () => {
    try {
      const [voiceData, soundData] = await Promise.all([
        fetch(`${process.env.REACT_APP_STATIC_URL}/voices-list.json`).then((res) =>
          res.json()
        ),
        fetch(`${process.env.REACT_APP_STATIC_URL}/sounds-list.json`).then((res) =>
          res.json()
        ),
      ]);
      setVoices(voiceData);
      setSounds(soundData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlayAudio = (directory, file) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(`${directory}${file}`);
    setCurrentAudio(audio);
    audio.play();

    audio.addEventListener("ended", () => {
      setCurrentAudio(null);
    });
  };

  const updateTextEditor = (e) => {
    let text = e.target.innerText;

    if (text.length > characterLimit) {
      text = text.substring(0, characterLimit);
    }

    setTextEditorContent(text);
  };

  return (
    <div className="tts-container">
      <header>
        <div id="headerContent">
          <img src="./static/resources/singgers.webp" alt="Logo" id="headerLogo" />
          <h1>TTSoft - Sonidos y Voces</h1>
          <img src="./static/resources/singgers.webp" alt="Logo" id="headerLogo" />
        </div>
      </header>
      <main id="layout">
        <div id="contentArea">
          <div id="mainContainer">
            <section id="intro">
              <h2>Holiwi!</h2>
              <p>
                En esta página puedes probar y usar voces y sonidos. En este recuadro, puedes validar tu texto y
                comprobar las voces y audios.
              </p>
              <div
                id="textEditor"
                contentEditable="true"
                placeholder="Escribe aquí..."
                onInput={updateTextEditor}
              >
                {textEditorContent}
              </div>
              <div id="textEditorProgress">
                <div id="progressBarContainer">
                  <div
                    id="progressBar"
                    style={{ width: `${(textEditorContent.length / characterLimit) * 100}%` }}
                  ></div>
                </div>
                <button id="copyButton" className="button-74">
                  Copiar
                </button>
              </div>
            </section>

            <section id="voices">
              <div id="voceslayout">
                <h2>Voces</h2>
                <div id="voiceContainer">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      className="button-30"
                      onClick={() => handlePlayAudio(process.env.REACT_APP_VOICES_DIR, voice.file)}
                    >
                      {voice.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section id="sounds">
              <h2>Sonidos</h2>
              <div id="soundContainer" className="scrollable-table">
                {sounds.map((sound) => (
                  <button
                    key={sound.id}
                    className="button-30"
                    onClick={() => handlePlayAudio(process.env.REACT_APP_SOUNDS_DIR, sound.file)}
                  >
                    {sound.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <footer>
        <p>© 2024 TsukiSoft</p>
      </footer>
    </div>
  );
}

export default TTS;
