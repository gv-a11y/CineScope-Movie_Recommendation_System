import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Movie } from '../movies/dto/movie.dto';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly moviesService: MoviesService,
  ) {}

  async getWishlist(userId: number): Promise<Movie[]> {
    const queryStr = `
      SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.overview,
             m.tmdb_id,
             GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
      FROM Wishlist w
      JOIN Movies m ON w.movie_id = m.movie_id
      LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genres g ON mg.genre_id = g.genre_id
      WHERE w.user_id = ?
      GROUP BY m.movie_id
      ORDER BY w.added_at DESC
    `;
    const rows = await this.db.query<any[]>(queryStr, [userId]);
    return rows.map((r) => ({
      movieId: r.movie_id,
      tmdbId: r.tmdb_id,
      title: this.moviesService.formatMovieTitle(r.title),
      posterUrl: r.poster_url,
      releaseYear: r.release_year,
      averageRating: r.average_rating ? Number(r.average_rating) : 0,
      overview: r.overview,
      genres: r.genres || '',
    }));
  }

  async getWishlistIds(userId: number): Promise<number[]> {
    const rows = await this.db.query<any[]>(
      'SELECT movie_id FROM Wishlist WHERE user_id = ?',
      [userId],
    );
    return rows.map((r) => r.movie_id);
  }

  async addToWishlist(userId: number, movieId: number): Promise<boolean> {
    try {
      await this.db.query(
        'INSERT IGNORE INTO Wishlist (user_id, movie_id) VALUES (?, ?)',
        [userId, movieId],
      );
      return true;
    } catch (err: any) {
      this.logger.error(`Error adding movie ${movieId} to wishlist for user ${userId}: ${err.message}`);
      return false;
    }
  }

  async removeFromWishlist(userId: number, movieId: number): Promise<boolean> {
    try {
      await this.db.query(
        'DELETE FROM Wishlist WHERE user_id = ? AND movie_id = ?',
        [userId, movieId],
      );
      return true;
    } catch (err: any) {
      this.logger.error(`Error removing movie ${movieId} from wishlist for user ${userId}: ${err.message}`);
      return false;
    }
  }
}
