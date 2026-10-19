import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      userId
      username
      email
      isAdmin
      joinDate
      wishlistCount
    }
    checkAdminAuth {
      isAdmin
      adminUsername
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        userId
        username
        email
        isAdmin
        joinDate
        wishlistCount
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        userId
        username
        email
        isAdmin
        joinDate
        wishlistCount
      }
    }
  }
`;

export const ADMIN_LOGIN_MUTATION = gql`
  mutation AdminLogin($input: AdminLoginInput!) {
    adminLogin(input: $input) {
      token
      user {
        userId
        username
        email
        isAdmin
        joinDate
        wishlistCount
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

export const SEARCH_MOVIES_QUERY = gql`
  query SearchMovies($query: String!, $type: String, $yearStart: Int, $yearEnd: Int) {
    searchMovies(query: $query, type: $type, yearStart: $yearStart, yearEnd: $yearEnd) {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const NEW_RELEASES_QUERY = gql`
  query NewReleases {
    newReleases {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const TOP_RATED_QUERY = gql`
  query TopRated {
    topRated {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const ORBIT_MOVIES_QUERY = gql`
  query OrbitMovies {
    orbitMovies {
      movieId
      tmdbId
      title
      releaseYear
      posterUrl
      averageRating
    }
  }
`;

export const RECOMMENDATIONS_QUERY = gql`
  query Recommendations($movieId: Int!) {
    recommendations(movieId: $movieId) {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const GENRES_QUERY = gql`
  query Genres {
    genres {
      genreId
      genreName
    }
  }
`;

export const MOVIES_BY_GENRE_QUERY = gql`
  query MoviesByGenre($ids: [Int!]!, $yearStart: Int, $yearEnd: Int) {
    moviesByGenre(ids: $ids, yearStart: $yearStart, yearEnd: $yearEnd) {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const MOVIE_DETAIL_QUERY = gql`
  query MovieDetail($movieId: Int!) {
    movieDetail(movieId: $movieId) {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
      runtime
      tagline
      backdropUrl
      cast {
        name
        character
        profileUrl
      }
    }
  }
`;

export const TRAILER_QUERY = gql`
  query Trailer($movieId: Int!) {
    trailer(movieId: $movieId) {
      videoKey
      title
    }
  }
`;

export const TMDB_NOW_PLAYING_QUERY = gql`
  query TmdbNowPlaying {
    tmdbNowPlaying {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const TMDB_TRENDING_QUERY = gql`
  query TmdbTrending {
    tmdbTrending {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const TMDB_UPCOMING_QUERY = gql`
  query TmdbUpcoming {
    tmdbUpcoming {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const TMDB_BY_LANGUAGE_QUERY = gql`
  query TmdbByLanguage($langCode: String!, $yearStart: Int, $yearEnd: Int) {
    tmdbByLanguage(langCode: $langCode, yearStart: $yearStart, yearEnd: $yearEnd) {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const ENSURE_LOCAL_MUTATION = gql`
  mutation EnsureLocalMovie($tmdbId: Int!) {
    ensureLocalMovie(tmdbId: $tmdbId) {
      movieId
    }
  }
`;

export const WISHLIST_QUERY = gql`
  query Wishlist {
    wishlist {
      movieId
      tmdbId
      title
      releaseYear
      overview
      posterUrl
      averageRating
      genres
    }
  }
`;

export const WISHLIST_IDS_QUERY = gql`
  query WishlistIds {
    wishlistIds
  }
`;

export const ADD_TO_WISHLIST_MUTATION = gql`
  mutation AddToWishlist($movieId: Int!) {
    addToWishlist(movieId: $movieId) {
      success
      message
    }
  }
`;

export const REMOVE_FROM_WISHLIST_MUTATION = gql`
  mutation RemoveFromWishlist($movieId: Int!) {
    removeFromWishlist(movieId: $movieId) {
      success
      message
    }
  }
`;

export const MOVIE_REVIEWS_QUERY = gql`
  query MovieReviews($movieId: Int!) {
    movieReviews(movieId: $movieId) {
      reviewId
      rating
      reviewText
      createdAt
      username
    }
  }
`;

export const MY_REVIEWS_QUERY = gql`
  query MyReviews {
    myReviews {
      reviewId
      rating
      reviewText
      createdAt
      movieId
      title
      posterUrl
      releaseYear
    }
  }
`;

export const POST_REVIEW_MUTATION = gql`
  mutation PostReview($input: PostReviewInput!) {
    postReview(input: $input) {
      success
      message
    }
  }
`;

export const DELETE_REVIEW_MUTATION = gql`
  mutation DeleteReview($reviewId: Int!) {
    deleteReview(reviewId: $reviewId) {
      success
      message
    }
  }
`;

export const ADMIN_ADD_MOVIE_MUTATION = gql`
  mutation AdminAddMovie($input: AddMovieInput!) {
    adminAddMovie(input: $input) {
      success
      message
    }
  }
`;

export const ADMIN_REMOVE_MOVIE_MUTATION = gql`
  mutation AdminRemoveMovie($movieId: Int!) {
    adminRemoveMovie(movieId: $movieId) {
      success
      message
    }
  }
`;

export const ADMIN_REMOVE_REVIEW_MUTATION = gql`
  mutation AdminRemoveReview($ratingId: Int!) {
    adminRemoveReview(ratingId: $ratingId) {
      success
      message
    }
  }
`;

export const ADMIN_REMOVE_USER_REVIEWS_MUTATION = gql`
  mutation AdminRemoveUserReviews($userId: Int!) {
    adminRemoveUserReviews(userId: $userId) {
      success
      message
    }
  }
`;
