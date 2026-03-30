import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import { ConversationService } from './conversation.service';

const WA_DEBUG_LOG = 'C:\\Users\\monst\\OneDrive\\Escritorio\\CLAUDE CODE\\AUTOMATIZACION\\backend\\bot-debug.log';
function waLog(msg: string) {
  try {
    fs.appendFileSync(WA_DEBUG_LOG, `[${new Date().toISOString()}] [WA] ${msg}\n`);
  } catch (_) {}
}

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private socket: any = null;
  private qrBase64: string | null = null;
  private connected = false;
  private connecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 8;
  private readonly authPath = path.join(process.cwd(), 'whatsapp-auth');

  // Human takeover: phone → timestamp hasta el que el bot está pausado
  private readonly humanPaused = new Map<string, number>();
  private readonly PAUSE_DURATION_MS = 60 * 60 * 1000; // 60 minutos

  constructor(private conversationService: ConversationService) {}

  async onModuleInit() {
    waLog('=== WhatsappService iniciando ===');
    // Siempre conectar al arrancar.
    // Si ya hay sesión guardada en whatsapp-auth/, se reconecta sin pedir QR.
    await this.connect();
    // Iniciar loop de reintentos por mensajes perdidos por quota
    this.startRetryInterval();
  }

  async connect() {
    if (this.connecting) return;
    this.connecting = true;

    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }

    const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason: DR } = await import('@whiskeysockets/baileys');
    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: {
        level: 'silent',
        trace: () => {}, debug: () => {}, info: () => {},
        warn: (o: any) => this.logger.warn(JSON.stringify(o)),
        error: (o: any) => this.logger.error(JSON.stringify(o)),
        fatal: (o: any) => this.logger.error(JSON.stringify(o)),
        child: () => ({
          level: 'silent',
          trace: () => {}, debug: () => {}, info: () => {},
          warn: () => {}, error: () => {}, fatal: () => {},
          child: (): any => ({}),
        }),
      } as any,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Convertir string Baileys → imagen PNG base64 → mostrar en el panel
        this.qrBase64 = await QRCode.toDataURL(qr, {
          width: 280,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        this.logger.log('📱 QR listo — esperando escaneo desde el panel');
      }

      if (connection === 'close') {
        this.connected = false;
        this.connecting = false;
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = code !== DR.loggedOut;
        this.logger.warn(`Desconectado (${code}). Reconectar: ${shouldReconnect}`);
        if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT) {
          this.reconnectAttempts++;
          // Backoff exponencial: 3s, 6s, 12s, ... hasta 60s
          const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
          this.logger.warn(`Reintento ${this.reconnectAttempts}/${this.MAX_RECONNECT} en ${delay/1000}s`);
          setTimeout(() => this.connect(), delay);
        } else if (!shouldReconnect) {
          this.qrBase64 = null;
          this.clearAuth();
        } else {
          this.logger.warn('Máximo de reconexiones alcanzado. Esperando acción manual.');
        }
      }

      if (connection === 'open') {
        this.reconnectAttempts = 0; // resetear contador al conectar
        this.connected = true;
        this.connecting = false;
        this.qrBase64 = null;
        this.logger.log('✅ WhatsApp conectado');
      }
    });

    this.socket.ev.on('messages.upsert', async (event: any) => {
      waLog(`messages.upsert type=${event.type} count=${event.messages?.length}`);
      // 'append' = historial de sync → ignorar. Solo procesar 'notify' (mensajes nuevos)
      if (event.type !== 'notify') return;

      const nowSec = Math.floor(Date.now() / 1000);

      for (const msg of event.messages) {
        // Ignorar mensajes de más de 60 segundos (son del historial de reconexión)
        const msgTs = msg.messageTimestamp ?? 0;
        const ageSec = nowSec - Number(msgTs);
        waLog(`msg fromMe=${msg.key.fromMe} ageSec=${ageSec} jid=${msg.key.remoteJid}`);
        if (ageSec > 60) {
          waLog(`Ignorando mensaje antiguo (${ageSec}s)`);
          continue;
        }

        if (msg.key.fromMe && msg.message) {
          // El médico respondió manualmente → pausar bot para ese contacto 60 min
          await this.handleOutgoingMessage(msg);
        } else if (!msg.key.fromMe && msg.message) {
          await this.handleIncomingMessage(msg);
        }
      }
    });
  }

  // Cierra sesión, limpia auth y lanza QR nuevo
  async logout() {
    try {
      if (this.socket) await this.socket.logout();
    } catch (_) {}
    finally {
      this.socket = null;
      this.connected = false;
      this.connecting = false;
      this.qrBase64 = null;
      this.clearAuth();
      this.logger.log('🔓 Sesión cerrada — generando QR nuevo');
      setTimeout(() => this.connect(), 1500);
    }
  }

  private clearAuth() {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
        fs.mkdirSync(this.authPath, { recursive: true });
      }
    } catch (e) {
      this.logger.error('Error limpiando auth:', e);
    }
  }

  // Detecta respuesta manual del médico → pausa el bot para ese contacto
  private async handleOutgoingMessage(msg: any) {
    const to = msg.key.remoteJid;
    if (!to || to.endsWith('@g.us') || to === 'status@broadcast') return;
    const phone = to.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!phone || phone.length < 8) return;

    const pausedUntil = Date.now() + this.PAUSE_DURATION_MS;
    this.humanPaused.set(phone, pausedUntil);
    this.logger.log(`🙋 [${phone}] Médico respondió manualmente — bot pausado 60 min`);
  }

  private async handleIncomingMessage(msg: any) {
    const from = msg.key.remoteJid;

    // Ignorar mensajes de grupos, estados y broadcasts
    if (!from || from.endsWith('@g.us') || from === 'status@broadcast') return;

    const phone = from.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!phone || phone.length < 8) return; // JID inválido

    // Human takeover activo → bot no responde
    const pausedUntil = this.humanPaused.get(phone);
    if (pausedUntil && Date.now() < pausedUntil) {
      const minLeft = Math.ceil((pausedUntil - Date.now()) / 60000);
      this.logger.log(`🙋 [${phone}] Bot pausado (médico tomó control, ${minLeft} min restantes)`);
      return;
    }
    // Pausa expirada → limpiar
    if (pausedUntil) this.humanPaused.delete(phone);

    const msgTypes = Object.keys(msg.message || {}).join(',');
    waLog(`Msg types: ${msgTypes}`);

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.ephemeralMessage?.message?.conversation ||
      msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text || '';

    waLog(`Text extraído: "${text.slice(0, 80)}"`);
    if (!text.trim()) {
      waLog(`Ignorando: mensaje sin texto (tipo: ${msgTypes})`);
      return;
    }

    this.logger.log(`📩 [${phone}] "${text}"`);
    waLog(`Incoming msg from ${phone}: "${text}"`);
    try {
      // Nuevo mensaje → limpiar cualquier retry pendiente (el paciente escribió de nuevo)
      this.conversationService.clearPending(phone);
      const reply = await this.conversationService.handleMessage(phone, text, from);
      if (reply) await this.sendMessage(from, reply);
    } catch (e) {
      this.logger.error('Error procesando mensaje:', e);
    }
  }

  // Exponer estado de pausa para el panel (opcional)
  isPaused(phone: string): boolean {
    const until = this.humanPaused.get(phone);
    return !!until && Date.now() < until;
  }

  getPausedList() {
    const now = Date.now();
    const list: Array<{ phone: string; minutesLeft: number }> = [];
    for (const [phone, until] of this.humanPaused.entries()) {
      if (until > now) {
        list.push({ phone, minutesLeft: Math.ceil((until - now) / 60000) });
      } else {
        this.humanPaused.delete(phone); // limpiar expirados
      }
    }
    return { paused: list, count: list.length };
  }

  resumeBot(phone: string) {
    this.humanPaused.delete(phone);
    this.logger.log(`▶️ [${phone}] Bot reanudado manualmente`);
  }

  resumeAll() {
    const count = this.humanPaused.size;
    this.humanPaused.clear();
    this.logger.log(`▶️ Bot reanudado para todos (${count} pausas eliminadas)`);
  }

  // Reintenta mensajes que quedaron sin respuesta por quota de Gemini
  private startRetryInterval() {
    setInterval(async () => {
      if (!this.connected) return;
      const pending = this.conversationService.getPendingRetries(90_000); // esperaron 90s
      if (pending.length === 0) return;

      this.logger.log(`🔄 Reintentando ${pending.length} mensaje(s) pendiente(s)...`);
      for (const { phone, jid, text } of pending) {
        try {
          const reply = await this.conversationService.handleMessage(phone, text, jid);
          if (reply) {
            await this.sendMessage(jid, reply);
            this.conversationService.clearPending(phone);
            this.logger.log(`✅ [${phone}] Reintento exitoso`);
          }
          // Si sigue fallando, quedará en el mapa para el próximo ciclo
        } catch (e) {
          this.logger.error(`Error en reintento [${phone}]:`, e);
        }
        // Pequeño delay entre reintentos para no saturar la API
        await new Promise((r) => setTimeout(r, 3000));
      }
    }, 90_000); // revisar cada 90 segundos
  }

  async sendMessage(to: string, text: string) {
    if (!this.socket || !this.connected) return;
    await this.socket.sendMessage(to, { text });
  }

  async sendToPhone(phone: string, text: string) {
    await this.sendMessage(`${phone}@s.whatsapp.net`, text);
  }

  getStatus() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      hasQr: this.qrBase64 !== null,
    };
  }

  getQrBase64() { return this.qrBase64; }
  isConnected()  { return this.connected; }
}
