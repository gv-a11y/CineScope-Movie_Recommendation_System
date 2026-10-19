import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { Movie, MovieDetail, Genre, CastMember, TrailerInfo } from './dto/movie.dto';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_W1280 = 'https://image.tmdb.org/t/p/w1280';
const IMG_W185 = 'https://image.tmdb.org/t/p/w185';

const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly tmdbApiKey = process.env.TMDB_API_KEY || 'f8f3fd8edc5a9c757319d172a5703920';

  constructor(private readonly db: DatabaseService) {}

  formatMovieTitle(title: string): string {
    if (!title) return '';
    const cleaned = title.trim();
    const match = cleaned.match(/^(.*),\s*(The|A|An)(\s*\(\d{4}\))?$/i);
    if (match) {
      const base = match[1].trim();
      const article = match[2];
      const year = match[3] || '';
      return `${article} ${base}${year}`;
    }
    return cleaned;
  }

  async searchMovies(
    query: string,
    searchType = 'title',
    yearStart?: number,
    yearEnd?: number,
  ): Promise<Movie[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const trimmed = query.trim();
    const cleanQuery = trimmed.replace(/^(the|a|an)\s+/i, '').trim();

    let yearFilter = '';
    const params: any[] = [];

    let queryStr = '';
    if (searchType === 'genre') {
      params.push(`%${trimmed}%`);
      if (yearStart) {
        yearFilter += ' AND m.release_year >= ?';
        params.push(yearStart);
      }
      if (yearEnd) {
        yearFilter += ' AND m.release_year <= ?';
        params.push(yearEnd);
      }

      queryStr = `
        SELECT m.movie_id, m.title, m.poster_url, m.release_year,
               m.overview, m.average_rating, m.tmdb_id,
               GROUP_CONCAT(DISTINCT g2.genre_name ORDER BY g2.genre_name SEPARATOR ', ') AS genres
        FROM Genres g
        JOIN Movie_Genres mg ON g.genre_id = mg.genre_id
        JOIN Movies m ON mg.movie_id = m.movie_id
        LEFT JOIN Movie_Genres mg2 ON m.movie_id = mg2.movie_id
        LEFT JOIN Genres g2 ON mg2.genre_id = g2.genre_id
        WHERE g.genre_name LIKE ? ${yearFilter}
        GROUP BY m.movie_id
        ORDER BY 
          (CASE WHEN m.poster_url IS NOT NULL AND m.poster_url != '' THEN 1 ELSE 0 END) DESC,
          m.average_rating DESC
        LIMIT 100
      `;
    } else {
      params.push(`%${trimmed}%`);
      params.push(`%${cleanQuery}%`);
      if (yearStart) {
        yearFilter += ' AND m.release_year >= ?';
        params.push(yearStart);
      }
      if (yearEnd) {
        yearFilter += ' AND m.release_year <= ?';
        params.push(yearEnd);
      }
      params.push(`${trimmed}%`);
      params.push(`${cleanQuery}%`);

      queryStr = `
        SELECT m.movie_id, m.title, m.poster_url, m.release_year,
               m.overview, m.average_rating, m.tmdb_id,
               GROUP_CONCAT(DISTINCT g2.genre_name ORDER BY g2.genre_name SEPARATOR ', ') AS genres
        FROM Movies m
        LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
        LEFT JOIN Genres g ON mg.genre_id = g.genre_id
        LEFT JOIN Movie_Genres mg2 ON m.movie_id = mg2.movie_id
        LEFT JOIN Genres g2 ON mg2.genre_id = g2.genre_id
        WHERE (m.title LIKE ? OR m.title LIKE ?) ${yearFilter}
        GROUP BY m.movie_id
        ORDER BY 
          (CASE WHEN m.poster_url IS NOT NULL AND m.poster_url != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN m.title LIKE ? THEN 1 WHEN m.title LIKE ? THEN 2 ELSE 3 END) ASC,
          m.average_rating DESC
        LIMIT 100
      `;
    }

    const rows = await this.db.query<any[]>(queryStr, params);
    const results: Movie[] = rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url || undefined,
      releaseYear: r.release_year,
      overview: r.overview,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      genres: r.genres || '',
    }));

    // Augment title search with live TMDB
    if (searchType === 'title' && this.tmdbApiKey) {
      try {
        const tmdbParams: any = {
          api_key: this.tmdbApiKey,
          query: cleanQuery || trimmed,
          language: 'en-US',
          region: 'IN',
        };
        if (yearStart && yearStart === yearEnd) {
          tmdbParams.primary_release_year = yearStart;
        } else if (yearStart) {
          tmdbParams.year = yearStart;
        }

        const resp = await axios.get(`${TMDB_BASE}/search/movie`, {
          params: tmdbParams,
          timeout: 3000,
        });

        const tmdbResults: any[] = resp.data?.results || [];
        const existingTmdbIds = new Set(results.map((r) => r.tmdbId).filter(Boolean));

        for (const m of tmdbResults) {
          if (existingTmdbIds.has(m.id)) continue;
          const posterPath = m.poster_path;
          const relDate = m.release_date || '';
          const genreNames = (m.genre_ids || [])
            .map((gid: number) => TMDB_GENRES[gid])
            .filter(Boolean);

          results.push({
            movieId: undefined,
            tmdbId: m.id,
            title: m.title || '',
            overview: m.overview || '',
            posterUrl: posterPath ? `${IMG_W500}${posterPath}` : undefined,
            releaseYear: relDate ? parseInt(relDate.substring(0, 4), 10) : undefined,
            averageRating: m.vote_average ? Math.round((m.vote_average / 2) * 10) / 10 : 0,
            genres: genreNames.slice(0, 3).join(', '),
          });
        }
      } catch (e: any) {
        this.logger.warn('TMDB search augmentation warning: ' + e.message);
      }
    }

    return results;
  }

  async getNewReleases(): Promise<Movie[]> {
    const queryStr = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.overview,
             m.tmdb_id,
             GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
      FROM Movies m
      LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genres g ON mg.genre_id = g.genre_id
      WHERE m.poster_url IS NOT NULL AND m.poster_url != ''
      GROUP BY m.movie_id
      ORDER BY m.release_year DESC
      LIMIT 100
    `;
    const rows = await this.db.query<any[]>(queryStr);
    return rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      overview: r.overview,
      genres: r.genres || '',
    }));
  }

  async getTopRated(): Promise<Movie[]> {
    const queryStr = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.overview,
             m.tmdb_id,
             GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
      FROM Movies m
      LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genres g ON mg.genre_id = g.genre_id
      WHERE m.poster_url IS NOT NULL AND m.poster_url != ''
      GROUP BY m.movie_id
      ORDER BY m.average_rating DESC, m.release_year DESC
      LIMIT 100
    `;
    const rows = await this.db.query<any[]>(queryStr);
    return rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      overview: r.overview,
      genres: r.genres || '',
    }));
  }

  async getOrbitMovies(): Promise<Movie[]> {
    const queryStr = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.tmdb_id
      FROM Movies m
      WHERE m.poster_url IS NOT NULL AND m.poster_url != ''
      ORDER BY m.average_rating DESC, m.release_year DESC
      LIMIT 60
    `;
    const rows = await this.db.query<any[]>(queryStr);
    return rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
    }));
  }

  async getRecommendations(movieId: number): Promise<Movie[]> {
    const queryStr = `
      SELECT
          m2.movie_id,
          m2.title,
          m2.poster_url,
          m2.release_year,
          m2.overview,
          m2.tmdb_id,
          ROUND(AVG(r2.rating), 2) AS average_rating,
          GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
      FROM (
          SELECT user_id
          FROM Ratings
          WHERE movie_id = ? AND rating >= 4.0
          ORDER BY rated_at DESC
          LIMIT 500
      ) AS top_users
      JOIN Ratings r2 ON top_users.user_id = r2.user_id
      JOIN Movies m2 ON r2.movie_id = m2.movie_id
      LEFT JOIN Movie_Genres mg1 ON mg1.movie_id = ?
      LEFT JOIN Movie_Genres mg2
          ON mg2.movie_id = m2.movie_id
         AND mg1.genre_id = mg2.genre_id
      LEFT JOIN Genres g ON mg2.genre_id = g.genre_id
      WHERE r2.movie_id != ?
      AND m2.poster_url IS NOT NULL AND m2.poster_url != ''
      GROUP BY m2.movie_id
      HAVING COUNT(DISTINCT r2.user_id) >= 5
      ORDER BY (
          COUNT(DISTINCT r2.user_id) * 0.6 +
          AVG(r2.rating) * 0.3 +
          COUNT(DISTINCT mg2.genre_id) * 0.1
      ) DESC
      LIMIT 10
    `;

    try {
      const rows = await this.db.query<any[]>(queryStr, [movieId, movieId, movieId]);
      if (rows.length > 0) {
        return rows.map((r) => ({
          movieId: r.movie_id,
          tmdbId: r.tmdb_id,
          title: this.formatMovieTitle(r.title),
          posterUrl: r.poster_url,
          releaseYear: r.release_year,
          overview: r.overview,
          averageRating: r.average_rating ? Number(r.average_rating) : 0,
          genres: r.genres || '',
        }));
      }
    } catch (e: any) {
      this.logger.warn('Collaborative filtering error: ' + e.message);
    }

    // Fallback: Same genre recommendations
    const fallbackQuery = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.overview, m.tmdb_id,
             GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
      FROM Movies m
      JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      JOIN Genres g ON mg.genre_id = g.genre_id
      WHERE mg.genre_id IN (SELECT genre_id FROM Movie_Genres WHERE movie_id = ?)
        AND m.movie_id != ?
        AND m.poster_url IS NOT NULL AND m.poster_url != ''
      GROUP BY m.movie_id
      ORDER BY m.average_rating DESC
      LIMIT 10
    `;
    const fallbackRows = await this.db.query<any[]>(fallbackQuery, [movieId, movieId]);
    return fallbackRows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      overview: r.overview,
      genres: r.genres || '',
    }));
  }

  async getAllGenres(): Promise<Genre[]> {
    const rows = await this.db.query<any[]>('SELECT genre_id, genre_name FROM Genres ORDER BY genre_name');
    return rows.map((r) => ({
      genreId: r.genre_id,
      genreName: r.genre_name,
    }));
  }

  async getMoviesByGenres(
    genreIds: number[],
    yearStart?: number,
    yearEnd?: number,
  ): Promise<Movie[]> {
    if (!genreIds || genreIds.length === 0) {
      return [];
    }

    const placeholders = genreIds.map(() => '?').join(',');
    let yearFilter = '';
    const params: any[] = [...genreIds];

    if (yearStart) {
      yearFilter += ' AND m.release_year >= ?';
      params.push(yearStart);
    }
    if (yearEnd) {
      yearFilter += ' AND m.release_year <= ?';
      params.push(yearEnd);
    }

    const queryStr = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year,
             m.average_rating, m.overview, m.tmdb_id,
             GROUP_CONCAT(DISTINCT g2.genre_name ORDER BY g2.genre_name SEPARATOR ', ') AS genres
      FROM Movies m
      JOIN Movie_Genres mg ON mg.movie_id = m.movie_id
      LEFT JOIN Movie_Genres mg2 ON m.movie_id = mg2.movie_id
      LEFT JOIN Genres g2 ON mg2.genre_id = g2.genre_id
      WHERE mg.genre_id IN (${placeholders}) ${yearFilter}
      AND m.poster_url IS NOT NULL AND m.poster_url != ''
      GROUP BY m.movie_id
      ORDER BY m.average_rating DESC
      LIMIT 100
    `;

    const rows = await this.db.query<any[]>(queryStr, params);
    return rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      overview: r.overview,
      genres: r.genres || '',
    }));
  }

  async getMovieDetail(movieId: number): Promise<MovieDetail> {
    const queryStr = `
      SELECT m.movie_id, m.title, m.release_year, m.overview,
             m.poster_url, m.average_rating, m.tmdb_id,
             GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
      FROM Movies m
      LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genres g ON mg.genre_id = g.genre_id
      WHERE m.movie_id = ?
      GROUP BY m.movie_id
    `;
    const rows = await this.db.query<any[]>(queryStr, [movieId]);

    if (rows.length === 0) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    const m = rows[0];
    let cast: CastMember[] = [];
    let backdropUrl: string | undefined = undefined;
    let runtime: number | undefined = undefined;
    let tagline: string | undefined = undefined;

    let tmdbId = m.tmdb_id;
    if (!tmdbId && this.tmdbApiKey) {
      try {
        const cleanTitle = this.formatMovieTitle(m.title).replace(/\s*\(\d{4}\)$/, '').trim();
        const searchResp = await axios.get(`${TMDB_BASE}/search/movie`, {
          params: {
            api_key: this.tmdbApiKey,
            query: cleanTitle,
            language: 'en-US',
            year: m.release_year,
          },
          timeout: 4000,
        });
        const first = searchResp.data?.results?.[0];
        if (first?.id) {
          tmdbId = first.id;
          this.db.query('UPDATE Movies SET tmdb_id = ? WHERE movie_id = ?', [tmdbId, movieId]).catch(() => {});
        }
      } catch (err: any) {
        this.logger.warn(`Failed to resolve TMDB ID for movie ${m.title}: ${err.message}`);
      }
    }

    if (tmdbId && this.tmdbApiKey) {
      try {
        let data: any = null;
        try {
          const movieResp = await axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
            params: {
              api_key: this.tmdbApiKey,
              language: 'en-US',
              append_to_response: 'credits',
            },
            timeout: 5000,
          });
          data = movieResp.data;
        } catch {
          // Fallback to fetch if axios hits connection reset
          const fetchResp = await fetch(
            `${TMDB_BASE}/movie/${tmdbId}?api_key=${this.tmdbApiKey}&language=en-US&append_to_response=credits`,
          );
          if (fetchResp.ok) {
            data = await fetchResp.json();
          }
        }

        if (data) {
          const rawCast = data?.credits?.cast || [];
          cast = rawCast.slice(0, 16).map((p: any) => ({
            name: p.name,
            character: p.character || '',
            profileUrl: p.profile_path ? `${IMG_W185}${p.profile_path}` : undefined,
          }));

          if (data?.backdrop_path) {
            backdropUrl = `${IMG_W1280}${data.backdrop_path}`;
          }
          runtime = data?.runtime;
          tagline = data?.tagline || '';
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch TMDB details for tmdb_id ${tmdbId}: ${err.message}`);
      }
    }

    return {
      movieId: m.movie_id,
      tmdbId: m.tmdb_id,
      title: this.formatMovieTitle(m.title),
      releaseYear: m.release_year,
      overview: m.overview,
      posterUrl: m.poster_url,
      averageRating: m.average_rating ? Number(m.average_rating) : 0,
      genres: m.genres || '',
      backdropUrl,
      runtime,
      tagline,
      cast,
    };
  }

  async ensureLocalMovie(tmdbId: number): Promise<number> {
    const existing = await this.db.query<any[]>(
      'SELECT movie_id FROM Movies WHERE tmdb_id = ?',
      [tmdbId],
    );
    if (existing.length > 0) {
      return existing[0].movie_id;
    }

    const resp = await axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
      params: { api_key: this.tmdbApiKey, language: 'en-US' },
      timeout: 8000,
    });
    const d = resp.data;

    // Genres handling
    const dbGenres: number[] = [];
    for (const g of d.genres || []) {
      const gName = g.name;
      const gRow = await this.db.query<any[]>(
        'SELECT genre_id FROM Genres WHERE genre_name = ?',
        [gName],
      );
      if (gRow.length > 0) {
        dbGenres.push(gRow[0].genre_id);
      } else {
        const maxG = await this.db.query<any[]>('SELECT MAX(genre_id) as max_id FROM Genres');
        const nextGId = (maxG[0]?.max_id || 0) + 1;
        await this.db.query('INSERT INTO Genres (genre_id, genre_name) VALUES (?, ?)', [
          nextGId,
          gName,
        ]);
        dbGenres.push(nextGId);
      }
    }

    const maxM = await this.db.query<any[]>('SELECT MAX(movie_id) as max_id FROM Movies');
    const newMid = (maxM[0]?.max_id || 0) + 1;

    const posterPath = d.poster_path;
    const posterUrl = posterPath ? `${IMG_W500}${posterPath}` : null;
    const relDate = d.release_date || '';
    const releaseYear = relDate && relDate.length >= 4 ? parseInt(relDate.substring(0, 4), 10) : null;
    const avgRating = d.vote_average ? Math.round((d.vote_average / 2) * 100) / 100 : 0;

    await this.db.query(
      `INSERT INTO Movies (movie_id, title, release_year, tmdb_id, overview, poster_url, average_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newMid, d.title || 'Unknown', releaseYear, tmdbId, d.overview || '', posterUrl, avgRating],
    );

    for (const gid of dbGenres) {
      await this.db.query(
        'INSERT IGNORE INTO Movie_Genres (movie_id, genre_id) VALUES (?, ?)',
        [newMid, gid],
      );
    }

    return newMid;
  }

  async getTrailer(movieId: number): Promise<TrailerInfo> {
    const rows = await this.db.query<any[]>(
      'SELECT tmdb_id, title FROM Movies WHERE movie_id = ?',
      [movieId],
    );

    if (rows.length === 0 || !rows[0].tmdb_id) {
      throw new NotFoundException('Movie not found or missing TMDB ID');
    }

    const tmdbId = rows[0].tmdb_id;
    const title = rows[0].title;

    const resp = await axios.get(`${TMDB_BASE}/movie/${tmdbId}/videos`, {
      params: { api_key: this.tmdbApiKey, language: 'en-US' },
      timeout: 8000,
    });

    const results = resp.data?.results || [];
    let videoKey: string | null = null;

    // Official YouTube Trailer first
    for (const v of results) {
      if (v.site === 'YouTube' && v.type === 'Trailer' && v.official) {
        videoKey = v.key;
        break;
      }
    }

    // Any Trailer or Teaser
    if (!videoKey) {
      for (const v of results) {
        if (v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) {
          videoKey = v.key;
          break;
        }
      }
    }

    if (!videoKey) {
      throw new NotFoundException('No trailer available for this movie');
    }

    return { videoKey, title };
  }

  async getTmdbNowPlaying(): Promise<Movie[]> {
    try {
      const thisYear = new Date().getFullYear();
      const [r1, r2] = await Promise.all([
        axios.get(`${TMDB_BASE}/movie/now_playing`, {
          params: { api_key: this.tmdbApiKey, language: 'en-US', page: 1 },
          timeout: 6000,
        }),
        axios.get(`${TMDB_BASE}/discover/movie`, {
          params: {
            api_key: this.tmdbApiKey,
            language: 'en-US',
            page: 1,
            with_origin_country: 'IN',
            'primary_release_date.gte': `${thisYear - 1}-01-01`,
            sort_by: 'popularity.desc',
          },
          timeout: 6000,
        }),
      ]);

      const d1 = (r1.data?.results || []).slice(0, 10);
      const d2 = (r2.data?.results || []).slice(0, 10);

      const mixed: any[] = [];
      const maxLen = Math.max(d1.length, d2.length);
      for (let i = 0; i < maxLen; i++) {
        if (d1[i]) mixed.push(d1[i]);
        if (d2[i]) mixed.push(d2[i]);
      }

      return this.mapTmdbToCards(mixed);
    } catch {
      return [];
    }
  }

  async getTmdbTrending(): Promise<Movie[]> {
    try {
      const thisYear = new Date().getFullYear();
      const [r1, r2] = await Promise.all([
        axios.get(`${TMDB_BASE}/trending/movie/week`, {
          params: { api_key: this.tmdbApiKey, language: 'en-US' },
          timeout: 6000,
        }),
        axios.get(`${TMDB_BASE}/discover/movie`, {
          params: {
            api_key: this.tmdbApiKey,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_origin_country: 'IN',
            'primary_release_date.gte': `${thisYear - 1}-01-01`,
            page: 1,
          },
          timeout: 6000,
        }),
      ]);

      const d1 = (r1.data?.results || []).slice(0, 10);
      const d2 = (r2.data?.results || []).slice(0, 10);

      const mixed: any[] = [];
      const maxLen = Math.max(d1.length, d2.length);
      for (let i = 0; i < maxLen; i++) {
        if (d1[i]) mixed.push(d1[i]);
        if (d2[i]) mixed.push(d2[i]);
      }

      return this.mapTmdbToCards(mixed);
    } catch {
      return [];
    }
  }

  async getTmdbUpcoming(): Promise<Movie[]> {
    try {
      const resp = await axios.get(`${TMDB_BASE}/movie/upcoming`, {
        params: { api_key: this.tmdbApiKey, language: 'en-US', page: 1, region: 'IN' },
        timeout: 6000,
      });
      return this.mapTmdbToCards((resp.data?.results || []).slice(0, 20));
    } catch {
      return [];
    }
  }

  async getTmdbByLanguage(
    langCode: string,
    yearStart?: number,
    yearEnd?: number,
  ): Promise<Movie[]> {
    try {
      const params: any = {
        api_key: this.tmdbApiKey,
        language: 'en-US',
        with_original_language: langCode,
        sort_by: 'revenue.desc',
        page: 1,
      };

      const indianLangs = ['hi', 'te', 'ta', 'ml', 'kn', 'mr', 'bn', 'gu', 'pa', 'ur', 'or', 'as'];
      if (indianLangs.includes(langCode)) {
        params.with_origin_country = 'IN';
      }
      if (yearStart) {
        params['primary_release_date.gte'] = `${yearStart}-01-01`;
      }
      if (yearEnd) {
        params['primary_release_date.lte'] = `${yearEnd}-12-31`;
      }

      const resp = await axios.get(`${TMDB_BASE}/discover/movie`, { params, timeout: 6000 });
      return this.mapTmdbToCards(resp.data?.results || []);
    } catch {
      return [];
    }
  }


  private mapTmdbToCards(results: any[]): Movie[] {
    const cards: Movie[] = [];
    for (const m of results) {
      if (!m.poster_path) continue;
      const relDate = m.release_date || '';
      const genreNames = (m.genre_ids || [])
        .map((gid: number) => TMDB_GENRES[gid])
        .filter(Boolean)
        .join(', ');

      cards.push({
        movieId: undefined,
        tmdbId: m.id,
        title: m.title || '',
        posterUrl: `${IMG_W500}${m.poster_path}`,
        releaseYear: relDate ? parseInt(relDate.substring(0, 4), 10) : undefined,
        averageRating: m.vote_average ? Math.round((m.vote_average / 2) * 10) / 10 : 0,
        overview: m.overview || '',
        genres: genreNames,
      });
    }
    return cards;
  }
}
