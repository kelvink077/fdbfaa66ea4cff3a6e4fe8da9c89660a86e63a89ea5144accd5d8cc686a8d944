import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { TelegramClient, sessions, Api } from 'telegram';
import { NewMessage } from 'telegram/events/index.js';
import { getTelegramCommand, checkTelegramExactMatch } from './src/utils/telegramCommandHelper';
import { cleanTelegramRawResponse } from './src/utils/cleanTelegramResponse';
import { ExactMatchResult } from './src/types';

const { StringSession } = sessions;

dotenv.config();

// Configuração de Porta Dinâmica para Produção (Render / Railway / Netlify proxy)
const PORT = process.env.APPLET_ID
  ? 3000
  : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

const app = express();
const server = http.createServer(app);

// =============================================================
// Gerenciamento Seguro de Variáveis (.env)
// =============================================================
const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 0;
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
let TELEGRAM_STRING_SESSION = process.env.TELEGRAM_STRING_SESSION || '';
const TELEGRAM_PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// =============================================================
// Regras de CORS Seguras para Produção
// =============================================================
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || '';
const configuredAllowedOrigins = [FRONTEND_URL, ...ALLOWED_ORIGINS_ENV.split(',')]
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  if (configuredAllowedOrigins.includes(normalizedOrigin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.netlify\.app$/.test(normalizedOrigin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return true;
  if (normalizedOrigin.endsWith('.run.app')) return true;
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada por política de segurança: ${origin}`);
      callback(new Error(`Bloqueado pelo CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não autorizada via CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

interface ConsultationState {
  id: string;
  socketId: string;
  moduleType: string;
  moduleTitle: string;
  queryParam: string;
  cleanedTarget?: string;
  telegramCommand?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  telegramMessageId?: number;
  telegramChatId?: string | number;
  telegramSentAt?: number;
  telegramAnsweredAt?: number;
  durationMs?: number;
  rawResponse?: string;
  exactMatch?: ExactMatchResult;
  error?: string;
}

const activeQueries = new Map<string, ConsultationState>();
const queryByTelegramMsgId = new Map<number, string>();
const queryHistory: ConsultationState[] = [];

interface UserbotProfile {
  id: string;
  firstName: string;
  username?: string;
  phone?: string;
}

let userbotClient: TelegramClient | null = null;
let userbotProfile: UserbotProfile | null = null;
let userbotStatus: 'disconnected' | 'connecting' | 'awaiting_code' | 'awaiting_password' | 'connected' | 'error' = 'disconnected';
let userbotLastError: string | null = null;
let isEventHandlerRegistered = false;

let pendingAuthClient: TelegramClient | null = null;
let pendingAuthPhoneCodeHash: string | null = null;
let pendingAuthPhoneNumber: string | null = null;

const MODULE_NAMES: Record<string, string> = {
  cpf_1: 'CPF 1 (Consulta Básica)',
  cpf_2: 'CPF 2 (Consulta Intermediária)',
  cpf_3: 'CPF 3 (Consulta Avançada)',
  cnpj: 'CNPJ (Dados Cadastrais & QSA)',
  nome: 'NOME (Localização & Homônimos)',
  email: 'E-MAIL (Vínculos & Vazamentos)',
  placa: 'PLACA (Histórico Veicular & Detran)',
  telefone: 'TELEFONE (Operadora & Titularidade)',
};

function formatTelegramCommandMessage(record: ConsultationState): string {
  const { fullMessage } = getTelegramCommand(record.moduleType, record.queryParam);
  return fullMessage;
}

async function handleUserbotIncomingMessage(event: any) {
  try {
    const message = event.message;
    if (!message || message.out) return;

    const incomingText = (message.message || message.text || '').trim();
    if (!incomingText) return;

    const replyToMsgId = message.replyTo?.replyToMsgId || (message.replyToMsgId as number | undefined);
    const messageId = message.id;

    let senderName = 'Bot Terceiro (Telegram)';
    try {
      const sender = await message.getSender();
      if (sender) {
        senderName = sender.username ? `@${sender.username}` : (sender.firstName || 'Bot Telegram');
      }
    } catch {}

    console.log(`[Userbot GramJS] Mensagem recebida de ${senderName}: "${incomingText.slice(0, 100)}..."`);

    let targetRequestId: string | null = null;

    if (replyToMsgId && queryByTelegramMsgId.has(replyToMsgId)) {
      targetRequestId = queryByTelegramMsgId.get(replyToMsgId)!;
    }

    if (!targetRequestId && replyToMsgId) {
      for (const [reqId, q] of activeQueries.entries()) {
        if (q.telegramMessageId === replyToMsgId) {
          targetRequestId = reqId;
          break;
        }
      }
    }

    if (!targetRequestId && incomingText) {
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = q.cleanedTarget || q.queryParam.replace(/\D/g, '');
        if (clean && clean.length >= 6 && incomingText.includes(clean)) {
          targetRequestId = reqId;
          break;
        }
        if (q.telegramCommand && incomingText.includes(q.telegramCommand)) {
          targetRequestId = reqId;
          break;
        }
        if (incomingText.toLowerCase().includes(q.queryParam.toLowerCase())) {
          targetRequestId = reqId;
          break;
        }
      }
    }

    if (!targetRequestId && activeQueries.size === 1) {
      targetRequestId = Array.from(activeQueries.keys())[0];
    }

    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, incomingText, {
        messageId,
        operator: senderName,
        simulated: false,
      });
      return;
    }

    io.emit('telegram:unlinked_message', {
      text: incomingText,
      from: senderName,
      messageId,
      date: message.date,
    });
  } catch (err: any) {
    console.error('[Userbot GramJS] Erro ao processar evento de mensagem:', err?.message || err);
  }
}

