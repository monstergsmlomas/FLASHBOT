import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma.service';

// DTO interno para crear/actualizar un repuesto
interface SparePartDto {
  brand: string;
  model: string;
  name: string;
  costPrice: number;
  sellPrice?: number;
  category?: string;
  isActive?: boolean;
}

// Fila esperada al leer el Excel (columnas por nombre)
interface ExcelRow {
  Marca?: string;
  Modelo?: string;
  Repuesto?: string;
  Costo?: number | string;
  [key: string]: unknown;
}

@Injectable()
export class SparePartsService {
  constructor(private prisma: PrismaService) {}

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /** Lista todos los repuestos activos del tenant */
  findAll(tenantId: string) {
    return this.prisma.sparePart.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { name: 'asc' }],
    });
  }

  /** Obtiene un repuesto por ID validando que pertenezca al tenant */
  async findOne(id: string, tenantId: string) {
    const part = await this.prisma.sparePart.findFirst({
      where: { id, tenantId },
    });
    if (!part) throw new NotFoundException('Repuesto no encontrado');
    return part;
  }

  /** Crea un nuevo repuesto */
  create(tenantId: string, dto: SparePartDto) {
    return this.prisma.sparePart.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  /** Actualiza un repuesto existente */
  async update(id: string, tenantId: string, dto: Partial<SparePartDto>) {
    await this.findOne(id, tenantId); // valida existencia y pertenencia
    return this.prisma.sparePart.update({
      where: { id },
      data: dto,
    });
  }

  /** Soft-delete: marca el repuesto como inactivo */
  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.sparePart.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── IMPORT EXCEL ──────────────────────────────────────────────────────────

  /**
   * Importa repuestos desde un buffer de archivo Excel (.xlsx / .xls).
   *
   * Columnas esperadas en la primera hoja:
   *   - Marca    → brand
   *   - Modelo   → model
   *   - Repuesto → name
   *   - Costo    → costPrice
   *
   * Hace upsert: si ya existe un repuesto con la misma combinación
   * (brand + model + name + tenantId) actualiza el costPrice; si no, lo crea.
   *
   * Retorna un resumen con totales de creados, actualizados y errores.
   */
  async importFromExcel(
    fileBuffer: Buffer,
    tenantId: string,
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    let rows: ExcelRow[];

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[firstSheet]);
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo Excel. Verificá que sea un .xlsx o .xls válido.',
      );
    }

    if (!rows || rows.length === 0) {
      throw new BadRequestException(
        'El archivo Excel está vacío o no tiene filas de datos.',
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque la fila 1 es el header

      // Extraer y validar campos
      const brand = String(row['Marca'] ?? '').trim();
      const model = String(row['Modelo'] ?? '').trim();
      const name = String(row['Repuesto'] ?? '').trim();
      const rawCosto = row['Costo'];
      const costPrice = parseFloat(String(rawCosto ?? '').replace(',', '.'));

      if (!brand || !model || !name) {
        errors.push(`Fila ${rowNum}: Marca, Modelo y Repuesto son obligatorios.`);
        continue;
      }

      if (isNaN(costPrice) || costPrice < 0) {
        errors.push(`Fila ${rowNum}: Costo inválido ("${rawCosto}").`);
        continue;
      }

      try {
        // Busca si ya existe esta combinación exacta para este tenant
        const existing = await this.prisma.sparePart.findFirst({
          where: {
            brand: { equals: brand, mode: 'insensitive' },
            model: { equals: model, mode: 'insensitive' },
            name: { equals: name, mode: 'insensitive' },
            tenantId,
          },
        });

        if (existing) {
          await this.prisma.sparePart.update({
            where: { id: existing.id },
            data: { costPrice, isActive: true },
          });
          updated++;
        } else {
          await this.prisma.sparePart.create({
            data: { brand, model, name, costPrice, tenantId },
          });
          created++;
        }
      } catch {
        errors.push(`Fila ${rowNum}: Error al guardar "${brand} ${model} - ${name}".`);
      }
    }

    return { created, updated, errors };
  }

  // ── BÚSQUEDA FUZZY (para el bot de WhatsApp) ──────────────────────────────

  /**
   * Búsqueda flexible de repuestos por marca, modelo y nombre del repuesto.
   *
   * Todos los parámetros son opcionales y usan ILIKE (case-insensitive).
   * Diseñado para que el bot pueda buscar con términos aproximados del usuario.
   *
   * Ejemplo: searchFuzzy('samsung', 'a54', 'pantalla', tenantId)
   */
  searchFuzzy(
    brand: string | undefined,
    model: string | undefined,
    partName: string | undefined,
    tenantId: string,
  ) {
    return this.prisma.sparePart.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(brand && {
          brand: { contains: brand, mode: 'insensitive' },
        }),
        ...(model && {
          model: { contains: model, mode: 'insensitive' },
        }),
        ...(partName && {
          name: { contains: partName, mode: 'insensitive' },
        }),
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { name: 'asc' }],
      take: 20, // límite para evitar respuestas enormes en el bot
    });
  }
}
