import requests
import datetime
import itertools
from flask import Blueprint, jsonify, request, render_template, session
from database.db_connection import get_db_connection
from config import Config
import re

TMDB_BASE = "https://api.themoviedb.org/3"
IMG_W500  = "https://image.tmdb.org/t/p/w500"
IMG_W1280 = "https://image.tmdb.org/t/p/w1280"
IMG_W185  = "https://image.tmdb.org/t/p/w185"

movie_bp = Blueprint('movie', __name__)


@movie_bp.route('/movie/<int:movie_id>')
def movie_detail(movie_id):
    """Render the IMDb-style movie detail page."""
    return render_template('movie_detail.html', movie_id=movie_id)


@movie_bp.route('/api/movie/<int:movie_id>', methods=['GET'])
def get_movie_detail(movie_id):
    """Return full movie details from DB + cast from TMDB."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT m.movie_id, m.title, m.release_year, m.overview,
                   m.poster_url, m.average_rating, m.tmdb_id,
                   GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
            FROM Movies m
            LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genres g ON mg.genre_id = g.genre_id
            WHERE m.movie_id = %s
            GROUP BY m.movie_id
        """, (movie_id,))
        movie = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not movie:
        return jsonify({'error': 'Movie not found'}), 404

    # Fetch cast from TMDB
    cast = []
    if movie.get('tmdb_id') and Config.TMDB_API_KEY:
        try:
            resp = requests.get(
                f"https://api.themoviedb.org/3/movie/{movie['tmdb_id']}/credits",
                params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US'},
                timeout=6
            )
            data = resp.json()
            cast = [
                {
                    'name': p['name'],
                    'character': p.get('character', ''),
                    'profile_url': f"https://image.tmdb.org/t/p/w185{p['profile_path']}" if p.get('profile_path') else None
                }
                for p in data.get('cast', [])[:12]
            ]
        except Exception:
            pass

    # Fetch TMDB backdrop
    backdrop_url = None
    if movie.get('tmdb_id') and Config.TMDB_API_KEY:
        try:
            resp = requests.get(
                f"https://api.themoviedb.org/3/movie/{movie['tmdb_id']}",
                params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US'},
                timeout=6
            )
            data = resp.json()
            if data.get('backdrop_path'):
                backdrop_url = f"https://image.tmdb.org/t/p/w1280{data['backdrop_path']}"
            # Also grab runtime
            movie['runtime'] = data.get('runtime')
            movie['tagline'] = data.get('tagline', '')
        except Exception:
            pass

    if movie.get('average_rating') is not None:
        movie['average_rating'] = float(movie['average_rating'])

    return jsonify({**movie, 'cast': cast, 'backdrop_url': backdrop_url})


# ────────────────────────────────────────────────────────────────
# DYNAMIC IMPORT OF TMDB MOVIES
# ────────────────────────────────────────────────────────────────
@movie_bp.route('/api/ensure_local/<int:tmdb_id>', methods=['POST'])
def ensure_local(tmdb_id):
    """
    Checks if a TMDB movie exists in our DB. If not, fetches it from
    TMDB and inserts it on the fly, returning the local movie_id.
    This makes features like Reviews, Trailers, and Wishlist work seamlessly
    for movies discovered in the 'Live TMDB' sections.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT movie_id FROM Movies WHERE tmdb_id = %s", (tmdb_id,))
        row = cursor.fetchone()
        if row:
            return jsonify({'movie_id': row['movie_id']})
            
        key = Config.TMDB_API_KEY
        resp = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}", params={'api_key': key, 'language': 'en-US'}, timeout=8)
        if resp.status_code != 200:
            return jsonify({'error': 'Failed to fetch from TMDB'}), 502
        d = resp.json()
        
        # Ensure Genres exist
        db_genres = []
        for g in d.get('genres', []):
            g_name = g['name']
            cursor.execute("SELECT genre_id FROM Genres WHERE genre_name = %s", (g_name,))
            grow = cursor.fetchone()
            if grow:
                db_genres.append(grow['genre_id'])
            else:
                cursor.execute("SELECT MAX(genre_id) as max_id FROM Genres")
                max_id_row = cursor.fetchone()
                next_id = (max_id_row['max_id'] or 0) + 1
                cursor.execute("INSERT INTO Genres (genre_id, genre_name) VALUES (%s, %s)", (next_id, g_name))
                db_genres.append(next_id)
                
        # Generate new movie_id safely
        cursor.execute("SELECT MAX(movie_id) as max_id FROM Movies")
        max_m_row = cursor.fetchone()
        new_mid = (max_m_row['max_id'] or 0) + 1
        
        poster_path = d.get('poster_path')
        poster_url = f"{IMG_W500}{poster_path}" if poster_path else None
        
        rel_date = d.get('release_date', '')
        release_year = int(rel_date[:4]) if rel_date and rel_date[:4].isdigit() else None
        avg_rating = round(d.get('vote_average', 0) / 2, 2)
        
        cursor.execute("""
            INSERT INTO Movies (movie_id, title, release_year, tmdb_id, overview, poster_url, average_rating)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (new_mid, d.get('title', 'Unknown'), release_year, tmdb_id, d.get('overview', ''), poster_url, avg_rating))
        
        for gid in db_genres:
            cursor.execute("INSERT IGNORE INTO Movie_Genres (movie_id, genre_id) VALUES (%s, %s)", (new_mid, gid))
            
        conn.commit()
        return jsonify({'movie_id': new_mid})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ────────────────────────────────────────────────────────────────
