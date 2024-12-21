import React, { useState, useEffect, useRef } from "react";
import "./TTS.css";

const TTS = () => {
  // Estado para manejar el tema (claro/oscuro)
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );

  // Estados para almacenar las voces y los sonidos
  const [voices, setVoices] = useState([]);
  const [sounds, setSounds] = useState([]);

  // Límite de caracteres en el editor
  const [characterLimit] = useState(500);
  const [text, setText] = useState(""); // Texto del editor

  const progressBarRef = useRef(null); // Referencia a la barra de progreso
  const [currentAudio, setCurrentAudio] = useState(null); // Audio actualmente en reproducción

  // Directorios de recursos
  const voicesDirectory = "./static/voices/";
  const soundsDirectory = "./static/sounds/";

  // Carga inicial de voces y sonidos desde JSON
  useEffect(() => {
    Promise.all([
      fetch("./static/voices-list.json").then((res) => res.json()),
      fetch("./static/sounds-list.json").then((res) => res.json()),
    ])
      .then(([voiceData, soundData]) => {
        setVoices(voiceData);
        setSounds(soundData);
      })
      .catch((error) => console.error("Error cargando datos:", error));
  }, []);

  // Inserta texto en la posición del cursor en el editor
  const insertTextAtCursor = (textToInsert) => {
    const editor = document.getElementById("textEditor");
    editor.focus();

    const selection = window.getSelection();
    const range =
      selection.rangeCount > 0
        ? selection.getRangeAt(0)
        : document.createRange();

    if (selection.rangeCount === 0) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const textNode = document.createTextNode(textToInsert);
    range.deleteContents();
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    const newText = editor.innerText;
    const styledText = validateText(newText);
    updateEditorWithStyledText(editor, styledText, newText.length);
    setText(newText);
  };

  // Maneja cambios en el contenido del editor
  const handleTextChange = (e) => {
    const editor = e.target;
    let newText = editor.innerText;

    if (newText.length > characterLimit) {
      newText = newText.substring(0, characterLimit);
      editor.innerText = newText;
    }

    const cursorPosition = saveCursorPosition(editor);
    const styledText = validateText(newText);
    updateEditorWithStyledText(editor, styledText, cursorPosition);
    setText(newText);
  };

  // Valida y estiliza el texto según patrones
  const validateText = (text) => {
    const formattedText = text.replace(
      /\(([^():]+):\)|\(([^():]+)\)/g,
      (match, voiceMatch, soundMatch) => {
        const isVoice =
          voiceMatch &&
          voices.some(
            (v) => v.name === voiceMatch || v.id.toString() === voiceMatch
          );
        const isSound =
          soundMatch &&
          sounds.some(
            (s) => s.name === soundMatch || s.id.toString() === soundMatch
          );

        if (isVoice) {
          return `<span class="rosa">(${voiceMatch}:)</span>`;
        } else if (isSound) {
          return `<span class="azul">(${soundMatch})</span>`;
        } else {
          return match;
        }
      }
    );
    return formattedText;
  };

  // Guarda la posición del cursor en el editor
  const saveCursorPosition = (element) => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Actualiza el contenido del editor con texto estilizado
  const updateEditorWithStyledText = (element, htmlContent, cursorPosition) => {
    element.innerHTML = htmlContent;
    placeCaretAtPosition(element, cursorPosition);
  };

  // Coloca el cursor en una posición específica
  const placeCaretAtPosition = (element, position) => {
    const range = document.createRange();
    const selection = window.getSelection();
    let currentNode = element;
    let charCount = 0;

    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const nextCharCount = charCount + currentNode.length;
        if (position <= nextCharCount) {
          range.setStart(currentNode, position - charCount);
          range.collapse(true);
          break;
        }
        charCount = nextCharCount;
      }
      currentNode = getNextNode(currentNode, element);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getNextNode = (node, container) => {
    if (node.firstChild) return node.firstChild;
    while (node) {
      if (node.nextSibling) return node.nextSibling;
      node = node.parentNode;
      if (node === container) break;
    }
    return null;
  };

  // Reproduce un archivo de audio
  const playAudio = (directory, file) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(`${directory}${file}`);
    audio.play();
    setCurrentAudio(audio);

    audio.addEventListener("ended", () => setCurrentAudio(null));
  };

  // Actualiza la barra de progreso al cambiar el texto
  useEffect(() => {
    if (progressBarRef.current) {
      const progressPercentage = Math.min(
        (text.length / characterLimit) * 100,
        100
      );
      progressBarRef.current.style.width = `${progressPercentage}%`;
    }
  }, [text]);

  return (
    <div className={`container-tts ${theme}`}>
      <div id="contentArea-tts">
        {/* Editor de texto */}
        <section id="intro-tts">
          <div
            id="textEditor"
            contentEditable="true"
            placeholder="Escribe aquí..."
            onInput={handleTextChange}
          ></div>
          <div id="textEditorProgress">
            <div id="progressBarContainer">
              <div id="progressBar" ref={progressBarRef}></div>
            </div>
            <button
              className="copyButton"
              onClick={() => navigator.clipboard.writeText(text)}
            ></button>
          </div>
        </section>

        <div className="tts-main-layout">
          {/* Columna izquierda: Voces y Sonidos */}
          <div className="tts-left-column">
            <section id="voices">
              <h2>Voces</h2>
              <div id="voiceContainer">
                {voices
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((voice) => (
                    <button
                      key={voice.id}
                      className="button-30"
                      onClick={() => {
                        const textToCopy = `(${voice.id}:)`;
                        navigator.clipboard.writeText(textToCopy);
                        insertTextAtCursor(textToCopy);
                        playAudio(voicesDirectory, voice.file);
                      }}
                    >
                      <span className="button-id voice-id">{voice.id}</span>
                      <span className="button-text">{voice.name}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section id="sounds">
              <h2>Sonidos</h2>
              <div id="soundContainer">
                {sounds
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((sound) => (
                    <button
                      key={sound.id}
                      className="button-30"
                      onClick={() => {
                        const textToCopy = `(${sound.id})`;
                        navigator.clipboard.writeText(textToCopy);
                        insertTextAtCursor(textToCopy);
                        playAudio(soundsDirectory, sound.file);
                      }}
                    >
                      <span className="button-id sound-id">{sound.id}</span>
                      <span className="button-text">{sound.name}</span>
                    </button>
                  ))}
              </div>
            </section>
          </div>

          {/* Columna derecha: Tutorial */}
          <section className="tts-right-column">
            <section className="section-null">
              <h2>Tutorial de Voces</h2>
              <p>
                Para usar las voces, escribe el nombre de la voz seguido de dos
                puntos entre paréntesis.
              </p>
              <div id="ejemplo">
                <span className="rosa">(Martin:)</span> Hola, soy Martín.
              </div>
              <p>Puedes combinar varias voces en el mismo texto:</p>
              <div id="ejemplo">
                <span className="rosa">(Martin:)</span> Hola, soy Martín, y
                ahora <span className="rosa">(Aerista:)</span> soy Aerista.
              </div>
            </section>
            <section className="section-null">
              <h2>Tutorial de Sonidos</h2>
              <p>
                Para usar los sonidos, escribe el nombre del sonido entre
                paréntesis.
              </p>
              <div id="ejemplo">
                Estoy muy triste <span className="azul">(llorar)</span>. Voy a
                beber agua <span className="azul">(servir-agua)</span>.
              </div>
            </section>
            <section className="section-null">
              <h2>Voces y Sonidos</h2>
              <p>Puedes combinar voces con sonidos:</p>
              <div id="ejemplo">
                <span className="rosa">(Arthur:)</span> Qué rica está esta
                cerveza <span className="azul">(tragar)</span>.{" "}
                <span className="rosa">(Aerista:)</span> ¡Deja de beber,
                borracho! <span className="azul">(puñetazo)</span>.
              </div>
            </section>
            <section className="section-null">
              <h2>Avanzado</h2>
              <p>
                Si haces clic en un botón, se copiará el ID en vez del nombre,
                permitiendo ahorrar caracteres.
              </p>
              <div id="ejemplo">
                <span className="rosa">(3:)</span> Hola, soy Arthur.{" "}
                <span className="rosa">(Arthur:)</span> También soy Arthur. Toma{" "}
                <span className="azul">(sartenazo)</span> y{" "}
                <span className="azul">(25)</span>.
              </div>
            </section>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TTS;