function attachUserbotListener(client: TelegramClient) {
  if (isEventHandlerRegistered) return;
  try {
    client.addEventHandler(handleUserbotIncomingMessage, new NewMessage({ incoming: true }));
    isEventHandlerRegistered = true;
    console.log('[Userbot GramJS] Listener ativado com sucesso.');
  } catch (err) {
    console.warn('[Userbot GramJS] Falha ao registrar handler:', err);
  }
}

async function initUserbot() {
  if (userbotClient) {
    try { await userbotClient.disconnect(); } catch {}
    userbotClient = null;
  }
  isEventHandlerRegistered = false;

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH) {
    userbotStatus = 'disconnected';
    userbotLastError = 'TELEGRAM_API_ID e TELEGRAM_API_HASH não configurados';
    return;
  }

  const sessionStr = (TELEGRAM_STRING_SESSION || '').trim();
  if (!sessionStr) {
    userbotStatus = 'disconnected';
    userbotLastError = 'Nenhuma String Session configurada.';
    return;
  }

  let clientToInit: TelegramClient | null = null;
  try {
    userbotStatus = 'connecting';
    const session = new StringSession(sessionStr);
    clientToInit = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
      connectionRetries: 3,
      autoReconnect: false,
    });

    try { clientToInit.setLogLevel('none' as any); } catch {}
    await clientToInit.connect();

    const isAuth = await clientToInit.checkAuthorization();
    if (isAuth) {
      userbotClient = clientToInit;
      const me: any = await userbotClient.getMe();
      userbotProfile = {
        id: String(me.id),
        firstName: me.firstName || 'Userbot',
        username: me.username,
        phone: me.phone,
      };
      userbotStatus = 'connected';
      userbotLastError = null;
      console.log(`[Userbot GramJS] Autenticado como: ${userbotProfile.firstName}`);
      attachUserbotListener(userbotClient);
    } else {
      userbotStatus = 'disconnected';
      userbotLastError = 'Sessão não autenticada.';
      try { await clientToInit.disconnect(); } catch {}
      userbotClient = null;
    }
  } catch (err: any) {
    userbotStatus = 'error';
    userbotLastError = err?.errorMessage || err?.message || 'Falha ao conectar Userbot';
    if (clientToInit) {
      try { await clientToInit.disconnect(); } catch {}
    }
    userbotClient = null;
  }
}

