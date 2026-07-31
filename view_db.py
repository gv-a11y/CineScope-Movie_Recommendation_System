import mysql.connector
from config import Config

def connect_db():
    try:
        return mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
    except Exception as e:
        return None

def run_query(title, query):
    conn = connect_db()
    if not conn: return
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        print(f"\n=== {title} ===")
        if not rows:
            print("No real user data found yet.")
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    # Users actually created in the web app (filtering out the default ml.example.com imported ones)
    q_users = "SELECT user_id, username, email, is_admin, created_at FROM Users WHERE password_hash != 'imported' ORDER BY created_at DESC;"
    run_query("USERS REGISTERED IN WEB APP", q_users)

    # Ratings submitted by actual users
    q_ratings = '''
    SELECT u.username, m.title, r.rating, r.rated_at 
    FROM Ratings r
    JOIN Users u ON r.user_id = u.user_id
    JOIN Movies m ON r.movie_id = m.movie_id
    WHERE u.password_hash != 'imported'
    ORDER BY r.rated_at DESC;
    '''
    run_query("RATINGS SUBMITTED IN WEB APP", q_ratings)

    # Wishlist items added by actual users
    q_wishlist = '''
    SELECT u.username, m.title, w.added_at 
    FROM Wishlist w
    JOIN Users u ON w.user_id = u.user_id
    JOIN Movies m ON w.movie_id = m.movie_id
    WHERE u.password_hash != 'imported'
    ORDER BY w.added_at DESC;
    '''
    run_query("WISHLIST ITEMS ADDED IN WEB APP", q_wishlist)
    
    # Recently imported/added movies via web app (movies added very recently)
    q_movies = "SELECT movie_id, title, release_year, created_at FROM Movies ORDER BY created_at DESC LIMIT 5;"
    run_query("RECENTLY ADDED/IMPORTED MOVIES", q_movies)
