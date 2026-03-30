import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // Listar clientes/pacientes del negocio
  async findAll(tenantId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener un cliente con su historial de turnos
  async findOne(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
  }

  // Crear cliente
  async create(tenantId: string, dto: CreateCustomerDto) {
    const exists = await this.prisma.customer.findUnique({
      where: { phone_tenantId: { phone: dto.phone, tenantId } },
    });

    if (exists) {
      throw new ConflictException('Ya existe un cliente con ese número');
    }

    return this.prisma.customer.create({
      data: { ...dto, tenantId },
    });
  }

  // Buscar cliente por teléfono (usado por el bot de WhatsApp)
  async findOrCreateByPhone(tenantId: string, phone: string, name?: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { phone_tenantId: { phone, tenantId } },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone, name, tenantId },
      });
    }

    return customer;
  }

  // Actualizar datos del cliente (solo campos permitidos)
  async update(tenantId: string, id: string, data: Record<string, any>) {
    const { name, realPhone, dni, address, email, notes } = data;
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name }),
        ...(realPhone !== undefined && { realPhone }),
        ...(dni       !== undefined && { dni }),
        ...(address   !== undefined && { address }),
        ...(email     !== undefined && { email }),
        ...(notes     !== undefined && { notes }),
      },
    });
  }

  // Eliminar cliente (borra sus turnos y conversaciones primero)
  async delete(tenantId: string, id: string) {
    // Verificar que el cliente pertenece al tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) return { count: 0 };

    // Borrar registros relacionados primero (FK sin cascade)
    await this.prisma.conversationState.deleteMany({ where: { customerId: id } });
    await this.prisma.appointment.deleteMany({ where: { customerId: id, tenantId } });

    // Borrar el cliente
    await this.prisma.customer.delete({ where: { id } });
    return { count: 1 };
  }
}
