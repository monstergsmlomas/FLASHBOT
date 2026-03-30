import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  // GET /api/v1/templates
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.tenantId);
  }

  // PATCH /api/v1/templates/:id
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('body') body: string,
  ) {
    return this.service.update(user.tenantId, id, body);
  }
}
