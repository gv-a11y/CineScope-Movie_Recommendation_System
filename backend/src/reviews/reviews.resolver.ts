import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review, MyReview, PostReviewInput } from './dto/review.dto';
import { StatusResponse } from '../auth/dto/auth.dto';
import { CurrentUser, JwtUserPayload } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/auth.guard';

@Resolver()
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Query(() => [Review])
  async movieReviews(
    @Args('movieId', { type: () => Int }) movieId: number,
  ): Promise<Review[]> {
    return this.reviewsService.getReviews(movieId);
  }

  @Query(() => [MyReview])
  @UseGuards(GqlAuthGuard)
  async myReviews(@CurrentUser() user: JwtUserPayload): Promise<MyReview[]> {
    return this.reviewsService.getMyReviews(user.userId);
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAuthGuard)
  async postReview(
    @Args('input') input: PostReviewInput,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StatusResponse> {
    await this.reviewsService.postReview(user.userId, input);
    return { success: true, message: 'Review submitted successfully' };
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAuthGuard)
  async deleteReview(
    @Args('reviewId', { type: () => Int }) reviewId: number,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StatusResponse> {
    await this.reviewsService.deleteReview(user.userId, reviewId);
    return { success: true, message: 'Review deleted successfully' };
  }
}
