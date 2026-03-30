import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        employees: {
          include: { employee: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: { ...dto, tenantId },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateServiceDto>) {
    const service = await this.prisma.service.findFirst({ where: { id, tenantId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({ where: { id, tenantId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    // Soft delete
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }
}
