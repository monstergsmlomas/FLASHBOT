import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/v1/auth/register - crear cuenta del negocio
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/v1/auth/login - iniciar sesión
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /api/v1/auth/me - datos del usuario logueado
  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        businessType: user.tenant.businessType,
        modules: user.tenant.modules,
      },
    };
  }
}
