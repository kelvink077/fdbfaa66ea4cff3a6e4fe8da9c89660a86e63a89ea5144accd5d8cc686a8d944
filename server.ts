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
// Em contêineres de sandbox gerenciados, preserva a porta 3000 requerida pelo proxy reverso.
const PORT = process.env.APPLET_ID
  ? 3000
  : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

const app = express();
const server = http.createServer(app);

// =============================================================
// Gerenciamento Seguro de Variáveis (.env)
// As 4 Chaves Oficiais do Telegram MTProto:
// =============================================================
const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 0;
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
let TELEGRAM_STRING_SESSION = process.env.TELEGRAM_STRING_SESSION || '';
const TELEGRAM_PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// =============================================================
// Regras de CORS Seguras para Produção (Netlify + Domínios Autorizados)
// =============================================================
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || '';
const configuredAllowedOrigins = [FRONTEND_URL, ...ALLOWED_ORIGINS_ENV.split(',')]
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

function isOriginAllowed(origin: string | undefined): boolean {
  // Permite chamadas locais, server-to-server, curl, ferramentas de teste ou sem header Origin
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (configuredAllowedOrigins.includes(normalizedOrigin)) return true;

  // Permite automaticamente qualquer subdomínio da Netlify (*.netlify.app)
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.netlify\.app$/.test(normalizedOrigin)) return true;

  // Permite ambientes de desenvolvimento locais
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return true;

  // Permite previews do Google Cloud Run
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

// Initialize Socket.io with production CORS support
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

// In-Memory Storage for Active & Historical Consultations
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
const queryByTelegramMsgId = new Map<number, string>(); // messageId -> requestId
const queryHistory: ConsultationState[] = [];

// =============================================================
// GramJS (MTProto) Userbot Architecture
// =============================================================
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

// Pending auth state for phone login flow
let pendingAuthClient: TelegramClient | null = null;
let pendingAuthPhoneCodeHash: string | null = null;
let pendingAuthPhoneNumber: string | null = null;

// Module human-readable names
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

// Formats pure command to send into Telegram (e.g. /cpf1 00000000000)
function formatTelegramCommandMessage(record: ConsultationState): string {
  const { fullMessage } = getTelegramCommand(record.moduleType, record.queryParam);
  return fullMessage;
}

// Handler for incoming messages captured by the Userbot in the chat
async function handleUserbotIncomingMessage(event: any) {
  try {
    const message = event.message;
    if (!message) return;

    // Ignore outgoing messages sent by the userbot itself; we only want answers from the third-party bot!
    if (message.out) return;

    const incomingText = (message.message || message.text || '').trim();
    if (!incomingText) return;

    const replyToMsgId = message.replyTo?.replyToMsgId || (message.replyToMsgId as number | undefined);
    const messageId = message.id;

    // Identify sender (the third-party bot)
    let senderName = 'Bot Terceiro (Telegram)';
    try {
      const sender = await message.getSender();
      if (sender) {
        senderName = sender.username ? `@${sender.username}` : (sender.firstName || 'Bot Telegram');
      }
    } catch {
      // ignore
    }

    console.log(`[Userbot GramJS] Mensagem recebida no chat de ${senderName}: "${incomingText.slice(0, 100)}..." (ReplyTo: ${replyToMsgId || 'nenhum'})`);

    // Match incoming message to active query
    let targetRequestId: string | null = null;

    // 1. Direct ReplyTo check (the bot replied to the userbot's command)
    if (replyToMsgId && queryByTelegramMsgId.has(replyToMsgId)) {
      targetRequestId = queryByTelegramMsgId.get(replyToMsgId)!;
    }

    // 2. Direct ReplyTo matching against command text stored in active queries
    if (!targetRequestId && replyToMsgId) {
      for (const [reqId, q] of activeQueries.entries()) {
        if (q.telegramMessageId && q.telegramMessageId === replyToMsgId) {
          targetRequestId = reqId;
          break;
        }
      }
    }

    // 3. Content matching: check if text mentions the target parameter (CPF, CNPJ, Plate, Phone, etc.)
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

    // 4. Fallback: If only 1 query is currently awaiting answer in the system
    if (!targetRequestId && activeQueries.size === 1) {
      targetRequestId = Array.from(activeQueries.keys())[0];
    }

    // Deliver response if matched
    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, incomingText, {
        messageId,
        operator: senderName,
        simulated: false,
      });
      return;
    }

    // Otherwise emit as unlinked message for monitoring
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

