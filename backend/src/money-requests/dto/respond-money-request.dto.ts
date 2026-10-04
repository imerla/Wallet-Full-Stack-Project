import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RespondMoneyRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACCEPT', 'REJECT'])
  action!: 'ACCEPT' | 'REJECT';
}
