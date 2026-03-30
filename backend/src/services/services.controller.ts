import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.servicesService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateServiceDto>) {
    return this.servicesService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.servicesService.delete(req.user.tenantId, id);
  }
}
