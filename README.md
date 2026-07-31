# CineScope — Movie Recommendation System

CineScope is a professional, web-based Movie Recommendation System. Built on top of **Flask** and **MySQL**, it integrates with the **TMDB (The Movie Database) API** to fetch high-quality movie metadata, posters, and trailers, and delivers personalized recommendations to users based on ratings, genres, and collaborative filtering.

---

## 🌟 Key Features

### 👤 User Authentication & Accounts
* **Secure Auth**: Complete login, registration, and logout flows.
* **Encrypted Passwords**: Secure client-side password hashing.
* **Wishlist Management**: Clean bookmarking system to save movies you want to watch.
* **Admin Controls**: Administrative layer (Add/Remove movies, delete ratings/reviews, and manage administrative privileges).

### 🎬 Interactive Movie Discovery
* **Live Search**: Efficient catalog search across local databases and the TMDB API.
* **Detailed View**: Access rich synopsis, ratings, and genre tags.
* **Trailers**: Dynamic trailer embeds powered by TMDB metadata.
* **Rating System**: Submit custom ratings (0 to 5 stars) that instantly feed recommendation algorithms.

### 🧠 Recommendation Engine
* **Collaborative Filtering**: Recommends movies based on taste profiles of similar users.
* **High-Performance SQL**: Optimized sampling queries capable of processing large-scale datasets (like MovieLens) with low latency.

### 🎨 Premium User Interface
* **Chic Dark Mode Theme**: Sleek UI designed with bespoke HSL color palettes.
* **Glassmorphism & Micro-animations**: Modern design elements including hover effects, 3D transformations (like the Orbit Stage and TV Frames), and styled movie grids.

---

## 🛠️ Technology Stack
* **Backend**: Flask (Python 3.x)
* **Database**: MySQL Server
* **Frontend**: HTML5, Vanilla CSS3 (Custom Responsive Layouts), Javascript (ES6+)
* **APIs**: TMDB API integration

---

## 📁 Repository Structure
```text
├── routes/                # Blueprint routes (auth, admin, wishlist, movies, trailers)
├── services/              # External API services (TMDB, helper integrations)
├── static/                # Static assets (CSS stylesheets, JS scripts, Images)
├── templates/             # Jinja2 HTML templates
├── app.py                 # Flask App initialization and blueprints registration
├── config.py              # Configuration manager reading from env variables
├── database_setup.sql     # Database Schema & analytics queries script
├── run_setup.py           # Automated MySQL Database initialization script
├── .env.example           # Secure template outlining required environment configurations
├── .gitignore             # Standard git exclude file
└── requirements.txt       # Python dependecies list
```

---

## 🚀 Local Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/godwin224767-a11y/CineScope-Movie_Recommendation_System.git
cd CineScope-Movie_Recommendation_System
```

### 2. Configure Environment Variables
Copy the template configuration code and replace values with your actual database credentials and TMDB API key:
```bash
cp .env.example .env
```
Open `.env` and fill out:
```ini
SECRET_KEY=your-custom-secret-key
TMDB_API_KEY=your_tmdb_api_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=movie_recommendation_system
```

### 3. Set Up Virtual Environment & Dependencies
Create a Python virtual environment and install the required libraries:
```bash
# Create Virtual Environment
python -m venv .venv

# Activate Virtual Environment (Windows)
.venv\Scripts\activate

# Activate Virtual Environment (macOS/Linux)
source .venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
```

### 4. Initialize the MySQL Database
With your MySQL server running, execute the database setup script to create tables and import base data:
```bash
python run_setup.py
```

### 5. Running the Application
Launch the Flask development server:
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000) on your favorite browser to check out the app!

---

## 👨‍💻 Administrative Commands
To promote any existing registered user to an Admin role, run:
```bash
python create_admin.py <username>
```

---

## 🛡️ License
This project is licensed under the MIT License. Feel free to use and distribute it!