initUserbot();

async function resolveChatPeer(client: TelegramClient, rawChatId: string): Promise<any> {
  if (!rawChatId) throw new Error('TELEGRAM_CHAT_ID não informado.');
  const trimmed = rawChatId.trim();
  try {
    return await client.getEntity(trimmed);
  } catch {
    const num = Number(trimmed);
    if (!isNaN(num)) {
      try { return await client.getEntity(num); } catch { return num; }
    }
    return trimmed;
  }
}

async function dispatchToTelegram(record: ConsultationState): Promise<{ sent: boolean; messageId?: number; commandText: string; error?: string }> {
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;

  if (userbotClient && userbotStatus === 'connected' && TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')) {
    try {
      const peer = await resolveChatPeer(userbotClient, TELEGRAM_CHAT_ID);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: commandText });
      return { sent: true, messageId: sentMsg.id, commandText };
    } catch (err: any) {
      return { sent: false, error: err?.message || 'Falha ao enviar comando', commandText };
    }
  }
  return { sent: false, error: 'Userbot offline ou Chat ID ausente', commandText };
}

io.on('connection', (socket) => {
  socket.emit('system:status', {
    socketId: socket.id,
    isUserbot: true,
    userbotStatus,
    userbotProfile,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    apiIdConfigured: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    hasChatId: Boolean(TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')),
  });

  socket.on('query:request', async (payload: { moduleType: string; queryParam: string }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;

    const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const { fullMessage, cleanParam } = getTelegramCommand(moduleType, queryParam);

    const record: ConsultationState = {
      id: requestId,
      socketId: socket.id,
      moduleType,
      moduleTitle: MODULE_NAMES[moduleType] || moduleType,
      queryParam: queryParam.trim(),
      cleanedTarget: cleanParam,
      telegramCommand: fullMessage,
      timestamp: Date.now(),
      status: 'pending',
    };

    activeQueries.set(requestId, record);

    socket.emit('query:ack', { requestId, status: 'pending', record, telegramCommand: fullMessage });

    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      record.telegramMessageId = dispatchResult.messageId;
      record.telegramSentAt = Date.now();
      record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
    }

    io.emit('telegram:query_created', { ...record, dispatchResult, userbotStatus });
  });

  socket.on('telegram:simulate_reply', async (payload: { requestId?: string; telegramMessageId?: number; responseText: string; operatorName?: string }) => {
    let targetRequestId = payload.requestId || (payload.telegramMessageId ? queryByTelegramMsgId.get(payload.telegramMessageId) : null);
    if (!targetRequestId || !activeQueries.has(targetRequestId)) return;

    handleIncomingTelegramResponse(targetRequestId, payload.responseText, {
      simulated: true,
      operator: payload.operatorName || 'Simulador',
    });
  });
});

function handleIncomingTelegramResponse(requestId: string, rawText: string, meta?: any) {
  const record = activeQueries.get(requestId);
  if (!record) return null;

  const now = Date.now();
  const cleanedText = cleanTelegramRawResponse(rawText);
  record.status = 'completed';
  record.telegramAnsweredAt = now;
  record.durationMs = now - record.timestamp;
  record.rawResponse = cleanedText;

  const exactMatch = checkTelegramExactMatch(record.queryParam, record.moduleType, cleanedText, record.telegramCommand);
  record.exactMatch = exactMatch;

  queryHistory.unshift({ ...record });
  if (queryHistory.length > 200) queryHistory.pop();

  activeQueries.delete(requestId);
  if (record.telegramMessageId) queryByTelegramMsgId.delete(record.telegramMessageId);

  io.to(record.socketId).emit('query:response', { ...record, exactMatch, meta });
  io.emit('query:completed_broadcast', { ...record, exactMatch, meta });
  return record;
}

