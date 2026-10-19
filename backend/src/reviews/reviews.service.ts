import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Review, MyReview, PostReviewInput } from './dto/review.dto';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly moviesService: MoviesService,
  ) {}

  async getReviews(movieId: number): Promise<Review[]> {
    const queryStr = `
      SELECT r.review_id, r.rating, r.review_text, r.created_at,
             u.username
      FROM Movie_Reviews r
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.movie_id = ?
      ORDER BY r.created_at DESC
    `;
    const rows = await this.db.query<any[]>(queryStr, [movieId]);
    return rows.map((r) => {
      let created = '';
      if (r.created_at) {
        const d = new Date(r.created_at);
        created = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return {
        reviewId: r.review_id,
        rating: r.rating ? Number(r.rating) : 0,
        reviewText: r.review_text || '',
        createdAt: created,
        username: r.username,
      };
    });
  }

  async getMyReviews(userId: number): Promise<MyReview[]> {
    const queryStr = `
      SELECT r.review_id, r.rating, r.review_text, r.created_at,
             m.movie_id, m.title, m.poster_url, m.release_year
      FROM Movie_Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const rows = await this.db.query<any[]>(queryStr, [userId]);
    return rows.map((r) => {
      let created = '';
      if (r.created_at) {
        const d = new Date(r.created_at);
        created = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return {
        reviewId: r.review_id,
        rating: r.rating ? Number(r.rating) : 0,
        reviewText: r.review_text || '',
        createdAt: created,
        movieId: r.movie_id,
        title: this.moviesService.formatMovieTitle(r.title),
        posterUrl: r.poster_url,
        releaseYear: r.release_year,
      };
    });
  }

  async postReview(userId: number, input: PostReviewInput): Promise<boolean> {
    const { movieId, rating, reviewText } = input;
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    await this.db.query(
      `INSERT INTO Movie_Reviews (user_id, movie_id, rating, review_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)`,
      [userId, movieId, rating, reviewText.trim()],
    );

    // Also update or insert into Ratings table for recommendation algorithm
    try {
      await this.db.query(
        `INSERT INTO Ratings (user_id, movie_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
        [userId, movieId, rating],
      );
    } catch {
      // Ignore if constraint
    }

    return true;
  }

  async deleteReview(userId: number, reviewId: number): Promise<boolean> {
    const result: any = await this.db.query(
      'DELETE FROM Movie_Reviews WHERE review_id = ? AND user_id = ?',
      [reviewId, userId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Review not found or not owned by you');
    }

    return true;
  }
}
