# 🎬 Base de Datos de Películas y Series

Una aplicación web interactiva para gestionar una base de datos personal de películas, series y juegos, con integración a TMDB (The Movie Database) para obtener información detallada.

## ✨ Características

- 📱 **Interfaz Responsiva**: Diseño moderno que funciona en dispositivos móviles y desktop
- 🎭 **Gestión de Películas y Series**: Añadir, editar y visualizar contenido audiovisual
- 🎮 **Gestión de Juegos**: Base de datos integrada de videojuegos
- 🔍 **Búsqueda Avanzada**: Filtros por género, nota, fecha, estado y más
- 🌟 **Sistema de Calificaciones**: Notas personales y del chat de Discord
- 🎬 **Integración TMDB**: Información automática de películas (sinopsis, directores, géneros, trailers)
- 📊 **Google Sheets**: Respaldo automático en hojas de cálculo
- 🎵 **Sistema TTS**: Text-to-speech integrado
- 🏆 **Sistema de Logros**: Achievements por actividades completadas
- ⭐ **Sistema de Estrellas**: Valoraciones visuales

## 🚀 Tecnologías

- **Frontend**: React.js con componentes modulares
- **Backend**: Node.js + Express
- **Base de Datos**: Google Sheets API
- **APIs Externas**: TMDB API, IGDB API
- **Despliegue**: Vercel
- **Estilos**: CSS modules con diseño responsivo

## 📁 Estructura del Proyecto

```
├── api/                    # APIs serverless para Vercel
│   ├── add-game.js        # Añadir juegos
│   ├── add-movie.js       # Añadir películas/series
│   ├── add-recommendation.js
│   ├── edit-game.js       # Editar juegos
│   ├── igdb-search.js     # Búsqueda IGDB
│   ├── tmdb-search.js     # Búsqueda TMDB
│   └── validate-user.js   # Validación de usuarios
├── build/                 # Build de producción
├── public/               # Archivos públicos
├── src/                  # Código fuente React
│   ├── components/       # Componentes de React
│   │   ├── Inicio/      # Página principal
│   │   ├── Pelis/       # Gestión de películas/series
│   │   ├── Juegos/      # Gestión de juegos
│   │   ├── Navbar/      # Navegación
│   │   ├── TTS/         # Text-to-speech
│   │   ├── Stars/       # Sistema de estrellas
│   │   ├── Gacha/       # Sistema gacha
│   │   └── Pokedex/     # Easter egg Pokédex
│   └── hooks/           # Custom hooks
├── server.js            # Servidor local de desarrollo
├── package.json         # Dependencias y scripts
└── vercel.json         # Configuración de Vercel
```

## 🛠️ Instalación y Desarrollo

1. **Clonar el repositorio**

   ```bash
   git clone [url-del-repo]
   cd database-web
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   Crear archivo `.env` con:

   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your-sheet-id
   TMDB_API_KEY=your-tmdb-api-key
   IGDB_CLIENT_ID=your-igdb-client-id
   IGDB_CLIENT_SECRET=your-igdb-client-secret
   ```

4. **Ejecutar en modo desarrollo**

   ```bash
   # Servidor local
   node server.js

   # O para React development
   npm start
   ```

5. **Build para producción**
   ```bash
   npm run build
   ```

## 🌐 Despliegue

La aplicación está configurada para desplegarse automáticamente en Vercel:

- **Producción**: Conectado a la rama principal
- **APIs**: Serverless functions en `/api`
- **Variables de entorno**: Configuradas en Vercel dashboard

## 📊 Funcionalidades Principales

### 🎬 Gestión de Películas/Series

- Búsqueda automática en TMDB
- Extracción de datos: sinopsis, director, géneros, trailers
- Filtros avanzados: género, nota, fecha, desde-hasta
- Estados: Visto, Viendo, Planeo Ver, Abandonado
- Notas personales y del chat

### 🎮 Gestión de Juegos

- Integración con IGDB
- Información detallada de videojuegos
- Filtros similares a películas
- Sistema de calificaciones

### 🔍 Características Avanzadas

- **Búsqueda Inteligente**: Múltiples criterios simultáneos
- **Filtros Dinámicos**: Spinners de género, rangos de fecha
- **Responsive Design**: Adaptable a cualquier dispositivo
- **Carga Optimizada**: Lazy loading y paginación

## 🎯 APIs Integradas

- **TMDB**: Información de películas y series
- **IGDB**: Base de datos de videojuegos
- **Google Sheets**: Almacenamiento y respaldo
- **TTS**: Síntesis de voz

## 🏆 Características Especiales

- **Sistema de Logros**: Achievements desbloqueables
- **Pokédex**: Easter egg con información Pokémon
- **Gacha**: Sistema de recompensas aleatorias
- **Estrellas**: Valoraciones visuales interactivas
- **TTS**: Lectura de texto en voz alta

## 📝 Estado del Proyecto

✅ **Completado**: Base de datos poblada y funcional  
✅ **Limpieza**: Scripts temporales eliminados  
✅ **Producción**: Listo para uso en vivo

---

**Última actualización**: Junio 2025  
**Estado**: ✅ Producción - Base de datos poblada y optimizada
