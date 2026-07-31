import os
import sys
import csv
import re
import time
import requests  # type: ignore
import mysql.connector  # type: ignore
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Set, Tuple, Optional
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config  # type: ignore

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ml-32m')

TMDB_BASE: str = "https://api.themoviedb.org/3"
IMG_BASE: str = "https://image.tmdb.org/t/p/w500"
BATCH: int = 5000   # general insert batch size
RATING_BATCH: int = 20000  # ratings-specific batch size
MAX_MOVIES: int = 10000  # Limit to 10,000 movies for exhibition
MAX_RATINGS: int = 15_000_000  # Limit to 15M ratings for exhibition

def get_db():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME
    )

def fetch_tmdb_info(tmdb_id):
    """Fetch poster_url and overview from TMDB using the known tmdb_id."""
    if not tmdb_id:
        return {'tmdb_id': None, 'overview': None, 'poster_url': None}
    for attempt in range(3):
        try:
            resp = requests.get(
                f"{TMDB_BASE}/movie/{tmdb_id}",
                params={'api_key': Config.TMDB_API_KEY, 'language': 'en-US'},
                timeout=6
            )
            if resp.status_code == 200:
                d = resp.json()
                poster_path = d.get('poster_path')
                return {
                    'tmdb_id': tmdb_id,
                    'overview': d.get('overview', ''),
                    'poster_url': f"{IMG_BASE}{poster_path}" if poster_path else None
                }
            elif resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            else:
                break
        except Exception:
            time.sleep(1)
    return {'tmdb_id': tmdb_id, 'overview': None, 'poster_url': None}

def parse_year(title):
    m = re.search(r'\((\d{4})\)\s*$', title)
    return int(m.group(1)) if m else None