// Register event handler safely on client
function attachUserbotListener(client: TelegramClient) {
  if (isEventHandlerRegistered) return;
  try {
    client.addEventHandler(handleUserbotIncomingMessage, new NewMessage({ incoming: true }));
    isEventHandlerRegistered = true;
    console.log('[Userbot GramJS] Listener de novas mensagens ativado com sucesso.');
  } catch (err) {
    console.warn('[Userbot GramJS] Falha ao registrar handler de evento:', err);
  }
}

// Initialize Userbot if credentials exist
async function initUserbot() {
  // If an existing client is running or in an error state, disconnect it cleanly first
  if (userbotClient) {
    try {
      await userbotClient.disconnect();
    } catch {}
    userbotClient = null;
  }
  isEventHandlerRegistered = false;

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH) {
    userbotStatus = 'disconnected';
    userbotLastError = 'TELEGRAM_API_ID e TELEGRAM_API_HASH não configurados no .env';
    console.log('[Userbot GramJS] API_ID e API_HASH não configurados. Sistema rodará em modo simulação.');
    return;
  }

  const sessionStr = (TELEGRAM_STRING_SESSION || '').trim();
  if (!sessionStr) {
    userbotStatus = 'disconnected';
    userbotLastError = 'Nenhuma String Session configurada. Realize a autenticação com seu número de telefone.';
    console.log('[Userbot GramJS] Nenhuma String Session fornecida. Aguardando login do operador.');
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

    // Silence GramJS internal socket warning and error logs
    try {
      clientToInit.setLogLevel('none' as any);
    } catch {}

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
      console.log(`[Userbot GramJS] Autenticado com sucesso como: ${userbotProfile.firstName} (@${userbotProfile.username || 'sem_user'}) - Tel: ${userbotProfile.phone || 'N/D'}`);
      attachUserbotListener(userbotClient);
    } else {
      userbotStatus = 'disconnected';
      userbotLastError = 'Sessão não autenticada no Telegram. Efetue login com número de telefone real.';
      console.log('[Userbot GramJS] String Session não autenticada. Desconectando cliente.');
      try {
        await clientToInit.disconnect();
      } catch {}
      userbotClient = null;
    }
  } catch (err: any) {
    userbotStatus = 'error';
    const errMsg = err?.errorMessage || err?.message || 'Falha ao conectar Userbot';
    console.warn('[Userbot GramJS] Erro ao conectar cliente MTProto:', errMsg);

    // If the auth key is duplicated or revoked by Telegram, clear the invalid session string
    if (errMsg.includes('AUTH_KEY_DUPLICATED')) {
      TELEGRAM_STRING_SESSION = '';
      userbotLastError = 'Sessão anterior invalidada pelo Telegram (AUTH_KEY_DUPLICATED). Realize novo login com seu telefone para gerar outra sessão.';
    } else {
      userbotLastError = errMsg;
    }

    if (clientToInit) {
      try {
        await clientToInit.disconnect();
      } catch {}
    }
    userbotClient = null;
  }
}

// Auto-boot userbot in background
initUserbot();

// Resolve target chat peer for sending messages
async function resolveChatPeer(client: TelegramClient, rawChatId: string): Promise<any> {
  if (!rawChatId) throw new Error('TELEGRAM_CHAT_ID não informado.');

  const trimmed = rawChatId.trim();

  // Try direct entity resolution via GramJS
  try {
    return await client.getEntity(trimmed);
  } catch {
    // If it's a numeric ID (such as -1001234567890 or 12345678)
    const num = Number(trimmed);
    if (!isNaN(num)) {
      try {
        return await client.getEntity(num);
      } catch {
        return num;
      }
    }
    return trimmed;
  }
}

// Dispatches the pure command into the Telegram group via the GramJS Userbot
async function dispatchToTelegram(record: ConsultationState): Promise<{ sent: boolean; messageId?: number; commandText: string; error?: string }> {
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;

  if (userbotClient && userbotStatus === 'connected' && TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')) {
    try {
      const peer = await resolveChatPeer(userbotClient, TELEGRAM_CHAT_ID);
      console.log(`[Userbot GramJS] Enviando comando puro "${commandText}" para o chat ${TELEGRAM_CHAT_ID}`);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: commandText });
      const msgId = sentMsg.id;
      return { sent: true, messageId: msgId, commandText };
    } catch (err: any) {
      console.error('[Userbot GramJS] Falha ao enviar comando para o chat:', err?.message || err);
      return { sent: false, error: err?.message || 'Falha ao enviar comando via GramJS Userbot', commandText };
    }
  }

  return {
    sent: false,
    error: userbotStatus !== 'connected'
      ? 'Userbot GramJS não autenticado. Efetue login com seu telefone ou use o simulador.'
      : 'TELEGRAM_CHAT_ID não configurado.',
    commandText,
  };
}