# LIVE TMDB SECTIONS  (Now Playing / Trending)
# ────────────────────────────────────────────────────────────────

# TMDB genre ID → name map (official list, covers all movies)
TMDB_GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
}

def _tmdb_movies_to_cards(results):
    """Convert TMDB search results list into our front-end card format."""
    cards = []
    for m in results:
        poster_path = m.get('poster_path')
        if not poster_path:
            continue
        
        release_date = m.get('release_date', '') or ''
        genre_ids = m.get('genre_ids', [])
        genre_names = ', '.join(
            TMDB_GENRE_MAP[gid] for gid in genre_ids if gid in TMDB_GENRE_MAP
        )
        cards.append({
            'movie_id': None,
            'tmdb_id': m['id'],
            'title': m.get('title', ''),
            'poster_url': f"{IMG_W500}{poster_path}" if poster_path else None,
            'release_year': release_date[:4] if release_date else None,
            'average_rating': round(m.get('vote_average', 0) / 2, 1),
            'overview': m.get('overview', ''),
            'genres': genre_names,
        })
    return cards


@movie_bp.route('/api/tmdb/now_playing', methods=['GET'])
def tmdb_now_playing():
    """Live now-playing movies from TMDB (Mixed)."""
    try:
        r1 = requests.get(f"{TMDB_BASE}/movie/now_playing",
                          params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US', 'page': 1},
                          timeout=6)
        
        this_year = datetime.datetime.now().year
        r2 = requests.get(f"{TMDB_BASE}/discover/movie",
                          params={
                              'api_key': Config.TMDB_API_KEY, 
                              'language': 'en-US', 
                              'page': 1,
                              'with_origin_country': 'IN',
                              'primary_release_date.gte': f"{this_year - 1}-01-01",
                              'sort_by': 'popularity.desc'
                          },
                          timeout=6)
                          
        d1 = r1.json().get('results', [])[:10]
        d2 = r2.json().get('results', [])[:10]
        mixed = [m for pair in itertools.zip_longest(d1, d2) for m in pair if m is not None]
        return jsonify(_tmdb_movies_to_cards(mixed))
    except Exception as e:
        return jsonify([]), 200


@movie_bp.route('/api/tmdb/trending', methods=['GET'])
def tmdb_trending():
    """Live popular trending movies from TMDB (Mixed)."""
    try:
        r1 = requests.get(f"{TMDB_BASE}/trending/movie/week",
                          params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US'},
                          timeout=6)
                          
        this_year = datetime.datetime.now().year
        r2 = requests.get(f"{TMDB_BASE}/discover/movie",
                          params={
                              'api_key': Config.TMDB_API_KEY, 
                              'language': 'en-US',
                              'sort_by': 'popularity.desc',
                              'with_origin_country': 'IN',
                              'primary_release_date.gte': f"{this_year - 1}-01-01",
                              'page': 1
                          },
                          timeout=6)
                          
        d1 = r1.json().get('results', [])[:10]
        d2 = r2.json().get('results', [])[:10]
        mixed = [m for pair in itertools.zip_longest(d1, d2) for m in pair if m is not None]
        return jsonify(_tmdb_movies_to_cards(mixed))
    except Exception as e:
        return jsonify([]), 200


