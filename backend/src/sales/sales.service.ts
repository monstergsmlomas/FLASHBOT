import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ── Productos ────────────────────────────────────────────────────────────

  async findAllProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findProductByBarcode(tenantId: string, barcode: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, barcode, isActive: true },
    });
  }

  async createProduct(tenantId: string, data: { name: string; price: number; cost?: number; stock?: number; category?: string; barcode?: string }) {
    return this.prisma.product.create({
      data: { ...data, tenantId },
    });
  }

  async updateProduct(tenantId: string, id: string, data: Partial<{ name: string; price: number; cost: number; stock: number; category: string; barcode: string; isActive: boolean }>) {
    await this.assertProductOwner(tenantId, id);
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(tenantId: string, id: string) {
    await this.assertProductOwner(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async adjustStock(tenantId: string, id: string, delta: number) {
    await this.assertProductOwner(tenantId, id);
    return this.prisma.product.update({
      where: { id },
      data: { stock: { increment: delta } },
    });
  }

  // ── Ventas ───────────────────────────────────────────────────────────────

  async findSales(tenantId: string, date?: string) {
    let from: Date, to: Date;
    if (date) {
      from = new Date(`${date}T00:00:00`);
      to   = new Date(`${date}T23:59:59`);
    } else {
      from = new Date();
      from.setHours(0, 0, 0, 0);
      to = new Date();
      to.setHours(23, 59, 59, 999);
    }

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const total = sales.reduce((sum, s) => sum + s.total, 0);
    return { sales, total, count: sales.length };
  }

  async createSale(tenantId: string, items: { productId?: string; name: string; price: number; quantity: number }[]) {
    const saleItems = items.map(i => ({
      name:      i.name,
      price:     i.price,
      quantity:  i.quantity,
      total:     i.price * i.quantity,
      productId: i.productId ?? null,
    }));
    const total = saleItems.reduce((sum, i) => sum + i.total, 0);

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        total,
        items: { create: saleItems },
      },
      include: { items: true },
    });

    // Descontar stock de los productos que lo tienen habilitado
    for (const item of items) {
      if (item.productId) {
        const prod = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.stock >= 0) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    }

    return sale;
  }

  async deleteSale(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    // Reponer stock
    for (const item of sale.items) {
      if (item.productId) {
        const prod = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.stock >= 0) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return this.prisma.sale.delete({ where: { id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async assertProductOwner(tenantId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Producto no encontrado');
  }
}