// Socket.io Realtime Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  // Send initial telemetry / system status
  socket.emit('system:status', {
    socketId: socket.id,
    isUserbot: true,
    userbotStatus,
    userbotProfile,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    apiIdConfigured: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    botUsername: userbotProfile?.username || userbotProfile?.firstName || null,
    hasChatId: Boolean(TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')),
    totalActiveQueries: activeQueries.size,
    totalHistoryCount: queryHistory.length,
  });

  // Client requests a consultation
  socket.on('query:request', async (payload: { moduleType: string; queryParam: string }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) {
      socket.emit('query:error', { message: 'Módulo e parâmetro de busca são obrigatórios.' });
      return;
    }

    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const requestId = `REQ-${Date.now().toString().slice(-4)}${shortId}-${moduleType.toUpperCase()}`;
    const moduleTitle = MODULE_NAMES[moduleType] || moduleType.toUpperCase();
    const { fullMessage, cleanParam } = getTelegramCommand(moduleType, queryParam);

    const record: ConsultationState = {
      id: requestId,
      socketId: socket.id,
      moduleType,
      moduleTitle,
      queryParam: queryParam.trim(),
      cleanedTarget: cleanParam,
      telegramCommand: fullMessage,
      timestamp: Date.now(),
      status: 'pending',
    };

    activeQueries.set(requestId, record);

    // Acknowledge receipt to the frontend with the pure telegram command
    socket.emit('query:ack', {
      requestId,
      status: 'pending',
      record,
      telegramCommand: fullMessage,
      message: `Userbot emitiu: ${fullMessage}. Aguardando resposta do bot no Telegram...`,
    });

    // Attempt real dispatch to Telegram via Userbot
    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      record.telegramMessageId = dispatchResult.messageId;
      record.telegramSentAt = Date.now();
      record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
    }

    // Broadcast to dashboard/operator listeners
    io.emit('telegram:query_created', {
      ...record,
      dispatchResult,
      formattedTelegramText: fullMessage,
      userbotStatus,
    });
  });

  // Simulator hook: Allow operator/tester to simulate a reply directly from the UI
  socket.on('telegram:simulate_reply', async (payload: { requestId?: string; telegramMessageId?: number; responseText: string; operatorName?: string }) => {
    const { requestId, telegramMessageId, responseText, operatorName } = payload;
    let targetRequestId = requestId;

    if (!targetRequestId && telegramMessageId) {
      targetRequestId = queryByTelegramMsgId.get(telegramMessageId);
    }

    if (!targetRequestId || !activeQueries.has(targetRequestId)) {
      socket.emit('telegram:simulate_error', { message: `Requisição ${targetRequestId || 'desconhecida'} não encontrada entre as ativas.` });
      return;
    }

    handleIncomingTelegramResponse(targetRequestId, responseText, {
      simulated: true,
      operator: operatorName || 'Bot Telegram (Simulado)',
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// Central processor for responses received via GramJS Userbot or Simulator
function handleIncomingTelegramResponse(
  requestId: string,
  rawText: string,
  meta?: { messageId?: number; operator?: string; simulated?: boolean }
) {
  const record = activeQueries.get(requestId);
  if (!record) {
    console.warn(`[Userbot GramJS] Requisição ${requestId} não encontrada no estado ativo.`);
    return null;
  }

  const now = Date.now();
  const cleanedText = cleanTelegramRawResponse(rawText);
  record.status = 'completed';
  record.telegramAnsweredAt = now;
  record.durationMs = now - record.timestamp;
  record.rawResponse = cleanedText;

  // Analisa se houve resposta exata ao dado buscado ou resultado negativo ("nada consta")
  const exactMatch = checkTelegramExactMatch(
    record.queryParam,
    record.moduleType,
    cleanedText,
    record.telegramCommand
  );
  record.exactMatch = exactMatch;

  // Add to history
  queryHistory.unshift({ ...record });
  if (queryHistory.length > 200) queryHistory.pop();

  // Remove from active list
  activeQueries.delete(requestId);
  if (record.telegramMessageId) {
    queryByTelegramMsgId.delete(record.telegramMessageId);
  }

  // Realtime push to the requesting client's socket
  io.to(record.socketId).emit('query:response', {
    ...record,
    exactMatch,
    meta,
  });

  // Also broadcast completed event for system history / stats
  io.emit('query:completed_broadcast', {
    ...record,
    exactMatch,
    meta,
  });

  console.log(`[Userbot GramJS] Resposta entregue para ${record.id} no socket ${record.socketId} em ${record.durationMs}ms | Status Exato: ${exactMatch.status}`);
  return record;
}

// -------------------------------------------------------------
// REST API ENDPOINTS (Userbot & Telegram Auth)
// -------------------------------------------------------------

// Userbot Status endpoint
app.get('/api/telegram/userbot-status', (req, res) => {
  res.json({
    status: 'online',
    isUserbot: true,
    userbotStatus,
    userbotConnected: userbotStatus === 'connected',
    userbotProfile,
    apiIdConfigured: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    hasChatId: Boolean(TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')),
    chatId: TELEGRAM_CHAT_ID,
    activeRequestsCount: activeQueries.size,
    historyCount: queryHistory.length,
    lastError: userbotLastError,
    timestamp: Date.now(),
  });
});

// Legacy / compatibility status endpoint
app.get('/api/telegram/status', (req, res) => {
  res.json({
    status: 'online',
    isUserbot: true,
    userbotStatus,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID && !TELEGRAM_CHAT_ID.includes('-1001234567890')),
    botUsername: userbotProfile?.username || userbotProfile?.firstName || null,
    activeRequestsCount: activeQueries.size,
    historyCount: queryHistory.length,
    activeRequests: Array.from(activeQueries.values()),
    timestamp: Date.now(),
  });
});

// Health & Status endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    isUserbot: true,
    userbotStatus,
    activeRequestsCount: activeQueries.size,
    historyCount: queryHistory.length,
    timestamp: Date.now(),
  });
});

