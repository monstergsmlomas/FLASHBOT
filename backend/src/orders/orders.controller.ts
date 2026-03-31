import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { OrdersService } from './orders.service';

@UseGuards(JwtGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  findAll(@Request() req: any, @Query('status') status?: string) {
    return this.ordersService.findAll(req.user.tenantId, status);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.ordersService.getStats(req.user.tenantId);
  }

  @Get('menu')
  getMenu(@Request() req: any) {
    return this.ordersService.getMenu(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: {
      customerName: string;
      customerPhone?: string;
      address?: string;
      type: 'DELIVERY' | 'PICKUP' | 'LOCAL';
      notes?: string;
      items: { productId?: string; name: string; price: number; quantity: number; notes?: string }[];
    },
  ) {
    return this.ordersService.create(req.user.tenantId, body);
  }

  @Patch(':id/status')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.ordersService.updateStatus(req.user.tenantId, id, body.status);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.delete(req.user.tenantId, id);
  }
}
