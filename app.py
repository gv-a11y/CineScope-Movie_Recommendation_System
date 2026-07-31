from flask import Flask
from routes.main_routes import main_bp
from routes.auth_routes import auth_bp, ensure_auto_increment
from routes.wishlist_routes import wishlist_bp
from routes.trailer_routes import trailer_bp
from routes.movie_routes import movie_bp
from routes.admin_routes import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(wishlist_bp)
    app.register_blueprint(trailer_bp)
    app.register_blueprint(movie_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        ensure_auto_increment()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
