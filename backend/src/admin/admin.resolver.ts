import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AddMovieInput } from './dto/admin.dto';
import { StatusResponse } from '../auth/dto/auth.dto';
import { GqlAdminGuard } from '../auth/admin.guard';

@Resolver()
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAdminGuard)
  async adminAddMovie(@Args('input') input: AddMovieInput): Promise<StatusResponse> {
    const res = await this.adminService.addMovie(input);
    return {
      success: true,
      message: `Movie "${res.title}" added successfully (ID: ${res.movieId})`,
    };
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAdminGuard)
  async adminRemoveMovie(
    @Args('movieId', { type: () => Int }) movieId: number,
  ): Promise<StatusResponse> {
    const title = await this.adminService.removeMovie(movieId);
    return {
      success: true,
      message: `Movie "${title}" (ID: ${movieId}) removed successfully`,
    };
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAdminGuard)
  async adminRemoveReview(
    @Args('ratingId', { type: () => Int }) ratingId: number,
  ): Promise<StatusResponse> {
    const msg = await this.adminService.removeReview(ratingId);
    return {
      success: true,
      message: msg,
    };
  }

  @Mutation(() => StatusResponse)
  @UseGuards(GqlAdminGuard)
  async adminRemoveUserReviews(
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<StatusResponse> {
    const msg = await this.adminService.removeUserReviews(userId);
    return {
      success: true,
      message: msg,
    };
  }
}
