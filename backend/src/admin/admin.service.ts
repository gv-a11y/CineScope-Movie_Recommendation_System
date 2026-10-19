import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AddMovieInput } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async addMovie(input: AddMovieInput): Promise<{ movieId: number; title: string }> {
    const title = input.title.trim();
    const releaseYear = input.releaseYear;
    const overview = (input.overview || '').trim();
    const posterUrl = (input.posterUrl || '').trim();
    const tmdbId = input.tmdbId || null;

    const maxRow = await this.db.query<any[]>('SELECT MAX(movie_id) as max_id FROM Movies');
    const nextMovieId = (maxRow[0]?.max_id || 0) + 1;

    await this.db.query(
      `INSERT INTO Movies (movie_id, title, release_year, overview, poster_url, tmdb_id, average_rating)
       VALUES (?, ?, ?, ?, ?, ?, 0.00)`,
      [nextMovieId, title, releaseYear, overview, posterUrl, tmdbId],
    );

    if (input.genres && input.genres.length > 0) {
      const existingGenres = await this.db.query<any[]>('SELECT genre_id, genre_name FROM Genres');
      const genreMap = new Map<string, number>();
      existingGenres.forEach((g) => genreMap.set(g.genre_name.toLowerCase(), g.genre_id));
      let maxGenreId = Math.max(...existingGenres.map((g) => g.genre_id), 0);

      for (const rawGenre of input.genres) {
        const gName = rawGenre.trim();
        if (!gName) continue;
        let gId = genreMap.get(gName.toLowerCase());
        if (!gId) {
          maxGenreId++;
          gId = maxGenreId;
          await this.db.query('INSERT INTO Genres (genre_id, genre_name) VALUES (?, ?)', [
            gId,
            gName,
          ]);
          genreMap.set(gName.toLowerCase(), gId);
        }
        await this.db.query(
          'INSERT IGNORE INTO Movie_Genres (movie_id, genre_id) VALUES (?, ?)',
          [nextMovieId, gId],
        );
      }
    }

    return { movieId: nextMovieId, title };
  }

  async removeMovie(movieId: number): Promise<string> {
    const movie = await this.db.query<any[]>(
      'SELECT title FROM Movies WHERE movie_id = ?',
      [movieId],
    );
    if (movie.length === 0) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    const title = movie[0].title;
    await this.db.query('DELETE FROM Movies WHERE movie_id = ?', [movieId]);
    return title;
  }

  async removeReview(ratingId: number): Promise<string> {
    const rating = await this.db.query<any[]>(
      `SELECT r.rating_id, r.movie_id, u.username, m.title, r.rating
       FROM Ratings r
       JOIN Users u ON r.user_id = u.user_id
       JOIN Movies m ON r.movie_id = m.movie_id
       WHERE r.rating_id = ?`,
      [ratingId],
    );

    if (rating.length === 0) {
      throw new NotFoundException(`Rating with ID ${ratingId} not found`);
    }

    const r = rating[0];
    await this.db.query('DELETE FROM Ratings WHERE rating_id = ?', [ratingId]);

    // Recalculate average rating
    const avgRes = await this.db.query<any[]>(
      'SELECT AVG(rating) as avg_rating FROM Ratings WHERE movie_id = ?',
      [r.movie_id],
    );
    const avgRating = avgRes[0]?.avg_rating ? Math.round(avgRes[0].avg_rating * 100) / 100 : 0.0;
    await this.db.query('UPDATE Movies SET average_rating = ? WHERE movie_id = ?', [
      avgRating,
      r.movie_id,
    ]);

    return `Removed ${r.username}'s ${r.rating} rating for "${r.title}"`;
  }

  async removeUserReviews(userId: number): Promise<string> {
    const user = await this.db.query<any[]>(
      'SELECT username FROM Users WHERE user_id = ?',
      [userId],
    );
    if (user.length === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const username = user[0].username;
    const affectedMovies = await this.db.query<any[]>(
      'SELECT DISTINCT movie_id FROM Ratings WHERE user_id = ?',
      [userId],
    );

    const deleteRes: any = await this.db.query('DELETE FROM Ratings WHERE user_id = ?', [userId]);
    const deletedCount = deleteRes.affectedRows || 0;

    for (const m of affectedMovies) {
      const avgRes = await this.db.query<any[]>(
        'SELECT AVG(rating) as avg_rating FROM Ratings WHERE movie_id = ?',
        [m.movie_id],
      );
      const avgRating = avgRes[0]?.avg_rating ? Math.round(avgRes[0].avg_rating * 100) / 100 : 0.0;
      await this.db.query('UPDATE Movies SET average_rating = ? WHERE movie_id = ?', [
        avgRating,
        m.movie_id,
      ]);
    }

    return `Removed ${deletedCount} reviews from user "${username}"`;
  }
}
