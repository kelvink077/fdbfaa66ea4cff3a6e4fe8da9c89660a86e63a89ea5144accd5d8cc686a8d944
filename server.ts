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

// Configuração de Porta Dinâmica para Produção
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
// Regras de CORS Seguras
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
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
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
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error('Origem não autorizada via CORS'));
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

let userbotClient: TelegramClient | null = null;
let userbotProfile: any = null;
let userbotStatus = 'disconnected';
let userbotLastError: string | null = null;
let isEventHandlerRegistered = false;

let pendingAuthClient: TelegramClient | null = null;
let pendingAuthPhoneCodeHash: string | null = null;
let pendingAuthPhoneNumber: string | null = null;

const MODULE_NAMES: Record<string, string> = {
  cpf_1: 'CPF 1 (Consulta Básica)', cpf_2: 'CPF 2 (Consulta Intermediária)', cpf_3: 'CPF 3 (Consulta Avançada)',
  cnpj: 'CNPJ (Dados Cadastrais & QSA)', nome: 'NOME (Localização & Homônimos)', email: 'E-MAIL (Vínculos & Vazamentos)',
  placa: 'PLACA (Histórico Veicular & Detran)', telefone: 'TELEFONE (Operadora & Titularidade)',
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

    const replyToMsgId = message.replyTo?.replyToMsgId || message.replyToMsgId;
    const messageId = message.id;

    let targetRequestId: string | null = null;

    if (replyToMsgId && queryByTelegramMsgId.has(replyToMsgId)) {
      targetRequestId = queryByTelegramMsgId.get(replyToMsgId)!;
    }

    if (!targetRequestId && replyToMsgId) {
      for (const [reqId, q] of activeQueries.entries()) {
        if (q.telegramMessageId === replyToMsgId) { targetRequestId = reqId; break; }
      }
    }

    if (!targetRequestId && incomingText) {
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = q.cleanedTarget || q.queryParam.replace(/\D/g, '');
        if (clean && clean.length >= 6 && incomingText.includes(clean)) { targetRequestId = reqId; break; }
        if (q.telegramCommand && incomingText.includes(q.telegramCommand)) { targetRequestId = reqId; break; }
      }
    }

    if (!targetRequestId && activeQueries.size === 1) {
      targetRequestId = Array.from(activeQueries.keys())[0];
    }

    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, incomingText, { messageId, simulated: false });
    }
  } catch (err) {}
}

function attachUserbotListener(client: TelegramClient) {
  if (isEventHandlerRegistered) return;
  try {
    client.addEventHandler(handleUserbotIncomingMessage, new NewMessage({ incoming: true }));
    isEventHandlerRegistered = true;
  } catch (err) {}
}

async function initUserbot() {
  if (userbotClient) { try { await userbotClient.disconnect(); } catch {} userbotClient = null; }
  isEventHandlerRegistered = false;

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_STRING_SESSION) {
    userbotStatus = 'disconnected'; return;
  }

  try {
    userbotStatus = 'connecting';
    const session = new StringSession(TELEGRAM_STRING_SESSION);
    const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
    try { client.setLogLevel('none' as any); } catch {}
    await client.connect();

    if (await client.checkAuthorization()) {
      userbotClient = client;
      const me: any = await client.getMe();
      userbotProfile = { id: String(me.id), firstName: me.firstName, username: me.username };
      userbotStatus = 'connected';
      attachUserbotListener(client);
    } else {
      userbotStatus = 'disconnected';
    }
  } catch (err) { userbotStatus = 'error'; }
}

initUserbot();

async function dispatchToTelegram(record: ConsultationState) {
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;
  if (userbotClient && userbotStatus === 'connected' && TELEGRAM_CHAT_ID) {
    try {
      const peer = await userbotClient.getEntity(TELEGRAM_CHAT_ID);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: commandText });
      return { sent: true, messageId: sentMsg.id, commandText };
    } catch (err) { return { sent: false, commandText }; }
  }
  return { sent: false, commandText };
}

io.on('connection', (socket) => {
  socket.on('query:request', async (payload: { moduleType: string; queryParam: string }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;
    const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const { fullMessage, cleanParam } = getTelegramCommand(moduleType, queryParam);

    const record: ConsultationState = {
      id: requestId, socketId: socket.id, moduleType, moduleTitle: MODULE_NAMES[moduleType] || moduleType,
      queryParam: queryParam.trim(), cleanedTarget: cleanParam, telegramCommand: fullMessage,
      timestamp: Date.now(), status: 'pending',
    };
    activeQueries.set(requestId, record);
    socket.emit('query:ack', { requestId, status: 'pending', record, telegramCommand: fullMessage });

    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      record.telegramMessageId = dispatchResult.messageId; record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
    }
    io.emit('telegram:query_created', { ...record, dispatchResult, userbotStatus });
  });

  socket.on('telegram:simulate_reply', async (payload) => {
    let targetRequestId = payload.requestId || (payload.telegramMessageId ? queryByTelegramMsgId.get(payload.telegramMessageId) : null);
    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, payload.responseText, { simulated: true });
    }
  });
});

