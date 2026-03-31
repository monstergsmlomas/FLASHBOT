import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async create(
    tenantId: string,
    data: {
      customerName: string;
      customerPhone?: string;
      address?: string;
      type: 'DELIVERY' | 'PICKUP' | 'LOCAL';
      notes?: string;
      items: { productId?: string; name: string; price: number; quantity: number; notes?: string }[];
    },
  ) {
    // número de pedido auto-incremental por tenant
    const count = await this.prisma.order.count({ where: { tenantId } });
    const number = count + 1;

    const orderItems = data.items.map(i => ({
      name:      i.name,
      price:     i.price,
      quantity:  i.quantity,
      total:     i.price * i.quantity,
      notes:     i.notes ?? null,
      productId: i.productId ?? null,
    }));
    const total = orderItems.reduce((s, i) => s + i.total, 0);

    return this.prisma.order.create({
      data: {
        number,
        customerName:  data.customerName,
        customerPhone: data.customerPhone ?? null,
        address:       data.address ?? null,
        type:          data.type,
        notes:         data.notes ?? null,
        total,
        tenantId,
        items: { create: orderItems },
      },
      include: { items: true },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.assertOwner(tenantId, id);
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }

  async delete(tenantId: string, id: string) {
    await this.assertOwner(tenantId, id);
    return this.prisma.order.delete({ where: { id } });
  }

  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, pending, preparing, ready, delivered] = await Promise.all([
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.order.count({ where: { tenantId, status: 'PENDING',   createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.order.count({ where: { tenantId, status: 'PREPARING', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.order.count({ where: { tenantId, status: 'READY',     createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.order.count({ where: { tenantId, status: 'DELIVERED', createdAt: { gte: today, lt: tomorrow } } }),
    ]);

    const revenueResult = await this.prisma.order.aggregate({
      where: { tenantId, status: 'DELIVERED', createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
    });

    return { total, pending, preparing, ready, delivered, revenue: revenueResult._sum.total ?? 0 };
  }

  // Buscar menú disponible (para el bot de WhatsApp)
  async getMenu(tenantId: string) {
    const items = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    // Agrupar por categoría
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.category ?? 'Otros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return grouped;
  }

  private async assertOwner(tenantId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, tenantId } });
    if (!o) throw new NotFoundException('Pedido no encontrado');
  }
}
