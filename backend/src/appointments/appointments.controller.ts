import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard) // todas las rutas requieren estar logueado
@Controller('appointments')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  // GET /api/v1/appointments - todos los turnos del negocio
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(user.tenantId, from, to);
  }

  // GET /api/v1/appointments/today - turnos de hoy
  @Get('today')
  findToday(@CurrentUser() user: any) {
    return this.service.findToday(user.tenantId);
  }

  // GET /api/v1/appointments/slots?date=2025-04-15&serviceId=xxx&employeeId=xxx
  @Get('slots')
  getSlots(
    @CurrentUser() user: any,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.getAvailableSlots(user.tenantId, date, serviceId, employeeId);
  }

  // POST /api/v1/appointments - crear turno
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateAppointmentDto) {
    return this.service.create(user.tenantId, dto);
  }

  // PATCH /api/v1/appointments/:id/status - cambiar estado del turno
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(user.tenantId, id, status);
  }

  // PATCH /api/v1/appointments/:id/cancel - cancelar turno
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.cancel(user.tenantId, id);
  }

  // DELETE /api/v1/appointments/:id - eliminar turno (solo cancelados)
  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}
