import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
} from 'class-validator';

export class TransferDto {
  @IsOptional()
  @IsString()
  receiver_email?: string;

  @IsOptional()
  @IsString()
  receiver_wallet_id?: string;

  @IsOptional()
  @IsString()
  receiver_user_id?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
