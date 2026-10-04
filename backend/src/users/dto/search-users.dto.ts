import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchUsersDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query!: string;
}
