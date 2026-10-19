import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPayload, LoginInput, RegisterInput, AdminLoginInput, User, StatusResponse, AdminAuthCheck } from './dto/auth.dto';
import { CurrentUser, JwtUserPayload } from './current-user.decorator';
import { GqlAuthGuard } from './auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const payload = await this.authService.register(input);
    if (context.res?.cookie) {
      context.res.cookie('cinescope_token', payload.token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    return payload;
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const payload = await this.authService.login(input);
    if (context.res?.cookie) {
      context.res.cookie('cinescope_token', payload.token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    return payload;
  }

  @Mutation(() => AuthPayload)
  async adminLogin(
    @Args('input') input: AdminLoginInput,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const payload = await this.authService.adminLogin(input);
    if (context.res?.cookie) {
      context.res.cookie('cinescope_token', payload.token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    return payload;
  }

  @Mutation(() => StatusResponse)
  async logout(@Context() context: any): Promise<StatusResponse> {
    if (context.res?.clearCookie) {
      context.res.clearCookie('cinescope_token');
    }
    return { success: true, message: 'Logged out successfully' };
  }

  @Query(() => User, { nullable: true })
  async me(@CurrentUser() user: JwtUserPayload | null): Promise<User | null> {
    if (!user) {
      return null;
    }
    return this.authService.getMe(user.userId);
  }

  @Query(() => AdminAuthCheck)
  checkAdminAuth(@CurrentUser() user: JwtUserPayload | null): AdminAuthCheck {
    return this.authService.checkAdminAuth(user);
  }
}
