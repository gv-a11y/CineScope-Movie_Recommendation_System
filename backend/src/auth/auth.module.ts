import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { GqlAuthGuard } from './auth.guard';
import { GqlAdminGuard } from './admin.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.SECRET_KEY || 'super-secret-key-123',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, AuthResolver, GqlAuthGuard, GqlAdminGuard],
  exports: [AuthService, JwtModule, GqlAuthGuard, GqlAdminGuard],
})
export class AuthModule {}
