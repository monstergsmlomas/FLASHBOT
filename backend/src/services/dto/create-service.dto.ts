import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMin: number;

  @IsOptional()
  @IsString()
  description?: string;
}
