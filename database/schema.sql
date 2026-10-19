CREATE DATABASE IF NOT EXISTS movie_recommendation_system;
USE movie_recommendation_system;

CREATE TABLE Users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Movies (
    movie_id INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_year INT,
    tmdb_id INT UNIQUE,
    overview TEXT,
    poster_url VARCHAR(500),
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Genres (
    genre_id INT PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Movie_Genres (
    movie_id INT,
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
        ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genres(genre_id)
        ON DELETE CASCADE
);

CREATE TABLE Ratings (
    rating_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    movie_id INT,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
        ON DELETE CASCADE,
    UNIQUE (user_id, movie_id)
);

CREATE INDEX idx_user_id ON Ratings(user_id);
CREATE INDEX idx_movie_id ON Ratings(movie_id);
CREATE INDEX idx_movie_genre_movie ON Movie_Genres(movie_id);
CREATE INDEX idx_movie_genre_genre ON Movie_Genres(genre_id);

SELECT COUNT(*) AS Genre_Count FROM Genres;
SELECT COUNT(*) AS Movie_Count FROM Movies;
SELECT COUNT(*) AS User_count FROM Users;
SELECT COUNT(*) AS Rating_Count FROM Ratings;

SELECT
    m2.title,
    ROUND(AVG(r2.rating), 2) AS avg_rating,
    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
FROM Ratings r1
JOIN Ratings r2
    ON r1.user_id = r2.user_id
JOIN Movies m2
    ON r2.movie_id = m2.movie_id
LEFT JOIN Movie_Genres mg1
    ON mg1.movie_id = 1
LEFT JOIN Movie_Genres mg2
    ON mg2.movie_id = m2.movie_id
    AND mg1.genre_id = mg2.genre_id
LEFT JOIN Genres g
    ON mg2.genre_id = g.genre_id
WHERE r1.movie_id = 1
  AND r2.movie_id != 1
GROUP BY m2.movie_id
HAVING COUNT(DISTINCT r2.user_id) >= 20
ORDER BY
    (
        COUNT(DISTINCT r2.user_id) * 0.6 +
        AVG(r2.rating) * 0.3 +
        COUNT(DISTINCT mg2.genre_id) * 0.1
    ) DESC
LIMIT 10;

-- --------------------------------------------------------------------
-- OPTIMIZED RECOMMENDATION QUERY FOR LARGE DATASETS (e.g. MovieLens 32M)
-- Since a naive self-join of the Ratings table across 32M rows is extremely slow, 
-- this query samples a limited pool of users who rated the target movie 
-- positively (>= 4.0), then finds other movies those specific users liked.
-- --------------------------------------------------------------------
SELECT
    m2.title,
    ROUND(AVG(r2.rating), 2) AS avg_rating,
    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
FROM (
    -- Subquery 1: Get up to 500 users who rated the target movie >= 4.0
    SELECT user_id 
    FROM Ratings 
    WHERE movie_id = 1 AND rating >= 4.0 
    ORDER BY rated_at DESC 
    LIMIT 500
) AS top_users
JOIN Ratings r2
    ON top_users.user_id = r2.user_id
JOIN Movies m2
    ON r2.movie_id = m2.movie_id
LEFT JOIN Movie_Genres mg1
    ON mg1.movie_id = 1
LEFT JOIN Movie_Genres mg2
    ON mg2.movie_id = m2.movie_id
    AND mg1.genre_id = mg2.genre_id
LEFT JOIN Genres g
    ON mg2.genre_id = g.genre_id
WHERE r2.movie_id != 1
GROUP BY m2.movie_id
HAVING COUNT(DISTINCT r2.user_id) >= 5  -- Lower threshold because we're sampling
ORDER BY
    (
        COUNT(DISTINCT r2.user_id) * 0.6 +
        AVG(r2.rating) * 0.3 +
        COUNT(DISTINCT mg2.genre_id) * 0.1
    ) DESC
LIMIT 10;