import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class Genre {
  @Field(() => Int)
  genreId: number;

  @Field()
  genreName: string;
}

@ObjectType()
export class CastMember {
  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  character?: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;
}

@ObjectType()
export class Movie {
  @Field(() => Int, { nullable: true })
  movieId?: number;

  @Field(() => Int, { nullable: true })
  tmdbId?: number;

  @Field()
  title: string;

  @Field(() => Int, { nullable: true })
  releaseYear?: number;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => String, { nullable: true })
  genres?: string;
}

@ObjectType()
export class MovieDetail extends Movie {
  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  tagline?: string;

  @Field(() => String, { nullable: true })
  backdropUrl?: string;

  @Field(() => [CastMember], { defaultValue: [] })
  cast: CastMember[];
}

@ObjectType()
export class TrailerInfo {
  @Field()
  videoKey: string;

  @Field()
  title: string;
}

@ObjectType()
export class EnsureLocalResponse {
  @Field(() => Int)
  movieId: number;
}
