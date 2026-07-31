import requests
from flask import Blueprint, jsonify
from config import Config

trailer_bp = Blueprint('trailer', __name__)

@trailer_bp.route('/api/trailer/<int:movie_id>', methods=['GET'])
def get_trailer(movie_id):
    """
    Fetches the YouTube trailer key for a movie using its TMDB ID.
    First looks up tmdb_id from our database, then calls TMDB's videos API.
    """
    from database.db_connection import get_db_connection

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT tmdb_id, title FROM Movies WHERE movie_id = %s", (movie_id,))
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not row or not row.get('tmdb_id'):
        return jsonify({'error': 'No TMDB ID found for this movie'}), 404

    tmdb_id = row['tmdb_id']
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos"
    params = {'api_key': Config.TMDB_API_KEY, 'language': 'en-US'}

    try:
        resp = requests.get(url, params=params, timeout=8)
        data = resp.json()
    except Exception as e:
        return jsonify({'error': str(e)}), 502

    # Pick the best trailer: official YouTube trailer first, then any teaser
    results = data.get('results', [])
    video_key = None
    for video in results:
        if video.get('site') == 'YouTube' and video.get('type') == 'Trailer' and video.get('official'):
            video_key = video['key']
            break
    if not video_key:
        for video in results:
            if video.get('site') == 'YouTube' and video.get('type') in ('Trailer', 'Teaser'):
                video_key = video['key']
                break

    if not video_key:
        return jsonify({'error': 'No trailer available'}), 404

    return jsonify({'video_key': video_key, 'title': row['title']})
