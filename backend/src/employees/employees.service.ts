import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, serviceId?: string) {
    const where: any = { tenantId, isActive: true };
    if (serviceId) {
      where.services = { some: { serviceId } };
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        services: {
          include: { service: { select: { id: true, name: true, durationMin: true } } },
        },
      },
    });
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const { name, serviceIds = [] } = dto;
    return this.prisma.employee.create({
      data: {
        name,
        tenantId,
        services: {
          create: serviceIds.map((serviceId) => ({ serviceId, tenantId })),
        },
      },
      include: {
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateEmployeeDto>) {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const { name, serviceIds } = dto;

    // Sincronizar servicios si se enviaron
    if (serviceIds !== undefined) {
      await this.prisma.employeeService.deleteMany({ where: { employeeId: id } });
      if (serviceIds.length > 0) {
        await this.prisma.employeeService.createMany({
          data: serviceIds.map((serviceId) => ({ employeeId: id, serviceId, tenantId })),
        });
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: { ...(name && { name }) },
      include: {
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } });
  }
}
