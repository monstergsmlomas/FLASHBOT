import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  // GET /api/v1/customers - listar pacientes
  @Get()
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.service.findAll(user.tenantId, search);
  }

  // GET /api/v1/customers/:id - ver paciente con historial
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  // POST /api/v1/customers - crear paciente
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.service.create(user.tenantId, dto);
  }

  // PATCH /api/v1/customers/:id - actualizar nombre, email, notas
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCustomerDto>,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  // DELETE /api/v1/customers/:id - eliminar paciente
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}
