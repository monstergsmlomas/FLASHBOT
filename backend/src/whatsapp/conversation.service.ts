import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { PrismaService } from '../prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CustomersService } from '../customers/customers.service';
import { TenantsService } from '../tenants/tenants.service';
import { ServicesService } from '../services/services.service';
import { EmployeesService } from '../employees/employees.service';
import { OrdersService } from '../orders/orders.service';
import { SparePartsService } from '../spare-parts/spare-parts.service';
import { RepairsService } from '../repairs/repairs.service';
import * as fs from 'fs';

const DEBUG_LOG = 'C:\\Users\\monst\\OneDrive\\Escritorio\\CLAUDE CODE\\AUTOMATIZACION\\backend\\bot-debug.log';
function debugLog(msg: string) {
  try {
    fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayName(date: Date): string {
  return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()];
}

// ── Definición de tools en formato OpenAI/Groq ───────────────────────────────
const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Obtiene los horarios disponibles para una fecha específica. Usá esta tool SIEMPRE antes de ofrecer horarios al paciente.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD (ej: "2026-04-07")' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Reserva un turno para el paciente. Usá esta tool SOLO después de que el paciente confirmó la fecha y hora.',
      parameters: {
        type: 'object',
        properties: {
          datetime:    { type: 'string', description: 'Fecha y hora en formato ISO 8601 (ej: "2026-04-07T14:30:00")' },
          service_id:  { type: 'string', description: 'ID del servicio elegido (opcional)' },
          employee_id: { type: 'string', description: 'ID del empleado elegido (opcional)' },
        },
        required: ['datetime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_appointments',
      description: 'Lista los próximos turnos del paciente actual.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancela un turno del paciente. Pedí confirmación antes de usar esta tool.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'ID del turno a cancelar (obtenido de list_my_appointments)' },
        },
        required: ['appointment_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_customer_profile',
      description: 'Guarda o actualiza los datos del paciente. Usá esta tool cuando el paciente te dé su nombre, teléfono, DNI o domicilio.',
      parameters: {
        type: 'object',
        properties: {
          name:       { type: 'string', description: 'Nombre completo del paciente' },
          real_phone: { type: 'string', description: 'Teléfono real con código de área (solo números)' },
          dni:        { type: 'string', description: 'DNI sin puntos (solo números)' },
          address:    { type: 'string', description: 'Domicilio completo (calle, número, localidad)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'Lista los servicios disponibles del negocio con su duración. Usá esta tool cuando el cliente quiera saber qué servicios hay o antes de reservar un turno en negocios con servicios.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employees_for_service',
      description: 'Obtiene los profesionales/empleados disponibles para un servicio específico.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'ID del servicio (obtenido de list_services)' },
        },
        required: ['service_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu',
      description: 'Obtiene el menú disponible agrupado por categoría. Usá esta tool cuando el cliente pida ver el menú, la carta o quiera hacer un pedido.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Crea un pedido con los ítems que eligió el cliente. Usá esta tool SOLO después de confirmar todos los ítems, el tipo de entrega y la dirección si es delivery.',
      parameters: {
        type: 'object',
        properties: {
          customer_name:  { type: 'string',  description: 'Nombre del cliente' },
          customer_phone: { type: 'string',  description: 'Teléfono del cliente (opcional)' },
          type:           { type: 'string',  enum: ['DELIVERY', 'PICKUP', 'LOCAL'], description: 'Tipo de pedido: DELIVERY (envío), PICKUP (retira), LOCAL (consume en el local)' },
          address:        { type: 'string',  description: 'Dirección de entrega (solo para DELIVERY)' },
          notes:          { type: 'string',  description: 'Notas del pedido (ej: sin cebolla, tocar timbre)' },
          items: {
            type: 'array',
            description: 'Lista de ítems del pedido',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string', description: 'ID del producto del menú' },
                name:       { type: 'string', description: 'Nombre del ítem' },
                price:      { type: 'number', description: 'Precio unitario' },
                quantity:   { type: 'number', description: 'Cantidad' },
                notes:      { type: 'string', description: 'Aclaración específica del ítem (ej: sin sal)' },
              },
              required: ['name', 'price', 'quantity'],
            },
          },
        },
        required: ['customer_name', 'type', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_slots',
      description: 'Obtiene los horarios disponibles para un empleado específico en una fecha. Usá esta tool en lugar de get_available_slots cuando el cliente eligió un empleado.',
      parameters: {
        type: 'object',
        properties: {
          employee_id: { type: 'string', description: 'ID del empleado (obtenido de get_employees_for_service)' },
          service_id:  { type: 'string', description: 'ID del servicio elegido' },
          date:        { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        },
        required: ['employee_id', 'service_id', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_orders',
      description: 'Lista los pedidos recientes del cliente actual. Usá esta tool cuando el cliente pregunta por su pedido, el estado, cuánto falta, etc.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_repair_price',
      description: 'Busca el precio de un repuesto para un equipo específico. Usá esta tool cuando el cliente pregunta cuánto cuesta arreglar algo, el precio de una pantalla, batería u otro repuesto.',
      parameters: {
        type: 'object',
        properties: {
          brand:     { type: 'string', description: 'Marca del equipo (ej: Samsung, Apple, Motorola)' },
          model:     { type: 'string', description: 'Modelo exacto del equipo (ej: A54, iPhone 13, G84)' },
          part_name: { type: 'string', description: 'Nombre del repuesto que busca (ej: pantalla, batería, conector de carga)' },
        },
        required: ['brand', 'model', 'part_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_repair_request',
      description: 'Registra un equipo para reparación. Usá esta tool SOLO después de obtener el nombre del cliente, la marca y modelo del equipo, y la descripción del problema. Devuelve el número de orden generado.',
      parameters: {
        type: 'object',
        properties: {
          customer_name:  { type: 'string', description: 'Nombre completo del cliente' },
          device_brand:   { type: 'string', description: 'Marca del equipo (ej: Samsung, Apple)' },
          device_model:   { type: 'string', description: 'Modelo del equipo (ej: A54, iPhone 13)' },
          problem:        { type: 'string', description: 'Descripción del problema según el cliente' },
          spare_part_id:  { type: 'string', description: 'ID del repuesto a usar (opcional, solo si ya se identificó el repuesto necesario)' },
        },
        required: ['customer_name', 'device_brand', 'device_model', 'problem'],
      },
    },
  },
];

type ChatMessage = Groq.Chat.ChatCompletionMessageParam;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  // Historial en memoria: key = "tenantId:phone" → ChatMessage[]
  private readonly histories = new Map<string, ChatMessage[]>();

  // Mensajes pendientes de reintento
  private readonly pendingRetries = new Map<string, { text: string; jid: string; savedAt: number }>();

  constructor(
    private prisma: PrismaService,
    private appointmentsService: AppointmentsService,
    private customersService: CustomersService,
    private tenantsService: TenantsService,
    private servicesService: ServicesService,
    private employeesService: EmployeesService,
    private ordersService: OrdersService,
    private sparePartsService: SparePartsService,
    private repairsService: RepairsService,
  ) {}

  // ── Retry de mensajes pendientes ─────────────────────────────────────────────
  savePendingRetry(phone: string, jid: string, text: string) {
    this.pendingRetries.set(phone, { text, jid, savedAt: Date.now() });
    this.logger.warn(`[${phone}] Mensaje guardado para reintento automático`);
  }

  getPendingRetries(minAgeMs = 60_000): Array<{ phone: string; jid: string; text: string }> {
    const now = Date.now();
    const ready: Array<{ phone: string; jid: string; text: string }> = [];
    for (const [phone, entry] of this.pendingRetries.entries()) {
      if (now - entry.savedAt >= minAgeMs) {
        ready.push({ phone, jid: entry.jid, text: entry.text });
      }
    }
    return ready;
  }

  clearPending(phone: string) {
    this.pendingRetries.delete(phone);
  }

  // ── Entrada principal ────────────────────────────────────────────────────────
  async handleMessage(phone: string, text: string, jid?: string): Promise<string | null> {
    debugLog(`handleMessage called: phone=${phone} text="${text}"`);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      debugLog('ERROR: GROQ_API_KEY no configurada');
      this.logger.warn('GROQ_API_KEY no configurada — bot desactivado');
      return null;
    }
    debugLog(`API key ok: ${apiKey.slice(0, 8)}...`);

    const tenant = await this.prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) {
      debugLog('ERROR: No se encontró tenant activo');
      return null;
    }
    debugLog(`Tenant: ${tenant.name} (${tenant.id})`);

    let cfg: any;
    let customer: any;
    try {
      cfg = this.tenantsService.getBotConfig(tenant);
      debugLog(`getBotConfig ok`);
      customer = await this.customersService.findOrCreateByPhone(tenant.id, phone);
      debugLog(`Customer ok: id=${customer.id} name=${customer.name}`);
    } catch (e: any) {
      debugLog(`ERROR en getBotConfig/findOrCreate: ${e?.message}`);
      return null;
    }

    this.logger.log(`[${phone}] "${text}"`);

    const key = `${tenant.id}:${phone}`;
    const history = this.histories.get(key) ?? [];

    // ── Construir lista de mensajes ──────────────────────────────────────────
    const systemPrompt = this.buildSystemPrompt(tenant, cfg, customer);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: text },
    ];

    const groq = new Groq({ apiKey });

    debugLog(`Iniciando Groq chat con ${messages.length} mensajes...`);
    debugLog(`Enviando a Groq: "${text.slice(0, 80)}"`);

    try {
      // ── Loop de function calling ───────────────────────────────────────────
      let safetyCounter = 0;
      let finalText: string | null = null;

      while (safetyCounter < 6) {
        safetyCounter++;

        const response = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 400,
          temperature: 0.4,
        });

        const assistantMessage = response.choices[0].message;
        const toolCalls = assistantMessage.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
          // Respuesta final de texto
          finalText = assistantMessage.content?.trim() ?? null;
          debugLog(`Groq respondió OK: "${(finalText ?? '').slice(0, 100)}"`);
          // Guardar en historial (sin el system prompt)
          messages.push({ role: 'assistant', content: finalText ?? '' });
          break;
        }

        // Hay tool calls → ejecutarlas
        this.logger.log(`[${phone}] Tools: ${toolCalls.map(t => t.function.name).join(', ')}`);
        messages.push(assistantMessage as ChatMessage);

        for (const toolCall of toolCalls) {
          let args: Record<string, any> = {};
          try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}

          const result = await this.executeTool(toolCall.function.name, args, tenant.id, customer.id);
          this.logger.log(`[${phone}] ${toolCall.function.name} → ${JSON.stringify(result).slice(0, 120)}`);
          debugLog(`Tool ${toolCall.function.name}: ${JSON.stringify(result).slice(0, 120)}`);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }

      if (!finalText) {
        this.logger.warn(`[${phone}] Groq devolvió respuesta vacía`);
        debugLog(`WARN: Groq devolvió respuesta vacía`);
        return null;
      }

      // Guardar historial (excluir system prompt, mantener máx 20 mensajes)
      const newHistory = messages.slice(1); // sin system
      const trimmed = newHistory.length > 20 ? newHistory.slice(newHistory.length - 20) : newHistory;
      this.histories.set(key, trimmed);

      return finalText;

    } catch (err: any) {
      const msg = err?.message ?? '';
      debugLog(`ERROR Groq: ${msg}`);
      this.logger.error(`[${phone}] Error en Groq: ${msg}`);

      if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('quota')) {
        this.logger.warn(`[${phone}] Rate limit Groq — mensaje en cola para reintento`);
        if (jid) this.savePendingRetry(phone, jid, text);
        return null;
      }

      return `Lo siento, tuve un problema técnico 😕 Por favor intentalo en unos segundos.`;
    }
  }

  // ── System prompt dinámico ────────────────────────────────────────────────────
  private buildSystemPrompt(tenant: any, cfg: any, customer: any): string {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const dayName = getDayName(now);
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const modules: string[] = Array.isArray(tenant.modules) ? tenant.modules : [];
    const hasAppointments = modules.includes('appointments');
    const hasDelivery     = modules.includes('delivery');

    const clienteLabel = tenant.businessType === 'consultorio' ? 'paciente' : 'cliente';

    // ── Sección de turnos ──────────────────────────────────────────────────────
    let appointmentsSection = '';
    if (hasAppointments) {
      const hasServices = cfg.services && Array.isArray(cfg.services) && cfg.services.length > 0 && typeof cfg.services[0] === 'object';
      const simpleServices = cfg.services && Array.isArray(cfg.services) && cfg.services.length > 0 && typeof cfg.services[0] === 'string';

      if (hasServices) {
        appointmentsSection = `== TURNOS ==
SERVICIOS: ${(cfg.services as any[]).map((s: any) => `${s.name} (${s.durationMin} min)`).join(', ')}
FLUJO: 1) Preguntá qué servicio quiere → 2) Llamá list_services → 3) get_employees_for_service → 4) get_employee_slots → 5) book_appointment`;
      } else if (simpleServices) {
        appointmentsSection = `== TURNOS ==
SERVICIOS: ${(cfg.services as string[]).join(', ')}
FLUJO: 1) Preguntá qué día quiere → 2) get_available_slots → 3) Mostrá horarios → 4) book_appointment`;
      } else {
        appointmentsSection = `== TURNOS ==
FLUJO: 1) Preguntá qué día quiere → 2) Llamá get_available_slots → 3) Mostrá horarios disponibles → 4) Confirmá con book_appointment
REGLA: Usá el "datetime" EXACTO del slot. Nunca lo calcules vos. Si el ${clienteLabel} da sus datos, guardá con update_customer_profile.`;
      }
    }

    // ── Sección de pedidos ─────────────────────────────────────────────────────
    let deliverySection = '';
    if (hasDelivery) {
      deliverySection = `== PEDIDOS / DELIVERY ==
FLUJO PARA TOMAR UN PEDIDO:
1. Cuando el cliente quiera pedir, llamá get_menu y mostrá las opciones por categoría con nombre y precio
2. Tomá los ítems que pide (pueden ser varios, preguntá si quiere algo más)
3. Confirmá el resumen del pedido con el total calculado
4. Preguntá si es para *delivery* (envío a domicilio), *retiro* (pasa a buscar) o *consumo en el local*
5. Si es DELIVERY, pedí la dirección de entrega
6. Creá el pedido con create_order
7. Informá el número de pedido y el total: "¡Listo! Tu pedido #X está confirmado. Total: $XXX 🛵"

Si el cliente pregunta por su pedido → llamá list_my_orders y mostrá el estado.`;
    }

    // ── Info del cliente ───────────────────────────────────────────────────────
    const clienteInfo = customer.name
      ? `CLIENTE: ${customer.name}. Tel: ${customer.realPhone ?? 'no registrado'}.`
      : `CLIENTE: Sin nombre registrado — pedíselo primero y guardalo con update_customer_profile.`;

    // ── Construir prompt final ─────────────────────────────────────────────────
    const sections = [appointmentsSection, deliverySection].filter(Boolean).join('\n\n');

    return `Sos el asistente virtual de WhatsApp de *${tenant.name}*. Hablás en español rioplatense, sos amable y usás 1-2 emojis por mensaje. La primera vez que hablás con alguien te presentás brevemente.

HOY: ${dayName} ${todayStr}, ${timeStr} hs (hora local)

${sections}

${clienteInfo}

REGLAS GENERALES:
- Mensajes cortos (máx 3-4 líneas por mensaje)
- Cuando diga "mañana" o "el lunes" calculá la fecha desde hoy (${todayStr})
- Formato WhatsApp: *negrita* — sin # ni **
- No inventes precios ni horarios — siempre usá las tools para obtener datos reales`;
  }

  // ── Ejecución de tools ────────────────────────────────────────────────────────
  private async executeTool(
    name: string,
    args: Record<string, any>,
    tenantId: string,
    customerId: string,
  ): Promise<Record<string, any>> {
    try {
      switch (name) {

        case 'get_available_slots': {
          const slotsResult = await this.appointmentsService.getAvailableSlots(tenantId, args.date);
          if (!slotsResult.available || slotsResult.slots.length === 0) {
            return { available: false, message: `No hay turnos disponibles para ${args.date}` };
          }
          return {
            available: true,
            date: args.date,
            slots: slotsResult.slots.map((s: any) => ({ time: s.time, datetime: s.datetime })),
          };
        }

        case 'book_appointment': {
          const appointment = await this.appointmentsService.create(tenantId, {
            date: args.datetime,
            customerId,
            ...(args.service_id && { serviceId: args.service_id }),
            ...(args.employee_id && { employeeId: args.employee_id }),
          });
          // Extraer hora directamente del string que envió el bot (ya es hora local)
          // Ej: "2026-03-30T09:00:00" → "09:00"
          const timeFromInput = typeof args.datetime === 'string'
            ? args.datetime.slice(11, 16)
            : new Date(appointment.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          return {
            success: true,
            appointment_id: appointment.id,
            date: toLocalDateStr(new Date(appointment.date)),
            time: timeFromInput,
            day: getDayName(new Date(appointment.date)),
            service: (appointment as any).service?.name ?? null,
            employee: (appointment as any).employee?.name ?? null,
          };
        }

        case 'list_services': {
          const services = await this.servicesService.findAll(tenantId);
          if (services.length === 0) {
            return { services: [], message: 'El negocio no tiene servicios configurados' };
          }
          return {
            services: services.map((s: any) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              description: s.description ?? null,
            })),
          };
        }

        case 'get_employees_for_service': {
          const employees = await this.employeesService.findAll(tenantId, args.service_id);
          if (employees.length === 0) {
            return { employees: [], message: 'No hay profesionales disponibles para ese servicio' };
          }
          return {
            employees: employees.map((e: any) => ({ id: e.id, name: e.name })),
          };
        }

        case 'get_employee_slots': {
          const slotsResult = await this.appointmentsService.getAvailableSlots(
            tenantId, args.date, args.service_id, args.employee_id,
          );
          if (!slotsResult.available || slotsResult.slots.length === 0) {
            return { available: false, message: `No hay horarios disponibles para esa fecha` };
          }
          return {
            available: true,
            date: args.date,
            slots: slotsResult.slots.map((s: any) => ({ time: s.time, datetime: s.datetime })),
          };
        }

        case 'list_my_appointments': {
          const appointments = await this.prisma.appointment.findMany({
            where: { customerId, tenantId, date: { gte: new Date() }, status: { not: 'CANCELLED' } },
            orderBy: { date: 'asc' },
            take: 5,
          });
          if (appointments.length === 0) {
            return { appointments: [], message: 'El paciente no tiene turnos próximos' };
          }
          return {
            appointments: appointments.map((a) => ({
              id: a.id,
              date: toLocalDateStr(new Date(a.date)),
              time: new Date(a.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              day: getDayName(new Date(a.date)),
            })),
          };
        }

        case 'cancel_appointment': {
          const updated = await this.prisma.appointment.updateMany({
            where: { id: args.appointment_id, tenantId, customerId },
            data: { status: 'CANCELLED' },
          });
          if (updated.count === 0) {
            return { success: false, message: 'No se encontró el turno o no pertenece a este paciente' };
          }
          return { success: true, message: 'Turno cancelado correctamente' };
        }

        case 'update_customer_profile': {
          const updateData: Record<string, string> = {};
          if (args.name)       updateData.name      = String(args.name).trim();
          if (args.real_phone) updateData.realPhone  = String(args.real_phone).replace(/\D/g, '');
          if (args.dni)        updateData.dni        = String(args.dni).replace(/\D/g, '');
          if (args.address)    updateData.address    = String(args.address).trim();

          if (Object.keys(updateData).length === 0) {
            return { success: false, message: 'No se proporcionaron datos para actualizar' };
          }
          await this.customersService.update(tenantId, customerId, updateData);
          return { success: true, updated_fields: Object.keys(updateData) };
        }

        case 'get_menu': {
          const menu = await this.ordersService.getMenu(tenantId);
          const categories = Object.entries(menu);
          if (categories.length === 0) {
            return { menu: [], message: 'El menú está vacío por el momento' };
          }
          return {
            menu: categories.map(([cat, items]) => ({
              category: cat,
              items: (items as any[]).map((i: any) => ({ id: i.id, name: i.name, price: i.price })),
            })),
          };
        }

        case 'list_my_orders': {
          const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
          const phone = customer?.realPhone ?? customer?.phone ?? null;
          if (!phone) {
            return { orders: [], message: 'No tenemos tu número de teléfono registrado para buscar pedidos' };
          }
          const orders = await this.prisma.order.findMany({
            where: { tenantId, customerPhone: { contains: phone.slice(-8) } },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
          });
          if (orders.length === 0) {
            return { orders: [], message: 'No encontramos pedidos recientes para este número' };
          }
          const STATUS_LABELS: Record<string, string> = {
            PENDING:    'Pendiente (recibido)',
            CONFIRMED:  'Confirmado',
            PREPARING:  'En preparación',
            READY:      'Listo para entregar',
            DELIVERED:  'Entregado',
            CANCELLED:  'Cancelado',
          };
          return {
            orders: orders.map(o => ({
              number:   o.number,
              status:   STATUS_LABELS[o.status] ?? o.status,
              total:    o.total,
              type:     o.type,
              items:    o.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
              created:  o.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            })),
          };
        }

        case 'create_order': {
          const order = await this.ordersService.create(tenantId, {
            customerName:  args.customer_name,
            customerPhone: args.customer_phone ?? null,
            address:       args.address ?? null,
            type:          args.type as 'DELIVERY' | 'PICKUP' | 'LOCAL',
            notes:         args.notes ?? null,
            items: (args.items ?? []).map((i: any) => ({
              productId: i.product_id ?? undefined,
              name:      i.name,
              price:     i.price,
              quantity:  i.quantity,
              notes:     i.notes ?? undefined,
            })),
          });
          return {
            success: true,
            order_number: order.number,
            total: order.total,
            type: order.type,
            message: `Pedido #${order.number} creado correctamente. Total: $${order.total}`,
          };
        }

        case 'search_repair_price': {
          // 1. Buscar repuestos con búsqueda fuzzy
          const parts = await this.sparePartsService.searchFuzzy(
            args.brand,
            args.model,
            args.part_name,
            tenantId,
          );

          if (parts.length === 0) {
            return {
              found: false,
              message: `No encontramos precios para *${args.part_name}* de ${args.brand} ${args.model}. Podemos revisar el equipo y darte un presupuesto personalizado.`,
            };
          }

          // 2. Obtener el margen del tenant para calcular precio de venta
          const tenantData = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { repairMarginPercent: true },
          });
          const margin = tenantData?.repairMarginPercent ?? 40;

          // 3. Formatear resultados con precio de venta calculado
          const results = parts.map((p) => {
            // Si el repuesto tiene precio de venta manual, lo usa; si no, calcula por margen
            const sellPrice = p.sellPrice ?? p.costPrice * (1 + margin / 100);
            return {
              id:         p.id,
              brand:      p.brand,
              model:      p.model,
              part:       p.name,
              sell_price: Math.round(sellPrice),
            };
          });

          const summary = results
            .map((r) => `• ${r.brand} ${r.model} - ${r.part}: $${r.sell_price}`)
            .join('\n');

          return {
            found: true,
            parts: results,
            summary: `Precios para *${args.brand} ${args.model}*:\n${summary}`,
          };
        }

        case 'create_repair_request': {
          // Recuperar el teléfono real del cliente para registrarlo en la reparación
          const customerData = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: { name: true, realPhone: true, phone: true },
          });
          const customerPhone = customerData?.realPhone ?? customerData?.phone ?? '';

          const repair = await this.repairsService.create(tenantId, {
            deviceBrand:   args.device_brand,
            deviceModel:   args.device_model,
            problem:       args.problem,
            customerName:  args.customer_name,
            customerPhone,
            ...(args.spare_part_id ? { sparePartId: args.spare_part_id } : {}),
          });

          return {
            success:        true,
            repair_number:  repair.number,
            repair_id:      repair.id,
            message:        `✅ ¡Ingreso registrado! Tu número de orden es *#${repair.number}*. Te avisamos cuando esté listo.`,
          };
        }

        default:
          return { error: `Tool desconocida: ${name}` };
      }
    } catch (err: any) {
      this.logger.error(`Error en tool ${name}: ${err?.message}`);
      return { error: err?.message ?? 'Error interno al ejecutar la acción' };
    }
  }

  // ── Limpiar historial ─────────────────────────────────────────────────────────
  clearHistory(tenantId: string, phone: string): void {
    this.histories.delete(`${tenantId}:${phone}`);
  }
}