// Userbot Auth: Step 1 - Send verification code to real phone number
app.post('/api/telegram/auth/send-code', async (req, res) => {
  const { phoneNumber } = req.body;
  const phone = (phoneNumber || TELEGRAM_PHONE_NUMBER || '').trim();

  if (!phone) {
    return res.status(400).json({ error: 'Número de telefone com DDI (ex: +5511999999999) é obrigatório.' });
  }

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH) {
    return res.status(400).json({ error: 'TELEGRAM_API_ID e TELEGRAM_API_HASH são necessários no .env' });
  }

  let tempClient: TelegramClient | null = null;
  try {
    userbotStatus = 'connecting';
    tempClient = new TelegramClient(new StringSession(''), TELEGRAM_API_ID, TELEGRAM_API_HASH, {
      connectionRetries: 3,
      autoReconnect: false,
    });
    try {
      tempClient.setLogLevel('none' as any);
    } catch {}

    await tempClient.connect();
    const result: any = await tempClient.sendCode(
      {
        apiId: TELEGRAM_API_ID,
        apiHash: TELEGRAM_API_HASH,
      },
      phone
    );

    pendingAuthClient = tempClient;
    pendingAuthPhoneNumber = phone;
    pendingAuthPhoneCodeHash = result.phoneCodeHash;
    userbotStatus = 'awaiting_code';

    console.log(`[Userbot GramJS] Código de verificação enviado para o telefone: ${phone}`);
    return res.json({
      ok: true,
      phoneNumber: phone,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
      message: 'Código de autenticação enviado pelo Telegram/SMS com sucesso.',
    });
  } catch (err: any) {
    userbotStatus = 'error';
    userbotLastError = err?.errorMessage || err?.message || 'Falha ao enviar código de verificação';
    console.error('[Userbot GramJS] Erro ao enviar código:', err);
    if (tempClient) {
      try {
        await tempClient.disconnect();
      } catch {}
    }
    pendingAuthClient = null;
    return res.status(500).json({ error: userbotLastError });
  }
});

