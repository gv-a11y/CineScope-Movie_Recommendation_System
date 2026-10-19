import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistResolver } from './wishlist.resolver';
import { MoviesModule } from '../movies/movies.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MoviesModule, AuthModule],
  providers: [WishlistService, WishlistResolver],
  exports: [WishlistService],
})
export class WishlistModule {}
