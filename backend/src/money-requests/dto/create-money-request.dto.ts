import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMoneyRequestDto {
  @IsEmail()
  @IsNotEmpty()
  requested_from_email!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
