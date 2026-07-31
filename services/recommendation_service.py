import re
from database.db_connection import get_db_connection  # type: ignore

def format_movie_title(title: str) -> str:
    """Formats titles like 'Matrix, The (1999)' into 'The Matrix (1999)'"""
    match = re.search(r', (The|A|An)(\s\(\d{4}\))?$', title)
    if match:
        article = match.group(1)
        year = match.group(2) if match.group(2) else ""
        base_title = title[:match.start()]  # type: ignore
        return f"{article} {base_title}{year}"
    return title


def search_movies(query, search_type='title', year_start=None, year_end=None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        year_filter = ""
        params = [f"%{query}%"]

        if year_start:
            year_filter += " AND m.release_year >= %s"
            params.append(year_start)
        if year_end:
            year_filter += " AND m.release_year <= %s"
            params.append(year_end)

        if search_type == 'genre':
            query_str = f"""
                SELECT m.movie_id, m.title, m.poster_url, m.release_year,
                       m.overview, m.average_rating, m.tmdb_id,
                       GROUP_CONCAT(DISTINCT g2.genre_name ORDER BY g2.genre_name SEPARATOR ', ') AS genres
                FROM Genres g
                JOIN Movie_Genres mg ON g.genre_id = mg.genre_id
                JOIN Movies m ON mg.movie_id = m.movie_id
                LEFT JOIN Movie_Genres mg2 ON m.movie_id = mg2.movie_id
                LEFT JOIN Genres g2 ON mg2.genre_id = g2.genre_id
                WHERE g.genre_name LIKE %s {year_filter}
                AND m.poster_url IS NOT NULL AND m.poster_url != ''
                GROUP BY m.movie_id
                ORDER BY m.average_rating DESC
                LIMIT 100
            """
        else:
            query_str = f"""
                SELECT m.movie_id, m.title, m.poster_url, m.release_year,
                       m.overview, m.average_rating, m.tmdb_id,
                       GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
                FROM Movies m
                LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
                LEFT JOIN Genres g ON mg.genre_id = g.genre_id
                WHERE m.title LIKE %s {year_filter}
                AND m.poster_url IS NOT NULL AND m.poster_url != ''
                GROUP BY m.movie_id
                ORDER BY m.average_rating DESC
                LIMIT 100
            """
        cursor.execute(query_str, tuple(params))
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def get_all_genres():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT genre_id, genre_name FROM Genres ORDER BY genre_name")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_movies_by_genres(genre_ids, year_start=None, year_end=None):
    """Return movies that belong to ANY of the given genre IDs, ordered by average rating."""
    if not genre_ids:
        return []
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        placeholders = ','.join(['%s'] * len(genre_ids))
        year_filter = ""
        params = list(genre_ids)

        if year_start:
            year_filter += " AND m.release_year >= %s"
            params.append(year_start)
        if year_end:
            year_filter += " AND m.release_year <= %s"
            params.append(year_end)

        query_str = f"""
            SELECT m.movie_id, m.title, m.poster_url, m.release_year,
                   m.average_rating, m.overview, m.tmdb_id,
                   GROUP_CONCAT(DISTINCT g2.genre_name ORDER BY g2.genre_name SEPARATOR ', ') AS genres
            FROM Movies m
            JOIN Movie_Genres mg ON mg.movie_id = m.movie_id
            LEFT JOIN Movie_Genres mg2 ON m.movie_id = mg2.movie_id
            LEFT JOIN Genres g2 ON mg2.genre_id = g2.genre_id
            WHERE mg.genre_id IN ({placeholders}) {year_filter}
            AND m.poster_url IS NOT NULL AND m.poster_url != ''
            GROUP BY m.movie_id
            ORDER BY m.average_rating DESC
            LIMIT 100
        """
        cursor.execute(query_str, tuple(params))
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def get_new_releases():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query_str = """
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
        """
        cursor.execute(query_str)
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def get_top_rated():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query_str = """
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
        """
        cursor.execute(query_str)
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def get_recommendations(movie_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                m2.movie_id,
                m2.title,
                m2.poster_url,
                m2.release_year,
                m2.overview,
                m2.tmdb_id,
                ROUND(AVG(r2.rating), 2)                       AS average_rating,
                GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
            FROM (
                SELECT user_id
                FROM Ratings
                WHERE movie_id = %s AND rating >= 4.0
                ORDER BY rated_at DESC
                LIMIT 500
            ) AS top_users
            JOIN Ratings r2          ON top_users.user_id = r2.user_id
            JOIN Movies  m2          ON r2.movie_id = m2.movie_id
            LEFT JOIN Movie_Genres mg1 ON mg1.movie_id = %s
            LEFT JOIN Movie_Genres mg2
                ON mg2.movie_id = m2.movie_id
               AND mg1.genre_id = mg2.genre_id
            LEFT JOIN Genres g        ON mg2.genre_id = g.genre_id
            WHERE r2.movie_id != %s
            AND m2.poster_url IS NOT NULL AND m2.poster_url != ''
            GROUP BY m2.movie_id
            HAVING COUNT(DISTINCT r2.user_id) >= 5
            ORDER BY (
                COUNT(DISTINCT r2.user_id) * 0.6 +
                AVG(r2.rating)              * 0.3 +
                COUNT(DISTINCT mg2.genre_id)* 0.1
            ) DESC
            LIMIT 10
        """
        cursor.execute(query, (movie_id, movie_id, movie_id))
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def get_wishlist_movies(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query_str = """
            SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.overview,
                   m.tmdb_id,
                   GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
            FROM Wishlist w
            JOIN Movies m ON w.movie_id = m.movie_id
            LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genres g ON mg.genre_id = g.genre_id
            WHERE w.user_id = %s
            GROUP BY m.movie_id
            ORDER BY w.added_at DESC
        """
        cursor.execute(query_str, (user_id,))
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()


def add_to_wishlist(user_id, movie_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT IGNORE INTO Wishlist (user_id, movie_id) VALUES (%s, %s)", (user_id, movie_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding to wishlist: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def remove_from_wishlist(user_id, movie_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Wishlist WHERE user_id = %s AND movie_id = %s", (user_id, movie_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error removing from wishlist: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def get_orbit_movies():
    """Return a large pool of well-known movies with poster URLs for the orbit animation."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.average_rating, m.tmdb_id
            FROM Movies m
            WHERE m.poster_url IS NOT NULL AND m.poster_url != ''
            ORDER BY m.average_rating DESC, m.release_year DESC
            LIMIT 60
        """)
        results = cursor.fetchall()
        for r in results:
            r['title'] = format_movie_title(r['title'])
            if r.get('average_rating') is not None:
                r['average_rating'] = float(r['average_rating'])
        return results
    finally:
        cursor.close()
        conn.close()
