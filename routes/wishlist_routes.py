from flask import Blueprint, jsonify, request, session
from services.recommendation_service import get_wishlist_movies, add_to_wishlist, remove_from_wishlist

wishlist_bp = Blueprint('wishlist', __name__)

@wishlist_bp.route('/api/wishlist', methods=['GET'])
def get_user_wishlist():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    results = get_wishlist_movies(user_id)
    return jsonify(results)

@wishlist_bp.route('/api/wishlist/<int:movie_id>', methods=['POST'])
def add_movie_wishlist(movie_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    success = add_to_wishlist(user_id, movie_id)
    if success:
        return jsonify({'message': 'Added to wishlist'}), 200
    return jsonify({'error': 'Failed to add'}), 500

@wishlist_bp.route('/api/wishlist/<int:movie_id>', methods=['DELETE'])
def remove_movie_wishlist(movie_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    success = remove_from_wishlist(user_id, movie_id)
    if success:
        return jsonify({'message': 'Removed from wishlist'}), 200
    return jsonify({'error': 'Failed to remove'}), 500

@wishlist_bp.route('/api/wishlist/ids', methods=['GET'])
def get_user_wishlist_ids():
    if 'user_id' not in session:
        return jsonify([])
    user_id = session['user_id']
    movies = get_wishlist_movies(user_id)
    ids = [m['movie_id'] for m in movies]
    return jsonify(ids)
