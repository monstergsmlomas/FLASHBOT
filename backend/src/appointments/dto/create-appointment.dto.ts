import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsDateString()
  date: string; // ISO 8601: "2025-04-15T15:30:00"

  @IsString()
  customerId: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number; // duración en minutos (por defecto 30)

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  serviceId?: string; // ID del servicio (peluquería, etc.)

  @IsOptional()
  @IsString()
  employeeId?: string; // ID del empleado asignado
}
