import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Request() req: any, @Query('serviceId') serviceId?: string) {
    return this.employeesService.findAll(req.user.tenantId, serviceId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>) {
    return this.employeesService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.employeesService.delete(req.user.tenantId, id);
  }
}
