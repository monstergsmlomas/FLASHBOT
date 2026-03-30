import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Plantillas por defecto para consultorios
const DEFAULT_TEMPLATES = [
  {
    key: 'welcome',
    name: 'Bienvenida',
    body: `¡Hola! 👋 Bienvenido/a a *{{negocio}}*.\n\n¿En qué te puedo ayudar?\n\n• Escribí *"quiero un turno"* para reservar\n• Escribí *"mis turnos"* para ver tus turnos\n• Escribí *"cancelar"* para cancelar un turno`,
  },
  {
    key: 'confirmed',
    name: 'Turno confirmado',
    body: `✅ *¡Turno reservado!*\n\n📅 Fecha: {{fecha}}\n🕐 Hora: {{hora}} hs\n📍 {{negocio}}\n\nTe vamos a mandar un recordatorio 24 horas antes. ¡Hasta pronto! 👋`,
  },
  {
    key: 'reminder',
    name: 'Recordatorio 24hs',
    body: `🔔 *Recordatorio de turno*\n\nHola {{nombre}}! Te recordamos que mañana tenés turno en *{{negocio}}*.\n\n📅 {{fecha}} a las {{hora}} hs\n\nSi necesitás cancelar, respondé "cancelar" antes de las 22hs de hoy.`,
  },
  {
    key: 'cancelled',
    name: 'Turno cancelado',
    body: `❌ Tu turno del {{fecha}} a las {{hora}} hs fue *cancelado*.\n\nSi querés sacar otro turno, escribí "quiero un turno".`,
  },
  {
    key: 'no_availability',
    name: 'Sin disponibilidad',
    body: `Lo siento 😕 No tenemos turnos disponibles para *{{fecha}}*.\n\n¿Querés probar con otro día? Decime cuándo te queda mejor.`,
  },
];

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  // Obtener todas las plantillas del negocio (crea las default si no existen)
  async findAll(tenantId: string) {
    const existing = await this.prisma.messageTemplate.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });

    // Si no tiene plantillas, crear las default
    if (existing.length === 0) {
      await this.prisma.messageTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({ ...t, tenantId })),
      });
      return this.prisma.messageTemplate.findMany({
        where: { tenantId },
        orderBy: { key: 'asc' },
      });
    }

    return existing;
  }

  // Actualizar el texto de una plantilla
  async update(tenantId: string, id: string, body: string) {
    return this.prisma.messageTemplate.updateMany({
      where: { id, tenantId },
      data: { body },
    });
  }

  // Obtener una plantilla por clave (usado por el bot)
  async getByKey(tenantId: string, key: string): Promise<string> {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key_tenantId: { key, tenantId } },
    });
    // Si no existe, usar la default
    return template?.body ?? DEFAULT_TEMPLATES.find((t) => t.key === key)?.body ?? '';
  }

  // Reemplaza variables en una plantilla: {{negocio}} → "Dr. García"
  render(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
      template,
    );
  }
}
