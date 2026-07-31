import mysql.connector
from config import Config

def create_wishlist_table():
    db = mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME
    )
    cursor = db.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Wishlist (
            user_id INT,
            movie_id INT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, movie_id),
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
        )
    """)
    db.commit()
    cursor.close()
    db.close()
    print("Wishlist table created or already exists.")

if __name__ == "__main__":
    create_wishlist_table()
