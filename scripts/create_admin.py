import os
import sys
import mysql.connector

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'movie_recommendation_system')

def promote_user(username):
    db = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute('SELECT user_id, is_admin FROM Users WHERE username = %s', (username,))
    user = cursor.fetchone()
    
    if not user:
        print(f"User '{username}' does not exist.")
        return

    if user[1]:
        print(f"User '{username}' is already an admin.")
        return

    # Promote user
    cursor.execute('UPDATE Users SET is_admin = TRUE WHERE username = %s', (username,))
    db.commit()
    print(f"Successfully promoted '{username}' to administrator.")
    
    cursor.close()
    db.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python create_admin.py <username>")
    else:
        promote_user(sys.argv[1])
