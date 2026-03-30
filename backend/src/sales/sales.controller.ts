import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SalesService } from './sales.service';

@UseGuards(JwtGuard)
@Controller()
export class SalesController {
  constructor(private salesService: SalesService) {}

  // ── Productos ────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(@Request() req: any) {
    return this.salesService.findAllProducts(req.user.tenantId);
  }

  @Get('products/barcode/:barcode')
  getProductByBarcode(@Request() req: any, @Param('barcode') barcode: string) {
    return this.salesService.findProductByBarcode(req.user.tenantId, barcode);
  }

  @Post('products')
  createProduct(@Request() req: any, @Body() body: { name: string; price: number; cost?: number; stock?: number; category?: string; barcode?: string }) {
    return this.salesService.createProduct(req.user.tenantId, body);
  }

  @Patch('products/:id')
  updateProduct(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.salesService.updateProduct(req.user.tenantId, id, body);
  }

  @Delete('products/:id')
  deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.salesService.deleteProduct(req.user.tenantId, id);
  }

  @Patch('products/:id/stock')
  adjustStock(@Request() req: any, @Param('id') id: string, @Body() body: { delta: number }) {
    return this.salesService.adjustStock(req.user.tenantId, id, body.delta);
  }

  // ── Ventas ───────────────────────────────────────────────────────────────

  @Get('sales')
  getSales(@Request() req: any, @Query('date') date?: string) {
    return this.salesService.findSales(req.user.tenantId, date);
  }

  @Post('sales')
  createSale(
    @Request() req: any,
    @Body() body: { items: { productId?: string; name: string; price: number; quantity: number }[] },
  ) {
    return this.salesService.createSale(req.user.tenantId, body.items);
  }

  @Delete('sales/:id')
  deleteSale(@Request() req: any, @Param('id') id: string) {
    return this.salesService.deleteSale(req.user.tenantId, id);
  }
}
