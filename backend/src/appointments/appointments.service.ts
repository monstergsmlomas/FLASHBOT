import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // Obtener todos los turnos del negocio (con filtro opcional por fecha)
  async findAll(tenantId: string, from?: string, to?: string) {
    const where: any = { tenantId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, durationMin: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Obtener turnos de hoy
  async findToday(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Crear un turno nuevo
  async create(tenantId: string, dto: CreateAppointmentDto) {
    const appointmentDate = new Date(dto.date);

    // Si hay servicio, usar su duración; si no, usar la del DTO o 30min
    let duration = dto.durationMin ?? 30;
    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } });
      if (service) duration = service.durationMin;
    }

    // Verificar disponibilidad (por empleado si se especificó)
    const available = await this.checkAvailability(tenantId, appointmentDate, duration, dto.employeeId);
    if (!available) {
      throw new BadRequestException('Ese horario no está disponible');
    }

    return this.prisma.appointment.create({
      data: {
        date: appointmentDate,
        durationMin: duration,
        notes: dto.notes,
        tenantId,
        customerId: dto.customerId,
        ...(dto.serviceId && { serviceId: dto.serviceId }),
        ...(dto.employeeId && { employeeId: dto.employeeId }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  // Actualizar estado de un turno
  async updateStatus(tenantId: string, id: string, status: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // Cancelar turno
  async cancel(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'CANCELLED');
  }

  // Eliminar turno (normalmente solo cancelados)
  async delete(tenantId: string, id: string) {
    return this.prisma.appointment.deleteMany({
      where: { id, tenantId },
    });
  }

  // Obtener horarios disponibles para una fecha (con filtro opcional por empleado/servicio)
  async getAvailableSlots(tenantId: string, date: string, serviceId?: string, employeeId?: string) {
    // CRÍTICO: parsear como fecha LOCAL, no UTC.
    // new Date("2026-03-28") interpreta UTC midnight → en UTC-3 es el día anterior.
    const [y, m, d] = date.split('-').map(Number);
    const requestedDate = new Date(y, m - 1, d); // local midnight → día correcto
    const dayOfWeek = requestedDate.getDay();

    // Obtener horarios del negocio para ese día
    const businessHours = await this.prisma.businessHours.findUnique({
      where: { dayOfWeek_tenantId: { dayOfWeek, tenantId } },
    });

    if (!businessHours || !businessHours.isOpen) {
      return { available: false, message: 'El negocio no atiende ese día', slots: [] };
    }

    // Si hay servicio, usar su duración para los slots
    let slotDuration = businessHours.slotMin;
    if (serviceId) {
      const service = await this.prisma.service.findFirst({ where: { id: serviceId, tenantId } });
      if (service) slotDuration = service.durationMin;
    }

    // Generar todos los slots (soporta turno partido mañana/tarde)
    const morningSlots = this.generateSlots(
      requestedDate,
      businessHours.openTime,
      businessHours.closeTime,
      slotDuration,
    );
    const afternoonSlots =
      businessHours.openTime2 && businessHours.closeTime2
        ? this.generateSlots(
            requestedDate,
            businessHours.openTime2,
            businessHours.closeTime2,
            slotDuration,
          )
        : [];
    const slots = [...morningSlots, ...afternoonSlots];

    // Obtener turnos ya reservados para esa fecha (filtrar por empleado si se especificó)
    const dayStart = new Date(requestedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookedWhere: any = {
      tenantId,
      date: { gte: dayStart, lt: dayEnd },
      status: { not: 'CANCELLED' },
    };
    if (employeeId) bookedWhere.employeeId = employeeId;

    const bookedAppointments = await this.prisma.appointment.findMany({ where: bookedWhere });

    const bookedTimes = new Set(
      bookedAppointments.map((a) => a.date.toISOString()),
    );

    const availableSlots = slots.filter(
      (slot) => !bookedTimes.has(slot.datetime),
    );

    return {
      available: availableSlots.length > 0,
      date,
      slots: availableSlots,
    };
  }

  // Verificar si un horario específico está libre (por empleado si se especificó)
  async checkAvailability(
    tenantId: string,
    date: Date,
    durationMin: number,
    employeeId?: string,
  ): Promise<boolean> {
    const endTime = new Date(date.getTime() + durationMin * 60 * 1000);

    const where: any = {
      tenantId,
      status: { not: 'CANCELLED' },
      AND: [
        { date: { lt: endTime } },
        { date: { gte: new Date(date.getTime() - durationMin * 60 * 1000) } },
      ],
    };
    if (employeeId) where.employeeId = employeeId;

    const conflict = await this.prisma.appointment.findFirst({ where });
    return !conflict;
  }

  // Genera lista de slots horarios para un día
  private generateSlots(
    date: Date,
    openTime: string,
    closeTime: string,
    slotMin: number,
  ) {
    const slots: { time: string; datetime: string }[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const start = new Date(date);
    start.setHours(openH, openM, 0, 0);

    const end = new Date(date);
    end.setHours(closeH, closeM, 0, 0);

    const current = new Date(start);
    while (current < end) {
      slots.push({
        time: current.toTimeString().slice(0, 5),
        datetime: current.toISOString(),
      });
      current.setMinutes(current.getMinutes() + slotMin);
    }

    return slots;
  }
}
