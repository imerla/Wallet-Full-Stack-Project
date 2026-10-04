import { IsNumber, IsPositive } from 'class-validator';

export class CheckoutDto {
  @IsNumber()
  @IsPositive()
  amount!: number;
}
