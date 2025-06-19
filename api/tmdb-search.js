export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, type = "multi" } = req.body; // type can be 'movie', 'tv', or 'multi'

  if (!query) return res.status(400).json({ error: "Missing query" });
  try {
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    console.log(`[tmdb-search] API key present: ${!!apiKey}`);
    if (!apiKey) {
      console.error("[tmdb-search] TMDB API key is missing from environment");
      return res.status(500).json({ error: "TMDB API key missing" });
    }

    console.log(`[tmdb-search] Searching for: ${query} (type: ${type})`);

    // Search TMDB
    const tmdbResp = await fetch(
      `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(
        query
      )}&language=es-ES&page=1`
    );

    if (!tmdbResp.ok) {
      return res.status(500).json({
        error: "TMDB API error",
        status: tmdbResp.status,
      });
    }

    const tmdbData = await tmdbResp.json();
    console.log(`[tmdb-search] Found ${tmdbData.results.length} results`);

    // Transform results and get additional details for each item
    const transformedResults = await Promise.all(
      tmdbData.results.slice(0, 10).map(async (item) => {
        // Get detailed information for each movie/TV show
        const detailType =
          item.media_type || (type === "movie" ? "movie" : "tv");

        // Get detail data and videos separately for better control
        const detailUrlES = `https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`;
        const detailUrlEN = `https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${apiKey}&language=en-US&append_to_response=credits`;
        const videosUrlES = `https://api.themoviedb.org/3/${detailType}/${item.id}/videos?api_key=${apiKey}&language=es-ES`;
        const videosUrlEN = `https://api.themoviedb.org/3/${detailType}/${item.id}/videos?api_key=${apiKey}&language=en-US`;

        console.log(
          `[tmdb-search] Fetching details for ${item.title || item.name} (ID: ${
            item.id
          })`
        );

        let detailData = {};
        let detailDataEN = {};
        let videosDataES = {};
        let videosDataEN = {};
        try {
          // Get Spanish version
          const detailResp = await fetch(detailUrlES);
          if (detailResp.ok) {
            detailData = await detailResp.json();
            console.log(
              `[tmdb-search] Spanish detail data received for ${
                item.title || item.name
              }`
            );
          }

          // Get English version for comparison
          const detailRespEN = await fetch(detailUrlEN);
          if (detailRespEN.ok) {
            detailDataEN = await detailRespEN.json();
            console.log(
              `[tmdb-search] English detail data received for ${
                item.title || item.name
              }`
            );
          }

          // Get videos in Spanish first
          const videosRespES = await fetch(videosUrlES);
          if (videosRespES.ok) {
            videosDataES = await videosRespES.json();
            console.log(
              `[tmdb-search] Spanish videos data received for ${
                item.title || item.name
              }: ${videosDataES.results?.length || 0} videos`
            );
          }

          // Get videos in English as backup
          const videosRespEN = await fetch(videosUrlEN);
          if (videosRespEN.ok) {
            videosDataEN = await videosRespEN.json();
            console.log(
              `[tmdb-search] English videos data received for ${
                item.title || item.name
              }: ${videosDataEN.results?.length || 0} videos`
            );
          }
        } catch (e) {
          console.error("Error fetching details for:", item.id, e);
        }

        // Log videos data for debugging
        if (videosDataES.results && videosDataES.results.length > 0) {
          console.log(
            `[tmdb-search] Found ${
              videosDataES.results.length
            } Spanish videos for ${item.title || item.name}`
          );
          videosDataES.results.forEach((video, index) => {
            console.log(
              `[tmdb-search] Spanish Video ${index + 1}: ${video.type} (${
                video.site
              }) - ${video.iso_639_1} - Key: ${video.key}`
            );
          });
        }

        if (videosDataEN.results && videosDataEN.results.length > 0) {
          console.log(
            `[tmdb-search] Found ${
              videosDataEN.results.length
            } English videos for ${item.title || item.name}`
          );
          videosDataEN.results.forEach((video, index) => {
            console.log(
              `[tmdb-search] English Video ${index + 1}: ${video.type} (${
                video.site
              }) - ${video.iso_639_1} - Key: ${video.key}`
            );
          });
        }

        // Format runtime/duration
        let duration = "";
        if (detailType === "movie" && detailData.runtime) {
          const hours = Math.floor(detailData.runtime / 60);
          const minutes = detailData.runtime % 60;
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else if (
          detailType === "tv" &&
          detailData.episode_run_time &&
          detailData.episode_run_time.length > 0
        ) {
          const avgRuntime = detailData.episode_run_time[0];
          const hours = Math.floor(avgRuntime / 60);
          const minutes = avgRuntime % 60;
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }

        // Get director (for movies) or creator (for TV shows)
        let director = "";
        let directorEN = "";

        // Get director from Spanish version
        if (detailData.credits) {
          console.log(
            `[tmdb-search] Spanish credits data available for ${
              item.title || item.name
            }`
          );
          console.log(
            `[tmdb-search] Spanish credits crew length: ${
              detailData.credits.crew?.length || 0
            }`
          );

          if (detailType === "movie") {
            const directorCredit = detailData.credits.crew?.find(
              (person) => person.job === "Director"
            );
            director = directorCredit ? directorCredit.name : "";
            console.log(`[tmdb-search] Spanish director found: ${director}`);
          } else if (detailType === "tv") {
            director =
              detailData.created_by
                ?.map((creator) => creator.name)
                .join(", ") || "";
            console.log(`[tmdb-search] Spanish TV creator found: ${director}`);

            // If director contains non-Latin characters, it might be in original language
            if (
              director &&
              /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(
                director
              )
            ) {
              console.log(
                `[tmdb-search] Spanish TV creator contains non-Latin characters: ${director}`
              );
              director = ""; // Clear it so we use English version
            }
          }
        } else {
          console.log(
            `[tmdb-search] No Spanish credits data for ${
              item.title || item.name
            }`
          );
        }

        // Get director from English version for comparison
        if (detailDataEN.credits) {
          console.log(
            `[tmdb-search] English credits data available for ${
              item.title || item.name
            }`
          );

          if (detailType === "movie") {
            const directorCreditEN = detailDataEN.credits.crew?.find(
              (person) => person.job === "Director"
            );
            directorEN = directorCreditEN ? directorCreditEN.name : "";
            console.log(`[tmdb-search] English director found: ${directorEN}`);
          } else if (detailType === "tv") {
            directorEN =
              detailDataEN.created_by
                ?.map((creator) => creator.name)
                .join(", ") || "";
            console.log(
              `[tmdb-search] English TV creator found: ${directorEN}`
            );
          }
        } else {
          console.log(
            `[tmdb-search] No English credits data for ${
              item.title || item.name
            }`
          );
        }

        // Use the best director information available
        let finalDirector = "";
        if (director && director.trim() !== "") {
          finalDirector = director;
          console.log(`[tmdb-search] Using Spanish director: ${finalDirector}`);
        } else if (directorEN && directorEN.trim() !== "") {
          finalDirector = directorEN;
          console.log(`[tmdb-search] Using English director: ${finalDirector}`);
        }

        // Get genres - prioritize Spanish, fallback to English
        let genresString = "";
        let genresES = [];
        let genresEN = [];

        // Get genres from Spanish data
        if (detailData.genres && Array.isArray(detailData.genres)) {
          genresES = detailData.genres
            .map((genre) => genre.name)
            .filter((name) => name);
          console.log(
            `[tmdb-search] Spanish genres found for ${
              item.title || item.name
            }: ${genresES.join(", ")}`
          );
        }

        // Get genres from English data as fallback
        if (detailDataEN.genres && Array.isArray(detailDataEN.genres)) {
          genresEN = detailDataEN.genres
            .map((genre) => genre.name)
            .filter((name) => name);
          console.log(
            `[tmdb-search] English genres found for ${
              item.title || item.name
            }: ${genresEN.join(", ")}`
          );
        }

        // Use Spanish genres if available, otherwise English
        if (genresES.length > 0) {
          genresString = genresES.join(", ");
          console.log(`[tmdb-search] Using Spanish genres: ${genresString}`);
        } else if (genresEN.length > 0) {
          genresString = genresEN.join(", ");
          console.log(
            `[tmdb-search] Using English genres (fallback): ${genresString}`
          );
        } else {
          console.log(
            `[tmdb-search] No genres found for ${item.title || item.name}`
          );
        } // Get trailer URL - PRIORIZAR ESPAÑOL SIEMPRE, CON FALLBACK A TEASERS
        let trailerUrl = "";
        console.log(
          `[tmdb-search] Starting trailer/teaser search for ${
            item.title || item.name
          }`
        );

        // Helper function to find video by type and language
        const findVideoByType = (videos, type, language = null) => {
          return videos.find((video) => {
            const isCorrectType = video.type === type;
            const isYoutube = video.site === "YouTube";
            const isCorrectLanguage = language
              ? video.iso_639_1 === language
              : true;

            return isCorrectType && isYoutube && isCorrectLanguage;
          });
        };

        // Paso 1: Buscar trailer en español
        if (videosDataES.results && videosDataES.results.length > 0) {
          console.log(
            `[tmdb-search] Searching Spanish trailers in ${videosDataES.results.length} Spanish videos`
          );

          const spanishTrailer = findVideoByType(
            videosDataES.results,
            "Trailer",
            "es"
          );

          if (spanishTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${spanishTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND SPANISH TRAILER: ${trailerUrl}`
            );
          } else {
            console.log(
              `[tmdb-search] ❌ No Spanish trailer found, trying Spanish teaser`
            );

            // Paso 1.1: Si no hay trailer en español, buscar teaser en español
            const spanishTeaser = findVideoByType(
              videosDataES.results,
              "Teaser",
              "es"
            );

            if (spanishTeaser) {
              trailerUrl = `https://www.youtube.com/watch?v=${spanishTeaser.key}`;
              console.log(
                `[tmdb-search] ✅ FOUND SPANISH TEASER (fallback): ${trailerUrl}`
              );
            } else {
              console.log(`[tmdb-search] ❌ No Spanish teaser found either`);
            }
          }
        }

        // Paso 2: Si no hay trailer/teaser en español, buscar en inglés
        if (
          !trailerUrl &&
          videosDataEN.results &&
          videosDataEN.results.length > 0
        ) {
          console.log(
            `[tmdb-search] No Spanish trailer/teaser found, searching English trailers in ${videosDataEN.results.length} English videos`
          );

          const englishTrailer = findVideoByType(
            videosDataEN.results,
            "Trailer",
            "en"
          );

          if (englishTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${englishTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ENGLISH TRAILER (fallback): ${trailerUrl}`
            );
          } else {
            console.log(
              `[tmdb-search] ❌ No English trailer found, trying English teaser`
            );

            // Paso 2.1: Si no hay trailer en inglés, buscar teaser en inglés
            const englishTeaser = findVideoByType(
              videosDataEN.results,
              "Teaser",
              "en"
            );

            if (englishTeaser) {
              trailerUrl = `https://www.youtube.com/watch?v=${englishTeaser.key}`;
              console.log(
                `[tmdb-search] ✅ FOUND ENGLISH TEASER (fallback): ${trailerUrl}`
              );
            } else {
              console.log(`[tmdb-search] ❌ No English teaser found either`);
            }
          }
        }

        // Paso 3: Como último recurso, buscar cualquier tipo de video promocional
        if (!trailerUrl) {
          console.log(
            `[tmdb-search] No trailers/teasers found in specific languages, searching any language`
          );

          const allVideos = [
            ...(videosDataES.results || []),
            ...(videosDataEN.results || []),
          ];

          // Priorizar: Trailer > Teaser > Clip
          const anyTrailer = findVideoByType(allVideos, "Trailer");
          const anyTeaser = findVideoByType(allVideos, "Teaser");
          const anyClip = findVideoByType(allVideos, "Clip");

          if (anyTrailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${anyTrailer.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ANY TRAILER (last resort): ${trailerUrl} (${anyTrailer.iso_639_1})`
            );
          } else if (anyTeaser) {
            trailerUrl = `https://www.youtube.com/watch?v=${anyTeaser.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ANY TEASER (last resort): ${trailerUrl} (${anyTeaser.iso_639_1})`
            );
          } else if (anyClip) {
            trailerUrl = `https://www.youtube.com/watch?v=${anyClip.key}`;
            console.log(
              `[tmdb-search] ✅ FOUND ANY CLIP (last resort): ${trailerUrl} (${anyClip.iso_639_1})`
            );
          } else {
            console.log(`[tmdb-search] ❌ No promotional videos found at all`);
          }
        }

        console.log(
          `[tmdb-search] Final trailer/teaser result for ${
            item.title || item.name
          }: ${trailerUrl || "NONE"}`
        ); // Get poster and backdrop - prioritize Spanish, fallback to English, then search result
        let posterPath = null;
        let backdropPath = null;

        // Priorizar carátula en español, luego inglés, luego resultado de búsqueda
        if (detailData.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${detailData.poster_path}`;
          console.log(
            `[tmdb-search] Using Spanish poster for ${item.title || item.name}`
          );
        } else if (detailDataEN.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${detailDataEN.poster_path}`;
          console.log(
            `[tmdb-search] Using English poster (fallback) for ${
              item.title || item.name
            }`
          );
        } else if (item.poster_path) {
          posterPath = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
          console.log(
            `[tmdb-search] Using search result poster for ${
              item.title || item.name
            }`
          );
        }

        // Priorizar imagen de fondo en español, luego inglés, luego resultado de búsqueda
        if (detailData.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${detailData.backdrop_path}`;
          console.log(
            `[tmdb-search] Using Spanish backdrop for ${
              item.title || item.name
            }`
          );
        } else if (detailDataEN.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${detailDataEN.backdrop_path}`;
          console.log(
            `[tmdb-search] Using English backdrop (fallback) for ${
              item.title || item.name
            }`
          );
        } else if (item.backdrop_path) {
          backdropPath = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
          console.log(
            `[tmdb-search] Using search result backdrop for ${
              item.title || item.name
            }`
          );
        }

        const result = {
          id: item.id,
          name: item.title || item.name,
          title: item.title || item.name,
          original_title: item.original_title || item.original_name || "",
          overview: item.overview || detailData.overview || "",
          release_date: item.release_date || item.first_air_date,
          poster_path: posterPath,
          backdrop_path: backdropPath,
          vote_average: item.vote_average || 0,
          vote_count: item.vote_count,
          genre_ids: item.genre_ids,
          original_language: item.original_language,
          popularity: item.popularity,
          media_type: detailType,
          adult: item.adult || false,
          // Additional detailed information
          duration: duration,
          director: finalDirector,
          trailer_url: trailerUrl,
          genres: genresString, // Add genres to result
          // TV specific fields
          first_air_date: item.first_air_date,
          origin_country: item.origin_country,
          original_name: item.original_name,
          number_of_seasons: detailData.number_of_seasons,
          number_of_episodes: detailData.number_of_episodes,
          // Movie specific fields
          original_title: item.original_title,
          video: item.video,
          runtime: detailData.runtime,
        };

        console.log(
          `[tmdb-search] Returning result for ${item.title || item.name}:`,
          {
            director: result.director,
            trailer_url: result.trailer_url,
            original_title: result.original_title,
            vote_average: result.vote_average,
          }
        );

        return result;
      })
    );

    console.log(`[tmdb-search] Processed ${transformedResults.length} results`);
    res.json({ results: transformedResults });
  } catch (e) {
    console.error("TMDB search error:", e);
    res.status(500).json({ error: e.message });
  }
}
