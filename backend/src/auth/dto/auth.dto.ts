import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@ObjectType()
export class User {
  @Field(() => Int)
  userId: number;

  @Field()
  username: string;

  @Field()
  email: string;

  @Field(() => Boolean)
  isAdmin: boolean;

  @Field(() => String, { nullable: true })
  joinDate?: string;

  @Field(() => Int, { defaultValue: 0 })
  wishlistCount: number;
}

@ObjectType()
export class AuthPayload {
  @Field()
  token: string;

  @Field(() => User)
  user: User;
}

@ObjectType()
export class StatusResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class AdminAuthCheck {
  @Field(() => Boolean)
  isAdmin: boolean;

  @Field(() => String, { nullable: true })
  adminUsername?: string;
}

@InputType()
export class RegisterInput {
  @Field()
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @Field()
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @Field()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @Field()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

@InputType()
export class AdminLoginInput {
  @Field()
  @IsNotEmpty({ message: 'Admin username is required' })
  username: string;

  @Field()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