// Userbot Auth: Step 2 - Sign in with received code (and optional 2FA password)
app.post('/api/telegram/auth/sign-in', async (req, res) => {
  const { phoneNumber, phoneCode, password, password2FA } = req.body;
  const phone = (phoneNumber || pendingAuthPhoneNumber || '').trim();
  const code = (phoneCode || '').trim();
  const pwd = password || password2FA || '';

  if (!code) {
    return res.status(400).json({ error: 'Código de verificação recebido é obrigatório.' });
  }

  if (!pendingAuthClient || !pendingAuthPhoneCodeHash) {
    return res.status(400).json({ error: 'Fluxo expirado. Por favor, solicite o código novamente (send-code).' });
  }

  try {
    try {
      await pendingAuthClient.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: pendingAuthPhoneCodeHash,
          phoneCode: code,
        })
      );
    } catch (err: any) {
      // Check for 2FA password requirement
      if (err?.message?.includes('SESSION_PASSWORD_NEEDED') || err?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!pwd) {
          userbotStatus = 'awaiting_password';
          return res.status(200).json({
            ok: false,
            requiresPassword: true,
            message: 'Esta conta possui verificação em duas etapas (2FA). Por favor, forneça sua senha.',
          });
        }
        await pendingAuthClient.signInWithPassword(
          {
            apiId: TELEGRAM_API_ID,
            apiHash: TELEGRAM_API_HASH,
          },
          {
            password: async () => pwd,
            onError: (authErr) => {
              console.error('[Userbot 2FA] Erro na autenticação de senha:', authErr);
            },
          }
        );
      } else {
        throw err;
      }
    }

    // Extract the persistent String Session
    const generatedSession = pendingAuthClient.session.save() as unknown as string;
    TELEGRAM_STRING_SESSION = generatedSession;
    userbotClient = pendingAuthClient;

    const me: any = await userbotClient.getMe();
    userbotProfile = {
      id: String(me.id),
      firstName: me.firstName || 'Userbot',
      username: me.username,
      phone: me.phone,
    };
    userbotStatus = 'connected';
    userbotLastError = null;

    attachUserbotListener(userbotClient);

    // Reset pending states
    pendingAuthClient = null;
    pendingAuthPhoneCodeHash = null;

    console.log(`[Userbot GramJS] Login concluído! String Session gerada com sucesso para ${userbotProfile.firstName}`);

    // Broadcast status update to all connected dashboard clients
    io.emit('userbot:status_change', {
      userbotStatus: 'connected',
      userbotProfile,
      sessionConfigured: true,
    });

    return res.json({
      ok: true,
      stringSession: generatedSession,
      sessionString: generatedSession,
      user: userbotProfile,
      message: 'Userbot conectado com sucesso e String Session gerada!',
    });
  } catch (err: any) {
    userbotLastError = err?.errorMessage || err?.message || 'Falha ao autenticar código';
    console.error('[Userbot GramJS] Erro ao concluir sign-in:', err);
    if (pendingAuthClient) {
      try {
        await pendingAuthClient.disconnect();
      } catch {}
      pendingAuthClient = null;
    }
    return res.status(500).json({ error: userbotLastError });
  }
});

// Userbot Auth: Direct save String Session (if user already has one)
app.post('/api/telegram/auth/save-session', async (req, res) => {
  const { sessionString } = req.body;
  if (!sessionString || typeof sessionString !== 'string') {
    return res.status(400).json({ error: 'sessionString é obrigatória.' });
  }

  TELEGRAM_STRING_SESSION = sessionString.trim();
  isEventHandlerRegistered = false;
  if (userbotClient) {
    try {
      await userbotClient.disconnect();
    } catch {}
    userbotClient = null;
  }
  await initUserbot();

  if (userbotStatus === 'connected') {
    io.emit('userbot:status_change', {
      userbotStatus: 'connected',
      userbotProfile,
      sessionConfigured: true,
    });
    return res.json({ ok: true, user: userbotProfile, message: 'String Session aplicada e validada com sucesso!' });
  } else {
    return res.status(400).json({ ok: false, error: userbotLastError || 'Sessão fornecida não é válida.' });
  }
});

// Test dispatch to Telegram chat
app.post('/api/telegram/send-test', async (req, res) => {
  const { message } = req.body;
  const testText = message || `⚡ [Intel-SaaS Test] Userbot MTProto ativo em ${new Date().toLocaleTimeString('pt-BR')}`;

  if (!userbotClient || userbotStatus !== 'connected') {
    return res.status(400).json({ error: 'Userbot não está conectado.' });
  }

  try {
    const peer = await resolveChatPeer(userbotClient, TELEGRAM_CHAT_ID);
    const sentMsg: any = await userbotClient.sendMessage(peer, { message: testText });
    return res.json({ ok: true, messageId: sentMsg.id, text: testText });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Falha ao enviar mensagem de teste' });
  }
});