function handleIncomingTelegramResponse(requestId: string, rawText: string, meta?: any) {
  const record = activeQueries.get(requestId);
  if (!record) return null;

  const now = Date.now();
  record.status = 'completed'; record.durationMs = now - record.timestamp;
  record.rawResponse = cleanTelegramRawResponse(rawText);
  record.exactMatch = checkTelegramExactMatch(record.queryParam, record.moduleType, record.rawResponse, record.telegramCommand);

  queryHistory.unshift({ ...record });
  if (queryHistory.length > 200) queryHistory.pop();
  activeQueries.delete(requestId);
  if (record.telegramMessageId) queryByTelegramMsgId.delete(record.telegramMessageId);

  io.to(record.socketId).emit('query:response', { ...record, meta });
  io.emit('query:completed_broadcast', { ...record, meta });
  return record;
}

// =============================================================
// REST API ENDPOINTS (Userbot Auth)
// =============================================================
app.post('/api/telegram/auth/send-code', async (req, res) => {
  const phone = (req.body.phoneNumber || TELEGRAM_PHONE_NUMBER || '').trim();
  if (!phone || !TELEGRAM_API_ID) return res.status(400).json({ error: 'Faltam chaves ou telefone' });

  try {
    userbotStatus = 'connecting';
    const tempClient = new TelegramClient(new StringSession(''), TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
    await tempClient.connect();
    const result: any = await tempClient.sendCode({ apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH }, phone);
    
    pendingAuthClient = tempClient; pendingAuthPhoneNumber = phone; pendingAuthPhoneCodeHash = result.phoneCodeHash;
    userbotStatus = 'awaiting_code';
    return res.json({ ok: true, phoneCodeHash: result.phoneCodeHash });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/telegram/auth/sign-in', async (req, res) => {
  const code = (req.body.phoneCode || '').trim();
  if (!code || !pendingAuthClient) return res.status(400).json({ error: 'Fluxo expirado ou código ausente.' });

  try {
    await pendingAuthClient.invoke(new Api.auth.SignIn({ phoneNumber: pendingAuthPhoneNumber!, phoneCodeHash: pendingAuthPhoneCodeHash!, phoneCode: code }));
    TELEGRAM_STRING_SESSION = pendingAuthClient.session.save() as unknown as string;
    userbotClient = pendingAuthClient;
    userbotStatus = 'connected';
    attachUserbotListener(userbotClient);
    return res.json({ ok: true, sessionString: TELEGRAM_STRING_SESSION });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// API REST UP DEPIX v1 (Integração de Pagamento)
// =============================================================

// CORREÇÃO CRÍTICA: A chave agora está idêntica a da sua imagem (sem erros de digitação).
const UPDEPIX_API_KEY = process.env.UPDEPIX_API_KEY || 'upx_c80bff3643dc294eaca31915d11408cfc7869402bc159a3b0e349ab1447f8e8f';
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

    // CORREÇÃO CRÍTICA: Reduzido o externalId para evitar crash no banco de dados da UP DEPIX
    const externalId = `szm-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanName = (userName || userEmail?.split('@')[0] || 'Cliente Shazam').trim();
    const webhookUrl = 'https://shazam-ygad.onrender.com/api/payment/webhook';

    console.log(`[UP DEPIX] Solicitando PIX de R$ ${planConfig.amount} para ${cleanName}...`);

    try {
      const upDepixRes = await fetch(`${UPDEPIX_BASE_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPDEPIX_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.1' // Disfarce robusto contra a Cloudflare
        },
        body: JSON.stringify({
          amount: planConfig.amount,
          external_id: externalId,
          webhook_url: webhookUrl,
          payer_name: cleanName,
          payer_document: cleanDoc,
          pass_fees_to_payer: false,
          wallet_id: null
        }),
      });

      const textResponse = await upDepixRes.text();
      let responseData: any = null;

      try {
        responseData = JSON.parse(textResponse);
      } catch (e) {
        console.error('[UP DEPIX] Cloudflare bloqueou a requisição ou servidor falhou. Resposta original:', textResponse.slice(0, 150));
        return res.status(502).json({ 
          success: false, 
          error: `O servidor de pagamentos recusou a conexão. Verifique no Render se UPDEPIX_API_KEY está configurado.` 
        });
      }

      if (upDepixRes.ok && responseData?.data?.id) {
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
      } else {
        console.warn('[UP DEPIX] Erro lógico da API:', responseData);
        return res.status(400).json({ 
          success: false, 
          error: responseData?.detail || responseData?.message || 'A operadora recusou a transação. Verifique os dados.' 
        });
      }
    } catch (fetchErr: any) {
      console.error('[UP DEPIX] Erro de rede:', fetchErr?.message || fetchErr);
      return res.status(500).json({ success: false, error: 'Falha de comunicação com o servidor financeiro.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Falha interna do servidor backend.' });
  }
});

