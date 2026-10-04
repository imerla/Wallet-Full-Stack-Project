import { IsOptional, IsInt, IsIn, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['INCOME', 'EXPENSE'])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