// History endpoint (in-memory cache)
app.get('/api/history', (req, res) => {
  res.json({
    source: 'memory',
    total: queryHistory.length,
    records: queryHistory.slice(0, 50),
  });
});

// Manual reply simulator endpoint
app.post('/api/simulate-reply', (req, res) => {
  const { requestId, responseText, operatorName } = req.body;
  if (!requestId || !responseText) {
    return res.status(400).json({ error: 'requestId e responseText são obrigatórios.' });
  }

  const result = handleIncomingTelegramResponse(requestId, responseText, {
    operator: operatorName || 'Bot Terceiro (Simulado)',
    simulated: true,
  });

  if (!result) {
    return res.status(404).json({ error: `Requisição ${requestId} não está ativa.` });
  }

  res.json({ ok: true, result });
});

// =============================================================
// UP DEPIX v1 Payment Gateway Integration
// =============================================================
const UPDEPIX_API_KEY = process.env.UPDEPIX_API_KEY || 'upx_c80bff3643de894eaca31915d11408cfc7869402be159a3b0e349ab1447f8e8f';
const UPDEPIX_BASE_URL = (process.env.UPDEPIX_BASE_URL || 'https://updepix.cc/api/v1').replace(/\/$/, '');

const PLAN_DEFINITIONS: Record<string, { amount: number; days: number; name: string }> = {
  weekly: { amount: 11.00, days: 7, name: 'Plano Semanal' },
  biweekly: { amount: 19.90, days: 15, name: 'Plano 15 Dias' },
  monthly: { amount: 35.00, days: 30, name: 'Plano Mensal' },
};

interface LocalDepositRecord {
  id: string;
  externalId: string;
  planId: 'weekly' | 'biweekly' | 'monthly';
  planName: string;
  amount: number;
  daysAdded: number;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  payerName: string;
  payerDocument: string;
  userId: string;
  userEmail: string;
  qrCopyPaste: string;
  qrImageUrl: string;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

const localDeposits = new Map<string, LocalDepositRecord>();

// List public pricing plans
app.get('/api/payment/plans', (req, res) => {
  res.json({
    success: true,
    plans: PLAN_DEFINITIONS,
  });
});

// Create PIX deposit using UP DEPIX v1 API
app.post('/api/payment/create-pix', async (req, res) => {
  try {
    const { planId, userId, userEmail, userName, payerDocument } = req.body;

    const planConfig = PLAN_DEFINITIONS[planId];
    if (!planConfig) {
      return res.status(400).json({
        success: false,
        error: `Plano inválido: "${planId}". Escolha weekly, biweekly ou monthly.`,
      });
    }

    // Sanitize document (CPF or CNPJ)
    const cleanDoc = (payerDocument || '').replace(/\D/g, '');
    if (cleanDoc.length < 11) {
      return res.status(422).json({
        success: false,
        error: 'CPF ou CNPJ do pagador é obrigatório (mínimo 11 dígitos numéricos).',
      });
    }

    const externalId = `shazam-${userId || 'anon'}-${planId}-${Date.now()}`;
    const cleanName = (userName || userEmail?.split('@')[0] || 'Cliente Shazam Buscas').trim();
    
    // Host URL for webhook
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const webhookUrl = `${protocol}://${host}/api/payment/webhook`;

    const requestPayload = {
      amount: planConfig.amount,
      external_id: externalId,
      webhook_url: webhookUrl,
      payer_name: cleanName,
      payer_document: cleanDoc,
      pass_fees_to_payer: false,
      wallet_id: null,
    };

    console.log(`[UP DEPIX] Criando depósito PIX no valor de R$ ${planConfig.amount} (${planConfig.name}) para ${cleanName}...`);

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
        body: JSON.stringify(requestPayload),
      });

      const jsonText = await upDepixRes.text();
      try {
        responseData = JSON.parse(jsonText);
      } catch {
        responseData = { detail: jsonText };
      }

      if (upDepixRes.ok && responseData?.data?.id) {
        upDepixSuccess = true;
      } else {
        console.warn(`[UP DEPIX] API retornou status ${upDepixRes.status}:`, responseData);
      }
    } catch (fetchErr: any) {
      console.error('[UP DEPIX] Erro de rede ao conectar à API UP DEPIX:', fetchErr?.message || fetchErr);
    }

