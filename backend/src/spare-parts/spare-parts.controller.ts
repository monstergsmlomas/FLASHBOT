import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SparePartsService } from './spare-parts.service';

@UseGuards(JwtGuard)
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  // ── GET /api/v1/spare-parts ───────────────────────────────────────────────
  /** Lista todos los repuestos activos del tenant */
  @Get()
  findAll(@Request() req: any) {
    return this.sparePartsService.findAll(req.user.tenantId);
  }

  // ── GET /api/v1/spare-parts/search ───────────────────────────────────────
  /**
   * Búsqueda fuzzy por query params.
   * Ej: GET /spare-parts/search?brand=samsung&model=a54&name=pantalla
   */
  @Get('search')
  search(
    @Request() req: any,
    @Query('brand') brand?: string,
    @Query('model') model?: string,
    @Query('name') name?: string,
  ) {
    return this.sparePartsService.searchFuzzy(brand, model, name, req.user.tenantId);
  }

  // ── GET /api/v1/spare-parts/:id ───────────────────────────────────────────
  /** Obtiene un repuesto por ID */
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.sparePartsService.findOne(id, req.user.tenantId);
  }

  // ── POST /api/v1/spare-parts ──────────────────────────────────────────────
  /** Crea un nuevo repuesto manualmente */
  @Post()
  create(
    @Request() req: any,
    @Body()
    body: {
      brand: string;
      model: string;
      name: string;
      costPrice: number;
      sellPrice?: number;
      category?: string;
    },
  ) {
    return this.sparePartsService.create(req.user.tenantId, body);
  }

  // ── POST /api/v1/spare-parts/import ──────────────────────────────────────
  /**
   * Importa repuestos masivamente desde un archivo Excel.
   *
   * Columnas esperadas: Marca | Modelo | Repuesto | Costo
   *
   * Multer lee el archivo en memoria (memoryStorage), lo que nos da
   * acceso al Buffer directamente sin escribir nada en el disco.
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió ningún archivo. Enviá el Excel con el campo "file".',
      );
    }

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream', // fallback genérico de algunos clientes
    ];

    if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls)$/i)) {
      throw new BadRequestException(
        'Formato inválido. Solo se aceptan archivos .xlsx o .xls',
      );
    }

    return this.sparePartsService.importFromExcel(file.buffer, req.user.tenantId);
  }

  // ── PATCH /api/v1/spare-parts/:id ────────────────────────────────────────
  /** Actualiza parcialmente un repuesto */
  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      brand?: string;
      model?: string;
      name?: string;
      costPrice?: number;
      sellPrice?: number;
      category?: string;
      isActive?: boolean;
    },
  ) {
    return this.sparePartsService.update(id, req.user.tenantId, body);
  }

  // ── DELETE /api/v1/spare-parts/:id ───────────────────────────────────────
  /** Soft-delete: desactiva el repuesto (no lo borra de la DB) */
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.sparePartsService.remove(id, req.user.tenantId);
  }
}
