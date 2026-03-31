import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { RepairStatus } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RepairsService } from './repairs.service';

// Tipo del usuario inyectado por JwtStrategy (incluye tenant)
interface JwtUser {
  id: string;
  email: string;
  tenantId: string;
  tenant: { id: string; name: string; isActive: boolean };
}

// Valores válidos del enum (para validación manual en runtime)
const VALID_STATUSES = Object.values(RepairStatus);

@UseGuards(JwtGuard)
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  // ── GET /api/v1/repairs ───────────────────────────────────────────────────
  /** Lista todas las reparaciones del tenant (más recientes primero) */
  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.repairsService.findAll(user.tenantId);
  }

  // ── GET /api/v1/repairs/stats ─────────────────────────────────────────────
  @Get('stats')
  getStats(@CurrentUser() user: JwtUser) {
    return this.repairsService.getStats(user.tenantId);
  }

  // ── GET /api/v1/repairs/:id ───────────────────────────────────────────────
  /** Detalle completo de una reparación */
  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.repairsService.findOne(id, user.tenantId);
  }

  // ── POST /api/v1/repairs ──────────────────────────────────────────────────
  /** Crea una nueva orden de reparación. El número se genera automáticamente. */
  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      deviceBrand: string;
      deviceModel: string;
      problem: string;
      customerName: string;
      customerPhone: string;
      laborCost?: number;
      sparePartId?: string;
      notes?: string;
    },
  ) {
    return this.repairsService.create(user.tenantId, body);
  }

  // ── PATCH /api/v1/repairs/:id ─────────────────────────────────────────────
  /** Actualiza datos generales (diagnóstico, costos, repuesto, notas...) */
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body()
    body: {
      deviceBrand?: string;
      deviceModel?: string;
      problem?: string;
      diagnosis?: string;
      customerName?: string;
      customerPhone?: string;
      laborCost?: number;
      sparePartId?: string | null;
      notes?: string;
    },
  ) {
    return this.repairsService.update(id, user.tenantId, body);
  }

  // ── PATCH /api/v1/repairs/:id/status ─────────────────────────────────────
  /**
   * Avanza o cambia el estado de la reparación.
   *
   * Body esperado: { "status": "DIAGNOSED" }
   * Valores válidos: PENDING | DIAGNOSED | IN_PROGRESS | READY | DELIVERED
   */
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { status: RepairStatus },
  ) {
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      throw new BadRequestException(
        `Estado inválido. Los valores permitidos son: ${VALID_STATUSES.join(', ')}`,
      );
    }
    return this.repairsService.updateStatus(id, user.tenantId, body.status);
  }

  // ── DELETE /api/v1/repairs/:id ────────────────────────────────────────────
  /** Elimina permanentemente una reparación */
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.repairsService.remove(id, user.tenantId);
  }
}
