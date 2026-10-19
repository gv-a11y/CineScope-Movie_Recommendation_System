import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, Min, Max } from 'class-validator';

@InputType()
export class AddMovieInput {
  @Field()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @Field(() => Int)
  @Min(1900, { message: 'Release year must be valid' })
  @Max(2100, { message: 'Release year must be valid' })
  releaseYear: number;

  @Field(() => Int, { nullable: true })
  tmdbId?: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => [String], { nullable: true })
  genres?: string[];

  @Field(() => String, { nullable: true })
  overview?: string;
}
