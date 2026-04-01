import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('settings')
export class TenantsController {
  constructor(private service: TenantsService) {}

  // GET /api/v1/settings - configuración del negocio
  @Get()
  getSettings(@CurrentUser() user: any) {
    return this.service.getSettings(user.tenantId);
  }

  // GET /api/v1/settings/dashboard - resumen del dashboard
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboardSummary(user.tenantId);
  }

  // PATCH /api/v1/settings - actualizar datos del negocio
  @Patch()
  updateSettings(@CurrentUser() user: any, @Body() body: {
    name?: string;
    whatsappPhone?: string;
    botConfig?: Record<string, any>;
    repairMarginPercent?: number;
    categoryMargins?: Record<string, number>;
    userName?: string;
  }) {
    return this.service.updateSettings(user.tenantId, user.id, body);
  }

  // PATCH /api/v1/settings/hours - actualizar horarios de atención
  @Patch('hours')
  updateHours(@CurrentUser() user: any, @Body('hours') hours: any[]) {
    return this.service.updateBusinessHours(user.tenantId, hours);
  }

  // PATCH /api/v1/settings/modules - actualizar módulos activos
  @Patch('modules')
  updateModules(@CurrentUser() user: any, @Body('modules') modules: string[]) {
    return this.service.updateModules(user.tenantId, modules);
  }
}
