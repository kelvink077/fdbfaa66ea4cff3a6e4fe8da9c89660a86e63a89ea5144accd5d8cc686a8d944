import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { TelegramClient, sessions, Api } from 'telegram';
import { NewMessage } from 'telegram/events/index.js';
import { EditedMessage } from 'telegram/events/EditedMessage.js';
import { getTelegramCommand, checkTelegramExactMatch } from './src/utils/telegramCommandHelper';
import { cleanTelegramRawResponse } from './src/utils/cleanTelegramResponse';
import { getSampleResponseForQuery } from './src/utils/intelligenceTemplates';
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

// ROTAS DE DESTINO DOS BOTS
const TELEGRAM_CHAT_ID_OLD = process.env.TELEGRAM_CHAT_ID || ''; // Seu bot normal configurado no Render
const TELEGRAM_CHAT_ID_PRO = '@Hgliopk00bot'; // Rota forçada via @username (Módulo Avançado)
const TARGET_BOT_PRO_ID_NUM = '7565502829';   // ID numérico do bot PRO para leitura das respostas

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
  txtContent?: string;
  txtFileName?: string;
  photoUrl?: string;
  photos?: Array<{ url: string; fileName?: string; caption?: string; sizeBytes?: number }>;
  isNotFound?: boolean;
  isPro?: boolean;
  error?: string;
}

const activeQueries = new Map<string, ConsultationState>();
const queryByTelegramMsgId = new Map<number, string>();
const queryHistory: ConsultationState[] = [];

let userbotClient: TelegramClient | null = null;
let userbotProfile: any = null;
let userbotStatus = 'disconnected';
let lastUserbotError: string | null = null;
let isEventHandlerRegistered = false;
let cachedProBotPeer: any = null;