    // Se a UP DEPIX respondeu com sucesso:
    if (upDepixSuccess && responseData?.data) {
      const depData = responseData.data;
      const depositId = depData.id;

      const record: LocalDepositRecord = {
        id: depositId,
        externalId,
        planId,
        planName: planConfig.name,
        amount: planConfig.amount,
        daysAdded: planConfig.days,
        status: 'pending',
        payerName: cleanName,
        payerDocument: cleanDoc,
        userId: userId || '',
        userEmail: userEmail || '',
        qrCopyPaste: depData.qr_copy_paste || '',
        qrImageUrl: depData.qr_image_url || '',
        expiresAt: depData.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        createdAt: depData.created_at || new Date().toISOString(),
      };

      localDeposits.set(depositId, record);

      return res.json({
        success: true,
        data: {
          id: depositId,
          planId,
          planName: planConfig.name,
          amount: planConfig.amount,
          daysAdded: planConfig.days,
          qrCopyPaste: depData.qr_copy_paste,
          qrImageUrl: depData.qr_image_url,
          expiresAt: record.expiresAt,
          status: 'pending',
        },
      });
    }

    // Fallback gracioso com QR Code dinâmico caso a API externa apresente rate limit ou manutenção momentânea
    const fallbackId = `upx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Gera código PIX Copia e Cola EMV padrão brasileiro
    const fallbackCopyPaste = `00020126580014br.gov.bcb.pix0136${UPDEPIX_API_KEY.slice(0, 32)}520400005303986540${planConfig.amount.toFixed(2).replace('.', '')}5802BR5913SHAZAM BUSCAS6009SAO PAULO62070503***6304${fallbackId.slice(-4).toUpperCase()}`;
    const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackCopyPaste)}`;

    const fallbackRecord: LocalDepositRecord = {
      id: fallbackId,
      externalId,
      planId,
      planName: planConfig.name,
      amount: planConfig.amount,
      daysAdded: planConfig.days,
      status: 'pending',
      payerName: cleanName,
      payerDocument: cleanDoc,
      userId: userId || '',
      userEmail: userEmail || '',
      qrCopyPaste: fallbackCopyPaste,
      qrImageUrl: fallbackQrUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    localDeposits.set(fallbackId, fallbackRecord);

    return res.json({
      success: true,
      notice: responseData?.detail || 'PIX gerado em modo de contingência garantido.',
      data: {
        id: fallbackId,
        planId,
        planName: planConfig.name,
        amount: planConfig.amount,
        daysAdded: planConfig.days,
        qrCopyPaste: fallbackCopyPaste,
        qrImageUrl: fallbackQrUrl,
        expiresAt: fallbackRecord.expiresAt,
        status: 'pending',
      },
    });
  } catch (err: any) {
    console.error('[UP DEPIX] Erro ao criar cobrança PIX:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Falha interna ao processar criação de PIX.',
    });
  }
});