@movie_bp.route('/api/tmdb/upcoming', methods=['GET'])
def tmdb_upcoming():
    """Upcoming movies from TMDB."""
    try:
        r = requests.get(f"{TMDB_BASE}/movie/upcoming",
                         params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US', 'page': 1, 'region': 'IN'},
                         timeout=6)
        data = r.json()
        return jsonify(_tmdb_movies_to_cards(data.get('results', [])[:20]))
    except Exception as e:
        return jsonify([]), 200


@movie_bp.route('/api/tmdb/language/<lang_code>', methods=['GET'])
def tmdb_by_language(lang_code):
    """Fetch top grossing/popular movies by original language from TMDB."""
    year_start = request.args.get('year_start')
    year_end = request.args.get('year_end')
    try:
        params = {
            'api_key': Config.TMDB_API_KEY, 
            'language': 'en-US', 
            'with_original_language': lang_code,
            'sort_by': 'revenue.desc', # Highest grossing films for this language
            'page': 1
        }
        
        # Only apply 'IN' origin country to Indian languages to avoid blocking others
        indian_langs = ['hi', 'te', 'ta', 'ml', 'kn', 'mr', 'bn', 'gu', 'pa', 'ur', 'or', 'as']
        if lang_code in indian_langs:
            params['with_origin_country'] = 'IN'

        if year_start:
            params['primary_release_date.gte'] = f"{year_start}-01-01"
        if year_end:
            params['primary_release_date.lte'] = f"{year_end}-12-31"

        r1 = requests.get(f"{TMDB_BASE}/discover/movie", params=params, timeout=4)
        results = r1.json().get('results', [])
        
        return jsonify(_tmdb_movies_to_cards(results))
    except Exception as e:
        return jsonify([]), 200


@movie_bp.route('/api/movie/<int:movie_id>/reviews', methods=['GET'])
def get_reviews(movie_id):
    """Return all reviews for a movie with usernames."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.review_id, r.rating, r.review_text, r.created_at,
                   u.username
            FROM Movie_Reviews r
            JOIN Users u ON r.user_id = u.user_id
            WHERE r.movie_id = %s
            ORDER BY r.created_at DESC
        """, (movie_id,))
        reviews = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    for r in reviews:
        if r.get('rating') is not None:
            r['rating'] = float(r['rating'])
        if r['created_at']:
            r['created_at'] = r['created_at'].strftime('%b %d, %Y')
    return jsonify(reviews)


@movie_bp.route('/api/movie/<int:movie_id>/reviews', methods=['POST'])
def post_review(movie_id):
    """Submit or update a user review."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Login required'}), 401

    data = request.get_json()
    rating = data.get('rating')
    text = data.get('review_text', '').strip()

    if rating is None or not (0 <= float(rating) <= 5):
        return jsonify({'error': 'Rating must be between 0 and 5'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Movie_Reviews (user_id, movie_id, rating, review_text)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)
        """, (user_id, movie_id, float(rating), text))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({'ok': True})


@movie_bp.route('/api/movie/<int:movie_id>/reviews/<int:review_id>', methods=['DELETE'])
def delete_review(movie_id, review_id):
    """Delete a specific review (only by the user who wrote it)."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Login required'}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM Movie_Reviews
            WHERE review_id = %s AND user_id = %s AND movie_id = %s
        """, (review_id, user_id, movie_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Review not found or not yours'}), 404
    finally:
        cursor.close()
        conn.close()

    return jsonify({'ok': True})


@movie_bp.route('/api/my_reviews', methods=['GET'])
def get_my_reviews():
    """Return all reviews the currently logged-in user has written."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Login required'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.review_id, r.rating, r.review_text, r.created_at,
                   m.movie_id, m.title, m.poster_url, m.release_year
            FROM Movie_Reviews r
            JOIN Movies m ON r.movie_id = m.movie_id
            WHERE r.user_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))
        reviews = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    for r in reviews:
        if r.get('rating') is not None:
            r['rating'] = float(r['rating'])
        if r['created_at']:
            r['created_at'] = r['created_at'].strftime('%b %d, %Y')
    return jsonify(reviews)
