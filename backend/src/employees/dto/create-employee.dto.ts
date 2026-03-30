import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  serviceIds?: string[]; // IDs de servicios que atiende este empleado
}
