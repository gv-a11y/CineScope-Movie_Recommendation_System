import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import { Min, Max, IsNotEmpty } from 'class-validator';

@ObjectType()
export class Review {
  @Field(() => Int)
  reviewId: number;

  @Field(() => Float)
  rating: number;

  @Field()
  reviewText: string;

  @Field()
  createdAt: string;

  @Field()
  username: string;
}

@ObjectType()
export class MyReview {
  @Field(() => Int)
  reviewId: number;

  @Field(() => Float)
  rating: number;

  @Field()
  reviewText: string;

  @Field()
  createdAt: string;

  @Field(() => Int)
  movieId: number;

  @Field()
  title: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => Int, { nullable: true })
  releaseYear?: number;
}

@InputType()
export class PostReviewInput {
  @Field(() => Int)
  movieId: number;

  @Field(() => Float)
  @Min(0, { message: 'Rating must be at least 0' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @Field(() => String, { defaultValue: '' })
  reviewText: string;
}
