from flask import Blueprint, jsonify, request, render_template
import requests
import services.recommendation_service as rec_service
from config import Config

main_bp = Blueprint('main', __name__)

TMDB_BASE = "https://api.themoviedb.org/3"
IMG_W500  = "https://image.tmdb.org/t/p/w500"

# Genre ID -> name map for TMDB search fallback
TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/mylist')
def mylist():
    return render_template('mylist.html')

@main_bp.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'title')
    year_start = request.args.get('year_start')
    year_end = request.args.get('year_end')
    
    if len(query) < 2:
        return jsonify([])
    
    results = rec_service.search_movies(query, search_type, year_start, year_end)
    
    # Always augment title search with TMDB
    if search_type == 'title':
        try:
            params = {'api_key': Config.TMDB_API_KEY, 'query': query, 'language': 'en-US', 'region': 'IN'}
            if year_start and year_start == year_end:
                params['primary_release_year'] = year_start
            elif year_start:
                params['year'] = year_start
                
            tmdb_resp = requests.get(
                f"{TMDB_BASE}/search/movie",
                params=params,
                timeout=5
            )
            tmdb_data = tmdb_resp.json().get('results', [])
            existing_tmdb_ids = set()
            
            # Collect tmdb_ids from DB results
            from database.db_connection import get_db_connection
            if results:
                conn = get_db_connection()
                cur = conn.cursor(dictionary=True)
                try:
                    ids = [r['movie_id'] for r in results if r.get('movie_id')]
                    if ids:
                        cur.execute(f"SELECT tmdb_id FROM Movies WHERE movie_id IN ({','.join(['%s']*len(ids))})", ids)
                        for row in cur.fetchall():
                            if row['tmdb_id']:
                                existing_tmdb_ids.add(row['tmdb_id'])
                finally:
                    cur.close()
                    conn.close()
            
            for m in tmdb_data:
                if m['id'] in existing_tmdb_ids:
                    continue  # already in DB results
                poster_path = m.get('poster_path')
                rel_date = m.get('release_date', '') or ''
                genre_names = [TMDB_GENRES[g] for g in m.get('genre_ids', []) if g in TMDB_GENRES]
                results.append({
                    'movie_id': None,
                    'tmdb_id': m['id'],
                    'title': m.get('title', ''),
                    'overview': m.get('overview', ''),
                    'poster_url': f"{IMG_W500}{poster_path}" if poster_path else None,
                    'release_year': rel_date[:4] if rel_date else None,
                    'average_rating': round(m.get('vote_average', 0) / 2, 1),
                    'genres': ', '.join(genre_names[:3]),
                })
        except Exception:
            pass
            
    return jsonify(results)


@main_bp.route('/api/new_releases', methods=['GET'])
def new_releases():
    results = rec_service.get_new_releases()
    return jsonify(results)

@main_bp.route('/api/top_rated', methods=['GET'])
def top_rated():
    results = rec_service.get_top_rated()
    return jsonify(results)

@main_bp.route('/api/orbit_movies', methods=['GET'])
def orbit_movies():
    """Serves a large pool of movies with poster_urls for the 3D orbit animation."""
    results = rec_service.get_orbit_movies()
    return jsonify(results)

@main_bp.route('/api/recommendations/<int:movie_id>', methods=['GET'])
def get_recommendations(movie_id):
    results = rec_service.get_recommendations(movie_id)
    return jsonify(results)

@main_bp.route('/api/genres', methods=['GET'])
def get_genres():
    results = rec_service.get_all_genres()
    return jsonify(results)

@main_bp.route('/api/movies/by-genre', methods=['GET'])
def movies_by_genre():
    genre_ids_str = request.args.get('ids', '')
    year_start = request.args.get('year_start')
    year_end = request.args.get('year_end')
    
    if not genre_ids_str:
        return jsonify([])
    try:
        genre_ids = [int(i) for i in genre_ids_str.split(',') if i.strip().isdigit()]
    except ValueError:
        return jsonify([])
        
    results = rec_service.get_movies_by_genres(genre_ids, year_start, year_end)
    return jsonify(results)
