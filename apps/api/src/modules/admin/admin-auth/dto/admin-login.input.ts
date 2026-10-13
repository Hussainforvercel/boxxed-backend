import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@InputType({ description: 'Credentials for admin authentication' })
export class AdminLoginInput {
  @Field(() => String)
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must have at least 6 characters' })
  password!: string;
}