// =============================================================
// API REST UP DEPIX v1 (Integração de Pagamento)
// =============================================================
// Recomendação: Coloque UPDEPIX_API_KEY lá no Render!
const UPDEPIX_API_KEY = process.env.UPDEPIX_API_KEY || 'upx_c80bff3643de894eaca31915d11408cfc7869402be159a3b0e349ab1447f8e8f';
const UPDEPIX_BASE_URL = (process.env.UPDEPIX_BASE_URL || 'https://updepix.cc/api/v1').replace(/\/$/, '');

const PLAN_DEFINITIONS: Record<string, { amount: number; days: number; name: string }> = {
  weekly: { amount: 11.00, days: 7, name: 'Plano Semanal' },
  biweekly: { amount: 19.90, days: 15, name: 'Plano 15 Dias' },
  monthly: { amount: 35.00, days: 30, name: 'Plano Mensal' },
};

const localDeposits = new Map<string, any>();

app.get('/api/payment/plans', (req, res) => {
  res.json({ success: true, plans: PLAN_DEFINITIONS });
});

// A Rota que o painel tenta acessar
app.post('/api/payment/create-pix', async (req, res) => {
  try {
    const { planId, userId, userEmail, userName, payerDocument } = req.body;
    const planConfig = PLAN_DEFINITIONS[planId];
    
    if (!planConfig) {
      return res.status(400).json({ success: false, error: 'Plano inválido.' });
    }

    const cleanDoc = (payerDocument || '').replace(/\D/g, '');
    if (cleanDoc.length < 11) {
      return res.status(422).json({ success: false, error: 'CPF ou CNPJ do pagador é obrigatório (mínimo 11 dígitos).' });
    }

    const externalId = `shazam-${userId || 'anon'}-${planId}-${Date.now()}`;
    const cleanName = (userName || userEmail?.split('@')[0] || 'Cliente Shazam Buscas').trim();
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const webhookUrl = `${protocol}://${host}/api/payment/webhook`;

    console.log(`[UP DEPIX] Criando PIX de R$ ${planConfig.amount} para ${cleanName}...`);

    let responseData: any = null;
    let upDepixSuccess = false;

    try {
      const upDepixRes = await fetch(`${UPDEPIX_BASE_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPDEPIX_API_KEY}`,
          'X-API-Key': UPDEPIX_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: planConfig.amount,
          external_id: externalId,
          webhook_url: webhookUrl,
          payer_name: cleanName,
          payer_document: cleanDoc,
          pass_fees_to_payer: false,
          wallet_id: null,
        }),
      });

      const jsonText = await upDepixRes.text();
      try { responseData = JSON.parse(jsonText); } catch { responseData = { detail: jsonText }; }

      if (upDepixRes.ok && responseData?.data?.id) {
        upDepixSuccess = true;
      }
    } catch (fetchErr: any) {
      console.error('[UP DEPIX] Erro de rede:', fetchErr?.message || fetchErr);
    }

    if (upDepixSuccess && responseData?.data) {
      const depData = responseData.data;
      localDeposits.set(depData.id, {
        id: depData.id, planId, userId, amount: planConfig.amount, daysAdded: planConfig.days, status: 'pending'
      });
      return res.json({
        success: true,
        data: {
          id: depData.id, planId, amount: planConfig.amount,
          qrCopyPaste: depData.qr_copy_paste, qrImageUrl: depData.qr_image_url, status: 'pending',
        },
      });
    }

    return res.status(500).json({ success: false, error: responseData?.detail || 'Erro ao comunicar com o Gateway UP DEPIX.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Falha interna do servidor.' });
  }
});

// Outros Endpoints de auth e webhook omitidos para economizar espaço (já estavam corretos no seu código)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[IntelSaaS Backend] Servidor rodando em http://localhost:${PORT}`);
  });
}
startServer();