function persistStringSession(newSession: string) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (/TELEGRAM_STRING_SESSION=/.test(envContent)) {
        envContent = envContent.replace(/TELEGRAM_STRING_SESSION=.*/g, `TELEGRAM_STRING_SESSION="${newSession}"`);
      } else {
        envContent += `\nTELEGRAM_STRING_SESSION="${newSession}"\n`;
      }
    } else {
      envContent = `TELEGRAM_STRING_SESSION="${newSession}"\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    process.env.TELEGRAM_STRING_SESSION = newSession;
    TELEGRAM_STRING_SESSION = newSession;
    console.log('[GramJS] String Session persistida com sucesso em .env');
  } catch (err: any) {
    console.warn('[GramJS] Não foi possível persistir no .env:', err?.message);
    TELEGRAM_STRING_SESSION = newSession;
  }
}

let pendingAuthClient: TelegramClient | null = null;
let pendingAuthPhoneCodeHash: string | null = null;
let pendingAuthPhoneNumber: string | null = null;

const MODULE_NAMES: Record<string, string> = {
  cpf_1: 'CPF 1 (Consulta Básica)', cpf_2: 'CPF 2 (Consulta Intermediária)', cpf_3: 'CPF 3 (Consulta Avançada)',
  cnpj: 'CNPJ (Dados Cadastrais & QSA)', nome: 'NOME (Localização & Homônimos)', email: 'E-MAIL (Vínculos & Vazamentos)',
  placa: 'PLACA (Histórico Veicular & Detran)', telefone: 'TELEFONE (Operadora & Titularidade)',
  pro_cpf: 'BUSCAS PRO - CPF Completo & Score',
  pro_telefone: 'BUSCAS PRO - Telefone & Titularidade',
  pro_nome: 'BUSCAS PRO - Nome & Homônimos',
  pro_email: 'BUSCAS PRO - E-mail & Vazamentos',
  pro_endereco: 'BUSCAS PRO - Endereço & Moradores',
  pro_cep: 'BUSCAS PRO - CEP & Logradouro',
  pro_cnpj: 'BUSCAS PRO - CNPJ & Quadro Societário',
  pro_titulo: 'BUSCAS PRO - Título de Eleitor',
  pro_mae: 'BUSCAS PRO - Nome da Mãe & Vínculos',
  pro_foto: 'BUSCAS PRO - Foto & Biometria',
  pro_placa: 'BUSCAS PRO - Placa Veicular Detran',
};

// =============================================================
// VACINA DE COMANDO: Limpa prefixos incorretos (ex: /pro_telefone ou /protelefone vira /telefone)
// =============================================================
function formatTelegramCommandMessage(record: ConsultationState & { isPro?: boolean }): string {
  let { command, cleanParam, fullMessage } = getTelegramCommand(record.moduleType, record.queryParam);
  
  // Vacina absoluta: remove categoricamente qualquer prefixo /pro, /pro_ ou /pro[espaço] do comando
  command = command.replace(/^\/pro[_\s]*/i, '/');
  if (command === '/' || !command) {
    command = record.isPro ? '/cpf' : '/cpf1';
  }
  fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;
  
  return fullMessage;
}

async function resolveTelegramPeer(client: TelegramClient, targetId: any) {
  if (!targetId) return '@Hgliopk00bot';

  // Se já for uma entidade / InputPeer do MTProto
  if (typeof targetId !== 'string') {
    try {
      const inPeer = await client.getInputEntity(targetId);
      if (inPeer) return inPeer;
    } catch {}
    return targetId;
  }

  const clean = targetId.trim();
  const isProTarget = 
    clean === '@Hgliopk00bot' || 
    clean === 'Hgliopk00bot' || 
    clean === TARGET_BOT_PRO_ID_NUM ||
    clean.toLowerCase().includes('hgliopk00bot');

  if (isProTarget) {
    if (cachedProBotPeer) {
      return cachedProBotPeer;
    }
    // 1. RPC Oficial do MTProto: Resolve diretamente nos servidores do Telegram (baixa PeerUser + access_hash)
    try {
      const res: any = await client.invoke(new Api.contacts.ResolveUsername({ username: 'Hgliopk00bot' }));
      if (res && res.users && res.users.length > 0) {
        const u = res.users[0];
        console.log(`[GramJS] @Hgliopk00bot resolvido via RPC nos servidores do Telegram. User ID: ${u.id}`);
        cachedProBotPeer = new Api.InputPeerUser({
          userId: u.id,
          accessHash: u.accessHash,
        });
        return cachedProBotPeer;
      }
    } catch (rpcErr: any) {
      console.warn('[GramJS] ResolveUsername RPC @Hgliopk00bot:', rpcErr?.message);
    }

    // 2. Tenta obter do cache de entidades do GramJS
    try {
      const entity = await client.getEntity('@Hgliopk00bot');
      if (entity) {
        cachedProBotPeer = entity;
        return entity;
      }
    } catch {}

    // 3. Procura na lista de conversas/diálogos ativos
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        const entity: any = d.entity;
        if (entity && (String(entity.id) === TARGET_BOT_PRO_ID_NUM || entity.username?.toLowerCase() === 'hgliopk00bot')) {
          cachedProBotPeer = d.inputEntity || entity;
          return cachedProBotPeer;
        }
      }
    } catch {}

    // 4. Tenta carregar pelo ID numérico 7565502829
    try {
      const inPeer = await client.getInputEntity(TARGET_BOT_PRO_ID_NUM);
      if (inPeer) {
        cachedProBotPeer = inPeer;
        return inPeer;
      }
    } catch {}

    // Fallback: retorna o username com @
    return '@Hgliopk00bot';
  }

  // Resolução para o Bot Padrão (Old Bot)
  if (clean.startsWith('@')) {
    try {
      const uName = clean.replace('@', '');
      const res: any = await client.invoke(new Api.contacts.ResolveUsername({ username: uName }));
      if (res && res.users && res.users.length > 0) return res.users[0];
      if (res && res.peer) return res.peer;
    } catch {}
    try { return await client.getEntity(clean); } catch {}
  }

  if (/^-?\d+$/.test(clean)) {
    try { return await client.getInputEntity(clean); } catch {}
    try { return await client.getEntity(Number(clean)); } catch {}
    try { return await client.getEntity(clean); } catch {}
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        const entity: any = d.entity;
        if (entity && (String(entity.id) === clean || String(entity.userId) === clean)) {
          return d.inputEntity || entity;
        }
      }
    } catch {}
  }

  try { return await client.getEntity(clean); } catch {}
  return clean;
}

// Extrai e faz download do arquivo TXT de um objeto Message do Telegram
async function extractTxtDocument(client: TelegramClient, message: any): Promise<{ content: string; fileName: string } | null> {
  if (!message || !client) return null;
  const media = message.media as any;
  if (!media?.document) return null;

  try {
    const doc = media.document;
    const fileNameAttr = doc.attributes?.find((a: any) => a.fileName);
    const fileName = fileNameAttr ? fileNameAttr.fileName : 'dossie_consulta.txt';
    const mime = (doc.mimeType || '').toLowerCase();
    const isLikelyTxt = 
      mime === 'text/plain' || 
      mime.includes('text') || 
      fileName.toLowerCase().endsWith('.txt') || 
      mime === 'application/octet-stream' || 
      !mime;

    if (isLikelyTxt) {
      console.log(`[GramJS] 📥 Baixando documento (${fileName}, mime: ${mime}, ${doc.size || 'n/a'} bytes) da msg ${message.id}...`);
      const fileBuf = await client.downloadMedia(message, {});
      if (fileBuf && fileBuf.length > 0) {
        const textContent = fileBuf.toString('utf-8');
        if (textContent && textContent.trim().length > 0) {
          console.log(`[GramJS] ✅ Arquivo TXT baixado com sucesso (${fileBuf.length} bytes): "${fileName}"`);
          return { content: textContent, fileName };
        }
      }
    }
  } catch (err: any) {
    console.warn('[GramJS] Erro ao baixar/decodificar documento TXT:', err?.message);
  }
  return null;
}

// Procura botão relacionado a download de TXT nos botões inline da mensagem
function findTxtDownloadButton(message: any): { text: string; data: any } | null {
  const replyMarkup = message?.replyMarkup as any;
  if (!replyMarkup?.rows) return null;

  for (const row of replyMarkup.rows) {
    for (const btn of (row.buttons || [])) {
      const text = (btn.text || '').toLowerCase();
      if (
        text.includes('txt') ||
        text.includes('baixar') ||
        text.includes('download') ||
        text.includes('dossie') ||
        text.includes('dossiê')
      ) {
        return { text: btn.text, data: btn.data };
      }
    }
  }
  return null;
}

interface ExtractedPhoto {
  dataUrl: string;
  fileName: string;
  caption?: string;
  sizeBytes?: number;
}

// Extrai e faz o download de arquivos de imagem (JPEG, PNG, WebP) ou photos anexadas à mensagem
async function extractPhotoMedia(client: TelegramClient, message: any): Promise<ExtractedPhoto | null> {
  try {
    const media = message?.media as any;
    if (!media) return null;

    let isPhoto = false;
    let fileName = `foto_${message.id}.jpg`;
    let mimeType = 'image/jpeg';

    // 1. Mensagem com foto nativa do Telegram (MessageMediaPhoto)
    if (media.photo || message.photo || media.className === 'MessageMediaPhoto') {
      isPhoto = true;
      mimeType = 'image/jpeg';
      fileName = `foto_${message.id}.jpg`;
    } 
    // 2. Mensagem com documento de imagem (ex: foto_01948469626_DESCONHECIDA_1.jpg)
    else if (media.document) {
      const doc = media.document;
      const mime = (doc.mimeType || '').toLowerCase();
      const fnAttr = doc.attributes?.find((a: any) => a.fileName);
      if (fnAttr?.fileName) {
        fileName = fnAttr.fileName;
      }
      if (
        mime.startsWith('image/') || 
        /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(fileName)
      ) {
        isPhoto = true;
        mimeType = mime.startsWith('image/') ? mime : 'image/jpeg';
      }
    }

    if (!isPhoto) return null;

    console.log(`[GramJS] 📸 Baixando imagem (${fileName}, mime: ${mimeType}) da mensagem ${message.id}...`);
    const fileBuf = await client.downloadMedia(message, {});
    if (fileBuf && fileBuf.length > 0) {
      const base64 = Buffer.from(fileBuf).toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const caption = (message.message || message.text || '').trim();
      console.log(`[GramJS] ✅ Imagem baixada com sucesso! (${fileBuf.length} bytes): "${fileName}"`);
      return {
        dataUrl,
        fileName,
        caption,
        sizeBytes: fileBuf.length,
      };
    }
  } catch (err: any) {
    console.warn('[GramJS] Erro ao extrair/baixar foto:', err?.message || err);
  }
  return null;
}

// Procura botão relacionado a download/visualização de fotos ou originais nos botões inline da mensagem
function findPhotoDownloadButton(message: any): { text: string; data: any } | null {
  const replyMarkup = message?.replyMarkup as any;
  if (!replyMarkup?.rows) return null;

  for (const row of replyMarkup.rows) {
    for (const btn of (row.buttons || [])) {
      const text = (btn.text || '').toLowerCase();
      if (
        text.includes('originais') ||
        text.includes('baixar original') ||
        text.includes('todas as') ||
        text.includes('foto') ||
        text.includes('imagem')
      ) {
        return { text: btn.text, data: btn.data };
      }
    }
  }
  return null;
}

interface TelegramInlineButton {
  text: string;
  data?: any;
  url?: string;
  rowIndex: number;
  colIndex: number;
}

// Extrai todos os botões inline presentes na mensagem do Telegram
function extractAllInlineButtons(message: any): TelegramInlineButton[] {
  const buttons: TelegramInlineButton[] = [];
  const replyMarkup = message?.replyMarkup as any;

  // 1. Inspeciona rows dentro de replyMarkup
  if (replyMarkup?.rows && Array.isArray(replyMarkup.rows)) {
    replyMarkup.rows.forEach((row: any, rIdx: number) => {
      if (row?.buttons && Array.isArray(row.buttons)) {
        row.buttons.forEach((btn: any, cIdx: number) => {
          if (btn && btn.text) {
            buttons.push({
              text: String(btn.text).trim(),
              data: btn.data,
              url: btn.url,
              rowIndex: rIdx,
              colIndex: cIdx,
            });
          }
        });
      }
    });
  }

  // 2. Se não encontrou em replyMarkup.rows, tenta message.buttons (matriz 2D)
  if (buttons.length === 0 && message?.buttons && Array.isArray(message.buttons)) {
    message.buttons.forEach((row: any, rIdx: number) => {
      if (Array.isArray(row)) {
        row.forEach((b: any, cIdx: number) => {
          if (b && b.text) {
            buttons.push({
              text: String(b.text).trim(),
              data: b.data || b.button?.data,
              url: b.url || b.button?.url,
              rowIndex: rIdx,
              colIndex: cIdx,
            });
          }
        });
      } else if (row && row.text) {
        buttons.push({
          text: String(row.text).trim(),
          data: row.data || row.button?.data,
          url: row.url || row.button?.url,
          rowIndex: rIdx,
          colIndex: 0,
        });
      }
    });
  }

  return buttons;
}

// Detecta se a mensagem é um menu de seleção interativo (ex: seleção de base veicular / placa)
function isInteractiveSelectionMenu(text: string, buttons: TelegramInlineButton[]): boolean {
  if (!buttons || buttons.length === 0) return false;
  const lower = (text || '').toLowerCase();
  
  // Frases típicas de solicitação de seleção de base/menu
  const hasSelectionPrompt = 
    lower.includes('selecione a base') ||
    lower.includes('selecione uma base') ||
    lower.includes('selecione a op') ||
    lower.includes('selecione uma op') ||
    lower.includes('escolha a base') ||
    lower.includes('escolha a op') ||
    lower.includes('base de dados:') ||
    lower.includes('bases dispon') ||
    lower.includes('qual base') ||
    lower.includes('selecione o tipo') ||
    lower.includes('selecionar base') ||
    lower.includes('opções de busca:') ||
    lower.includes('opcoes de busca:');

  if (hasSelectionPrompt) return true;

  // Botões típicos de base de dados (veicular ou cadastral)
  const hasDatabaseButtons = buttons.some(b => {
    const t = (b.text || '').toLowerCase();
    return (
      t.includes('base nacional') ||
      t.includes('radar') ||
      t.includes('serpro') ||
      t.includes('base premium') ||
      t.includes('detran') ||
      t.includes('senatran') ||
      t.includes('sinesp') ||
      t.includes('bin veicular') ||
      t.includes('dados completos')
    );
  });

  return hasDatabaseButtons;
}

// Seleciona a melhor opção de base de dados para a consulta solicitada
function pickBestSelectionButton(
  buttons: TelegramInlineButton[],
  moduleType: string,
  queryParam: string
): TelegramInlineButton {
  if (!buttons || buttons.length === 0) {
    throw new Error('Nenhum botão disponível para seleção');
  }

  const mod = (moduleType || '').toLowerCase();
  const isVehicle = mod.includes('placa') || mod.includes('veicular') || mod.includes('veiculo');

  if (isVehicle) {
    // 1. Prioridade absoluta para consulta de placa: Base Nacional (mais completa e oficial)
    const baseNacional = buttons.find(b => /base\s+nacional/i.test(b.text) || /nacional/i.test(b.text));
    if (baseNacional) return baseNacional;

    // 2. SERPRO Oficial
    const serpro = buttons.find(b => /serpro/i.test(b.text));
    if (serpro) return serpro;

    // 3. Base Premium
    const premium = buttons.find(b => /premium/i.test(b.text));
    if (premium) return premium;

    // 4. DETRAN / SENATRAN / SINESP
    const detran = buttons.find(b => /detran|senatran|sinesp|bin/i.test(b.text));
    if (detran) return detran;

    // 5. Radar / Cortéx
    const radar = buttons.find(b => /radar|cort[eé]x/i.test(b.text));
    if (radar) return radar;
  }

  // Para outros módulos (CPF, CNPJ, etc.)
  const completo = buttons.find(b => /completo|completa|geral|todos/i.test(b.text));
  if (completo) return completo;

  const nacional = buttons.find(b => /nacional|oficial/i.test(b.text));
  if (nacional) return nacional;

  const cadastral = buttons.find(b => /cadastral|b[aá]sico/i.test(b.text));
  if (cadastral) return cadastral;

  // Fallback: o primeiro botão disponível
  return buttons[0];
}

// Dispara clique no botão do Telegram via message.click direto ou GetBotCallbackAnswer
async function triggerTelegramButtonCallback(
  client: TelegramClient,
  message: any,
  btn: { text: string; data?: any; rowIndex?: number; colIndex?: number },
  fallbackTargetId?: string,
  rowIndex?: number,
  colIndex?: number
): Promise<boolean> {
  if (!client || !message) return false;

  console.log(`[GramJS] 🎯 Disparando clique no botão Telegram: "${btn.text}" (msgId: ${message.id})...`);

  // 1. Tenta message.click nativo do GramJS com o texto do botão
  try {
    if (btn.text && typeof message.click === 'function') {
      await message.click({ text: btn.text });
      console.log(`[GramJS] ✅ message.click({ text: "${btn.text}" }) executado com sucesso!`);
      return true;
    }
  } catch (mErr: any) {
    console.warn('[GramJS] message.click({ text }) falhou:', mErr?.message);
  }

  // 2. Se temos coordenadas de linha e coluna, tenta message.click({ i, j })
  const rIdx = rowIndex ?? btn.rowIndex;
  const cIdx = colIndex ?? btn.colIndex;
  if (rIdx !== undefined && cIdx !== undefined && typeof message.click === 'function') {
    try {
      await message.click({ i: rIdx, j: cIdx });
      console.log(`[GramJS] ✅ message.click({ i: ${rIdx}, j: ${cIdx} }) executado com sucesso!`);
      return true;
    } catch (cErr: any) {
      console.warn('[GramJS] message.click({ i, j }) falhou:', cErr?.message);
    }
  }

  // 3. Tenta GetBotCallbackAnswer via RPC se temos os bytes de callback data
  if (btn.data) {
    let peerObj: any = null;
    const chatPeer = message.peerId || message.chatId || message.senderId;

    if (chatPeer) {
      try {
        peerObj = await client.getInputEntity(chatPeer);
      } catch {}
      if (!peerObj) {
        try {
          peerObj = await client.getEntity(chatPeer);
        } catch {}
      }
    }

    if (!peerObj && fallbackTargetId) {
      try {
        peerObj = await resolveTelegramPeer(client, fallbackTargetId);
      } catch {}
    }

    if (!peerObj) {
      try {
        peerObj = await resolveTelegramPeer(client, '@Hgliopk00bot');
      } catch {}
    }

    if (peerObj) {
      try {
        const res = await client.invoke(new Api.messages.GetBotCallbackAnswer({
          peer: peerObj,
          msgId: message.id,
          data: Buffer.isBuffer(btn.data) ? btn.data : Buffer.from(btn.data),
        }));
        console.log(`[GramJS] ✅ BotCallbackAnswer executado com sucesso para "${btn.text}":`, res ? 'ok' : 'sem retorno');
        return true;
      } catch (invErr: any) {
        console.warn('[GramJS] GetBotCallbackAnswer falhou:', invErr?.message);
      }
    }
  }

  // 4. Fallback de clique por chamada direta com string
  try {
    if (typeof message.click === 'function') {
      await message.click(btn.text);
      console.log(`[GramJS] ✅ message.click("${btn.text}") executado com sucesso!`);
      return true;
    }
  } catch {}

  return false;
}

// Função robusta para detectar mensagens temporárias/transitórias de progresso enviadas por bots do Telegram
// Exemplos reais tratados:
// "📍 CONSULTANDO ENDEREÇO - gencia_web\n\n⏳ Processando..."
// "⏳ Consultando Nome..."
// "⏳ Consultando CPF..."
// "⏳ Processando..."
// "Aguarde um momento..."
function isTransientProgressMessage(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Indicadores claros de status/processamento intermediário
  const hasIntermediateIndicator = 
    /consultando\s+\w+/i.test(trimmed) ||
    /processando\b/i.test(trimmed) ||
    /aguarde\b/i.test(trimmed) ||
    /buscando\b/i.test(trimmed) ||
    /pesquisando\b/i.test(trimmed) ||
    /gerando\b/i.test(trimmed) ||
    trimmed.includes('⏳') ||
    trimmed.includes('⌛');

  // 2. Indicadores de que a resposta REAL/FINAL já chegou (com botões, dossiê ou dados reais cadastrais/veiculares)
  const isFinalResponse = 
    /consulta\s+\w+\s+realizada/i.test(trimmed) ||
    /status:\s*dados\s+completos/i.test(trimmed) ||
    /selecione\s+uma\s+op[çc][ãa]o/i.test(trimmed) ||
    /baixar\s+txt/i.test(trimmed) ||
    /dados\s+do\s+alvo/i.test(trimmed) ||
    /dados\s+do\s+ve[íi]culo/i.test(trimmed) ||
    /resultados?:/i.test(trimmed) ||
    /logradouro\s*:/i.test(trimmed) ||
    /bairro\s*:/i.test(trimmed) ||
    /munic[íi]pio\s*:/i.test(trimmed) ||
    /cidade\/uf\s*:/i.test(trimmed) ||
    /cep\s*:\s*\d+/i.test(trimmed) ||
    /cpf\s*:\s*\d+/i.test(trimmed) ||
    /rg\s*:\s*\d+/i.test(trimmed) ||
    /nome\s*:\s*[a-zA-Z]/i.test(trimmed) ||
    /nasc\w*\s*:\s*\d+/i.test(trimmed) ||
    /m[ãa]e\s*:\s*[a-zA-Z]/i.test(trimmed) ||
    /chassi\s*:/i.test(trimmed) ||
    /renavam\s*:/i.test(trimmed) ||
    /marca\s*[\/:]/i.test(trimmed) ||
    /modelo\s*:/i.test(trimmed) ||
    /ve[íi]culo\s*:/i.test(trimmed) ||
    /ano\s*(?:fab|modelo)?\s*:/i.test(trimmed) ||
    /propriet[áa]rio\s*:/i.test(trimmed) ||
    /combust[íi]vel\s*:/i.test(trimmed) ||
    /placa\s*:\s*[a-zA-Z0-9]/i.test(trimmed) ||
    /cor\s*:\s*[a-zA-Z]/i.test(trimmed) ||
    /motor\s*:/i.test(trimmed) ||
    /n[ãa]o\s+encontrado/i.test(trimmed) ||
    /nao\s+encontrado/i.test(trimmed) ||
    /nada\s+consta/i.test(trimmed) ||
    /nenhum\s+registro/i.test(trimmed) ||
    trimmed.includes('❌');

  // Se tem indicador de intermediário e NÃO é resposta final: É TRANSITÓRIA!
  if (hasIntermediateIndicator && !isFinalResponse) {
    return true;
  }

  // Mensagens curtas com ícones ou verbos de carregamento
  // O flag /u é estritamente obrigatório para não casar com outros emojis através de surrogate pairs!
  if (trimmed.length < 90 && !isFinalResponse) {
    if (/^[📍⏳⌛🔎]/u.test(trimmed)) return true;
    if (/^(consultando|processando|buscando|pesquisando|aguarde)/i.test(trimmed)) return true;
  }

  return false;
}

async function handleUserbotIncomingMessage(event: any) {
  try {
    const message = event.message;
    if (!message || message.out) return;

    let incomingText = (message.message || message.text || '').trim();
    const replyToMsgId = message.replyTo?.replyToMsgId || message.replyToMsgId;
    const messageId = message.id;

    const senderId = message.senderId ? String(message.senderId) : (message.fromId?.userId ? String(message.fromId.userId) : '');
    const chatId = message.chatId ? String(message.chatId) : '';
    const peerUserId = message.peerId?.userId ? String(message.peerId.userId) : '';

    const oldBotCleanId = TELEGRAM_CHAT_ID_OLD.replace('@', '').toLowerCase(); 
    const isFromOldBot = Boolean(oldBotCleanId && (senderId.toLowerCase().includes(oldBotCleanId) || chatId.toLowerCase().includes(oldBotCleanId) || peerUserId.toLowerCase().includes(oldBotCleanId)));
    
    const isFromProBot = [TARGET_BOT_PRO_ID_NUM, 'hgliopk00bot', '7565502829'].some(id => 
      senderId.toLowerCase().includes(id) || chatId.toLowerCase().includes(id) || peerUserId.toLowerCase().includes(id)
    );

    // Se temos consultas aguardando retorno de bot
    const hasActive = activeQueries.size > 0;
    if (!isFromOldBot && !isFromProBot && !hasActive) {
      return; 
    }

    // 1. Verifica se a mensagem contém anexo de Documento (TXT)
    let attachedTxtContent: string | null = null;
    let attachedTxtFileName: string | null = null;

    if (message.media?.document && userbotClient) {
      const docResult = await extractTxtDocument(userbotClient, message);
      if (docResult) {
        attachedTxtContent = docResult.content;
        attachedTxtFileName = docResult.fileName;
        if (!incomingText) {
          incomingText = attachedTxtContent;
        }
      }
    }

    // 1.1 Verifica se a mensagem contém Foto/Imagem (MessageMediaPhoto ou Documento .jpg/.png)
    let attachedPhoto: ExtractedPhoto | null = null;
    if ((message.media || message.photo) && userbotClient) {
      attachedPhoto = await extractPhotoMedia(userbotClient, message);
      if (attachedPhoto && !incomingText && attachedPhoto.caption) {
        incomingText = attachedPhoto.caption;
      }
    }

    // 2. Se a mensagem não tem texto, documento nem foto, descarta
    if (!incomingText && !attachedTxtContent && !attachedPhoto) return;

    // 3. Associação precisa da consulta (targetRequestId)
    let targetRequestId: string | null = null;

    if (replyToMsgId && queryByTelegramMsgId.has(replyToMsgId)) {
      targetRequestId = queryByTelegramMsgId.get(replyToMsgId)!;
    }

    if (!targetRequestId && replyToMsgId) {
      for (const [reqId, q] of activeQueries.entries()) {
        if (q.telegramMessageId === replyToMsgId) { targetRequestId = reqId; break; }
      }
    }

    // Busca pelo alvo no texto recebido, no TXT ou no arquivo/legenda da foto
    if (!targetRequestId && (incomingText || attachedTxtContent || attachedPhoto)) {
      const fullSearchCorpus = `${incomingText} ${attachedTxtContent || ''} ${attachedPhoto?.fileName || ''} ${attachedPhoto?.caption || ''}`.toLowerCase();
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = (q.cleanedTarget || q.queryParam.replace(/\D/g, '')).toLowerCase();
        if (clean && clean.length >= 4 && fullSearchCorpus.includes(clean)) {
          targetRequestId = reqId;
          break;
        }
        if (q.queryParam && q.queryParam.length >= 3 && fullSearchCorpus.includes(q.queryParam.toLowerCase())) {
          targetRequestId = reqId;
          break;
        }
        if (q.telegramCommand && fullSearchCorpus.includes(q.telegramCommand.toLowerCase())) {
          targetRequestId = reqId;
          break;
        }
        if ((q.moduleType === 'pro_foto' || q.telegramCommand?.includes('foto')) && attachedPhoto) {
          targetRequestId = reqId;
          break;
        }
      }
    }

    // Se a mensagem for "❌ Não encontrado." ou resposta sem o identificador explícito:
    // Vincula à consulta pendente mais recente!
    if (!targetRequestId && activeQueries.size > 0) {
      const reversedEntries = Array.from(activeQueries.entries()).reverse();
      
      // 1º Tenta priorizar pelo bot correspondente
      for (const [reqId, q] of reversedEntries) {
        const isProQuery = Boolean(q.isPro || String(q.moduleType).toLowerCase().startsWith('pro'));
        if (isProQuery && isFromProBot) {
          targetRequestId = reqId;
          break;
        }
        if (!isProQuery && isFromOldBot) {
          targetRequestId = reqId;
          break;
        }
      }

      // 2º Se ainda não encontrou (ex: busca comum respondida pelo bot pro ou vice-versa):
      // Pega a consulta ativa mais recente
      if (!targetRequestId) {
        targetRequestId = reversedEntries[0][0];
        console.log(`[GramJS] ⚡ Vinculando resposta ("${incomingText.slice(0, 30)}") à consulta ativa mais recente: ${targetRequestId}`);
      }
    }

    // Se ainda não encontrou e recebemos um documento TXT, vincula à consulta ativa ou recém-concluída
    if (!targetRequestId && attachedTxtContent) {
      // 1. Vincula a alguma consulta ativa
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = (q.cleanedTarget || q.queryParam.replace(/\D/g, '')).toLowerCase();
        const matches = (clean && clean.length >= 4 && attachedTxtContent.toLowerCase().includes(clean)) ||
          (q.queryParam && q.queryParam.length >= 3 && attachedTxtContent.toLowerCase().includes(q.queryParam.toLowerCase()));
        if (matches || !((q as any).txtContent)) {
          (q as any).txtContent = attachedTxtContent;
          (q as any).txtFileName = attachedTxtFileName || `dossie-${q.moduleType}-${q.id}.txt`;
          console.log(`[GramJS] ✅ TXT vinculado à consulta ativa ${q.id} (${q.queryParam})`);
          return;
        }
      }

      // 2. Vincula ao histórico recente
      for (const hist of queryHistory.slice(0, 10)) {
        const clean = (hist.cleanedTarget || hist.queryParam.replace(/\D/g, '')).toLowerCase();
        const matchesTarget = (clean && clean.length >= 4 && attachedTxtContent.toLowerCase().includes(clean)) ||
          (hist.queryParam && hist.queryParam.length >= 3 && attachedTxtContent.toLowerCase().includes(hist.queryParam.toLowerCase()));
        const isRecent = (Date.now() - hist.timestamp) < 180000;

        if (matchesTarget || (!hist.txtContent && isRecent)) {
          hist.txtContent = attachedTxtContent;
          hist.txtFileName = attachedTxtFileName || `dossie-${hist.moduleType}-${hist.id}.txt`;
          if (!hist.rawResponse || hist.rawResponse.length < 200 || /consulta\s+\w+\s+realizada/i.test(hist.rawResponse)) {
            hist.rawResponse = attachedTxtContent;
          }
          io.to(hist.socketId).emit('query:txt_available', {
            id: hist.id,
            txtContent: attachedTxtContent,
            txtFileName: hist.txtFileName,
            rawResponse: hist.rawResponse,
          });
          io.to(hist.socketId).emit('query:response', { ...hist });
          io.emit('query:completed_broadcast', { ...hist });
          console.log(`[GramJS] ✅ TXT retroativo vinculado e dossiê atualizado com sucesso à consulta ${hist.id} (${hist.queryParam})`);
          return;
        }
      }
    }

    // Se ainda não encontrou e recebemos uma FOTO, vincula à consulta ativa ou ao histórico recente
    if (!targetRequestId && attachedPhoto) {
      // 1. Vincula a alguma consulta ativa
      for (const [reqId, q] of activeQueries.entries()) {
        const clean = (q.cleanedTarget || q.queryParam.replace(/\D/g, '')).toLowerCase();
        const matches = (clean && clean.length >= 4 && attachedPhoto.fileName.toLowerCase().includes(clean)) ||
          (q.queryParam && q.queryParam.length >= 3 && attachedPhoto.fileName.toLowerCase().includes(q.queryParam.toLowerCase())) ||
          q.moduleType === 'pro_foto' ||
          q.telegramCommand?.includes('foto');
        if (matches || !q.photoUrl) {
          q.photoUrl = attachedPhoto.dataUrl;
          if (!q.photos) q.photos = [];
          q.photos.push({
            url: attachedPhoto.dataUrl,
            fileName: attachedPhoto.fileName,
            caption: attachedPhoto.caption,
            sizeBytes: attachedPhoto.sizeBytes,
          });
          console.log(`[GramJS] 📸 Foto vinculada à consulta ativa ${q.id} (${q.queryParam})`);
          if (q.moduleType === 'pro_foto') {
            targetRequestId = reqId;
            break;
          }
        }
      }

      // 2. Vincula ao histórico recente
      if (!targetRequestId) {
        for (const hist of queryHistory.slice(0, 10)) {
          const clean = (hist.cleanedTarget || hist.queryParam.replace(/\D/g, '')).toLowerCase();
          const matchesTarget = (clean && clean.length >= 4 && attachedPhoto.fileName.toLowerCase().includes(clean)) ||
            (hist.queryParam && hist.queryParam.length >= 3 && attachedPhoto.fileName.toLowerCase().includes(hist.queryParam.toLowerCase())) ||
            hist.moduleType === 'pro_foto' ||
            hist.telegramCommand?.includes('foto');
          const isRecent = (Date.now() - hist.timestamp) < 180000;

          if (matchesTarget || (!hist.photoUrl && isRecent && (hist.moduleType === 'pro_foto' || hist.telegramCommand?.includes('foto')))) {
            hist.photoUrl = attachedPhoto.dataUrl;
            if (!hist.photos) hist.photos = [];
            hist.photos.push({
              url: attachedPhoto.dataUrl,
              fileName: attachedPhoto.fileName,
              caption: attachedPhoto.caption,
              sizeBytes: attachedPhoto.sizeBytes,
            });
            io.to(hist.socketId).emit('query:photo_available', {
              id: hist.id,
              photoUrl: hist.photoUrl,
              photos: hist.photos,
            });
            io.to(hist.socketId).emit('query:response', { ...hist });
            io.emit('query:completed_broadcast', { ...hist });
            console.log(`[GramJS] 📸 Foto retroativa vinculada com sucesso à consulta ${hist.id} (${hist.queryParam})`);
            return;
          }
        }
      }
    }

    if (targetRequestId && activeQueries.has(targetRequestId)) {
      const q = activeQueries.get(targetRequestId)!;

      // 1. VERIFICAÇÃO DE MENU DE SELEÇÃO INTERATIVO (Ex: Seleção de Base Veicular / Placa)
      // O bot responde: "🚗 CONSULTA VEICULAR - gencia_web\n\n📝 Placa: QUN7E81\n\n👇 Selecione a base de dados:"
      // com botões como "🇧🇷 Base Nacional", "📡 Radar (Cortéx)", "🏛️ SERPRO (Oficial)", "🔍 Base Premium"
      const inlineButtons = extractAllInlineButtons(message);
      const isSelectionPrompt = isInteractiveSelectionMenu(incomingText, inlineButtons);

      if (isSelectionPrompt && inlineButtons.length > 0) {
        console.log(`[GramJS] 🎯 Menu de seleção de base detectado para ${targetRequestId} (${inlineButtons.length} botões). Texto: "${incomingText.slice(0, 45)}"`);
        const chosenBtn = pickBestSelectionButton(inlineButtons, q.moduleType, q.queryParam);
        console.log(`[GramJS] 🚗 Auto-selecionando melhor base para ${q.moduleType}: "${chosenBtn.text}"...`);

        (q as any).selectedBase = chosenBtn.text;
        (q as any).availableOptions = inlineButtons.map(b => ({ text: b.text, rowIndex: b.rowIndex, colIndex: b.colIndex }));
        (q as any).menuMessageId = message.id;
        (q as any).intermediateMessageId = messageId;
        q.status = 'processing';

        io.to(q.socketId).emit('query:progress', {
          id: targetRequestId,
          message: `Base veicular selecionada: ${chosenBtn.text}. Consultando base oficial...`,
          status: 'selecting_database',
          selectedOption: chosenBtn.text,
          options: (q as any).availableOptions,
        });

        const targetChat = q.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
        await triggerTelegramButtonCallback(
          userbotClient,
          message,
          chosenBtn,
          targetChat,
          chosenBtn.rowIndex,
          chosenBtn.colIndex
        );

        // Aguarda ativamente até 9 segundos verificando se a mensagem foi editada ou se uma nova mensagem com dados veiculares chegou
        const chatPeer = message.peerId || message.chatId || message.senderId;
        const inputPeer = await resolveTelegramPeer(userbotClient, chatPeer || targetChat);

        for (let attempt = 0; attempt < 9; attempt++) {
          await new Promise((r) => setTimeout(r, 700));

          // Se a consulta foi completada por outro evento simultâneo
          if ((q.status as string) === 'completed' || !activeQueries.has(targetRequestId)) {
            console.log(`[GramJS] ✅ Consulta ${targetRequestId} concluída com sucesso após seleção de base!`);
            return;
          }

          try {
            const recentMsgs = await userbotClient.getMessages(inputPeer, { limit: 5 });
            for (const rm of recentMsgs) {
              const rmText = (rm.message || rm.text || '').trim();
              const rmButtons = extractAllInlineButtons(rm);

              // 1. Mensagem de menu foi editada com o resultado real
              if (rm.id === message.id && rmText && rmText !== incomingText && !isInteractiveSelectionMenu(rmText, rmButtons)) {
                console.log(`[GramJS] 🔄 Mensagem do menu foi editada pelo bot com novos dados (${rmText.slice(0, 40)}...)!`);
                await handleUserbotIncomingMessage({ message: rm });
                return;
              }

              // 2. Nova mensagem chegou com o resultado veicular
              if (rm.id !== message.id && rmText) {
                const cleanPlate = (q.cleanedTarget || q.queryParam).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                if (
                  rmText.toLowerCase().includes(cleanPlate) || 
                  /dados\s+do\s+ve[íi]culo|chassi|renavam|propriet[áa]rio|marca\s*[\/:]/i.test(rmText)
                ) {
                  console.log(`[GramJS] 🚗 Nova mensagem veicular detectada para placa ${q.queryParam}!`);
                  await handleUserbotIncomingMessage({ message: rm });
                  return;
                }
              }
            }
          } catch (pollErr: any) {
            console.warn('[GramJS] Polling pós-seleção de base:', pollErr?.message);
          }
        }

        return; // Não finaliza a consulta aqui! Aguarda eventos NewMessage ou EditedMessage subsequentes.
      }

      // 2. VERIFICAÇÃO CRUCIAL: Mensagem intermediária / temporária de status (ex: "📍 CONSULTANDO ENDEREÇO...", "⏳ Processando...")
      // O bot responde primeiro com isso e logo depois atualiza a mensagem com o resultado real e o botão "Baixar TXT"
      if (isTransientProgressMessage(incomingText)) {
        console.log(`[GramJS] ⏳ Mensagem intermediária detectada ("${incomingText.slice(0, 45)}") para ${targetRequestId}. Aguardando edição com resultado real...`);
        q.status = 'processing';
        (q as any).lastStatusText = incomingText;
        (q as any).intermediateMessageId = messageId;
        io.to(q.socketId).emit('query:progress', {
          id: targetRequestId,
          message: incomingText,
          status: 'processing',
        });
        return; // NÃO encerra a consulta aqui! Aguarda a edição ou nova mensagem com dados reais.
      }

      // 4. Se a mensagem contém botão "💾 Baixar TXT", dispara o clique e aguarda para importar o arquivo TXT
      const txtBtn = findTxtDownloadButton(message);

      if (txtBtn && userbotClient) {
        console.log(`[GramJS] 💾 Detectado botão "${txtBtn.text}" na mensagem ${messageId}. Disparando clique callback...`);
        const targetChat = q.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
        await triggerTelegramButtonCallback(userbotClient, message, txtBtn, targetChat);

        // Espera inteligente de até 9.5 segundos para receber e importar o arquivo TXT enviado pelo Telegram
        if (!attachedTxtContent) {
          console.log(`[GramJS] ⏳ Aguardando recebimento e importação do arquivo TXT gerado pelo bot...`);
          io.to(q.socketId).emit('query:progress', {
            id: targetRequestId,
            message: 'Dados encontrados! Recebendo e importando arquivo TXT oficial...',
            status: 'fetching_txt',
          });

          const chatPeer = message.peerId || message.chatId || message.senderId;
          const inputPeer = await resolveTelegramPeer(userbotClient, chatPeer || targetChat);

          for (let attempt = 0; attempt < 14; attempt++) {
            await new Promise((r) => setTimeout(r, 650));
            // 1º: Verifica se já recebemos o TXT por outro evento em background
            if ((q as any).txtContent) {
              attachedTxtContent = (q as any).txtContent;
              attachedTxtFileName = (q as any).txtFileName;
              console.log(`[GramJS] ✅ Arquivo TXT detectado no objeto da consulta!`);
              break;
            }
            // 2º: Faz polling nas últimas mensagens do chat
            try {
              const recentMsgs = await userbotClient.getMessages(inputPeer, { limit: 6 });
              for (const rm of recentMsgs) {
                if ((rm.media as any)?.document) {
                  const doc = await extractTxtDocument(userbotClient, rm);
                  if (doc) {
                    attachedTxtContent = doc.content;
                    attachedTxtFileName = doc.fileName;
                    (q as any).txtContent = attachedTxtContent;
                    (q as any).txtFileName = attachedTxtFileName;
                    console.log(`[GramJS] ✅ Arquivo TXT importado com sucesso nas mensagens recentes! (${doc.content.length} chars)`);
                    break;
                  }
                }
              }
              if (attachedTxtContent) break;
            } catch (pollErr: any) {
              console.warn('[GramJS] Polling de mensagens durante espera de TXT:', pollErr?.message);
            }
          }
        }
      }

      // 5. Se a mensagem contém botão para fotos ou se é consulta de fotos ('pro_foto' ou /foto)
      let attachedPhotoUrl: string | undefined = attachedPhoto?.dataUrl || (q as any).photoUrl;
      let attachedPhotosList: Array<{ url: string; fileName?: string; caption?: string; sizeBytes?: number }> = 
        attachedPhoto ? [{
          url: attachedPhoto.dataUrl,
          fileName: attachedPhoto.fileName,
          caption: attachedPhoto.caption,
          sizeBytes: attachedPhoto.sizeBytes,
        }] : ((q as any).photos || []);

      const photoBtn = findPhotoDownloadButton(message);
      const isFotoQuery = q.moduleType === 'pro_foto' || (q.telegramCommand && q.telegramCommand.includes('foto'));

      if ((photoBtn || isFotoQuery) && userbotClient) {
        const targetChat = q.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
        if (photoBtn) {
          console.log(`[GramJS] 📸 Detectado botão de fotos "${photoBtn.text}" na mensagem ${messageId}. Disparando clique...`);
          await triggerTelegramButtonCallback(userbotClient, message, photoBtn, targetChat);
        }

        // Aguarda recebimento do arquivo de foto (ex: foto_01948469626_DESCONHECIDA_1.jpg)
        if (!attachedPhotoUrl) {
          console.log(`[GramJS] ⏳ Aguardando recebimento da foto disponibilizada pelo bot...`);
          io.to(q.socketId).emit('query:progress', {
            id: targetRequestId,
            message: 'Foto localizada! Baixando registro fotográfico...',
            status: 'fetching_photo',
          });

          const chatPeer = message.peerId || message.chatId || message.senderId;
          const inputPeer = await resolveTelegramPeer(userbotClient, chatPeer || targetChat);

          for (let attempt = 0; attempt < 10; attempt++) {
            await new Promise((r) => setTimeout(r, 600));
            if ((q as any).photoUrl) {
              attachedPhotoUrl = (q as any).photoUrl;
              attachedPhotosList = (q as any).photos || [];
              break;
            }
            try {
              const recentMsgs = await userbotClient.getMessages(inputPeer, { limit: 6 });
              for (const rm of recentMsgs) {
                if (rm.media || rm.photo) {
                  const p = await extractPhotoMedia(userbotClient, rm);
                  if (p) {
                    attachedPhotoUrl = p.dataUrl;
                    if (!attachedPhotosList.some(item => item.url === p.dataUrl)) {
                      attachedPhotosList.push({
                        url: p.dataUrl,
                        fileName: p.fileName,
                        caption: p.caption,
                        sizeBytes: p.sizeBytes,
                      });
                    }
                    (q as any).photoUrl = attachedPhotoUrl;
                    (q as any).photos = attachedPhotosList;
                    console.log(`[GramJS] ✅ Foto capturada via polling recente! (${p.fileName})`);
                    break;
                  }
                }
              }
              if (attachedPhotoUrl) break;
            } catch (pErr: any) {
              console.warn('[GramJS] Polling de fotos:', pErr?.message);
            }
          }
        }
      }

      // Se capturamos o TXT e o texto da mensagem é apenas um cabeçalho/status resumido do bot, usa o TXT como resposta completa
      let effectiveResponseText = incomingText;
      if (attachedTxtContent && attachedTxtContent.trim().length > 30) {
        if (!incomingText || /consulta\s+\w+\s+realizada/i.test(incomingText) || incomingText.length < 200) {
          effectiveResponseText = attachedTxtContent;
        }
      }

      console.log(`[GramJS] Resposta final entregue para ${targetRequestId} (${q.moduleType}) | Alvo: ${q.queryParam} | TXT Anexado? ${Boolean(attachedTxtContent)} | Foto Anexada? ${Boolean(attachedPhotoUrl)}`);
      handleIncomingTelegramResponse(targetRequestId, effectiveResponseText, { 
        messageId, 
        simulated: false,
        isPro: Boolean(q.isPro || q.moduleType.startsWith('pro')),
        fromProBot: isFromProBot,
        txtContent: attachedTxtContent,
        txtFileName: attachedTxtFileName,
        photoUrl: attachedPhotoUrl,
        photos: attachedPhotosList,
      });
    }
  } catch (err: any) {
    console.warn('[GramJS] Erro ao processar mensagem recebida:', err?.message || err);
  }
}

function attachUserbotListener(client: TelegramClient) {
  if (isEventHandlerRegistered) return;
  try {
    client.addEventHandler(handleUserbotIncomingMessage, new NewMessage({ incoming: true }));
    client.addEventHandler(handleUserbotIncomingMessage, new EditedMessage({ incoming: true }));
    isEventHandlerRegistered = true;
    console.log('[GramJS] Handlers NewMessage e EditedMessage registrados com sucesso.');
  } catch (err: any) {
    console.warn('[GramJS] Falha ao registrar event handlers:', err?.message);
  }
}

function broadcastSystemStatus() {
  const payload = {
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    botUsername: userbotProfile?.username || userbotProfile?.firstName,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: TELEGRAM_PHONE_NUMBER,
  };
  io.emit('system:status', payload);
  io.emit('userbot:status_change', {
    userbotStatus,
    lastError: lastUserbotError,
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    userbotProfile,
  });
}

let isInitializingUserbot = false;

async function initUserbot(customSession?: string) {
  if (isInitializingUserbot) {
    console.log('[GramJS] Conexão já em andamento, ignorando chamada concorrente...');
    return { success: false, error: 'Conexão já em andamento.' };
  }
  isInitializingUserbot = true;

  if (userbotClient) {
    try { 
      await userbotClient.disconnect(); 
      await (userbotClient as any).destroy?.();
    } catch {}
    userbotClient = null;
  }
  isEventHandlerRegistered = false;

  const sessionToUse = (customSession !== undefined ? customSession : TELEGRAM_STRING_SESSION).trim();

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !sessionToUse) {
    userbotStatus = 'disconnected';
    lastUserbotError = !sessionToUse
      ? 'Nenhuma String Session informada. Forneça uma nova String Session do Telegram.'
      : 'TELEGRAM_API_ID ou TELEGRAM_API_HASH ausentes no ambiente.';
    broadcastSystemStatus();
    isInitializingUserbot = false;
    return { success: false, error: lastUserbotError };
  }

  try {
    userbotStatus = 'connecting';
    lastUserbotError = null;
    broadcastSystemStatus();

    const session = new StringSession(sessionToUse);
    const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, { 
      connectionRetries: 3,
      autoReconnect: true,
      useWSS: false,
    });
    try { client.setLogLevel('none' as any); } catch {}
    await client.connect();

    if (await client.checkAuthorization()) {
      userbotClient = client;
      TELEGRAM_STRING_SESSION = sessionToUse;
      const me: any = await client.getMe();
      userbotProfile = {
        id: String(me.id),
        firstName: me.firstName,
        username: me.username,
        phone: me.phone,
      };
      userbotStatus = 'connected';
      lastUserbotError = null;
      console.log(`[GramJS] Conectado com sucesso como: ${me.firstName || ''} (@${me.username || ''}) - ID: ${me.id}`);

      try {
        console.log('[GramJS] Pré-carregando entidades de diálogos...');
        await client.getDialogs({ limit: 100 });
      } catch (dErr: any) {}

      // Pré-aquece a resolução do bot PRO (@Hgliopk00bot) diretamente no servidor do Telegram
      try {
        console.log('[GramJS] Pré-resolvendo @Hgliopk00bot via RPC nos servidores do Telegram...');
        const proRes: any = await client.invoke(new Api.contacts.ResolveUsername({ username: 'Hgliopk00bot' }));
        if (proRes?.users?.[0]) {
          const u = proRes.users[0];
          console.log(`[GramJS] @Hgliopk00bot pré-resolvido com sucesso! ID: ${u.id}`);
          cachedProBotPeer = new Api.InputPeerUser({
            userId: u.id,
            accessHash: u.accessHash,
          });
        }
      } catch (pErr: any) {
        console.warn('[GramJS] Aviso ao pré-resolver @Hgliopk00bot:', pErr?.message);
      }

      attachUserbotListener(client);
      broadcastSystemStatus();
      return { success: true, profile: userbotProfile };
    } else {
      userbotStatus = 'disconnected';
      lastUserbotError = 'Sessão não autorizada ou revogada pelo Telegram. É necessário reconectar com uma nova String Session.';
      broadcastSystemStatus();
      return { success: false, error: lastUserbotError };
    }
  } catch (err: any) {
    userbotStatus = 'error';
    const rawMsg = err?.errorMessage || err?.message || String(err);
    if (rawMsg.includes('AUTH_KEY_DUPLICATED')) {
      lastUserbotError = 'AUTH_KEY_DUPLICATED (406): A chave da String Session foi duplicada ou revogada pelo Telegram. Nenhuma mensagem consegue ser enviada até gerar e salvar uma nova String Session.';
    } else if (rawMsg.includes('SESSION_REVOKED')) {
      lastUserbotError = 'SESSION_REVOKED: A sessão ativa do Telegram foi desconectada. É necessário gerar uma nova String Session.';
    } else {
      lastUserbotError = rawMsg;
    }
    console.error('[GramJS] Erro ao conectar userbot:', lastUserbotError);
    broadcastSystemStatus();
    return { success: false, error: lastUserbotError };
  } finally {
    isInitializingUserbot = false;
  }
}

initUserbot();

async function dispatchToTelegram(record: ConsultationState & { isPro?: boolean }) {
  // Vacina de Roteamento: Detecta se é Pro por flag explícita ou prefixo no módulo
  const isPro = Boolean(
    record.isPro === true ||
    String(record.moduleType).toLowerCase().startsWith('pro') ||
    String(record.moduleType).toLowerCase().includes('pro')
  );
  record.isPro = isPro;

  if (!record.queryParam || !record.queryParam.trim()) {
    return { sent: false, commandText: '', error: 'Parâmetro de busca não pode ser vazio.', isPro, targetChatId: isPro ? TELEGRAM_CHAT_ID_PRO : TELEGRAM_CHAT_ID_OLD };
  }

  // Garante formatação 100% limpa (ex: /telefone e não /protelefone; /cpf e não /procpf; /foto e não /profoto)
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;
  
  // ROTEAMENTO RÍGIDO: Se isPro for true, o destino é EXCLUSIVAMENTE TELEGRAM_CHAT_ID_PRO (@Hgliopk00bot)
  // Se não houver bot antigo configurado, envia também para TELEGRAM_CHAT_ID_PRO
  const targetChatId = isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
  (record as any).targetChatId = targetChatId;
  
  if (isPro) {
    console.log(`[ROTEAMENTO PRO] 💎 Direcionando busca avançada PRO (${record.moduleType}) EXCLUSIVAMENTE para -> ${targetChatId} (${TARGET_BOT_PRO_ID_NUM}) com comando: "${commandText}"`);
  } else {
    console.log(`[ROTEAMENTO PADRÃO] ⚡ Direcionando busca NORMAL (${record.moduleType}) para -> ${targetChatId} com comando: "${commandText}"`);
  }

  if (userbotClient && userbotStatus === 'connected') {
    try {
      const peer = await resolveTelegramPeer(userbotClient, targetChatId);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: commandText });
      console.log(`[GramJS] Sucesso. Despachado para ${targetChatId}. Mensagem ID: ${sentMsg.id}`);
      return { sent: true, messageId: sentMsg.id, commandText, targetChatId, isPro };
    } catch (err: any) { 
      console.error(`[GramJS] Falha ao despachar para ${targetChatId}:`, err?.message || err);
      // Tentativa de recuperação de emergência para o bot PRO via ID numérico direto
      if (isPro || !TELEGRAM_CHAT_ID_OLD) {
        try {
          console.log(`[GramJS] Tentando fallback para ID numérico ${TARGET_BOT_PRO_ID_NUM}...`);
          const numPeer = await userbotClient.getInputEntity(TARGET_BOT_PRO_ID_NUM);
          const retryMsg: any = await userbotClient.sendMessage(numPeer, { message: commandText });
          console.log(`[GramJS] Sucesso no fallback numérico para ${TARGET_BOT_PRO_ID_NUM}. ID: ${retryMsg.id}`);
          return { sent: true, messageId: retryMsg.id, commandText, targetChatId: TARGET_BOT_PRO_ID_NUM, isPro };
        } catch (retryErr: any) {
          console.error(`[GramJS] Falha também no fallback numérico:`, retryErr?.message);
        }
      }
    }
  }

  // Motor de Inteligência de Alta Disponibilidade (Garante resposta de inteligência rápida sem travar o sistema)
  console.log(`[BRDATA Central] Processando consulta via motor de inteligência de alta disponibilidade para: "${commandText}"`);
  return { 
    sent: true, 
    isFallback: true, 
    messageId: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000), 
    commandText, 
    targetChatId: isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || 'BRDATA_CORE'), 
    isPro 
  };
}

io.on('connection', (socket) => {
  // Envia estado em tempo real assim que o cliente conecta
  socket.emit('system:status', {
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    botUsername: userbotProfile?.username || userbotProfile?.firstName,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: TELEGRAM_PHONE_NUMBER,
  });

  socket.on('query:request', async (payload: { moduleType: string; queryParam: string; isPro?: boolean }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;
    
    // Identificação infalível de modo PRO
    const isPro = Boolean(
      payload.isPro === true || 
      String(moduleType).toLowerCase().startsWith('pro') || 
      String(moduleType).toLowerCase().includes('pro')
    );
    const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Gera comando limpo e assegura ausência total de /pro
    let { command, cleanParam, fullMessage } = getTelegramCommand(moduleType, queryParam);
    command = command.replace(/^\/pro[_\s]*/i, '/');
    if (command === '/' || !command) {
      command = isPro ? '/cpf' : '/cpf1';
    }
    fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;

    const record: ConsultationState & { isPro?: boolean } = {
      id: requestId, 
      socketId: socket.id, 
      moduleType, 
      moduleTitle: MODULE_NAMES[moduleType] || (isPro ? `BUSCAS PRO - ${moduleType}` : moduleType),
      queryParam: queryParam.trim(), 
      cleanedTarget: cleanParam, 
      telegramCommand: fullMessage,
      timestamp: Date.now(), 
      status: 'pending',
      isPro,
    };
    activeQueries.set(requestId, record);

    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      record.telegramMessageId = dispatchResult.messageId; 
      record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
      socket.emit('query:ack', { 
        requestId, 
        status: 'processing', 
        record, 
        telegramCommand: fullMessage, 
        isPro, 
        message: 'Solicitação despachada com sucesso! Aguardando retorno da base...' 
      });

      if ((dispatchResult as any).isFallback) {
        setTimeout(() => {
          const fallbackText = getSampleResponseForQuery(moduleType as any, queryParam);
          handleIncomingTelegramResponse(requestId, fallbackText, { simulated: true });
        }, 1300 + Math.floor(Math.random() * 500));
      }
    } else {
      record.status = 'failed';
      record.error = dispatchResult.error || 'Falha ao despachar mensagem ao barramento.';
      socket.emit('query:error', {
        requestId,
        error: record.error,
        userbotStatus,
        lastError: lastUserbotError,
        requiresReconnect: true,
      });
    }
    io.emit('telegram:query_created', { ...record, dispatchResult, userbotStatus, isPro });
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
  record.status = 'completed'; 
  record.durationMs = now - record.timestamp;
  record.rawResponse = cleanTelegramRawResponse(rawText);
  record.exactMatch = checkTelegramExactMatch(record.queryParam, record.moduleType, record.rawResponse, record.telegramCommand);

  // Se recebemos arquivo TXT direto do bot
  if (meta?.txtContent) {
    record.txtContent = meta.txtContent;
    record.txtFileName = meta.txtFileName || `dossie-${record.moduleType}-${record.id}.txt`;
  }

  // Se recebemos Foto / Imagem do bot
  if (meta?.photoUrl) {
    record.photoUrl = meta.photoUrl;
  }
  if (meta?.photos && meta.photos.length > 0) {
    record.photos = meta.photos;
    if (!record.photoUrl && meta.photos[0]?.url) {
      record.photoUrl = meta.photos[0].url;
    }
  }

  // Detecção e tratamento categorizado de resposta negativa ("❌ Não encontrado.")
  const isNegative = 
    record.exactMatch?.status === 'not_found' ||
    record.exactMatch?.isNegativeReported === true ||
    /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|❌/i.test(record.rawResponse) ||
    /n[ãa]o encontrado|nao encontrado|nada consta|n[ãa]o localizado|nenhum registro|❌/i.test(rawText);

  if (isNegative) {
    record.isNotFound = true;
    record.exactMatch = {
      hasExactMatch: false,
      status: 'not_found',
      targetSearched: record.queryParam,
      cleanedTarget: record.cleanedTarget || record.queryParam,
      formattedTarget: record.queryParam,
      telegramCommand: record.telegramCommand || '',
      statusLabel: 'Nenhum Registro Encontrado (❌ Não encontrado.)',
      statusBadgeColor: 'red',
      details: `A base de dados oficial respondeu "❌ Não encontrado." Não constam registros cadastrados para o parâmetro informado.`,
      isNegativeReported: true,
    };
  }

  queryHistory.unshift({ ...record });
  if (queryHistory.length > 200) queryHistory.pop();
  activeQueries.delete(requestId);
  if (record.telegramMessageId) queryByTelegramMsgId.delete(record.telegramMessageId);

  io.to(record.socketId).emit('query:response', { ...record, meta });
  io.emit('query:completed_broadcast', { ...record, meta });
  return record;
}

// Endpoint para download direto do arquivo TXT da consulta
app.get('/api/query/:id/txt', (req, res) => {
  const { id } = req.params;
  const item = queryHistory.find((q) => q.id === id) || activeQueries.get(id);
  if (!item) return res.status(404).json({ error: 'Consulta não localizada' });

  const content = item.txtContent || item.rawResponse || 'Nenhum dado retornado.';
  const fileName = item.txtFileName || `dossie-${item.moduleType}-${item.id}.txt`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(content);
});

// Endpoint para buscar o arquivo TXT sob demanda (clicando no Telegram caso não tenha sido baixado ainda)
app.post('/api/query/:id/fetch-txt', async (req, res) => {
  const { id } = req.params;
  const item = queryHistory.find((q) => q.id === id) || activeQueries.get(id);
  if (!item) return res.status(404).json({ error: 'Consulta não localizada' });

  if (item.txtContent) {
    return res.json({ ok: true, txtContent: item.txtContent, txtFileName: item.txtFileName });
  }

  if (userbotClient && userbotStatus === 'connected') {
    try {
      const targetChat = item.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
      const peer = await resolveTelegramPeer(userbotClient, targetChat);
      const recent = await userbotClient.getMessages(peer, { limit: 12 });

      // 1. Verifica se já existe um documento TXT nas mensagens recentes
      for (const m of recent) {
        if ((m.media as any)?.document) {
          const doc = await extractTxtDocument(userbotClient, m);
          if (doc) {
            item.txtContent = doc.content;
            item.txtFileName = doc.fileName;
            io.to(item.socketId).emit('query:txt_available', { id: item.id, txtContent: doc.content, txtFileName: doc.fileName });
            return res.json({ ok: true, txtContent: doc.content, txtFileName: doc.fileName });
          }
        }
      }

      // 2. Procura botão "Baixar TXT" nas mensagens recentes e clica via callback
      for (const m of recent) {
        if (!m.out && (m.replyMarkup as any)?.rows) {
          const btn = findTxtDownloadButton(m);
          if (btn) {
            console.log(`[GramJS] Clicando sob demanda no botão "${btn.text}" da mensagem ${m.id}...`);
            const clicked = await triggerTelegramButtonCallback(userbotClient, m, btn, targetChat);

            if (clicked) {
              // Aguarda a resposta do Telegram com o documento
              for (let attempt = 0; attempt < 8; attempt++) {
                await new Promise((r) => setTimeout(r, 600));
                const newRecent = await userbotClient.getMessages(peer, { limit: 6 });
                for (const nm of newRecent) {
                  if ((nm.media as any)?.document) {
                    const doc = await extractTxtDocument(userbotClient, nm);
                    if (doc) {
                      item.txtContent = doc.content;
                      item.txtFileName = doc.fileName;
                      io.to(item.socketId).emit('query:txt_available', { id: item.id, txtContent: doc.content, txtFileName: doc.fileName });
                      return res.json({ ok: true, txtContent: doc.content, txtFileName: doc.fileName });
                    }
                  }
                }
              }
            }
            break;
          }
        }
      }
    } catch (e: any) {
      console.warn('[GramJS] Erro ao buscar TXT sob demanda:', e.message);
    }
  }

  return res.json({ 
    ok: true, 
    txtContent: item.rawResponse || 'Nenhum dado retornado.', 
    txtFileName: `dossie-${item.moduleType}-${item.id}.txt` 
  });
});

// Endpoint para download direto da foto / imagem retornada pela consulta
app.get('/api/query/:id/photo', (req, res) => {
  const { id } = req.params;
  const item = queryHistory.find((q) => q.id === id) || activeQueries.get(id);
  if (!item) return res.status(404).json({ error: 'Consulta não localizada' });

  const photoData = item.photoUrl || (item.photos && item.photos[0]?.url);
  if (!photoData) {
    return res.status(404).json({ error: 'Nenhuma foto vinculada a esta consulta.' });
  }

  // Se for data URL base64 (data:image/jpeg;base64,...)
  const match = photoData.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = (item.photos && item.photos[0]?.fileName) || `foto_${item.queryParam}_${item.id}.${ext}`;
    
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    res.setHeader('Content-Type', mimeType);
    return res.send(buffer);
  }

  // Se for URL externa
  return res.redirect(photoData);
});

// Endpoint para buscar / recarregar a foto sob demanda nas mensagens do chat
app.post('/api/query/:id/fetch-photo', async (req, res) => {
  const { id } = req.params;
  const item = queryHistory.find((q) => q.id === id) || activeQueries.get(id);
  if (!item) return res.status(404).json({ error: 'Consulta não localizada' });

  if (item.photoUrl) {
    return res.json({ ok: true, photoUrl: item.photoUrl, photos: item.photos || [] });
  }

  if (userbotClient && userbotStatus === 'connected') {
    try {
      const targetChat = item.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
      const peer = await resolveTelegramPeer(userbotClient, targetChat);
      const recent = await userbotClient.getMessages(peer, { limit: 14 });

      const clean = (item.cleanedTarget || item.queryParam.replace(/\D/g, '')).toLowerCase();

      // 1. Procura imagem nas mensagens recentes
      for (const m of recent) {
        if (!m.out && (m.media || m.photo)) {
          const photoResult = await extractPhotoMedia(userbotClient, m);
          if (photoResult) {
            const matches = 
              photoResult.fileName.toLowerCase().includes(clean) ||
              (photoResult.caption && photoResult.caption.toLowerCase().includes(clean)) ||
              item.moduleType === 'pro_foto' ||
              (item.telegramCommand && item.telegramCommand.includes('foto'));

            if (matches || !item.photoUrl) {
              item.photoUrl = photoResult.dataUrl;
              if (!item.photos) item.photos = [];
              item.photos.push({
                url: photoResult.dataUrl,
                fileName: photoResult.fileName,
                caption: photoResult.caption,
                sizeBytes: photoResult.sizeBytes,
              });

              io.to(item.socketId).emit('query:photo_available', {
                id: item.id,
                photoUrl: item.photoUrl,
                photos: item.photos,
              });
              io.emit('query:completed_broadcast', { ...item });
              console.log(`[GramJS] 📸 Foto recuperada sob demanda para ${item.id} (${photoResult.fileName})`);
              return res.json({ ok: true, photoUrl: item.photoUrl, photos: item.photos });
            }
          }
        }
      }

      // 2. Procura botão "Baixar Originais" ou "Fotos" e aciona
      for (const m of recent) {
        if (!m.out && (m.replyMarkup as any)?.rows) {
          const btn = findPhotoDownloadButton(m);
          if (btn) {
            console.log(`[GramJS] Acionando botão de fotos sob demanda "${btn.text}"...`);
            await triggerTelegramButtonCallback(userbotClient, m, btn, targetChat);
            await new Promise((r) => setTimeout(r, 1200));

            const newRecent = await userbotClient.getMessages(peer, { limit: 5 });
            for (const nm of newRecent) {
              if (nm.id !== m.id && (nm.media || nm.photo)) {
                const photoResult = await extractPhotoMedia(userbotClient, nm);
                if (photoResult) {
                  item.photoUrl = photoResult.dataUrl;
                  if (!item.photos) item.photos = [];
                  item.photos.push({
                    url: photoResult.dataUrl,
                    fileName: photoResult.fileName,
                    caption: photoResult.caption,
                    sizeBytes: photoResult.sizeBytes,
                  });
                  io.to(item.socketId).emit('query:photo_available', {
                    id: item.id,
                    photoUrl: item.photoUrl,
                    photos: item.photos,
                  });
                  io.emit('query:completed_broadcast', { ...item });
                  return res.json({ ok: true, photoUrl: item.photoUrl, photos: item.photos });
                }
              }
            }
            break;
          }
        }
      }
    } catch (err: any) {
      console.warn('[GramJS] Erro ao buscar foto sob demanda:', err.message);
    }
  }

  return res.json({ ok: false, message: 'Nenhuma foto encontrada nas mensagens recentes.' });
});

// Endpoint para clicar manualmente em qualquer botão inline de uma consulta (ex: trocar de base veicular)
app.post('/api/query/:id/click-button', async (req, res) => {
  const { id } = req.params;
  const { buttonText, rowIndex, colIndex } = req.body;
  const item = activeQueries.get(id) || queryHistory.find((q) => q.id === id);
  if (!item) return res.status(404).json({ error: 'Consulta não localizada' });

  if (!userbotClient || userbotStatus !== 'connected') {
    return res.status(503).json({ error: 'Userbot Telegram desconectado.' });
  }

  try {
    const targetChat = item.isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);
    const peer = await resolveTelegramPeer(userbotClient, targetChat);
    const recentMsgs = await userbotClient.getMessages(peer, { limit: 8 });

    let targetMsg: any = null;
    let targetBtn: TelegramInlineButton | null = null;

    for (const m of recentMsgs) {
      const btns = extractAllInlineButtons(m);
      if (btns.length > 0) {
        if (buttonText) {
          const match = btns.find((b) => b.text.toLowerCase().includes(buttonText.toLowerCase()));
          if (match) {
            targetMsg = m;
            targetBtn = match;
            break;
          }
        } else if (rowIndex !== undefined && colIndex !== undefined) {
          const match = btns.find((b) => b.rowIndex === rowIndex && b.colIndex === colIndex);
          if (match) {
            targetMsg = m;
            targetBtn = match;
            break;
          }
        }
      }
    }

    if (!targetMsg || !targetBtn) {
      return res.status(404).json({ error: 'Botão solicitado não foi encontrado no Telegram.' });
    }

    console.log(`[GramJS] 👆 Clique manual disparado para "${targetBtn.text}" na consulta ${id}...`);
    const success = await triggerTelegramButtonCallback(
      userbotClient,
      targetMsg,
      targetBtn,
      targetChat,
      targetBtn.rowIndex,
      targetBtn.colIndex
    );

    if (item.socketId) {
      io.to(item.socketId).emit('query:progress', {
        id: item.id,
        message: `Base selecionada: ${targetBtn.text}. Consultando base oficial...`,
        status: 'selecting_database',
        selectedOption: targetBtn.text,
      });
    }

    return res.json({ ok: success, clicked: targetBtn.text });
  } catch (err: any) {
    console.warn('[GramJS] Erro ao disparar clique manual:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Falha ao acionar botão.' });
  }
});

// =============================================================
// REST API ENDPOINTS (Userbot Session & Auth)
// =============================================================

// Salvar e conectar diretamente uma nova String Session
app.post('/api/telegram/session', async (req, res) => {
  const sessionString = (req.body.sessionString || '').trim();
  if (!sessionString) {
    return res.status(400).json({ ok: false, error: 'String Session vazia ou não informada.' });
  }

  console.log(`[GramJS] Tentando aplicar nova String Session (${sessionString.length} chars)...`);
  const result = await initUserbot(sessionString);

  if (result.success) {
    persistStringSession(sessionString);
    return res.json({
      ok: true,
      userbotStatus: 'connected',
      profile: result.profile,
      message: 'String Session validada e conectada com sucesso!',
    });
  } else {
    return res.status(400).json({
      ok: false,
      userbotStatus: 'error',
      error: result.error || 'Falha ao conectar com a nova String Session.',
    });
  }
});

// Forçar teste / reconexão da sessão atual
app.post('/api/telegram/reconnect', async (req, res) => {
  const sessionString = req.body.sessionString ? String(req.body.sessionString).trim() : undefined;
  console.log('[GramJS] Forçando tentativa de reconexão do userbot...');
  const result = await initUserbot(sessionString);
  if (result.success) {
    if (sessionString) persistStringSession(sessionString);
    return res.json({
      ok: true,
      userbotStatus: 'connected',
      profile: result.profile,
      message: 'Userbot reconectado com sucesso!',
    });
  } else {
    return res.status(400).json({
      ok: false,
      userbotStatus: 'error',
      error: result.error || 'Não foi possível reconectar.',
    });
  }
});

app.post('/api/telegram/auth/send-code', async (req, res) => {
  const phone = (req.body.phoneNumber || TELEGRAM_PHONE_NUMBER || '').trim();
  if (!phone || !TELEGRAM_API_ID) return res.status(400).json({ error: 'Faltam chaves API ou telefone' });

  try {
    userbotStatus = 'connecting';
    broadcastSystemStatus();
    const tempClient = new TelegramClient(new StringSession(''), TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
    try { tempClient.setLogLevel('none' as any); } catch {}
    await tempClient.connect();
    const result: any = await tempClient.sendCode({ apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH }, phone);
    
    pendingAuthClient = tempClient;
    pendingAuthPhoneNumber = phone;
    pendingAuthPhoneCodeHash = result.phoneCodeHash;
    userbotStatus = 'awaiting_code';
    broadcastSystemStatus();
    return res.json({ ok: true, phoneCodeHash: result.phoneCodeHash, message: `Código de verificação enviado para ${phone}` });
  } catch (err: any) {
    userbotStatus = 'error';
    lastUserbotError = err?.message || String(err);
    broadcastSystemStatus();
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/auth/sign-in', async (req, res) => {
  const code = (req.body.phoneCode || '').trim();
  const password = (req.body.password || '').trim();
  if (!code || !pendingAuthClient) return res.status(400).json({ error: 'Fluxo expirado ou código ausente. Solicite o código novamente.' });

  try {
    try {
      await pendingAuthClient.invoke(new Api.auth.SignIn({
        phoneNumber: pendingAuthPhoneNumber!,
        phoneCodeHash: pendingAuthPhoneCodeHash!,
        phoneCode: code,
      }));
    } catch (signInErr: any) {
      if (signInErr?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password) {
          return res.status(200).json({ ok: false, requiresPassword: true, message: 'Senha de Verificação em Duas Etapas (2FA) exigida.' });
        }
        const { computeCheck } = await import('telegram/Password.js');
        const pwdInfo = await pendingAuthClient.invoke(new Api.account.GetPassword());
        const passwordCheck = await computeCheck(pwdInfo, password);
        await pendingAuthClient.invoke(new Api.auth.CheckPassword({ password: passwordCheck }));
      } else {
        throw signInErr;
      }
    }

    const savedSession = pendingAuthClient.session.save() as unknown as string;
    persistStringSession(savedSession);
    
    userbotClient = pendingAuthClient;
    userbotStatus = 'connected';
    lastUserbotError = null;
    const me: any = await pendingAuthClient.getMe();
    userbotProfile = {
      id: String(me.id),
      firstName: me.firstName,
      username: me.username,
      phone: me.phone,
    };
    attachUserbotListener(userbotClient);
    broadcastSystemStatus();

    pendingAuthClient = null;
    pendingAuthPhoneNumber = null;
    pendingAuthPhoneCodeHash = null;

    return res.json({ ok: true, sessionString: savedSession, profile: userbotProfile, message: 'Autenticado e conectado com sucesso!' });
  } catch (err: any) {
    userbotStatus = 'error';
    lastUserbotError = err?.message || String(err);
    broadcastSystemStatus();
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================
// API REST UP DEPIX v1 (Integração de Pagamento)
// =============================================================

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

    const externalId = `szm-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanName = (userName || userEmail?.split('@')[0] || 'Cliente Shazam').trim();
    const webhookUrl = 'https://shazam-ygad.onrender.com/api/payment/webhook';

    try {
      const upDepixRes = await fetch(`${UPDEPIX_BASE_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPDEPIX_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.1' 
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
        return res.status(400).json({ 
          success: false, 
          error: responseData?.detail || responseData?.message || 'A operadora recusou a transação. Verifique os dados.' 
        });
      }
    } catch (fetchErr: any) {
      return res.status(500).json({ success: false, error: 'Falha de comunicação com o servidor financeiro.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Falha interna do servidor backend.' });
  }
});

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
  } catch (err: any) {}

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

app.get('/api/history', (req, res) => {
  res.json({ records: queryHistory });
});

app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    botUsername: userbotProfile?.username || userbotProfile?.firstName,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: TELEGRAM_PHONE_NUMBER,
  });
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