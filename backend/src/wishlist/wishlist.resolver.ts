import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { Movie } from '../movies/dto/movie.dto';
import { StatusResponse } from '../auth/dto/auth.dto';
import { CurrentUser, JwtUserPayload } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/auth.guard';

@Resolver()
export class WishlistResolver {
  constructor(private readonly wishlistService: WishlistService) {}

  @Query(() => [Movie])
  @UseGuards(GqlAuthGuard)
  async wishlist(@CurrentUser() user: JwtUserPayload): Promise<Movie[]> {
    return this.wishlistService.getWishlist(user.userId);
  }

  @Query(() => [Int])
  async wishlistIds(@CurrentUser() user: JwtUserPayload | null): Promise<number[]> {
    if (!user) {
      return [];
    }
    return this.wishlistService.getWishlistIds(user.userId);
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAuthGuard)
  async addToWishlist(
    @Args('movieId', { type: () => Int }) movieId: number,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StatusResponse> {
    const success = await this.wishlistService.addToWishlist(user.userId, movieId);
    return {
      success,
      message: success ? 'Movie added to My List' : 'Failed to add movie to My List',
    };
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAuthGuard)
  async removeFromWishlist(
    @Args('movieId', { type: () => Int }) movieId: number,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StatusResponse> {
    const success = await this.wishlistService.removeFromWishlist(user.userId, movieId);
    return {
      success,
      message: success ? 'Movie removed from My List' : 'Failed to remove movie from My List',
    };
  }
}
