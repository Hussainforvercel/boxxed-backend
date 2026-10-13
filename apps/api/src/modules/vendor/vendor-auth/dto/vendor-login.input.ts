import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType({ description: 'Merchant partner station login credentials' })
export class VendorLoginInput {
  @Field(() => String, { description: 'Merchant username, station ID, or official email' })
  @IsString()
  @IsNotEmpty()
  usernameOrEmail!: string;

  @Field(() => String, { description: 'Merchant security key password' })
  @IsString()
  @MinLength(6)
  password!: string;
}
