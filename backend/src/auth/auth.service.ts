import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // Registrar un nuevo negocio + su usuario admin
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Módulos que se activan según el rubro
    const modulesByType: Record<string, string[]> = {
      consultorio: ['appointments', 'customers'],
      peluqueria:  ['appointments', 'customers'],
      salon:       ['appointments', 'customers', 'sales'],
      cancha:      ['appointments', 'sales', 'inventory'],
      kiosco:      ['sales', 'inventory', 'delivery'],
      tecnico:     ['repairs', 'customers', 'sales', 'inventory'],
      gimnasio:    ['appointments', 'customers', 'sales'],
      restaurante: ['sales', 'inventory', 'delivery'],
      otro:        ['appointments', 'customers'],
    };

    // Crear el negocio (tenant) y el usuario admin en una sola transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName,
          businessType: dto.businessType,
          modules: modulesByType[dto.businessType] || ['appointments', 'customers'],
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      // Horarios de atención por defecto: Lunes a Viernes 9-18hs
      const defaultSlot = dto.businessType === 'cancha' ? 60 : 30;
      await tx.businessHours.createMany({
        data: [1, 2, 3, 4, 5].map((day) => ({
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '18:00',
          isOpen: true,
          slotMin: defaultSlot,
          tenantId: tenant.id,
        })),
      });

      return { tenant, user };
    });

    const token = this.generateToken(result.user.id, result.user.email, result.tenant.id);

    return {
      accessToken: token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        businessType: result.tenant.businessType,
        modules: result.tenant.modules,
      },
    };
  }

  // Iniciar sesión
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tu cuenta está desactivada');
    }

    const token = this.generateToken(user.id, user.email, user.tenantId);

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        businessType: user.tenant.businessType,
        modules: user.tenant.modules,
      },
    };
  }

  private generateToken(userId: string, email: string, tenantId: string) {
    return this.jwt.sign({
      sub: userId,
      email,
      tenantId,
    });
  }
}
