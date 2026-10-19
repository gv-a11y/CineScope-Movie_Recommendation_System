from flask import Blueprint, jsonify, request, session
import mysql.connector
from config import Config
from functools import wraps

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def get_db():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME
    )


def require_admin(f):
    """Decorator to check if user is admin."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Admin access required.'}), 403
        return f(*args, **kwargs)
    return decorated_function


@admin_bp.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if current session is admin."""
    is_admin = session.get('is_admin', False)
    return jsonify({
        'is_admin': is_admin,
        'admin_username': session.get('admin_username', None) if is_admin else None
    })


@admin_bp.route('/add-movie', methods=['POST'])
@require_admin
def add_movie():
    """Add a new movie to the database."""
    data = request.get_json()
    
    required_fields = ['title', 'release_year']
    if not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400
    
    title = data.get('title', '').strip()
    release_year = data.get('release_year')
    overview = data.get('overview', '').strip()
    poster_url = data.get('poster_url', '').strip()
    tmdb_id = data.get('tmdb_id')
    
    if not title:
        return jsonify({'error': 'Title is required.'}), 400
    
    try:
        release_year = int(release_year) if release_year else None
    except (ValueError, TypeError):
        return jsonify({'error': 'release_year must be a valid year.'}), 400
    
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Get the next movie_id
        cursor.execute('SELECT MAX(movie_id) as max_id FROM Movies')
        result = cursor.fetchone()
        next_movie_id = (result['max_id'] or 0) + 1
        
        # Insert the movie
        cursor.execute(
            '''INSERT INTO Movies (movie_id, title, release_year, overview, poster_url, tmdb_id, average_rating)
               VALUES (%s, %s, %s, %s, %s, %s, 0.00)''',
            (next_movie_id, title, release_year, overview, poster_url, tmdb_id)
        )
        db.commit()
        
        # Handle genres if provided
        genres = data.get('genres', [])
        if genres:
            cursor.execute('SELECT genre_id, genre_name FROM Genres')
            existing_genres = {row['genre_name']: row['genre_id'] for row in cursor.fetchall()}
            
            genre_links = []
            for genre_name in genres:
                genre_name = genre_name.strip()
                if genre_name in existing_genres:
                    genre_id = existing_genres[genre_name]
                    genre_links.append((next_movie_id, genre_id))
                else:
                    # Create new genre
                    new_genre_id = max(existing_genres.values()) + 1 if existing_genres else 1
                    cursor.execute(
                        'INSERT INTO Genres (genre_id, genre_name) VALUES (%s, %s)',
                        (new_genre_id, genre_name)
                    )
                    genre_links.append((next_movie_id, new_genre_id))
                    existing_genres[genre_name] = new_genre_id
            
            if genre_links:
                cursor.executemany(
                    'INSERT INTO Movie_Genres (movie_id, genre_id) VALUES (%s, %s)',
                    genre_links
                )
            db.commit()
        
        cursor.close()
        db.close()
        
        return jsonify({
            'success': True,
            'message': f'Movie "{title}" added successfully',
            'movie_id': next_movie_id
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/remove-movie/<int:movie_id>', methods=['DELETE'])
@require_admin
def remove_movie(movie_id):
    """Remove a movie from the database."""
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Check if movie exists
        cursor.execute('SELECT title FROM Movies WHERE movie_id = %s', (movie_id,))
        movie = cursor.fetchone()
        
        if not movie:
            return jsonify({'error': f'Movie with ID {movie_id} not found.'}), 404
        
        movie_title = movie['title']
        
        # Delete movie (foreign keys will cascade)
        cursor.execute('DELETE FROM Movies WHERE movie_id = %s', (movie_id,))
        db.commit()
        
        cursor.close()
        db.close()
        
        return jsonify({
            'success': True,
            'message': f'Movie "{movie_title}" (ID: {movie_id}) removed successfully'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/remove-review/<int:rating_id>', methods=['DELETE'])
@require_admin
def remove_review(rating_id):
    """Remove a user review/rating."""
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Check if rating exists
        cursor.execute('''
            SELECT r.rating_id, u.username, m.title, r.rating
            FROM Ratings r
            JOIN Users u ON r.user_id = u.user_id
            JOIN Movies m ON r.movie_id = m.movie_id
            WHERE r.rating_id = %s
        ''', (rating_id,))
        rating = cursor.fetchone()
        
        if not rating:
            return jsonify({'error': f'Rating with ID {rating_id} not found.'}), 404
        
        username = rating['username']
        movie_title = rating['title']
        
        # Delete the rating
        cursor.execute('DELETE FROM Ratings WHERE rating_id = %s', (rating_id,))
        db.commit()
        
        # Recalculate average rating for affected movie
        movie_id = rating.get('movie_id')
        cursor.execute('''
            SELECT AVG(rating) as avg_rating FROM Ratings
            WHERE movie_id = %s
        ''', (movie_id,))
        avg_result = cursor.fetchone()
        avg_rating = round(avg_result['avg_rating'], 2) if avg_result and avg_result['avg_rating'] else 0.00
        
        cursor.execute('UPDATE Movies SET average_rating = %s WHERE movie_id = %s', (avg_rating, movie_id))
        db.commit()
        
        cursor.close()
        db.close()
        
        return jsonify({
            'success': True,
            'message': f'Review removed: {username}\'s {rating["rating"]} rating for "{movie_title}"'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/remove-user-reviews/<int:user_id>', methods=['DELETE'])
@require_admin
def remove_user_reviews(user_id):
    """Remove all reviews from a specific user."""
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute('SELECT username FROM Users WHERE user_id = %s', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': f'User with ID {user_id} not found.'}), 404
        
        username = user['username']
        
        # Get the count and affected movies
        cursor.execute('SELECT movie_id FROM Ratings WHERE user_id = %s', (user_id,))
        affected_movie_ids = [row['movie_id'] for row in cursor.fetchall()]
        
        # Delete all ratings from this user
        cursor.execute('DELETE FROM Ratings WHERE user_id = %s', (user_id,))
        deleted_count = cursor.rowcount
        db.commit()
        
        # Recalculate average ratings for affected movies
        for movie_id in affected_movie_ids:
            cursor.execute('''
                SELECT AVG(rating) as avg_rating FROM Ratings
                WHERE movie_id = %s
            ''', (movie_id,))
            avg_result = cursor.fetchone()
            avg_rating = round(avg_result['avg_rating'], 2) if avg_result and avg_result['avg_rating'] else 0.00
            
            cursor.execute('UPDATE Movies SET average_rating = %s WHERE movie_id = %s', (avg_rating, movie_id))
        db.commit()
        
        cursor.close()
        db.close()
        
        return jsonify({
            'success': True,
            'message': f'Removed {deleted_count} reviews from user "{username}"'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
