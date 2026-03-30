import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  phone: string; // JID de WhatsApp (puede ser ID de Meta, no el número real)

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  realPhone?: string; // teléfono real declarado por el paciente (para wa.me/)

  @IsOptional()
  @IsString()
  dni?: string; // documento de identidad

  @IsOptional()
  @IsString()
  address?: string; // domicilio del paciente

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
