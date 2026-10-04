import { IsString, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  transaction_id!: string;

  @IsString()
  @IsIn(['SUCCESS', 'REJECTED'])
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsOptional()
  rejection_reason?: string;
}