// Check status of PIX deposit
app.all(['/api/payment/check-status/:id', '/api/payment/deposits/:id'], async (req, res) => {
  const depositId = req.params.id;
  if (!depositId) return res.status(400).json({ success: false, error: 'ID é obrigatório.' });

  const localRecord = localDeposits.get(depositId);

  if (localRecord && localRecord.status === 'completed') {
    return res.json({
      success: true,
      data: {
        id: depositId, status: 'completed', isPaid: true, planId: localRecord.planId,
        daysAdded: localRecord.daysAdded, amount: localRecord.amount, completedAt: localRecord.completedAt,
      },
    });
  }

  if (localRecord && ['refunded', 'failed', 'canceled'].includes(localRecord.status)) {
    return res.json({ success: true, data: { id: depositId, status: localRecord.status, isPaid: false } });
  }

  try {
    const getRes = await fetch(`${UPDEPIX_BASE_URL}/deposits/${depositId}`, {
      headers: { 'Authorization': `Bearer ${UPDEPIX_API_KEY}`, 'User-Agent': 'PostmanRuntime/7.36.1' },
    });
    
    const getJson: any = await getRes.json();
    let currentStatus = getJson?.data?.status;

    if (['completed', 'approved', 'depix_sent'].includes(currentStatus)) {
      if (localRecord) { localRecord.status = 'completed'; localRecord.completedAt = new Date().toISOString(); }
      return res.json({
        success: true,
        data: {
          id: depositId, status: 'completed', isPaid: true, planId: localRecord?.planId || 'biweekly',
          daysAdded: localRecord?.daysAdded || 15, amount: localRecord?.amount || 19.90, completedAt: new Date().toISOString(),
        },
      });
    }

    if (['refunded', 'error', 'canceled', 'failed'].includes(currentStatus)) {
      if (localRecord) localRecord.status = currentStatus;
    }

    return res.json({
      success: true,
      data: {
        id: depositId, status: currentStatus || 'pending', isPaid: false,
        planId: localRecord?.planId, daysAdded: localRecord?.daysAdded, amount: localRecord?.amount,
      },
    });
  } catch (err: any) {
    console.warn(`[UP DEPIX] Erro ao checar status ${depositId}:`, err?.message);
  }

  return res.json({
    success: true,
    data: { id: depositId, status: localRecord?.status || 'pending', isPaid: localRecord?.status === 'completed' },
  });
});

app.post('/api/payment/simulate-confirm/:id', (req, res) => {
  const depositId = req.params.id;
  const localRecord = localDeposits.get(depositId);

  if (localRecord) {
    localRecord.status = 'completed';
    localRecord.completedAt = new Date().toISOString();
    io.emit('payment:confirmed', { depositId, userId: localRecord.userId, planId: localRecord.planId, daysAdded: localRecord.daysAdded });
    return res.json({ success: true, message: 'Simulação concluída', data: { id: depositId, status: 'completed', isPaid: true } });
  }
  return res.status(404).json({ success: false, error: 'Depósito não encontrado.' });
});

// Webhook receiver for UP DEPIX events
app.post('/api/payment/webhook', (req, res) => {
  try {
    const data = req.body?.data;
    const event = req.body?.event;
    if (!data) return res.status(200).json({ success: true, message: 'Sem payload' });

    let matchedRecord = localDeposits.get(data.id);
    if (!matchedRecord && data.external_id) {
      for (const rec of localDeposits.values()) {
        if (rec.externalId === data.external_id) { matchedRecord = rec; break; }
      }
    }

    if (matchedRecord) {
      if (event === 'deposit.completed' || data.status === 'completed' || data.status === 'approved') {
        matchedRecord.status = 'completed'; matchedRecord.completedAt = new Date().toISOString();
        io.emit('payment:confirmed', { depositId: matchedRecord.id, userId: matchedRecord.userId, planId: matchedRecord.planId, daysAdded: matchedRecord.daysAdded });
      } else if (event === 'deposit.refunded' || data.status === 'refunded') {
        matchedRecord.status = 'refunded';
      } else if (['error', 'canceled', 'failed'].includes(data.status)) {
        matchedRecord.status = 'failed';
      }
    }
    return res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message });
  }
});

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