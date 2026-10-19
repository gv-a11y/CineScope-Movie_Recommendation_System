from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from config import Config

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


def ensure_auto_increment():
    """Ensure Users.user_id has AUTO_INCREMENT (safe to run repeatedly)."""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            ALTER TABLE Users MODIFY COLUMN user_id INT NOT NULL AUTO_INCREMENT
        """)
        db.commit()
        cursor.close()
        db.close()
    except Exception:
        pass  # Already has AUTO_INCREMENT or other non-critical error


def get_db():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME
    )


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    password_hash = generate_password_hash(password)

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Check for existing user
        cursor.execute('SELECT user_id FROM Users WHERE email = %s OR username = %s', (email, username))
        if cursor.fetchone():
            return jsonify({'error': 'Email or username already in use.'}), 409

        cursor.execute(
            'INSERT INTO Users (username, email, password_hash) VALUES (%s, %s, %s)',
            (username, email, password_hash)
        )
        db.commit()
        new_id = cursor.lastrowid

        session['user_id'] = new_id
        session['username'] = username
        session['email'] = email

        cursor.close()
        db.close()
        return jsonify({'user_id': new_id, 'username': username, 'email': email}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute('SELECT user_id, username, email, password_hash, is_admin FROM Users WHERE email = %s', (email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()

        if not user:
            return jsonify({'error': 'Invalid email or password.'}), 401

        is_valid = False
        if user['password_hash']:
            try:
                is_valid = check_password_hash(user['password_hash'], password)
            except ValueError:
                pass

        if not is_valid:
            if user['password_hash'] == password:
                pass  # Fallback for older plaintext passwords
            else:
                return jsonify({'error': 'Invalid email or password.'}), 401

        session['user_id'] = user['user_id']
        session['username'] = user['username']
        session['email'] = user['email']
        session['is_admin'] = user['is_admin']

        return jsonify({
            'user_id': user['user_id'], 
            'username': user['username'], 
            'email': user['email'],
            'is_admin': user['is_admin']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    """Admin login with hardcoded credentials."""
    data = request.get_json()
    admin_username = data.get('username') or ''
    admin_password = data.get('password') or ''

    # Hardcoded admin credentials
    ADMIN_USERNAME = 'admin'
    ADMIN_PASSWORD = 'admin123'

    if admin_username == ADMIN_USERNAME and admin_password == ADMIN_PASSWORD:
        session['is_admin'] = True
        session['admin_username'] = ADMIN_USERNAME
        return jsonify({
            'success': True,
            'message': 'Admin logged in successfully',
            'is_admin': True
        }), 200
    else:
        return jsonify({'error': 'Invalid admin credentials.'}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    if 'user_id' in session:
        user_id = session['user_id']
        username = session['username']
        email = session['email']
        is_admin = session.get('is_admin', False)
        
        # Extended profile info
        join_date = None
        wishlist_count = 0
        try:
            db = get_db()
            cursor = db.cursor(dictionary=True)
            
            # Get created_at
            cursor.execute('SELECT created_at FROM Users WHERE user_id = %s', (user_id,))
            user_record = cursor.fetchone()
            if user_record and user_record['created_at']:
                # Format to a readable string (e.g. "March 2026")
                join_date = user_record['created_at'].strftime("%B %Y")
                
            # Get Wishlist count
            cursor.execute('SELECT COUNT(*) as count FROM Wishlist WHERE user_id = %s', (user_id,))
            wishlist_record = cursor.fetchone()
            if wishlist_record:
                wishlist_count = wishlist_record['count']
                
            cursor.close()
            db.close()
        except Exception as e:
            print("Error fetching profile details:", e)

        return jsonify({
            'user_id': user_id,
            'username': username,
            'email': email,
            'is_admin': is_admin,
            'join_date': join_date or 'Recently',
            'wishlist_count': wishlist_count
        })
    return jsonify({}), 200
