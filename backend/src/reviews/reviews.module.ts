import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsResolver } from './reviews.resolver';
import { MoviesModule } from '../movies/movies.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MoviesModule, AuthModule],
  providers: [ReviewsService, ReviewsResolver],
  exports: [ReviewsService],
})
export class ReviewsModule {}
