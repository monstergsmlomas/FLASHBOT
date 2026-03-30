import { Controller, Get, Post, Delete, Body, Param, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { ConversationService } from './conversation.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private whatsappService: WhatsappService,
    private conversationService: ConversationService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  // Lista qué conversaciones están pausadas (médico tomó control)
  @Get('paused')
  getPaused() {
    return this.whatsappService.getPausedList();
  }

  // Reactiva el bot para un contacto específico
  @Delete('paused/:phone')
  resumeBot(@Param('phone') phone: string) {
    this.whatsappService.resumeBot(phone);
    return { ok: true, message: `Bot reactivado para ${phone}` };
  }

  // Reactiva el bot para TODOS los contactos pausados
  @Delete('paused')
  resumeAll() {
    this.whatsappService.resumeAll();
    return { ok: true, message: 'Bot reactivado para todos los contactos' };
  }

  // Test: simula un mensaje entrante y devuelve la respuesta del bot
  @Post('test-bot')
  async testBot(@Body('message') message: string) {
    const text = message || 'hola quiero un turno';
    const reply = await this.conversationService.handleMessage('test_diagnostico', text);
    return { input: text, reply: reply ?? '(sin respuesta — ver logs del servidor)' };
  }


  @Get('qr')
  getQr(@Res() res: Response) {
    const qr = this.whatsappService.getQrBase64();
    if (!qr) return res.status(204).send();
    return res.json({ qr });
  }

  @Post('logout')
  async logout() {
    await this.whatsappService.logout();
    return { ok: true };
  }

  // Reprogramar un turno: lo cancela y envía WA al paciente para que elija nuevo horario
  @Post('reschedule-appointment')
  async rescheduleAppointment(
    @CurrentUser() user: any,
    @Body('appointmentId') appointmentId: string,
  ) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId: user.tenantId },
      include: { customer: true, tenant: true },
    });
    if (!appt) return { ok: false, error: 'Turno no encontrado' };

    // Cancelar el turno
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    // Enviar mensaje de WhatsApp si el paciente tiene teléfono
    const phone = appt.customer.phone;
    const name = appt.customer.name ?? 'paciente';
    const date = new Date(appt.date);
    const dateStr = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const msg = `Hola ${name} 👋\nTe escribimos de *${appt.tenant.name}*.\n\nNecesitamos reprogramar tu turno del *${dateStr}* a las *${timeStr} hs*.\n\n¿Qué día y horario te viene mejor? Escribinos y te ayudamos a encontrar un nuevo turno 📅`;

    if (this.whatsappService.isConnected()) {
      await this.whatsappService.sendToPhone(phone, msg);
    }

    return { ok: true, notified: this.whatsappService.isConnected() };
  }

  // Cerrar un día completo: cancela todos los turnos activos y notifica a cada paciente
  @Post('close-day')
  async closeDay(
    @CurrentUser() user: any,
    @Body('date') date: string,
  ) {
    const [y, m, d] = date.split('-').map(Number);
    const from = new Date(y, m - 1, d, 0, 0, 0);
    const to   = new Date(y, m - 1, d, 23, 59, 59);

    const appts = await this.prisma.appointment.findMany({
      where: {
        tenantId: user.tenantId,
        date: { gte: from, lte: to },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { customer: true, tenant: true },
    });

    if (appts.length === 0) return { ok: true, cancelled: 0 };

    // Cancelar todos
    await this.prisma.appointment.updateMany({
      where: { id: { in: appts.map(a => a.id) } },
      data: { status: 'CANCELLED' },
    });

    // Notificar a cada paciente por WhatsApp
    if (this.whatsappService.isConnected()) {
      const dateStr = from.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      for (const appt of appts) {
        const name = appt.customer.name ?? 'paciente';
        const timeStr = new Date(appt.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const msg = `Hola ${name} 👋\nTe escribimos de *${appt.tenant.name}*.\n\nEl consultorio no va a atender el *${dateStr}*, por lo que tu turno de las *${timeStr} hs* fue cancelado.\n\nEscribinos para coordinar un nuevo turno 📅`;
        await this.whatsappService.sendToPhone(appt.customer.phone, msg);
        await new Promise(r => setTimeout(r, 800)); // pequeño delay entre mensajes
      }
    }

    return { ok: true, cancelled: appts.length, notified: this.whatsappService.isConnected() };
  }
}
