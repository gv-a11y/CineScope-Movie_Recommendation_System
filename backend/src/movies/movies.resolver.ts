import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MoviesService } from './movies.service';
import { Movie, MovieDetail, Genre, TrailerInfo, EnsureLocalResponse } from './dto/movie.dto';

@Resolver(() => Movie)
export class MoviesResolver {
  constructor(private readonly moviesService: MoviesService) {}

  @Query(() => [Movie])
  async searchMovies(
    @Args('query') query: string,
    @Args('type', { defaultValue: 'title' }) type: string,
    @Args('yearStart', { type: () => Int, nullable: true }) yearStart?: number,
    @Args('yearEnd', { type: () => Int, nullable: true }) yearEnd?: number,
  ): Promise<Movie[]> {
    return this.moviesService.searchMovies(query, type, yearStart, yearEnd);
  }

  @Query(() => [Movie])
  async newReleases(): Promise<Movie[]> {
    return this.moviesService.getNewReleases();
  }

  @Query(() => [Movie])
  async topRated(): Promise<Movie[]> {
    return this.moviesService.getTopRated();
  }

  @Query(() => [Movie])
  async orbitMovies(): Promise<Movie[]> {
    return this.moviesService.getOrbitMovies();
  }

  @Query(() => [Movie])
  async recommendations(
    @Args('movieId', { type: () => Int }) movieId: number,
  ): Promise<Movie[]> {
    return this.moviesService.getRecommendations(movieId);
  }

  @Query(() => [Genre])
  async genres(): Promise<Genre[]> {
    return this.moviesService.getAllGenres();
  }

  @Query(() => [Movie])
  async moviesByGenre(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('yearStart', { type: () => Int, nullable: true }) yearStart?: number,
    @Args('yearEnd', { type: () => Int, nullable: true }) yearEnd?: number,
  ): Promise<Movie[]> {
    return this.moviesService.getMoviesByGenres(ids, yearStart, yearEnd);
  }

  @Query(() => MovieDetail)
  async movieDetail(
    @Args('movieId', { type: () => Int }) movieId: number,
  ): Promise<MovieDetail> {
    return this.moviesService.getMovieDetail(movieId);
  }

  @Query(() => TrailerInfo)
  async trailer(
    @Args('movieId', { type: () => Int }) movieId: number,
  ): Promise<TrailerInfo> {
    return this.moviesService.getTrailer(movieId);
  }

  @Query(() => [Movie])
  async tmdbNowPlaying(): Promise<Movie[]> {
    return this.moviesService.getTmdbNowPlaying();
  }

  @Query(() => [Movie])
  async tmdbTrending(): Promise<Movie[]> {
    return this.moviesService.getTmdbTrending();
  }

  @Query(() => [Movie])
  async tmdbUpcoming(): Promise<Movie[]> {
    return this.moviesService.getTmdbUpcoming();
  }

  @Query(() => [Movie])
  async tmdbByLanguage(
    @Args('langCode') langCode: string,
    @Args('yearStart', { type: () => Int, nullable: true }) yearStart?: number,
    @Args('yearEnd', { type: () => Int, nullable: true }) yearEnd?: number,
  ): Promise<Movie[]> {
    return this.moviesService.getTmdbByLanguage(langCode, yearStart, yearEnd);
  }

  @Mutation(() => EnsureLocalResponse)
  async ensureLocalMovie(
    @Args('tmdbId', { type: () => Int }) tmdbId: number,
  ): Promise<EnsureLocalResponse> {
    const movieId = await this.moviesService.ensureLocalMovie(tmdbId);
    return { movieId };
  }
}
