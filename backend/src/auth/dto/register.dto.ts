import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString()
  businessName: string; // nombre del consultorio / negocio

  @IsIn(['consultorio', 'peluqueria', 'salon', 'tecnico', 'tienda', 'cancha', 'kiosco', 'gimnasio', 'restaurante', 'gastronomia', 'otro'])
  businessType: string;

  @IsString()
  name: string; // nombre del dueño

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
