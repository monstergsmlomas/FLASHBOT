import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface BotConfig {
  appointmentLabel: string;        // "turno" | "reserva" | "cita" | "sesión" | "análisis"
  appointmentLabelPlural: string;  // "turnos" | "reservas" | "citas" | ...
  requestKeywords: string[];       // palabras que disparan el flujo de reserva
  services: string[];              // servicios que ofrece (vacío = no filtrar)
  greeting: string;               // mensaje de bienvenida personalizado
}

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  // Obtener configuración completa del negocio
  async getSettings(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { businessHours: { orderBy: { dayOfWeek: 'asc' } } },
    });
  }

  // Actualizar configuración del negocio (y opcionalmente el nombre del profesional)
  async updateSettings(tenantId: string, userId: string, data: {
    name?: string;
    whatsappPhone?: string;
    botConfig?: Record<string, any>;
    categoryMargins?: Record<string, number>;
    brandExtras?: Record<string, number>;
    userName?: string;
  }) {
    const { userName, categoryMargins, brandExtras, ...tenantData } = data;

    if (categoryMargins != null) tenantData.categoryMargins = categoryMargins;
    if (brandExtras != null) tenantData.brandExtras = brandExtras;

    const [tenant] = await Promise.all([
      this.prisma.tenant.update({ where: { id: tenantId }, data: tenantData }),
      userName
        ? this.prisma.user.update({ where: { id: userId }, data: { name: userName } })
        : Promise.resolve(null),
    ]);

    return tenant;
  }

  // Extrae y normaliza la configuración del bot con defaults seguros
  getBotConfig(tenant: { name: string; botConfig?: any }): BotConfig {
    const raw = (tenant.botConfig as Record<string, any>) ?? {};
    const label   = raw.appointmentLabel       ?? 'turno';
    const plural  = raw.appointmentLabelPlural ?? `${label}s`;
    return {
      appointmentLabel:       label,
      appointmentLabelPlural: plural,
      requestKeywords:        raw.requestKeywords ?? ['turno', 'cita', 'reservar', 'quiero', 'necesito', 'agendar', 'sacar'],
      services:               raw.services       ?? [],
      greeting:               raw.greeting       ?? `¡Hola! 👋 Bienvenido/a a *${tenant.name}*.\n\n¿En qué te puedo ayudar?\n• Escribí *"quiero un ${label}"* para reservar\n• Escribí *"mis ${plural}"* para ver los tuyos\n• Escribí *"cancelar"* para cancelar`,
    };
  }

  // Actualizar horarios de atención (soporta turno partido)
  async updateBusinessHours(
    tenantId: string,
    hours: {
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      openTime2?: string | null;
      closeTime2?: string | null;
      isOpen: boolean;
      slotMin: number;
    }[],
  ) {
    await this.prisma.$transaction(
      hours.map((h) =>
        this.prisma.businessHours.upsert({
          where: { dayOfWeek_tenantId: { dayOfWeek: h.dayOfWeek, tenantId } },
          create: { ...h, tenantId },
          update: h,
        }),
      ),
    );
  }

  // Resumen del dashboard
  async getDashboardSummary(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayTotal, todayConfirmed, todayPending, totalCustomers] =
      await Promise.all([
        this.prisma.appointment.count({ where: { tenantId, date: { gte: today, lt: tomorrow } } }),
        this.prisma.appointment.count({ where: { tenantId, date: { gte: today, lt: tomorrow }, status: 'CONFIRMED' } }),
        this.prisma.appointment.count({ where: { tenantId, date: { gte: today, lt: tomorrow }, status: 'PENDING' } }),
        this.prisma.customer.count({ where: { tenantId } }),
      ]);

    return {
      today: { total: todayTotal, confirmed: todayConfirmed, pending: todayPending },
      totalCustomers,
    };
  }

  // Actualizar módulos activos del negocio
  async updateModules(tenantId: string, modules: string[]) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { modules },
    });
    return { modules: tenant.modules };
  }
}
