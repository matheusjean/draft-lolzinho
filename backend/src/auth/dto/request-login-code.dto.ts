import { IsEmail } from 'class-validator';

export class RequestLoginCodeDto {
  @IsEmail()
  email!: string;
}