def import_data():
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        print("Truncating tables...")
        for table in ['Movie_Genres', 'Ratings', 'Movies', 'Users', 'Genres']:
            cursor.execute(f"TRUNCATE TABLE {table}")
        conn.commit()

        # ── 1. Genres (extracted from movies.csv pipe-separated field) ──
        print(f"Extracting genres from movies.csv (limiting to {MAX_MOVIES} movies)...")
        genre_set = set()
        movies_raw = []
        with open(os.path.join(DATA_DIR, 'movies.csv'), 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if len(movies_raw) >= MAX_MOVIES:
                    break
                movies_raw.append(row)
                for g in row['genres'].split('|'):
                    if g and g.lower() != '(no genres listed)':
                        genre_set.add(g.strip())

        genre_list = sorted(genre_set)
        genre_to_id = {g: i+1 for i, g in enumerate(genre_list)}
        cursor.executemany(
            "INSERT INTO Genres (genre_id, genre_name) VALUES (%s, %s)",
            [(gid, name) for name, gid in genre_to_id.items()]
        )
        conn.commit()
        print(f"  Inserted {len(genre_list)} genres.")

        # ── 2. Load links (movieId → tmdbId) ──
        print("Loading links.csv (tmdbId mapping)...")
        tmdb_map = {}
        with open(os.path.join(DATA_DIR, 'links.csv'), 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                mid = int(row['movieId'])
                tid = row.get('tmdbId', '').strip()
                tmdb_map[mid] = int(tid) if tid else None

        # ── 3. Insert placeholder users (max userId from ratings.csv) ──
        print("Scanning ratings.csv for max userId (this may take a moment)...")
        max_user_id: int = 0
        with open(os.path.join(DATA_DIR, 'ratings.csv'), 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                uid = int(row['userId'])
                if uid > max_user_id:
                    max_user_id = uid

        print(f"  Max userId = {max_user_id}. Inserting placeholder users...")
        users_batch = []
        for uid in range(1, max_user_id + 1):  # type: ignore
            users_batch.append((uid, f"user_{uid}", f"user_{uid}@ml.example.com", "imported"))
            if len(users_batch) >= BATCH:
                cursor.executemany(
                    "INSERT IGNORE INTO Users (user_id, username, email, password_hash) VALUES (%s,%s,%s,%s)",
                    users_batch
                )
                conn.commit()
                users_batch = []
        if users_batch:
            cursor.executemany(
                "INSERT IGNORE INTO Users (user_id, username, email, password_hash) VALUES (%s,%s,%s,%s)",
                users_batch
            )
            conn.commit()
        print(f"  Inserted {max_user_id} placeholder users.")

        # ── 4. Fetch TMDB data & insert movies ──
        print(f"Fetching TMDB data for {len(movies_raw)} movies (concurrent, reduced dataset)...")
        futures: Dict[Any, Dict[str, Any]] = {}
        movies_to_insert: List[Tuple[Any, ...]] = []
        movie_genres_to_insert: List[Tuple[Any, ...]] = []
        # Track seen tmdb_ids to avoid duplicate UNIQUE constraint violations.
        # When two MovieLens movies map to the same TMDB id we keep the one
        # with the smaller movie_id (processed first) and skip the rest.
        seen_tmdb_ids: Set[int] = set()

        with ThreadPoolExecutor(max_workers=40) as ex:
            for row in movies_raw:
                mid = int(row['movieId'])
                tmdb_id = tmdb_map.get(mid)
                fut = ex.submit(fetch_tmdb_info, tmdb_id)  # type: ignore
                futures[fut] = {
                    'movie_id': mid,
                    'title': row['title'],
                    'year': parse_year(row['title']),
                    'genres': [g.strip() for g in row['genres'].split('|') if g.strip() and g.lower() != '(no genres listed)']
                }

            done: int = 0
            skipped_dupes: int = 0
            for fut in as_completed(futures):
                meta = futures[fut]
                tmdb = fut.result()
                tid = tmdb['tmdb_id']

                # Skip if this tmdb_id was already claimed by another movie_id
                if tid is not None and tid in seen_tmdb_ids:
                    skipped_dupes += 1  # type: ignore
                    done += 1  # type: ignore
                    continue
                if tid is not None:
                    seen_tmdb_ids.add(tid)

                movies_to_insert.append((
                    meta['movie_id'],
                    meta['title'],
                    meta['year'],
                    tid,
                    tmdb['overview'],
                    tmdb['poster_url']
                ))
                genres_list: List[str] = meta.get('genres', [])
                for genre_name in genres_list:
                    gid = genre_to_id.get(genre_name)
                    if gid:
                        movie_genres_to_insert.append((meta['movie_id'], gid))
                done += 1
                if done % 200 == 0:
                    print(f"  TMDB fetched {done}/{len(futures)} movies (skipped {skipped_dupes} dupes)...")
        print(f"  TMDB fetch complete. {len(movies_to_insert)} unique movies, {skipped_dupes} duplicate tmdb_id skipped.")

        print("Inserting movies into DB...")
        try:
            time.sleep(2)
            conn.ping(reconnect=True, attempts=3)
        except Exception as e:
            print("Reconnecting to DB failed, attempting to get a new connection...")
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")

        for i in range(0, len(movies_to_insert), BATCH):
            cursor.executemany(
                "INSERT IGNORE INTO Movies (movie_id, title, release_year, tmdb_id, overview, poster_url) VALUES (%s,%s,%s,%s,%s,%s)",
                movies_to_insert[i:i+BATCH]  # type: ignore
            )
            conn.commit()

        print("Inserting movie-genre mappings...")
        for i in range(0, len(movie_genres_to_insert), BATCH):
            cursor.executemany(
                "INSERT IGNORE INTO Movie_Genres (movie_id, genre_id) VALUES (%s,%s)",
                movie_genres_to_insert[i:i+BATCH]  # type: ignore
            )
            conn.commit()
        print(f"  Inserted {len(movies_to_insert)} movies, {len(movie_genres_to_insert)} genre links.")

        # ── 5. Import ratings in streaming chunks ──
        print(f"Importing ratings (limiting to {MAX_RATINGS:,} rows, streaming in chunks)...")
        ratings_batch: List[Tuple[Any, ...]] = []
        total_ratings: int = 0
        valid_movie_ids: Set[int] = {r[0] for r in movies_to_insert}
        last_ping: int = 0  # track when we last pinged the DB connection
        rating_sums = defaultdict(float)
        rating_counts = defaultdict(int)

        with open(os.path.join(DATA_DIR, 'ratings.csv'), 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if total_ratings >= MAX_RATINGS:
                    break
                uid  = int(row['userId'])
                mid  = int(row['movieId'])
                rate = float(row['rating'])
                if mid not in valid_movie_ids:
                    continue
                rating_sums[mid] += rate
                rating_counts[mid] += 1
                ratings_batch.append((uid, mid, rate))
                if len(ratings_batch) >= RATING_BATCH:
                    cursor.executemany(
                        "INSERT IGNORE INTO Ratings (user_id, movie_id, rating) VALUES (%s,%s,%s)",
                        ratings_batch
                    )
                    conn.commit()
                    total_ratings += len(ratings_batch)  # type: ignore
                    ratings_batch = []
                    if total_ratings % 500000 == 0:
                        print(f"  Inserted {total_ratings:,} ratings so far...")
                    # Keep the connection alive every 1M rows to avoid timeout
                    if total_ratings - last_ping >= 1_000_000:  # type: ignore
                        try:
                            time.sleep(2)
                            conn.ping(reconnect=True, attempts=3)
                        except Exception:
                            conn = get_db()
                            cursor = conn.cursor()
                            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                        last_ping = total_ratings
        if ratings_batch:
            cursor.executemany(
                "INSERT IGNORE INTO Ratings (user_id, movie_id, rating) VALUES (%s,%s,%s)",
                ratings_batch
            )
            conn.commit()
            total_ratings += len(ratings_batch)  # type: ignore
        print(f"  Done — {total_ratings:,} ratings inserted.")

        # ── 6. Compute average ratings ──
        print("Computing average ratings...")
        averages = []
        for mid in rating_sums:
            avg = round(rating_sums[mid] / rating_counts[mid], 2)
            averages.append((avg, mid))
        
        for i in range(0, len(averages), BATCH):
            cursor.executemany(
                "UPDATE Movies SET average_rating = %s WHERE movie_id = %s",
                averages[i:i+BATCH]
            )
            conn.commit()

        print("\n✅ MovieLens 32M import complete!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  MovieLens 32M Import Script")
    print("  This will run for many hours. Leave it overnight.")
    print("=" * 60)
    import_data()
