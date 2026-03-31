import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RepairStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

// DTO de creación: campos que llegan desde el frontend
interface CreateRepairDto {
  deviceBrand: string;
  deviceModel: string;
  problem: string;
  customerName: string;
  customerPhone: string;
  laborCost?: number;
  sparePartId?: string;
  notes?: string;
}

// DTO de actualización: todos opcionales
interface UpdateRepairDto {
  deviceBrand?: string;
  deviceModel?: string;
  problem?: string;
  diagnosis?: string;
  customerName?: string;
  customerPhone?: string;
  laborCost?: number;
  sparePartId?: string | null; // null = quitar repuesto asignado
  notes?: string;
}

@Injectable()
export class RepairsService {
  constructor(private prisma: PrismaService) {}

  // ── LISTAR ────────────────────────────────────────────────────────────────

  /** Devuelve todas las reparaciones del tenant, ordenadas por número DESC (las más recientes primero) */
  findAll(tenantId: string) {
    return this.prisma.repair.findMany({
      where: { tenantId },
      include: {
        sparePart: {
          select: { id: true, brand: true, model: true, name: true, costPrice: true, sellPrice: true },
        },
      },
      orderBy: { number: 'desc' },
    });
  }

  // ── ESTADÍSTICAS ──────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const repairs = await this.prisma.repair.findMany({
      where: { tenantId },
    });

    const enteredToday = repairs.filter(r => r.createdAt >= today).length;
    const ready = repairs.filter(r => r.status === 'READY').length;
    const projectedIncome = repairs.filter(r => r.status !== 'DELIVERED').reduce((sum, r) => sum + (r.total || 0), 0);

    return {
      enteredToday,
      ready,
      projectedIncome,
    };
  }

  // ── OBTENER UNA ───────────────────────────────────────────────────────────

  /** Obtiene el detalle completo de una reparación validando pertenencia al tenant */
  async findOne(id: string, tenantId: string) {
    const repair = await this.prisma.repair.findFirst({
      where: { id, tenantId },
      include: {
        sparePart: true,
      },
    });
    if (!repair) throw new NotFoundException('Reparación no encontrada');
    return repair;
  }

  // ── CREAR ─────────────────────────────────────────────────────────────────

  /**
   * Crea una nueva orden de reparación.
   *
   * Lógica de número correlativo:
   *   Busca el número más alto del tenant y le suma 1.
   *   Si el tenant no tiene reparaciones previas, arranca en 1.
   *
   * Lógica de total:
   *   total = laborCost + sparePartCost
   *   sparePartCost se toma del campo `costPrice` del repuesto si se asigna uno.
   */
  async create(tenantId: string, dto: CreateRepairDto) {
    // 1. Generar número correlativo
    const last = await this.prisma.repair.findFirst({
      where: { tenantId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    // 2. Calcular costo del repuesto si se asigna uno
    let sparePartCost = 0;
    if (dto.sparePartId) {
      const part = await this.prisma.sparePart.findFirst({
        where: { id: dto.sparePartId, tenantId, isActive: true },
        select: { costPrice: true },
      });
      if (!part) {
        throw new BadRequestException('El repuesto indicado no existe o no pertenece a este negocio');
      }
      sparePartCost = part.costPrice;
    }

    const laborCost = dto.laborCost ?? 0;
    const total = laborCost + sparePartCost;

    return this.prisma.repair.create({
      data: {
        number: nextNumber,
        deviceBrand: dto.deviceBrand,
        deviceModel: dto.deviceModel,
        problem: dto.problem,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        laborCost,
        sparePartCost,
        total,
        notes: dto.notes,
        ...(dto.sparePartId ? { sparePartId: dto.sparePartId } : {}),
        tenantId,
      },
      include: {
        sparePart: {
          select: { id: true, brand: true, model: true, name: true, costPrice: true },
        },
      },
    });
  }

  // ── ACTUALIZAR ────────────────────────────────────────────────────────────

  /**
   * Actualiza datos generales de una reparación (diagnóstico, costos, repuesto, etc.).
   *
   * Recalcula el total automáticamente si cambian laborCost o sparePartId.
   */
  async update(id: string, tenantId: string, dto: UpdateRepairDto) {
    const existing = await this.findOne(id, tenantId);

    // Determinar el nuevo repuesto asignado
    let sparePartCost = existing.sparePartCost;

    if (dto.sparePartId === null) {
      // Se está quitando el repuesto explícitamente
      sparePartCost = 0;
    } else if (dto.sparePartId && dto.sparePartId !== existing.sparePartId) {
      // Se cambió el repuesto, recalcular el costo
      const part = await this.prisma.sparePart.findFirst({
        where: { id: dto.sparePartId, tenantId, isActive: true },
        select: { costPrice: true },
      });
      if (!part) {
        throw new BadRequestException('El repuesto indicado no existe o no pertenece a este negocio');
      }
      sparePartCost = part.costPrice;
    }

    const laborCost = dto.laborCost ?? existing.laborCost;
    const total = laborCost + sparePartCost;

    return this.prisma.repair.update({
      where: { id },
      data: {
        ...dto,
        sparePartCost,
        laborCost,
        total,
      },
      include: {
        sparePart: {
          select: { id: true, brand: true, model: true, name: true, costPrice: true },
        },
      },
    });
  }

  // ── AVANZAR ESTADO ────────────────────────────────────────────────────────

  /**
   * Cambia el estado de una reparación.
   * Valida que el estado sea un valor válido del enum RepairStatus.
   *
   * Estados posibles: PENDING → DIAGNOSED → IN_PROGRESS → READY → DELIVERED
   */
  async updateStatus(id: string, tenantId: string, status: RepairStatus) {
    await this.findOne(id, tenantId); // valida existencia y pertenencia

    return this.prisma.repair.update({
      where: { id },
      data: { status },
      include: {
        sparePart: {
          select: { id: true, brand: true, model: true, name: true },
        },
      },
    });
  }

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  /**
   * Elimina una reparación de la base de datos.
   * A diferencia de los repuestos (soft-delete), las reparaciones se borran
   * físicamente ya que no hay otras entidades que las referencien.
   */
  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // valida existencia y pertenencia
    return this.prisma.repair.delete({ where: { id } });
  }
}
