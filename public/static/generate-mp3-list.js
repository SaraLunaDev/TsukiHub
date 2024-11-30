const fs = require('fs');
const path = require('path');

const projectFolder = path.resolve(__dirname, '..'); // Carpeta principal del proyecto
const configFolder = path.join(projectFolder, 'config');
const staticFolder = path.join(projectFolder, 'web', 'static');
const soundsFolder = path.join(staticFolder, 'sounds');
const voicesFolder = path.join(staticFolder, 'voices');

const soundsOutput = path.join(staticFolder, 'sounds-list.json');
const voicesOutput = path.join(staticFolder, 'voices-list.json');
const endpointsFile = path.join(configFolder, 'endpoint.txt');

// Función para leer el archivo `endpoint.txt` y mapear las voces
function parseEndpoints(filePath) {
    const voiceMap = {};

    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').map(line => line.trim()).filter(line => line);

    lines.forEach(line => {
        const [id, name, identifiers] = line.split('=');
        if (id && name && identifiers) {
            const identifierList = identifiers.split(',');
            const api = identifierList.some(id => !id.startsWith('google_')) ? 'elevenlabs' : 'google';
            voiceMap[parseInt(id, 10)] = { name, api };
        }
    });

    return voiceMap;
}

// Procesar sonidos
function processSounds(folder, output) {
    fs.readdir(folder, (err, files) => {
        if (err) {
            console.error('Error leyendo la carpeta de sonidos:', err);
            return;
        }

        const processedFiles = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const [id, ...nameParts] = file.replace('.mp3', '').split('_');
                if (!id || isNaN(id)) {
                    console.warn(`El archivo '${file}' no sigue el formato <ID>_<NOMBRE>.mp3 y será ignorado.`);
                    return null;
                }
                return {
                    id: parseInt(id, 10),
                    name: nameParts.join('_'),
                    file: file
                };
            })
            .filter(item => item !== null);

        fs.writeFileSync(output, JSON.stringify(processedFiles, null, 2));
        console.log(`Archivo ${output} generado con éxito con ${processedFiles.length} archivos.`);
    });
}

// Procesar voces
function processVoices(folder, output, voiceMap) {
    fs.readdir(folder, (err, files) => {
        if (err) {
            console.error('Error leyendo la carpeta de voces:', err);
            return;
        }

        const processedFiles = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const [id, ...nameParts] = file.replace('.mp3', '').split('_');
                if (!id || isNaN(id)) {
                    console.warn(`El archivo '${file}' no sigue el formato <ID>_<NOMBRE>.mp3 y será ignorado.`);
                    return null;
                }

                const voiceData = voiceMap[parseInt(id, 10)] || {};
                return {
                    id: parseInt(id, 10),
                    name: nameParts.join('_'),
                    file: file,
                    api: voiceData.api || 'unknown', // Por defecto 'unknown' si no está en el mapa
                    fullName: voiceData.name || nameParts.join('_') // Nombre completo desde `endpoint.txt`
                };
            })
            .filter(item => item !== null);

        fs.writeFileSync(output, JSON.stringify(processedFiles, null, 2));
        console.log(`Archivo ${output} generado con éxito con ${processedFiles.length} archivos.`);
    });
}

// Ejecutar procesos
const voiceMap = parseEndpoints(endpointsFile);
processSounds(soundsFolder, soundsOutput);
processVoices(voicesFolder, voicesOutput, voiceMap);