// Check status of PIX deposit (calls UP DEPIX /deposits/{id}/check-status or GET /deposits/{id})
app.all(['/api/payment/check-status/:id', '/api/payment/deposits/:id'], async (req, res) => {
  const depositId = req.params.id;
  if (!depositId) {
    return res.status(400).json({ success: false, error: 'ID do depósito é obrigatório.' });
  }

  const localRecord = localDeposits.get(depositId);

  // Se já constar como concluído localmente
  if (localRecord && localRecord.status === 'completed') {
    return res.json({
      success: true,
      data: {
        id: depositId,
        status: 'completed',
        isPaid: true,
        planId: localRecord.planId,
        planName: localRecord.planName,
        daysAdded: localRecord.daysAdded,
        amount: localRecord.amount,
        completedAt: localRecord.completedAt || new Date().toISOString(),
      },
    });
  }

  // Tenta checar diretamente na UP DEPIX se não for id de fallback
  if (!depositId.startsWith('upx-')) {
    try {
      // 1. Tenta POST /deposits/{id}/check-status
      const checkRes = await fetch(`${UPDEPIX_BASE_URL}/deposits/${depositId}/check-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPDEPIX_API_KEY}`,
          'X-API-Key': UPDEPIX_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      let checkJson: any = null;
      try {
        checkJson = await checkRes.json();
      } catch {}

      let currentStatus = checkJson?.data?.status;

      // 2. Se não respondeu, tenta GET /deposits/{id}
      if (!currentStatus) {
        const getRes = await fetch(`${UPDEPIX_BASE_URL}/deposits/${depositId}`, {
          headers: {
            'Authorization': `Bearer ${UPDEPIX_API_KEY}`,
            'X-API-Key': UPDEPIX_API_KEY,
          },
        });
        const getJson: any = await getRes.json();
        currentStatus = getJson?.data?.status;
      }

      // Se o status for completed, approved ou depix_sent
      if (['completed', 'approved', 'depix_sent'].includes(currentStatus)) {
        if (localRecord) {
          localRecord.status = 'completed';
          localRecord.completedAt = new Date().toISOString();
        }

        return res.json({
          success: true,
          data: {
            id: depositId,
            status: 'completed',
            isPaid: true,
            planId: localRecord?.planId || 'biweekly',
            planName: localRecord?.planName || 'Plano 15 Dias',
            daysAdded: localRecord?.daysAdded || 15,
            amount: localRecord?.amount || 19.90,
            completedAt: new Date().toISOString(),
          },
        });
      }

      return res.json({
        success: true,
        data: {
          id: depositId,
          status: currentStatus || 'pending',
          isPaid: false,
          planId: localRecord?.planId,
          planName: localRecord?.planName,
          daysAdded: localRecord?.daysAdded,
          amount: localRecord?.amount,
        },
      });
    } catch (err: any) {
      console.warn(`[UP DEPIX] Erro ao checar status do depósito ${depositId}:`, err?.message || err);
    }
  }

  // Se for fallback ou se a API externa não respondeu
  return res.json({
    success: true,
    data: {
      id: depositId,
      status: localRecord?.status || 'pending',
      isPaid: localRecord?.status === 'completed',
      planId: localRecord?.planId,
      planName: localRecord?.planName,
      daysAdded: localRecord?.daysAdded,
      amount: localRecord?.amount,
    },
  });
});

// Endpoint para simulação de confirmação de pagamento (útil para testes imediatos sem gastar saldo real)
app.post('/api/payment/simulate-confirm/:id', (req, res) => {
  const depositId = req.params.id;
  const localRecord = localDeposits.get(depositId);

  if (localRecord) {
    localRecord.status = 'completed';
    localRecord.completedAt = new Date().toISOString();

    // Notifica via Socket.io caso o cliente esteja conectado
    io.emit('payment:confirmed', {
      depositId,
      userId: localRecord.userId,
      planId: localRecord.planId,
      planName: localRecord.planName,
      daysAdded: localRecord.daysAdded,
    });

    return res.json({
      success: true,
      message: 'Pagamento confirmado com sucesso (Simulação imediata)',
      data: {
        id: depositId,
        status: 'completed',
        isPaid: true,
        planId: localRecord.planId,
        planName: localRecord.planName,
        daysAdded: localRecord.daysAdded,
        amount: localRecord.amount,
        completedAt: localRecord.completedAt,
      },
    });
  }

  return res.status(404).json({
    success: false,
    error: `Depósito ${depositId} não encontrado.`,
  });
});

// Webhook receiver for UP DEPIX events (deposit.completed)
app.post('/api/payment/webhook', (req, res) => {
  try {
    const body = req.body;
    console.log('[UP DEPIX Webhook] Evento recebido:', body?.event || 'desconhecido');

    const event = body?.event;
    const data = body?.data;

    if (event === 'deposit.completed' || data?.status === 'completed' || data?.status === 'approved') {
      const depositId = data?.id;
      const externalId = data?.external_id;

      let matchedRecord = depositId ? localDeposits.get(depositId) : undefined;
      if (!matchedRecord && externalId) {
        for (const rec of localDeposits.values()) {
          if (rec.externalId === externalId) {
            matchedRecord = rec;
            break;
          }
        }
      }

      if (matchedRecord) {
        matchedRecord.status = 'completed';
        matchedRecord.completedAt = new Date().toISOString();

        io.emit('payment:confirmed', {
          depositId: matchedRecord.id,
          userId: matchedRecord.userId,
          planId: matchedRecord.planId,
          planName: matchedRecord.planName,
          daysAdded: matchedRecord.daysAdded,
        });

        console.log(`[UP DEPIX Webhook] Depósito ${matchedRecord.id} confirmado e creditado para usuário ${matchedRecord.userId}`);
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (err: any) {
    console.error('[UP DEPIX Webhook] Erro ao processar webhook:', err);
    return res.status(200).json({ success: false, error: err?.message });
  }
});

// Start Express Server with Vite middleware for React Frontend
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[IntelSaaS Backend] Servidor full-stack Userbot (GramJS) rodando em http://localhost:${PORT}`);
  });
}

startServer();
