import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtUserPayload {
  userId: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): JwtUserPayload | null => {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    return req?.user || null;
  },
);
