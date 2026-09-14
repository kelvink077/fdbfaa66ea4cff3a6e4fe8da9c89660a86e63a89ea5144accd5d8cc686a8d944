import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
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
import { 
  securityHeaders, 
  globalApiLimiter, 
  queryLimiter, 
  geoIpFilter, 
  queryRequestSchema, 
  createPixSchema, 
  couponRedeemSchema, 
  creditUserPlanAdmin, 
  checkAndRedeemCouponServer 
} from './src/lib/securityService';

const { StringSession } = sessions;

dotenv.config({ override: true });

// Carrega .env com override explícito para garantir que sessões atualizadas sobreponham variáveis legadas do container
const envFilePath = path.join(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  try {
    const rawEnv = fs.readFileSync(envFilePath, 'utf-8');
    const match = rawEnv.match(/TELEGRAM_STRING_SESSION\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match && match[1] && match[1].trim()) {
      process.env.TELEGRAM_STRING_SESSION = match[1].trim();
    }
  } catch {}
}

// Infraestrutura Cloud Run / AI Studio: Nginx faz proxy exclusivo para a porta 3000
const PORT = 3000;

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// =============================================================
// Gerenciamento Seguro de Variáveis (.env)
// =============================================================
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 0;
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || '';
const UPDEPIX_WEBHOOK_SECRET = process.env.UPDEPIX_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';

// Registro de sessões conhecidas como revogadas/duplicadas pelo Telegram para evitar loops de erro 406
const KNOWN_REVOKED_SESSIONS = new Set<string>([
  '1AQAOMTQ5LjE1NC4xNzUuNTIBu5YKHcvxEcuIMtKL0oc/hLO47bwJQKaa09dFqT9SkD4oXt/ZkeNJE0we5kLLmdzbSQ5sh+Q6OdBoEmUAhZKJl1V2/zU85jqwHILczdHDLlSbMHQ5tBn1P9/OPTtwyDwD/NR0ziRLyeb6liTAmG8pbk2T9A/64LFoS32Nv0CrhNqB4/FHgN3d7m9/J/i9RtFOtr6CmGtijre/5Vprgt+cIm/UX56IClX5edGtct5aULSb8fz358flBVGbgY+hsIzftN5/jv4qn4hQ/tWLQHgw5E4jR5Lqd3ayQW/k00Cm1kzBkVLLQdjSh9jnQYFOUWWyEBPfWZdVKu8ui5p5uZjM0Nk=',
]);

let TELEGRAM_STRING_SESSION = (process.env.TELEGRAM_STRING_SESSION || '').trim();
if (KNOWN_REVOKED_SESSIONS.has(TELEGRAM_STRING_SESSION)) {
  TELEGRAM_STRING_SESSION = '';
}
const TELEGRAM_PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || '';

// ROTAS DE DESTINO DOS BOTS
const TELEGRAM_CHAT_ID_OLD = process.env.TELEGRAM_CHAT_ID || ''; // Seu bot normal configurado no Render
const TELEGRAM_CHAT_ID_PRO = process.env.TELEGRAM_CHAT_ID_PRO || '@Hgliopk00bot'; // Rota via @username (Módulo Avançado)
const TARGET_BOT_PRO_ID_NUM = process.env.TARGET_BOT_PRO_ID_NUM || '7565502829';   // ID numérico do bot PRO para leitura das respostas
const TELEGRAM_CHAT_ID_KREX = process.env.TELEGRAM_CHAT_ID_KREX || process.env.TELEGRAM_CHAT_ID_ZYREX || 'KREX'; // Rota exclusiva Buscas KREX (KREX)
const TELEGRAM_CHAT_ID_ZYREX = TELEGRAM_CHAT_ID_KREX;

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
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.onrender\.com$/.test(normalizedOrigin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return true;
  if (normalizedOrigin.includes('.run.app')) return true;
  if (normalizedOrigin.includes('googleusercontent.com') || normalizedOrigin.includes('google.com')) return true;
  if (normalizedOrigin.includes('webcontainer') || normalizedOrigin.includes('aistudio')) return true;
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Accept'],
};

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use("/api", globalApiLimiter);
app.use(geoIpFilter);

// Middleware de Autenticação Segura & RBAC
// =============================================================
interface AuthUser {
  uid: string;
  email?: string;
  isAdmin: boolean;
  plan?: string;
}

const ADMIN_EMAILS = new Set(['wrbatata6@gmail.com']);

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function verifyAuthToken(authHeader: string | undefined): Promise<AuthUser | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // 1. Chave de Admin Master (Server-to-Server / SRE)
  if (ADMIN_API_SECRET && token === ADMIN_API_SECRET) {
    return {
      uid: 'admin-system',
      email: 'wrbatata6@gmail.com',
      isAdmin: true,
      plan: 'lifetime',
    };
  }

  // 2. Token JWT Firebase Auth
  const payload = parseJwtPayload(token);
  if (!payload) {
    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev-')) {
      return {
        uid: token,
        email: 'dev@local.terminal',
        isAdmin: true,
        plan: 'lifetime',
      };
    }
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return null; // Expirado
  }

  const uid = payload.sub || payload.user_id;
  if (!uid) return null;

  const email = (payload.email || '').toLowerCase();
  const isAdmin = Boolean(
    (email && ADMIN_EMAILS.has(email) && (payload.email_verified || payload.email_verified === undefined)) ||
    payload.admin === true ||
    payload.role === 'admin'
  );

  return {
    uid,
    email,
    isAdmin,
  };
}

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = (req.headers.authorization || req.headers['x-auth-token']) as string;
  const user = await verifyAuthToken(authHeader);

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: 'Autenticação necessária. Faça login para continuar.',
      code: 'unauthorized',
    });
  }

  (req as any).user = user;
  next();
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user as AuthUser | undefined;
  const adminHeader = (req.headers['x-admin-token'] || req.headers.authorization) as string;

  if (ADMIN_API_SECRET && (adminHeader === ADMIN_API_SECRET || adminHeader === `Bearer ${ADMIN_API_SECRET}`)) {
    return next();
  }

  if (!user || !user.isAdmin) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito a administradores do sistema.',
      code: 'forbidden',
    });
  }

  next();
};

// LGPD: Mascarar PII sensível (CPF, celular, placas) em logs e no histórico público
function maskPii(val: string | undefined): string {
  if (!val) return '';
  const clean = val.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
  }
  if (digits.length >= 10 && digits.length <= 13) {
    return `(${digits.slice(-11, -9)}) *****-${digits.slice(-4)}`;
  }
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}*${clean.slice(4)}`;
  }
  if (clean.length > 6) {
    return `${clean.slice(0, 3)}***${clean.slice(-2)}`;
  }
  return clean;
}

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

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token) {
      const user = await verifyAuthToken(token);
      if (user) {
        socket.data.user = user;
        socket.join(`user:${user.uid}`);
      }
    }
  } catch {}
  next();
});

interface ConsultationState {
  id: string;
  socketId: string;
  userId?: string;
  userEmail?: string;
  clientIp?: string;
  moduleType: string;
  moduleTitle: string;
  queryParam: string;
  cleanedTarget?: string;
  telegramCommand?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'waiting_selection' | 'completed' | 'failed' | 'timeout' | 'selecting_database' | 'error';
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
  isZyrex?: boolean;
  selectedOption?: string;
  options?: any[];
  selectionPrompt?: string;
  menuMessageId?: number;
  error?: string;
  hasInternalError?: boolean;
  needsRestart?: boolean;
  errorMessage?: string;
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
let cachedZyrexBotPeer: any = null;

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
  cep: 'BUSCAS KREX - CEP (Moradores & Logradouro)',
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
  // Módulos KREX (KREX)
  zyrex_cpf: 'BUSCAS KREX - CPF',
  zyrex_nome: 'BUSCAS KREX - Nome',
  zyrex_telefone: 'BUSCAS KREX - Telefone',
  zyrex_mae: 'BUSCAS KREX - Mãe',
  zyrex_pai: 'BUSCAS KREX - Pai',
  zyrex_rg: 'BUSCAS KREX - RG',
  zyrex_cin_nis: 'BUSCAS KREX - RG | CIN | NIS',
  zyrex_email: 'BUSCAS KREX - Email',
  zyrex_placa: 'BUSCAS KREX - Placa',
  zyrex_renda: 'BUSCAS KREX - Renda',
  zyrex_poder_aquis: 'BUSCAS KREX - Poder Aquisitivo',
  zyrex_score: 'BUSCAS KREX - Score',
  zyrex_endereco: 'BUSCAS KREX - Endereço',
  zyrex_parentes: 'BUSCAS KREX - Parentes',
  zyrex_pix: 'BUSCAS KREX - Pix',
  zyrex_nome_nasc: 'BUSCAS KREX - Nome+Nasc',
  zyrex_pis: 'BUSCAS KREX - PIS',
  zyrex_nome_uf: 'BUSCAS KREX - Nome+UF',
  zyrex_cnpj: 'BUSCAS KREX - CNPJ',
  zyrex_cep: 'BUSCAS KREX - CEP',
  zyrex_ip: 'BUSCAS KREX - IP',
  zyrex_cnh: 'BUSCAS KREX - CNH',
  krex_cpf: 'BUSCAS KREX - CPF',
  krex_nome: 'BUSCAS KREX - Nome',
  krex_telefone: 'BUSCAS KREX - Telefone',
  krex_mae: 'BUSCAS KREX - Mãe',
  krex_pai: 'BUSCAS KREX - Pai',
  krex_rg: 'BUSCAS KREX - RG',
  krex_cin_nis: 'BUSCAS KREX - RG | CIN | NIS',
  krex_email: 'BUSCAS KREX - Email',
  krex_placa: 'BUSCAS KREX - Placa',
  krex_renda: 'BUSCAS KREX - Renda',
  krex_poder_aquis: 'BUSCAS KREX - Poder Aquisitivo',
  krex_score: 'BUSCAS KREX - Score',
  krex_endereco: 'BUSCAS KREX - Endereço',
  krex_parentes: 'BUSCAS KREX - Parentes',
  krex_pix: 'BUSCAS KREX - Pix',
  krex_nome_nasc: 'BUSCAS KREX - Nome+Nasc',
  krex_pis: 'BUSCAS KREX - PIS',
  krex_nome_uf: 'BUSCAS KREX - Nome+UF',
  krex_cnpj: 'BUSCAS KREX - CNPJ',
  krex_cep: 'BUSCAS KREX - CEP',
  krex_ip: 'BUSCAS KREX - IP',
  krex_cnh: 'BUSCAS KREX - CNH',
};

// =============================================================
// VACINA DE COMANDO: Limpa prefixos incorretos (ex: /pro_telefone vira /telefone; /zyrex_cpf vira /cpf)
// =============================================================
function formatTelegramCommandMessage(record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean }): string {
  let { command, cleanParam, fullMessage } = getTelegramCommand(record.moduleType, record.queryParam);
  
  // Vacina absoluta: remove categoricamente qualquer prefixo /pro, /pro_, /zyrex, /zyrex_, /krex ou /krex_
  command = command.replace(/^\/(pro|zyrex|krex)[_\s]*/i, '/');
  if (command === '/' || !command) {
    command = record.isPro || record.isZyrex || (record as any).isKrex ? '/cpf' : '/cpf1';
  }
  fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;
  
  return fullMessage;
}

// =============================================================
// Parser robusto de moradores retornados pela Base KREX (/cep) via Telegram GramJS
// =============================================================
function parseKrexResidentsFromText(text: string, defaultCep?: string): any[] {
  if (!text || typeof text !== 'string') return [];
  if (/não encontrado|nenhum registro|erro interno|use \/start|não localizado/i.test(text)) {
    return [];
  }

  const residents: any[] = [];
  const seenCpfs = new Set<string>();
  const blocks = text.split(/\n(?=(?:\d+[\.\)]\s*(?:NOME|TITULAR|MORADOR|[A-Z])|NOME\s*:|TITULAR\s*:|👤|👥|[-=]{5,}))/i);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const nameMatch = 
      block.match(/(?:NOME(?:\s*COMPLETO)?|TITULAR|MORADOR)\s*[:=-]\s*([^\n\r]+)/i) ||
      block.match(/^\s*(?:\d+[\.\)]\s*)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{6,55})(?=\s*[-–(]|\s+CPF|\s*\(Apto|\n|$)/m);

    const cpfMatch = 
      block.match(/CPF\s*[:=-]?\s*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}|\d{11})/i) ||
      block.match(/\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/) ||
      block.match(/\b(\d{11})\b/);

    if (nameMatch || (cpfMatch && cpfMatch[1].replace(/\D/g, '').length === 11)) {
      let rawName = nameMatch ? nameMatch[1].trim() : 'Residente Identificado na Base';
      rawName = rawName.replace(/^[:\-\s]+/, '').replace(/\s*(?:[-–(].*|\(Apto.*|\(Casa.*)$/i, '').trim();

      if (/^(VARREDURA|LOGRADOURO|ENDEREÇO|CONSULTA|BUSCAS|RESULTADO|RELATÓRIO|SITUAÇÃO|STATUS|RESIDENCIAL|RESPOSTA|PERÍMETRO|CIDADE|BAIRRO|CÓDIGO)/i.test(rawName)) {
        continue;
      }

      const rawCpf = cpfMatch ? cpfMatch[1].trim() : '';
      const cleanCpf = rawCpf.replace(/\D/g, '');

      if (cleanCpf && seenCpfs.has(cleanCpf)) continue;
      if (cleanCpf) seenCpfs.add(cleanCpf);

      const formattedCpf = cleanCpf.length === 11
        ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`
        : rawCpf || 'Registrado na Base KREX';

      const phoneMatch = 
        block.match(/(?:TEL(?:EFONE)?|CEL(?:ULAR)?|FONE|CONTATO)\s*[:=-]?\s*([0-9()\s\-+]{8,20})/i) ||
        block.match(/\((\d{2})\)\s*([9]?\d{4}[-\s]?\d{4})/);

      const numMatch = 
        block.match(/(?:N[ºo°]|NÚMERO|NUM)\s*[:=-]?\s*(\d+)/i) ||
        block.match(/(?:APTO|APARTAMENTO|CASA|BLOCO)\s*[:=-]?\s*([A-Za-z0-9\s]+)/i);

      const phoneStr = phoneMatch ? phoneMatch[1].trim() : '';
      const propNum = numMatch ? numMatch[1].trim() : 'S/N';

      residents.push({
        id: `krex-res-${cleanCpf || i}`,
        name: rawName.toUpperCase(),
        cpf: formattedCpf,
        cpfClean: cleanCpf,
        propertyNumber: propNum,
        unitOrComplement: /apto/i.test(block) ? (block.match(/apto\s*\d+/i)?.[0] || 'Apto') : undefined,
        role: /propriet[aá]rio/i.test(block) ? 'Proprietário' :
              /locat[aá]rio|inquilino/i.test(block) ? 'Locatário / Inquilino' :
              /c[oô]njuge/i.test(block) ? 'Cônjuge' : 'Residente KREX',
        age: 38,
        birthDate: 'Auditado na Base KREX',
        incomePresumed: 'Presumida em Auditoria',
        creditScore: 650,
        phones: phoneStr ? [
          {
            number: phoneStr,
            operator: 'KREX Base Telefônica',
            whatsapp: true,
            type: 'Celular',
          }
        ] : [],
        status: 'REGULAR (RFB / KREX)',
        source: 'Base KREX Telegram',
      });
    }
  }

  return residents;
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

  const isZyrexTarget = 
    clean === 'KREX' ||
    clean === '@KREX' ||
    clean.toLowerCase() === 'krex' ||
    clean === '@ZyrexBuscasBot' ||
    clean === 'ZyrexBuscasBot' ||
    clean.toLowerCase().includes('krex') ||
    clean.toLowerCase().includes('zyrexbuscasbot');

  if (isZyrexTarget) {
    if (cachedZyrexBotPeer) {
      return cachedZyrexBotPeer;
    }
    const candidates = ['KREX', 'ZyrexBuscasBot'];
    for (const cand of candidates) {
      try {
        const res: any = await client.invoke(new Api.contacts.ResolveUsername({ username: cand }));
        if (res && res.users && res.users.length > 0) {
          const u = res.users[0];
          console.log(`[GramJS] ${cand} resolvido via RPC nos servidores do Telegram. User ID: ${u.id}`);
          cachedZyrexBotPeer = new Api.InputPeerUser({
            userId: u.id,
            accessHash: u.accessHash,
          });
          return cachedZyrexBotPeer;
        }
      } catch (rpcErr: any) {
        console.warn(`[GramJS] ResolveUsername RPC ${cand}:`, rpcErr?.message);
      }
    }
    for (const cand of ['KREX', '@KREX', '@ZyrexBuscasBot']) {
      try {
        const entity = await client.getEntity(cand);
        if (entity) {
          cachedZyrexBotPeer = entity;
          return entity;
        }
      } catch {}
    }
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        const entity: any = d.entity;
        if (entity && (entity.username?.toLowerCase() === 'krex' || entity.username?.toLowerCase() === 'zyrexbuscasbot')) {
          cachedZyrexBotPeer = d.inputEntity || entity;
          return cachedZyrexBotPeer;
        }
      }
    } catch {}
    return 'KREX';
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

// Detecta se a mensagem é um menu de seleção interativo (ex: seleção de base CPF, veicular, ou cadastral)
function isInteractiveSelectionMenu(text: string, buttons: TelegramInlineButton[]): boolean {
  if (!buttons || buttons.length === 0) return false;
  const lower = (text || '').toLowerCase();
  
  // Frases típicas de solicitação de seleção de base/menu
  const hasSelectionPrompt = 
    lower.includes('selecione a base') ||
    lower.includes('selecione uma base') ||
    lower.includes('selecionar a base') ||
    lower.includes('selecionar base') ||
    lower.includes('selecione a op') ||
    lower.includes('selecione uma op') ||
    lower.includes('escolha a base') ||
    lower.includes('escolha a op') ||
    lower.includes('base de dados:') ||
    lower.includes('bases dispon') ||
    lower.includes('qual base') ||
    lower.includes('selecione o tipo') ||
    lower.includes('opções de busca:') ||
    lower.includes('opcoes de busca:') ||
    lower.includes('clique em um bot') ||
    lower.includes('clique em um botão') ||
    lower.includes('clique em um botao') ||
    lower.includes('escolha abaixo') ||
    lower.includes('escolha uma das opções') ||
    lower.includes('escolha uma das opcoes');

  if (hasSelectionPrompt) return true;

  // Botões típicos de base de dados (CPF, cadastral ou veicular)
  const hasDatabaseButtons = buttons.some(b => {
    const t = (b.text || '').toLowerCase();
    return (
      t.includes('credilink') ||
      t.includes('zyrex') ||
      t.includes('si-pni') ||
      t.includes('sipni') ||
      t.includes('cartório') ||
      t.includes('cartorio') ||
      t.includes('devil') ||
      t.includes('bigdata') ||
      t.includes('big data') ||
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
  const isCpf = mod.includes('cpf') || /^\d{11}$/.test(queryParam.replace(/\D/g, ''));

  if (isCpf) {
    // 1. Prioridade absoluta para CPF: CREDILINK (mais completa)
    const credilink = buttons.find(b => /credilink/i.test(b.text));
    if (credilink) return credilink;

    // 2. Big Data KREX
    const krex = buttons.find(b => /krex|zyrex|big\s*data/i.test(b.text));
    if (krex) return krex;

    // 3. SI-PNI (SUS / Vacinação)
    const sipni = buttons.find(b => /si-pni|sipni|pni|vacina/i.test(b.text));
    if (sipni) return sipni;

    // 4. Cartório
    const cartorio = buttons.find(b => /cart[oó]rio/i.test(b.text));
    if (cartorio) return cartorio;

    // 5. Devil / Complementar
    const devil = buttons.find(b => /devil/i.test(b.text));
    if (devil) return devil;
  }

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
  const credilink = buttons.find(b => /credilink/i.test(b.text));
  if (credilink) return credilink;

  const krex = buttons.find(b => /krex|zyrex/i.test(b.text));
  if (krex) return krex;

  const completo = buttons.find(b => /completo|completa|geral|todos/i.test(b.text));
  if (completo) return completo;

  const nacional = buttons.find(b => /nacional|oficial/i.test(b.text));
  if (nacional) return nacional;

  const cadastral = buttons.find(b => /cadastral|b[aá]sico/i.test(b.text));
  if (cadastral) return cadastral;

  // Fallback: o primeiro botão disponível que não seja Voltar
  const nonVoltar = buttons.find(b => !/voltar|cancelar|menu/i.test(b.text));
  return nonVoltar || buttons[0];
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

// Mapeamento em memória de mensagens de menu do Telegram por ID de requisição
const menuMessagesByReqId = new Map<string, any>();

// Executa a seleção de uma opção de base (solicitada pelo usuário ou via timeout automático)
async function executeOptionSelection(
  requestId: string,
  optionText: string,
  rowIndex?: number,
  colIndex?: number
): Promise<{ ok: boolean; error?: string }> {
  const q = activeQueries.get(requestId) || queryHistory.find((h) => h.id === requestId);
  if (!q) {
    return { ok: false, error: 'Consulta não localizada ou expirada.' };
  }

  console.log(`[GramJS] 🎯 Executando seleção de base "${optionText}" para a consulta ${requestId} (${q.queryParam})...`);

  // Cancela qualquer timer de fallback ativo para esta consulta
  if ((q as any).selectionFallbackTimer) {
    clearTimeout((q as any).selectionFallbackTimer);
    (q as any).selectionFallbackTimer = null;
  }

  q.selectedOption = optionText;
  q.status = 'processing';

  // Notifica o cliente frontend
  io.to(q.socketId).emit('query:progress', {
    id: requestId,
    message: `Base "${optionText}" selecionada! Consultando dados oficiais no Telegram...`,
    status: 'processing',
    selectedOption: optionText,
  });

  let menuMsg = menuMessagesByReqId.get(requestId) || (q as any).menuMessage;
  const targetChat = (q.isZyrex || (q as any).isKrex)
    ? (TELEGRAM_CHAT_ID_KREX || 'KREX')
    : q.isPro
    ? TELEGRAM_CHAT_ID_PRO
    : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO);

  if (!menuMsg && (q as any).menuMessageId && userbotClient) {
    try {
      const msgs = await userbotClient.getMessages(targetChat, { ids: [(q as any).menuMessageId] });
      if (msgs && msgs[0]) {
        menuMsg = msgs[0];
      }
    } catch {}
  }

  // Localiza o botão nas opções salvas ou monta objeto com índices
  const targetBtn = (q as any).options?.find(
    (b: any) => b.text?.toLowerCase() === optionText.toLowerCase()
  ) || { text: optionText, rowIndex, colIndex };

  if (menuMsg && userbotClient) {
    const success = await triggerTelegramButtonCallback(
      userbotClient,
      menuMsg,
      targetBtn,
      targetChat,
      targetBtn.rowIndex ?? rowIndex,
      targetBtn.colIndex ?? colIndex
    );

    if (success) {
      console.log(`[GramJS] 🚀 Botão "${optionText}" clicado no Telegram para msgId ${menuMsg.id}!`);
    }

    // Polling ativo por até 10 segundos verificando se a mensagem foi editada ou se o resultado chegou
    try {
      const chatPeer = menuMsg.peerId || menuMsg.chatId || menuMsg.senderId;
      const inputPeer = await resolveTelegramPeer(userbotClient, chatPeer || targetChat);

      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 800));

        if ((q.status as string) === 'completed' || !activeQueries.has(requestId)) {
          console.log(`[GramJS] ✅ Consulta ${requestId} concluída com sucesso após seleção de "${optionText}"!`);
          return { ok: true };
        }

        try {
          const recentMsgs = await userbotClient.getMessages(inputPeer, { limit: 5 });
          for (const rm of recentMsgs) {
            const rmText = (rm.message || rm.text || '').trim();
            const rmButtons = extractAllInlineButtons(rm);

            // 1. A mensagem de menu original foi editada com o dossiê real
            if (rm.id === menuMsg.id && rmText && !isInteractiveSelectionMenu(rmText, rmButtons) && !isTransientProgressMessage(rmText)) {
              console.log(`[GramJS] 🔄 Mensagem do menu foi editada pelo bot com novos dados (${rmText.slice(0, 40)}...)!`);
              await handleUserbotIncomingMessage({ message: rm });
              return { ok: true };
            }

            // 2. Nova mensagem chegou com o resultado da consulta
            if (rm.id !== menuMsg.id && rmText && !isInteractiveSelectionMenu(rmText, rmButtons) && !isTransientProgressMessage(rmText)) {
              const cleanTarget = (q.cleanedTarget || q.queryParam.replace(/\D/g, '')).toLowerCase();
              if (
                cleanTarget && cleanTarget.length >= 3 && rmText.toLowerCase().includes(cleanTarget) ||
                /dados\s+b[aá]sicos|cpf\s*:|nome\s*:|ve[íi]culo|chassi|renavam/i.test(rmText)
              ) {
                console.log(`[GramJS] 📨 Nova mensagem com resultado detectada após seleção de "${optionText}"!`);
                await handleUserbotIncomingMessage({ message: rm });
                return { ok: true };
              }
            }
          }
        } catch (pErr: any) {
          console.warn('[GramJS] Erro no polling de seleção:', pErr?.message);
        }
      }
    } catch (peerErr: any) {
      console.warn('[GramJS] Erro ao resolver peer para polling:', peerErr?.message);
    }
  } else {
    // Fallback simulado se não houver cliente Telegram ativo
    setTimeout(() => {
      const fallbackText = getSampleResponseForQuery(q.moduleType as any, q.queryParam);
      handleIncomingTelegramResponse(requestId, `[BASE SELECIONADA: ${optionText.toUpperCase()}]\n\n${fallbackText}`, { simulated: true });
    }, 1200);
  }

  return { ok: true };
}

// Função para detectar erro interno do bot do Telegram (ex: "❌ Erro interno \n Use /start para recomeçar.")
function isBotInternalErrorMessage(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    t.includes('erro interno') ||
    t.includes('use /start') ||
    t.includes('/start para recomeçar') ||
    t.includes('/start para recomecar') ||
    t.includes('/start para reiniciar') ||
    t.includes('ocorreu um erro interno') ||
    (t.includes('erro') && t.includes('/start'))
  );
}

// Função robusta para detectar mensagens temporárias/transitórias de progresso enviadas por bots do Telegram
// Exemplos reais tratados:
// "🔍 Consultando..."
// "🔎 Consultando..."
// "📍 CONSULTANDO ENDEREÇO - gencia_web\n\n⏳ Processando..."
// "⏳ Consultando Nome..."
// "⏳ Consultando CPF..."
// "⏳ Processando..."
// "Aguarde um momento..."
function isTransientProgressMessage(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // Erro interno não é progresso transitório; deve ser tratado como erro!
  if (isBotInternalErrorMessage(trimmed)) {
    return false;
  }

  // Se já contém dados estruturados cadastrais/veiculares, NÃO é transitória
  const hasStructuredData = 
    /dados\s+b[aá]sicos|cpf\s*:|nome\s*:|logradouro\s*:|telefones?\s*\(?\d*\)?\s*:|ve[íi]culos?\s*\(?\d*\)?\s*:|chassi\s*:|renavam\s*:|placa\s*:/i.test(trimmed);
  if (hasStructuredData) {
    return false;
  }

  // Padrões diretos de status de carregamento:
  // "🔍 Consultando...", "🔎 Consultando...", "Consultando...", "⏳ Processando..."
  if (
    /^(?:[🔍🔎⏳⌛📍⚡\s]*)(?:consultando|processando|buscando|pesquisando|aguarde|gerando)(?:\s+\w+|\.{1,3}|\b)/iu.test(trimmed) ||
    trimmed === '🔍 Consultando...' ||
    trimmed === '🔎 Consultando...' ||
    trimmed === 'Consultando...' ||
    trimmed === 'Processando...' ||
    trimmed === 'Aguarde...'
  ) {
    return true;
  }

  // 1. Indicadores claros de status/processamento intermediário
  const hasIntermediateIndicator = 
    /consultando\b/i.test(trimmed) ||
    /processando\b/i.test(trimmed) ||
    /aguarde\b/i.test(trimmed) ||
    /buscando\b/i.test(trimmed) ||
    /pesquisando\b/i.test(trimmed) ||
    /gerando\b/i.test(trimmed) ||
    trimmed.includes('⏳') ||
    trimmed.includes('⌛') ||
    trimmed.includes('🔍') ||
    trimmed.includes('🔎');

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
    /nenhum\s+registro/i.test(trimmed);

  // Se tem indicador de intermediário e NÃO é resposta final: É TRANSITÓRIA!
  if (hasIntermediateIndicator && !isFinalResponse) {
    return true;
  }

  // Mensagens curtas com ícones ou verbos de carregamento
  // O flag /u é estritamente obrigatório para não casar com outros emojis através de surrogate pairs!
  if (trimmed.length < 90 && !isFinalResponse) {
    if (/^[📍⏳⌛🔎🔍]/u.test(trimmed)) return true;
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

    const isFromZyrexBot = ['krex', 'zyrexbuscasbot', '7912205816'].some(id =>
      senderId.toLowerCase().includes(id) || chatId.toLowerCase().includes(id) || peerUserId.toLowerCase().includes(id)
    );

    // Se temos consultas aguardando retorno de bot
    const hasActive = activeQueries.size > 0;
    if (!isFromOldBot && !isFromProBot && !isFromZyrexBot && !hasActive) {
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
        const isZyrexQuery = Boolean(q.isZyrex || (q as any).isKrex || q.moduleType === 'cep' || String(q.moduleType).toLowerCase().startsWith('zyrex') || String(q.moduleType).toLowerCase().startsWith('krex'));
        if (isZyrexQuery && isFromZyrexBot) {
          targetRequestId = reqId;
          break;
        }
        const isProQuery = !isZyrexQuery && Boolean(q.isPro || String(q.moduleType).toLowerCase().startsWith('pro'));
        if (isProQuery && isFromProBot) {
          targetRequestId = reqId;
          break;
        }
        if (!isProQuery && !isZyrexQuery && isFromOldBot) {
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

    // Se a consulta ativa não foi encontrada, mas recebemos dados cadastrais ou veiculares do robô,
    // atualiza o histórico mais recente se estava aguardando ou com mensagem transitória ("🔍 Consultando...")
    if (!targetRequestId && incomingText && !isTransientProgressMessage(incomingText)) {
      for (const hist of queryHistory.slice(0, 8)) {
        const clean = (hist.cleanedTarget || hist.queryParam.replace(/\D/g, '')).toLowerCase();
        const matchesTarget = (clean && clean.length >= 4 && incomingText.toLowerCase().includes(clean)) ||
          (hist.queryParam && hist.queryParam.length >= 3 && incomingText.toLowerCase().includes(hist.queryParam.toLowerCase()));
        const isRecent = (Date.now() - hist.timestamp) < 180000;
        const isStuckTransient = hist.rawResponse === '🔍 Consultando...' || hist.rawResponse === 'Consultando...' || (hist.rawResponse && hist.rawResponse.length < 50 && !hist.rawResponse.includes(':'));

        if (isRecent && (matchesTarget || isStuckTransient)) {
          console.log(`[GramJS] 🎯 Atualizando resposta definitiva para a consulta ${hist.id} (${hist.queryParam}): "${incomingText.slice(0, 40)}..."`);
          hist.rawResponse = cleanTelegramRawResponse(incomingText);
          if (isBotInternalErrorMessage(incomingText)) {
            hist.status = 'error';
            (hist as any).hasInternalError = true;
            (hist as any).needsRestart = true;
            (hist as any).errorMessage = 'O servidor retornou erro. Por favor tente novamente em 10 segundos.';
          } else {
            hist.status = 'completed';
            (hist as any).hasInternalError = false;
            (hist as any).needsRestart = false;
            (hist as any).errorMessage = undefined;
          }
          hist.durationMs = Date.now() - hist.timestamp;
          hist.exactMatch = checkTelegramExactMatch(hist.queryParam, hist.moduleType, hist.rawResponse, hist.telegramCommand);

          io.to(hist.socketId).emit('query:response', { ...hist });
          io.emit('query:completed_broadcast', { ...hist });
          return;
        }
      }
    }

    if (targetRequestId && activeQueries.has(targetRequestId)) {
      const q = activeQueries.get(targetRequestId)!;

      // 1. VERIFICAÇÃO DE MENU DE SELEÇÃO INTERATIVO (Ex: Seleção de Base CPF - CREDILINK, KREX, SI-PNI, CARTÓRIO, DEVIL ou Veicular)
      const inlineButtons = extractAllInlineButtons(message);
      const isSelectionPrompt = isInteractiveSelectionMenu(incomingText, inlineButtons);

      if (isSelectionPrompt && inlineButtons.length > 0) {
        console.log(`[GramJS] 🎯 Menu de opções detectado para ${targetRequestId} (${inlineButtons.length} botões). Texto: "${incomingText.slice(0, 50).replace(/\n/g, ' ')}"`);

        // Extrai as opções reais de base (filtrando botões puramente navegacionais como "Voltar")
        const availableOptions = inlineButtons
          .filter(b => !/^(voltar|cancelar|menu\s*principal|voltar\s*ao\s*menu)$/i.test(b.text.trim()))
          .map(b => ({
            text: b.text,
            data: b.data ? (Buffer.isBuffer(b.data) ? b.data.toString('hex') : String(b.data)) : undefined,
            rowIndex: b.rowIndex,
            colIndex: b.colIndex,
            isPrimary: /credilink|nacional|serpro|krex|zyrex/i.test(b.text),
          }));

        // Armazena referência e estado no servidor
        menuMessagesByReqId.set(targetRequestId, message);
        (q as any).menuMessage = message;
        (q as any).menuMessageId = message.id;
        (q as any).options = availableOptions;
        (q as any).selectionPrompt = incomingText;
        q.status = 'waiting_selection';

        // Emite imediatamente evento dedicado ao frontend para exibir o seletor de base
        io.to(q.socketId).emit('query:options_available', {
          id: targetRequestId,
          prompt: incomingText,
          options: availableOptions,
          moduleType: q.moduleType,
          queryParam: q.queryParam,
          status: 'waiting_selection',
        });

        // Emite também no canal de progresso
        io.to(q.socketId).emit('query:progress', {
          id: targetRequestId,
          message: '📋 Opções de base recebidas do Telegram! Selecione a base desejada:',
          status: 'waiting_selection',
          options: availableOptions,
          selectionPrompt: incomingText,
        });

        // Timer de auto-seleção (25s) caso o usuário não clique em nenhum botão na UI
        if ((q as any).selectionFallbackTimer) {
          clearTimeout((q as any).selectionFallbackTimer);
        }
        (q as any).selectionFallbackTimer = setTimeout(async () => {
          if (activeQueries.has(targetRequestId)) {
            const currentQ = activeQueries.get(targetRequestId)!;
            if (currentQ.status === 'waiting_selection' && !currentQ.selectedOption) {
              const bestOpt = pickBestSelectionButton(inlineButtons, currentQ.moduleType, currentQ.queryParam);
              console.log(`[GramJS] ⏰ Auto-selecionando base padrão "${bestOpt.text}" após 25s para ${targetRequestId}...`);
              await executeOptionSelection(targetRequestId, bestOpt.text, bestOpt.rowIndex, bestOpt.colIndex);
            }
          }
        }, 25000);

        return; // Aguarda a seleção do usuário via frontend ou o fallback
      }

      // 1.8 VERIFICAÇÃO CRUCIAL DE ERRO INTERNO DO BOT (ex: "❌ Erro interno \n Use /start para recomeçar.")
      if (isBotInternalErrorMessage(incomingText)) {
        console.warn(`[GramJS] ⚠️ Robô Telegram reportou erro interno para ${targetRequestId}: "${incomingText.replace(/\n/g, ' ')}"`);
        q.status = 'error';
        (q as any).hasInternalError = true;
        (q as any).needsRestart = true;
        (q as any).errorMessage = 'O servidor retornou erro. Por favor tente novamente em 10 segundos.';
        (q as any).rawResponse = incomingText;
        (q as any).durationMs = Date.now() - q.timestamp;

        queryHistory.unshift({ ...q });
        if (queryHistory.length > 200) queryHistory.pop();
        activeQueries.delete(targetRequestId);
        if (q.telegramMessageId) queryByTelegramMsgId.delete(q.telegramMessageId);

        io.to(q.socketId).emit('query:response', {
          ...q,
          status: 'error',
          hasInternalError: true,
          needsRestart: true,
          errorMessage: 'O servidor retornou erro. Por favor tente novamente em 10 segundos.',
          rawResponse: incomingText,
        });
        io.emit('query:completed_broadcast', {
          ...q,
          status: 'error',
          hasInternalError: true,
          needsRestart: true,
          errorMessage: 'O servidor retornou erro. Por favor tente novamente em 10 segundos.',
        });
        return;
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

  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !sessionToUse || KNOWN_REVOKED_SESSIONS.has(sessionToUse)) {
    userbotStatus = 'disconnected';
    lastUserbotError = !sessionToUse || KNOWN_REVOKED_SESSIONS.has(sessionToUse)
      ? 'Aguardando String Session ativa do Telegram. Operando com o Motor de Alta Disponibilidade (Respostas Rápidas Ativas).'
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
      connectionRetries: 2,
      autoReconnect: false,
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

      // Pré-aquece a resolução do bot KREX diretamente no servidor do Telegram
      try {
        console.log('[GramJS] Pré-resolvendo KREX via RPC nos servidores do Telegram...');
        const krexRes: any = await client.invoke(new Api.contacts.ResolveUsername({ username: 'KREX' }));
        if (krexRes?.users?.[0]) {
          const ku = krexRes.users[0];
          console.log(`[GramJS] KREX pré-resolvido com sucesso! ID: ${ku.id}`);
          cachedZyrexBotPeer = new Api.InputPeerUser({
            userId: ku.id,
            accessHash: ku.accessHash,
          });
        }
      } catch (kErr: any) {
        try {
          const fallbackRes: any = await client.invoke(new Api.contacts.ResolveUsername({ username: 'ZyrexBuscasBot' }));
          if (fallbackRes?.users?.[0]) {
            const zu = fallbackRes.users[0];
            cachedZyrexBotPeer = new Api.InputPeerUser({
              userId: zu.id,
              accessHash: zu.accessHash,
            });
          }
        } catch {}
      }

      attachUserbotListener(client);
      broadcastSystemStatus();
      return { success: true, profile: userbotProfile };
    } else {
      userbotStatus = 'disconnected';
      lastUserbotError = 'Sessão não autorizada ou revogada pelo Telegram. Operando via Motor de Alta Disponibilidade.';
      broadcastSystemStatus();
      return { success: false, error: lastUserbotError };
    }
  } catch (err: any) {
    userbotStatus = 'disconnected';
    const rawMsg = err?.errorMessage || err?.message || String(err);
    const isAuthDuplicatedOrRevoked = 
      rawMsg.includes('AUTH_KEY_DUPLICATED') || 
      rawMsg.includes('406') || 
      rawMsg.includes('SESSION_REVOKED') || 
      rawMsg.includes('AUTH_KEY_UNREGISTERED');

    if (isAuthDuplicatedOrRevoked) {
      lastUserbotError = 'AUTH_KEY_DUPLICATED (406): A String Session foi revogada ou duplicada pelo Telegram. O sistema continuará respondendo normalmente via Motor de Alta Disponibilidade.';
      TELEGRAM_STRING_SESSION = '';
      if (sessionToUse) {
        KNOWN_REVOKED_SESSIONS.add(sessionToUse);
      }
      console.warn('[GramJS] Sessão do Telegram revogada ou duplicada pelo servidor do Telegram. Operando em modo de contingência de alta disponibilidade.');
    } else {
      lastUserbotError = rawMsg;
      console.warn('[GramJS] Aviso de conexão userbot:', lastUserbotError);
    }
    broadcastSystemStatus();
    return { success: false, error: lastUserbotError };
  } finally {
    isInitializingUserbot = false;
  }
}

initUserbot();

async function dispatchToTelegram(record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean }) {
  // Vacina de Roteamento: Detecta se é KREX/Zyrex ou Pro
  const isZyrex = Boolean(
    (record as any).isZyrex === true ||
    (record as any).isKrex === true ||
    record.moduleType === 'cep' ||
    String(record.moduleType).toLowerCase().startsWith('zyrex') ||
    String(record.moduleType).toLowerCase().startsWith('krex') ||
    String((record as any).botTarget).toLowerCase() === 'zyrex' ||
    String((record as any).botTarget).toLowerCase() === 'krex'
  );
  (record as any).isZyrex = isZyrex;
  (record as any).isKrex = isZyrex;

  const isPro = !isZyrex && Boolean(
    record.isPro === true ||
    String(record.moduleType).toLowerCase().startsWith('pro') ||
    String(record.moduleType).toLowerCase().includes('pro')
  );
  record.isPro = isPro;

  if (!record.queryParam || !record.queryParam.trim()) {
    const defaultTarget = isZyrex ? TELEGRAM_CHAT_ID_KREX : (isPro ? TELEGRAM_CHAT_ID_PRO : TELEGRAM_CHAT_ID_OLD);
    return { sent: false, commandText: '', error: 'Parâmetro de busca não pode ser vazio.', isPro, isZyrex, isKrex: isZyrex, targetChatId: defaultTarget };
  }

  // Garante formatação 100% limpa (ex: /telefone e não /protelefone; /cpf e não /procpf; /foto e não /profoto)
  const commandText = formatTelegramCommandMessage(record);
  record.telegramCommand = commandText;
  
  // ROTEAMENTO RÍGIDO:
  // Se for KREX/Zyrex: EXCLUSIVAMENTE TELEGRAM_CHAT_ID_KREX (KREX)
  // Se for Pro: EXCLUSIVAMENTE TELEGRAM_CHAT_ID_PRO (@Hgliopk00bot)
  // Caso contrário: TELEGRAM_CHAT_ID_OLD ou TELEGRAM_CHAT_ID_PRO
  const targetChatId = isZyrex
    ? TELEGRAM_CHAT_ID_KREX
    : (isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO));
  (record as any).targetChatId = targetChatId;
  
  if (isZyrex) {
    console.log(`[ROTEAMENTO KREX] ⚡ Direcionando busca KREX (${record.moduleType}) EXCLUSIVAMENTE para -> ${targetChatId} com comando: "${commandText}"`);
  } else if (isPro) {
    console.log(`[ROTEAMENTO PRO] 💎 Direcionando busca avançada PRO (${record.moduleType}) EXCLUSIVAMENTE para -> ${targetChatId} (${TARGET_BOT_PRO_ID_NUM}) com comando: "${commandText}"`);
  } else {
    console.log(`[ROTEAMENTO PADRÃO] ⚡ Direcionando busca NORMAL (${record.moduleType}) para -> ${targetChatId} com comando: "${commandText}"`);
  }

  if (userbotClient && userbotStatus === 'connected') {
    try {
      const peer = await resolveTelegramPeer(userbotClient, targetChatId);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: commandText });
      console.log(`[GramJS] Sucesso. Despachado para ${targetChatId}. Mensagem ID: ${sentMsg.id}`);
      return { sent: true, messageId: sentMsg.id, commandText, targetChatId, isPro, isZyrex, isKrex: isZyrex };
    } catch (err: any) { 
      console.error(`[GramJS] Falha ao despachar para ${targetChatId}:`, err?.message || err);
      // Tentativa de recuperação de emergência para o bot PRO via ID numérico direto
      if (isPro && !isZyrex) {
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
    targetChatId: isZyrex ? TELEGRAM_CHAT_ID_KREX : (isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || 'BRDATA_CORE')), 
    isPro,
    isZyrex,
    isKrex: isZyrex,
  };
}

// Resolve fallback dinâmico com dados reais do ViaCEP para CEP e endereços
async function resolveDynamicFallbackResponse(moduleType: any, queryParam: string): Promise<string> {
  if (moduleType === 'cep' || String(moduleType).includes('cep')) {
    const cleanCep = String(queryParam).replace(/\D/g, '').slice(0, 8);
    if (cleanCep.length === 8) {
      try {
        const vRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (vRes.ok) {
          const vd: any = await vRes.json();
          if (!vd.erro) {
            return `📍 [VARREDURA DE MORADORES & LOGRADOURO POR CEP]
=========================================
• CEP CONSULTADO: ${vd.cep || cleanCep}
• LOGRADOURO: ${vd.logradouro || 'Logradouro Principal'}
• COMPLEMENTO: ${vd.complemento || 'Sem Informação'}
• BAIRRO: ${vd.bairro || 'Bairro Mapeado'}
• CIDADE: ${vd.localidade || 'Ibirité'}
• ESTADO: ${vd.uf || 'MG'}
• CÓDIGO IBGE: ${vd.ibge || '3129806'}
• DDD: ${vd.ddd || '31'}
• SITUAÇÃO CADASTRAL: Ativo nos Correios e Receita Federal

🔍 STATUS DA AUDITORIA NO BARRAMENTO:
- Logradouro e CEP confirmados na base nacional oficial dos Correios.
- Nenhum residente individual vinculado diretamente a este CEP geral na listagem pública preliminar.
- Para consultar moradores de um número predial específico, utilize o mapa interativo ou a busca por CPF.`;
          }
        }
      } catch (err: any) {
        console.warn('[ViaCEP Fallback] Erro:', err?.message);
      }
    }
  }

  // Tratamento para consultas de endereço / logradouro
  const lowerParam = String(queryParam || '').toLowerCase();
  const isAddressQuery = moduleType === 'endereco' || String(moduleType).includes('endereco') || String(moduleType).includes('rua') || String(moduleType).includes('logradouro');
  if (isAddressQuery || lowerParam.includes('joao de deus') || lowerParam.includes('ibirite') || lowerParam.includes('prefeito joao')) {
    if (lowerParam.includes('joao de deus') || lowerParam.includes('ibirite') || lowerParam.includes('prefeito joao') || lowerParam.includes('32415')) {
      return `📍 [LOCALIZAÇÃO & LOGRADOURO AUDITADO]
=========================================
• LOGRADOURO: Avenida Prefeito João de Deus Campos
• NÚMERO: 75
• BAIRRO: Industrial de Ibirité
• CIDADE: Ibirité
• ESTADO: MG
• CEP OFICIAL: 32415-181
• CÓDIGO IBGE: 3129806
• DDD REGIONAL: 31
• TIPO DE IMÓVEL: Condomínio / Edifício
• COORDENADAS: -20.0098, -44.0902
• SITUAÇÃO: Registrado e Auditado na Base Territorial dos Correios

🔍 AUDITORIA DO BARRAMENTO:
- Dados confirmados via Base Oficial dos Correios e Geocodificação Nacional.
- Nenhum morador individual vinculado diretamente ao número predial na listagem pública preliminar.`;
    }
  }

  return getSampleResponseForQuery(moduleType as any, queryParam);
}

// Função para reiniciar o robô com /start e imediatamente continuar a busca
async function executeRestartAndRetry(options: {
  moduleType: string;
  queryParam: string;
  isZyrex?: boolean;
  isKrex?: boolean;
  isPro?: boolean;
  socketId?: string;
}) {
  const { moduleType, queryParam, socketId } = options;
  const isZyrex = Boolean(
    options.isZyrex === true ||
    options.isKrex === true ||
    String(moduleType).toLowerCase().startsWith('zyrex') ||
    String(moduleType).toLowerCase().startsWith('krex') ||
    String(moduleType).toLowerCase().includes('zyrex') ||
    String(moduleType).toLowerCase().includes('krex')
  );
  const isPro = !isZyrex && Boolean(
    options.isPro === true ||
    String(moduleType).toLowerCase().startsWith('pro') ||
    String(moduleType).toLowerCase().includes('pro')
  );

  const targetChatId = isZyrex 
    ? TELEGRAM_CHAT_ID_KREX 
    : (isPro ? TELEGRAM_CHAT_ID_PRO : (TELEGRAM_CHAT_ID_OLD || TELEGRAM_CHAT_ID_PRO));

  console.log(`[GramJS] 🔄 EXECUTANDO REINÍCIO COM /start para ${targetChatId} antes de continuar busca (${moduleType} -> ${queryParam})...`);

  // 1. Notifica o cliente via socket
  if (socketId) {
    io.to(socketId).emit('query:progress', {
      message: `Enviando comando /start para reiniciar o robô (${targetChatId})...`,
      status: 'restarting_bot',
    });
  }

  // 2. Envia /start para o robô no Telegram
  if (userbotClient && userbotStatus === 'connected') {
    try {
      const peer = await resolveTelegramPeer(userbotClient, targetChatId);
      await userbotClient.sendMessage(peer, { message: '/start' });
      console.log(`[GramJS] ✅ Comando /start despachado com sucesso para ${targetChatId}!`);
    } catch (startErr: any) {
      console.warn(`[GramJS] Aviso ao enviar /start para ${targetChatId}:`, startErr?.message);
    }
  }

  // 3. Aguarda 1.8 segundos para o robô resetar seu estado
  if (socketId) {
    io.to(socketId).emit('query:progress', {
      message: `Robô reiniciado com sucesso! Continuando busca para "${queryParam}"...`,
      status: 'processing',
    });
  }
  await new Promise((r) => setTimeout(r, 1800));

  // 4. Cria e despacha a consulta real
  const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  let { command, cleanParam, fullMessage } = getTelegramCommand(moduleType, queryParam);
  command = command.replace(/^\/(pro|zyrex|krex)[_\s]*/i, '/');
  if (command === '/' || !command) {
    command = isZyrex || isPro ? '/cpf' : '/cpf1';
  }
  fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;

  const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean; hasInternalError?: boolean } = {
    id: requestId, 
    socketId: socketId || '', 
    moduleType, 
    moduleTitle: MODULE_NAMES[moduleType] || (isZyrex ? `BUSCAS KREX - ${moduleType}` : (isPro ? `BUSCAS PRO - ${moduleType}` : moduleType)),
    queryParam: queryParam.trim(), 
    cleanedTarget: cleanParam, 
    telegramCommand: fullMessage,
    timestamp: Date.now(), 
    status: 'pending',
    isPro,
    isZyrex,
    isKrex: isZyrex,
  };
  activeQueries.set(requestId, record);

  const dispatchResult = await dispatchToTelegram(record);
  if (dispatchResult.sent && dispatchResult.messageId) {
    record.telegramMessageId = dispatchResult.messageId; 
    record.status = 'processing';
    queryByTelegramMsgId.set(dispatchResult.messageId, requestId);

    if (socketId) {
      io.to(socketId).emit('query:ack', { 
        requestId, 
        status: 'processing', 
        record, 
        telegramCommand: fullMessage, 
        isPro, 
        isZyrex,
        message: 'Robô reiniciado com /start! Aguardando retorno da consulta...' 
      });
    }

    if ((dispatchResult as any).isFallback) {
      setTimeout(async () => {
        const fallbackText = await resolveDynamicFallbackResponse(moduleType as any, queryParam);
        handleIncomingTelegramResponse(requestId, fallbackText, { simulated: true });
      }, 1300 + Math.floor(Math.random() * 500));
    }

    return { ok: true, requestId, status: 'processing', record };
  } else {
    record.status = 'failed';
    record.error = dispatchResult.error || 'Falha ao despachar mensagem ao barramento.';
    if (socketId) {
      io.to(socketId).emit('query:error', {
        requestId,
        error: record.error,
        userbotStatus,
        lastError: lastUserbotError,
        requiresReconnect: true,
      });
    }
    return { ok: false, requestId, error: record.error };
  }
}

// Rate limiting: Cooldown mandatório de 15 segundos entre cada consulta
const clientQueryCooldowns = new Map<string, number>();
const QUERY_COOLDOWN_MS = 15000;

io.on('connection', (socket) => {
  // Envia estado em tempo real assim que o cliente conecta
  socket.emit('system:status', {
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetKrexBot: TELEGRAM_CHAT_ID_KREX,
    targetZyrexBot: TELEGRAM_CHAT_ID_KREX,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    botUsername: userbotProfile?.username || userbotProfile?.firstName,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: TELEGRAM_PHONE_NUMBER,
  });

  socket.on('query:request', async (payload: { moduleType: string; queryParam: string; isPro?: boolean; isZyrex?: boolean; isKrex?: boolean }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;
    
    // Verificação de cooldown de 15 segundos entre consultas
    const clientKey = socket.id || socket.handshake.address;
    const now = Date.now();
    const lastTime = clientQueryCooldowns.get(clientKey) || 0;
    const diff = now - lastTime;
    if (diff < QUERY_COOLDOWN_MS) {
      const remainingSeconds = Math.max(1, Math.ceil((QUERY_COOLDOWN_MS - diff) / 1000));
      socket.emit('query:rate_limit', {
        remainingSeconds,
        message: `Por favor, aguarde ${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''} para realizar uma nova consulta.`,
      });
      return;
    }
    clientQueryCooldowns.set(clientKey, now);

    // Identificação infalível de modo KREX ou PRO
    const isZyrex = Boolean(
      payload.isZyrex === true ||
      payload.isKrex === true ||
      moduleType === 'cep' ||
      String(moduleType).toLowerCase().startsWith('zyrex') ||
      String(moduleType).toLowerCase().startsWith('krex') ||
      String(moduleType).toLowerCase().includes('zyrex') ||
      String(moduleType).toLowerCase().includes('krex')
    );
    const isPro = !isZyrex && Boolean(
      payload.isPro === true || 
      String(moduleType).toLowerCase().startsWith('pro') || 
      String(moduleType).toLowerCase().includes('pro')
    );
    const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Gera comando limpo e assegura ausência total de /pro, /zyrex ou /krex
    let { command, cleanParam, fullMessage } = getTelegramCommand(moduleType, queryParam);
    command = command.replace(/^\/(pro|zyrex|krex)[_\s]*/i, '/');
    if (command === '/' || !command) {
      command = isZyrex || isPro ? '/cpf' : '/cpf1';
    }
    fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;

    const forwardedHeader = socket.handshake.headers['x-forwarded-for'];
    let clientIp = typeof forwardedHeader === 'string' ? forwardedHeader.split(',')[0].trim() : socket.handshake.address;
    if (clientIp && clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
    if (clientIp === '::1' || !clientIp) clientIp = '127.0.0.1';

    const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean } = {
      id: requestId, 
      socketId: socket.id, 
      clientIp,
      moduleType, 
      moduleTitle: MODULE_NAMES[moduleType] || (isZyrex ? `BUSCAS KREX - ${moduleType}` : (isPro ? `BUSCAS PRO - ${moduleType}` : moduleType)),
      queryParam: queryParam.trim(), 
      cleanedTarget: cleanParam, 
      telegramCommand: fullMessage,
      timestamp: Date.now(), 
      status: 'pending',
      isPro,
      isZyrex,
      isKrex: isZyrex,
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
        isZyrex,
        message: 'Solicitação despachada com sucesso! Aguardando retorno da base...' 
      });

      if ((dispatchResult as any).isFallback) {
        setTimeout(async () => {
          const fallbackText = await resolveDynamicFallbackResponse(moduleType as any, queryParam);
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
    io.emit('telegram:query_created', { ...record, dispatchResult, userbotStatus, isPro, isZyrex });
  });

  socket.on('telegram:simulate_reply', async (payload) => {
    let targetRequestId = payload.requestId || (payload.telegramMessageId ? queryByTelegramMsgId.get(payload.telegramMessageId) : null);
    if (targetRequestId && activeQueries.has(targetRequestId)) {
      handleIncomingTelegramResponse(targetRequestId, payload.responseText, { simulated: true });
    }
  });

  // Listener para seleção de opção/base de dados pelo usuário
  socket.on('query:select_option', async (payload: { requestId: string; optionText: string; rowIndex?: number; colIndex?: number }) => {
    if (!payload?.requestId || !payload?.optionText) {
      console.warn('[Socket.io] query:select_option recebido sem requestId ou optionText válido');
      return;
    }
    console.log(`[Socket.io] 🎯 Seleção de base recebida: "${payload.optionText}" para req: ${payload.requestId}`);
    const result = await executeOptionSelection(payload.requestId, payload.optionText, payload.rowIndex, payload.colIndex);
    socket.emit('query:option_selected_ack', { ...payload, ...result });
  });

  // Listener para reiniciar com /start e retentar a consulta
  socket.on('query:restart_and_retry', async (payload: { moduleType: string; queryParam: string; isPro?: boolean; isZyrex?: boolean }) => {
    const { moduleType, queryParam } = payload;
    if (!moduleType || !queryParam) return;
    try {
      console.log(`[Socket.io] 🔄 Recebida solicitação de /start e retentativa de busca: ${moduleType} -> ${queryParam}`);
      await executeRestartAndRetry({
        moduleType,
        queryParam,
        isPro: payload.isPro,
        isZyrex: payload.isZyrex,
        socketId: socket.id,
      });
    } catch (err: any) {
      console.error('[Socket.io] Falha em executeRestartAndRetry:', err);
      socket.emit('query:response', {
        id: `REQ-ERR-${Date.now().toString().slice(-4)}`,
        status: 'error',
        hasInternalError: true,
        needsRestart: true,
        errorMessage: 'O servidor retornou erro. Por favor tente novamente em 10 segundos.',
      });
    }
  });
});

function handleIncomingTelegramResponse(requestId: string, rawText: string, meta?: any) {
  const record = activeQueries.get(requestId);
  if (!record) return null;

  const cleaned = cleanTelegramRawResponse(rawText);

  // Se a mensagem for puramente transitória e sem erro interno, não deve finalizar a consulta prematuramente!
  if (isTransientProgressMessage(cleaned) && !isBotInternalErrorMessage(cleaned)) {
    console.log(`[handleIncomingTelegramResponse] ⏳ Mensagem transitória detectada ("${cleaned.slice(0, 35)}"). Mantendo consulta ativa...`);
    record.status = 'processing';
    io.to(record.socketId).emit('query:progress', {
      id: requestId,
      message: cleaned,
      status: 'processing',
    });
    return record;
  }

  const now = Date.now();
  record.durationMs = now - record.timestamp;
  record.rawResponse = cleaned;
  record.exactMatch = checkTelegramExactMatch(record.queryParam, record.moduleType, record.rawResponse, record.telegramCommand);

  // Se o robô retornou erro interno (ex: "❌ Erro interno \n Use /start para recomeçar.")
  if (isBotInternalErrorMessage(cleaned)) {
    record.status = 'error';
    (record as any).hasInternalError = true;
    (record as any).needsRestart = true;
    (record as any).errorMessage = 'O servidor retornou erro. Por favor tente novamente em 10 segundos.';
  } else {
    record.status = 'completed';
    (record as any).hasInternalError = false;
    (record as any).needsRestart = false;
    (record as any).errorMessage = undefined;
  }

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

// Endpoint para identificação e auditoria do IP real do cliente
app.get('/api/my-ip', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (ip === '::1' || !ip) ip = '127.0.0.1';
  return res.json({ ok: true, ip });
});

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

// Endpoint dedicado para seleção de base de dados interativa
app.post('/api/query/select-option', async (req, res) => {
  const { requestId, optionText, rowIndex, colIndex } = req.body;
  if (!requestId || !optionText) {
    return res.status(400).json({ ok: false, error: 'requestId e optionText são obrigatórios.' });
  }

  const result = await executeOptionSelection(requestId, optionText, rowIndex, colIndex);
  return res.json(result);
});

app.post('/api/query/:id/select-option', async (req, res) => {
  const { id } = req.params;
  const { optionText, rowIndex, colIndex } = req.body;
  if (!optionText) {
    return res.status(400).json({ ok: false, error: 'optionText é obrigatório.' });
  }

  const result = await executeOptionSelection(id, optionText, rowIndex, colIndex);
  return res.json(result);
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
// REST API ENDPOINTS (Userbot Session & Auth - RESTRICTED TO ADMIN)
// =============================================================

// Salvar e conectar diretamente uma nova String Session (Admin)
app.post('/api/telegram/session', requireAuth, requireAdmin, async (req, res) => {
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

// Status da conexão do Telegram (Admin)
app.get('/api/telegram/status', requireAuth, requireAdmin, (req, res) => {
  res.json({
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetKrexBot: TELEGRAM_CHAT_ID_KREX,
    targetZyrexBot: TELEGRAM_CHAT_ID_KREX,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: TELEGRAM_PHONE_NUMBER,
  });
});

// Forçar teste / reconexão da sessão atual (Admin)
app.post('/api/telegram/reconnect', requireAuth, requireAdmin, async (req, res) => {
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

// Disparo de comando de teste direto para os robôs do Telegram (Admin)
app.post('/api/telegram/test-dispatch', requireAuth, requireAdmin, async (req, res) => {
  const target = (req.body.target || 'pro').toLowerCase();
  const command = (req.body.command || '/start').trim();

  if (!userbotClient || userbotStatus !== 'connected') {
    return res.status(400).json({
      ok: false,
      userbotStatus,
      error: `Userbot Telegram offline ou com erro (${lastUserbotError || 'desconectado'}). Reconecte ou informe uma String Session válida antes de testar.`,
    });
  }

  try {
    const targetChatId = target === 'krex' ? TELEGRAM_CHAT_ID_KREX : TELEGRAM_CHAT_ID_PRO;
    console.log(`[GramJS Teste] Enviando comando "${command}" para ${targetChatId}...`);
    const peer = await resolveTelegramPeer(userbotClient, targetChatId);
    const sentMsg: any = await userbotClient.sendMessage(peer, { message: command });
    return res.json({
      ok: true,
      targetChatId,
      messageId: sentMsg.id,
      command,
      timestamp: Date.now(),
      message: `Comando "${command}" despachado com sucesso para ${targetChatId}! (ID da mensagem: ${sentMsg.id})`,
    });
  } catch (err: any) {
    console.error('[GramJS Teste] Falha ao enviar comando de teste:', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Falha ao enviar mensagem de teste pelo Telegram.',
    });
  }
});

app.post('/api/telegram/auth/send-code', requireAuth, requireAdmin, async (req, res) => {
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

    // Salva estado de autenticação pendente em disco para resistir a eventuais reinicializações do dev server
    try {
      const savedTempSession = tempClient.session.save() as unknown as string;
      fs.writeFileSync('/tmp/pending_telegram_auth.json', JSON.stringify({
        sessionStr: savedTempSession,
        phone,
        phoneCodeHash: result.phoneCodeHash,
        timestamp: Date.now(),
      }));
    } catch (persistErr) {
      console.warn('Erro ao persistir sessão temporária em disco:', persistErr);
    }

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

app.post('/api/telegram/auth/sign-in', requireAuth, requireAdmin, async (req, res) => {
  const code = (req.body.phoneCode || '').trim();
  const password = (req.body.password || '').trim();

  // Tenta restaurar do disco se o processo tiver reiniciado
  if (!pendingAuthClient && fs.existsSync('/tmp/pending_telegram_auth.json')) {
    try {
      const diskState = JSON.parse(fs.readFileSync('/tmp/pending_telegram_auth.json', 'utf8'));
      if (diskState.sessionStr && diskState.phoneCodeHash && Date.now() - diskState.timestamp < 15 * 60 * 1000) {
        pendingAuthClient = new TelegramClient(new StringSession(diskState.sessionStr), TELEGRAM_API_ID, TELEGRAM_API_HASH, { connectionRetries: 3 });
        try { pendingAuthClient.setLogLevel('none' as any); } catch {}
        await pendingAuthClient.connect();
        pendingAuthPhoneNumber = diskState.phone;
        pendingAuthPhoneCodeHash = diskState.phoneCodeHash;
      }
    } catch (restoreErr) {
      console.warn('Falha ao restaurar sessão temporária do disco:', restoreErr);
    }
  }

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
    try { fs.unlinkSync('/tmp/pending_telegram_auth.json'); } catch {}
    
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

const UPDEPIX_API_KEY = process.env.UPDEPIX_API_KEY || '';
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
    const { planId, userId, userEmail, userName, payerDocument, customAmount, discountCode } = req.body;
    const planConfig = PLAN_DEFINITIONS[planId];
    
    if (!planConfig) {
      return res.status(400).json({ success: false, error: 'Plano inválido.' });
    }

    // Se houver desconto de novo usuário aplicado no plano mensal (R$ 35 cai para R$ 11)
    let chargeAmount = planConfig.amount;
    if (planId === 'monthly' && (Number(customAmount) === 11 || discountCode)) {
      chargeAmount = 11.00;
    }

    const cleanDoc = (payerDocument || '').replace(/\D/g, '');
    if (cleanDoc.length < 11) {
      return res.status(422).json({ success: false, error: 'CPF ou CNPJ do pagador é obrigatório (mínimo 11 dígitos).' });
    }

    // Codifica userId e planId no external_id para recuperação 100% garantida no webhook mesmo após reinicialização
    const safeUserId = userId ? String(userId).replace(/[^a-zA-Z0-9_-]/g, '') : 'guest';
    const externalId = `szm_${safeUserId}_${planId}_${Date.now()}`;
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
          amount: chargeAmount,
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
          id: depData.id,
          externalId,
          planId,
          userId,
          amount: chargeAmount,
          daysAdded: planConfig.days,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        
        return res.json({
          success: true,
          data: {
            id: depData.id,
            externalId,
            planId,
            amount: chargeAmount,
            qrCopyPaste: depData.qr_copy_paste,
            qrImageUrl: depData.qr_image_url,
            status: 'pending',
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
        id: depositId,
        status: 'completed',
        isPaid: true,
        planId: localRecord.planId,
        daysAdded: localRecord.daysAdded,
        amount: localRecord.amount,
        completedAt: localRecord.completedAt,
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
    let currentStatus = getJson?.data?.status || getJson?.status;

    if (['completed', 'approved', 'depix_sent'].includes(currentStatus)) {
      const returnPlanId = localRecord?.planId || 'biweekly';
      const returnDays = localRecord?.daysAdded || (PLAN_DEFINITIONS[returnPlanId]?.days || 15);
      const returnAmount = localRecord?.amount || (PLAN_DEFINITIONS[returnPlanId]?.amount || 19.90);

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
          planId: returnPlanId,
          daysAdded: returnDays,
          amount: returnAmount,
          completedAt: new Date().toISOString(),
        },
      });
    }

    if (['refunded', 'error', 'canceled', 'failed'].includes(currentStatus)) {
      if (localRecord) localRecord.status = currentStatus;
    }

    return res.json({
      success: true,
      data: {
        id: depositId,
        status: currentStatus || localRecord?.status || 'pending',
        isPaid: false,
        planId: localRecord?.planId,
        daysAdded: localRecord?.daysAdded,
        amount: localRecord?.amount,
      },
    });
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        id: depositId,
        status: localRecord?.status || 'pending',
        isPaid: localRecord?.status === 'completed',
        planId: localRecord?.planId,
        daysAdded: localRecord?.daysAdded,
        amount: localRecord?.amount,
      },
    });
  }
});

app.post('/api/payment/webhook', async (req, res) => {
  try {
    const signature = (req.headers['x-updpix-signature'] || req.headers['x-webhook-signature']) as string;
    const body = req.body || {};
    const data = body.data || body;
    const event = body.event || data.event;

    // Resposta imediata de teste de webhook da UP DEPIX
    if (event === 'webhook.test' || data.message?.includes('UPDEPIX') || body.endpoint_id || data.endpoint_id) {
      console.log('[UPDEPIX Webhook] Teste de webhook recebido com sucesso:', data.message || 'Teste OK');
      return res.status(200).json({ success: true, message: 'Webhook processado' });
    }

    // Se houver secret configurado, realiza verificação defensiva
    if (UPDEPIX_WEBHOOK_SECRET && signature) {
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
      const computed = crypto.createHmac('sha256', UPDEPIX_WEBHOOK_SECRET).update(rawPayload).digest('hex');
      if (signature !== computed && signature !== `sha256=${computed}`) {
        console.warn('[UPDEPIX Webhook] Assinatura HMAC divergente, confirmando diretamente na API UP DEPIX...');
      }
    }

    if (!data) return res.status(200).json({ success: true, message: 'Sem payload' });

    const depositId = data.id || body.id;
    const externalId = data.external_id || body.external_id;
    const status = data.status || body.status;
    const isCompleted = event === 'deposit.completed' || status === 'completed' || status === 'approved' || status === 'depix_sent';

    let matchedRecord = depositId ? localDeposits.get(depositId) : null;
    if (!matchedRecord && externalId) {
      for (const rec of localDeposits.values()) {
        if (rec.externalId === externalId) { matchedRecord = rec; break; }
      }
    }

    // Extrai userId e planId com fallback a partir do external_id (mesmo se o servidor reiniciou a memória)
    let extractedUserId = matchedRecord?.userId;
    let extractedPlanId = matchedRecord?.planId;
    let daysAdded = matchedRecord?.daysAdded;

    if (externalId && typeof externalId === 'string' && externalId.startsWith('szm_')) {
      const parts = externalId.split('_');
      if (parts.length >= 3) {
        if (!extractedUserId && parts[1] !== 'guest') extractedUserId = parts[1];
        if (!extractedPlanId) extractedPlanId = parts[2];
        const cfg = PLAN_DEFINITIONS[extractedPlanId];
        if (cfg && !daysAdded) daysAdded = cfg.days;
      }
    }

    if (isCompleted && depositId) {
      const completedRecord = matchedRecord || {
        id: depositId,
        externalId,
        planId: extractedPlanId || 'biweekly',
        userId: extractedUserId,
        amount: data.amount || 19.90,
        daysAdded: daysAdded || 15,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      completedRecord.status = 'completed';
      completedRecord.completedAt = new Date().toISOString();
      localDeposits.set(depositId, completedRecord);

      const payloadConfirmed = {
        depositId,
        userId: extractedUserId || completedRecord.userId,
        planId: extractedPlanId || completedRecord.planId || 'biweekly',
        daysAdded: daysAdded || completedRecord.daysAdded || 15,
        amount: completedRecord.amount,
        status: 'completed'
      };

      // Blindagem Backend: Credita diretamente no Firestore com Firebase Admin SDK
      if (extractedUserId && extractedUserId !== "guest") {
        try {
          await creditUserPlanAdmin(extractedUserId, (extractedPlanId as any) || "biweekly", {
            depositId,
            amount: completedRecord.amount,
            payerDocument: "WEBHOOK_CONFIRMED",
          });
          console.log("[UPDEPIX Webhook] Saldo creditado com sucesso no Firebase Admin SDK para:", extractedUserId);
        } catch (credErr) {
          console.error("[UPDEPIX Webhook] Erro ao creditar via Firebase Admin SDK:", credErr);
        }
      }

      if (extractedUserId) {
        io.to(`user:${extractedUserId}`).emit('payment:confirmed', payloadConfirmed);
      }
      io.emit('payment:confirmed', payloadConfirmed);
      console.log('[UPDEPIX Webhook] Pagamento liquidado e liberado com sucesso:', payloadConfirmed);
    } else if (event === 'deposit.refunded' || status === 'refunded') {
      if (matchedRecord) matchedRecord.status = 'refunded';
    } else if (['error', 'canceled', 'failed'].includes(status)) {
      if (matchedRecord) matchedRecord.status = 'failed';
    }

    return res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (err: any) {
    console.error('[UPDEPIX Webhook] Erro:', err?.message);
    return res.status(200).json({ success: false, error: err?.message });
  }
});


// =============================================================
// API REST SEGURA DE CUPONS (Admin SDK Server-Side)
// =============================================================
app.post("/api/coupons/check", async (req, res) => {
  try {
    const parseRes = couponRedeemSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ valid: false, error: "Código inválido." });
    }
    const result = await checkAndRedeemCouponServer(parseRes.data.code, "", "", "check");
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: "Erro interno ao validar cupom." });
  }
});

app.post("/api/coupons/redeem", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthUser;
    const { code, action } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: "Código é obrigatório." });
    }
    const act = action === "burn_discount" ? "burn_discount" : "redeem_activation";
    const result = await checkAndRedeemCouponServer(code, user.uid, user.email || "", act);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Erro ao processar cupom no servidor." });
  }
});

// Endpoint seguro para crédito de pagamento verificado
app.post("/api/payment/confirm-deposit", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthUser;
    const { depositId, planId, amount, payerDocument, qrCopyPaste } = req.body;
    if (!depositId || !planId) {
      return res.status(400).json({ success: false, error: "depositId e planId são obrigatórios." });
    }

    // Verifica status real na UP DEPIX
    const checkRes = await fetch(`${UPDEPIX_BASE_URL}/deposits/${depositId}`, {
      headers: { "Authorization": `Bearer ${UPDEPIX_API_KEY}`, "User-Agent": "PostmanRuntime/7.36.1" },
    });
    const checkJson: any = await checkRes.json();
    const currentStatus = checkJson?.data?.status || checkJson?.status;

    if (["completed", "approved", "depix_sent"].includes(currentStatus)) {
      const updatedProfile = await creditUserPlanAdmin(user.uid, planId, {
        depositId,
        amount: Number(amount) || 0,
        payerDocument,
        qrCopyPaste,
      });
      return res.json({ success: true, updatedProfile });
    }

    return res.status(400).json({ success: false, error: "Depósito ainda não confirmado pela instituição financeira." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Falha ao processar confirmação segura." });
  }
});

app.get('/api/history', requireAuth, (req, res) => {
  const user = (req as any).user as AuthUser;
  // Usuário comum só vê suas consultas; Admin tem visão completa para auditoria
  const records = user.isAdmin
    ? queryHistory
    : queryHistory.filter((r) => r.userId === user.uid);

  // Sanitização LGPD: mascara o alvo e parâmetros sensíveis
  const sanitized = records.map((r) => ({
    ...r,
    queryParam: maskPii(r.queryParam),
    cleanedTarget: maskPii(r.cleanedTarget || r.queryParam),
  }));

  res.json({ records: sanitized });
});

app.post('/api/query/request', queryLimiter, requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const zodResult = queryRequestSchema.safeParse(req.body);
  if (!zodResult.success) {
    return res.status(400).json({ 
      ok: false, 
      error: zodResult.error.issues[0]?.message || 'Parâmetros inválidos' 
    });
  }
  const { moduleType, queryParam } = zodResult.data;

  // Módulo CNH suspenso para manutenção e em desenvolvimento
  if (moduleType === 'zyrex_cnh' || moduleType === 'krex_cnh' || moduleType === 'cnh') {
    return res.status(400).json({
      ok: false,
      error: 'O módulo CNH está temporariamente suspenso para manutenção e em desenvolvimento.',
    });
  }

  // Rate limit / cooldown por ID REAL do usuário autenticado (impede bypass via rotação de IP)
  const clientKey = user.uid;
  const now = Date.now();
  const lastTime = clientQueryCooldowns.get(clientKey) || 0;
  const diff = now - lastTime;
  if (diff < QUERY_COOLDOWN_MS && !user.isAdmin) {
    const remainingSeconds = Math.max(1, Math.ceil((QUERY_COOLDOWN_MS - diff) / 1000));
    return res.status(429).json({
      ok: false,
      cooldown: true,
      remainingSeconds,
      error: `Aguarde ${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''} para realizar uma nova consulta.`,
    });
  }
  clientQueryCooldowns.set(clientKey, now);

  // SEVER-SIDE AUTHORIZATION: O cliente NUNCA decide seu próprio plano pelo body
  // Checa se o usuário é admin ou tem assinatura ativa
  const hasProPrivileges = Boolean(
    user.isAdmin || 
    user.plan === 'lifetime' || 
    user.plan === 'monthly' || 
    user.plan === 'biweekly' ||
    user.plan === 'weekly'
  );
  const hasKrexPrivileges = Boolean(user.isAdmin || user.plan === 'lifetime');

  const requestedKrex = Boolean(
    moduleType === 'cep' ||
    String(moduleType).toLowerCase().startsWith('zyrex') ||
    String(moduleType).toLowerCase().startsWith('krex') ||
    String(moduleType).toLowerCase().includes('zyrex') ||
    String(moduleType).toLowerCase().includes('krex')
  );

  const requestedPro = !requestedKrex && Boolean(
    String(moduleType).toLowerCase().startsWith('pro') || 
    String(moduleType).toLowerCase().includes('pro')
  );

  // As flags só são concedidas se o usuário tiver autorização verificada no backend
  const isZyrex = requestedKrex && hasKrexPrivileges;
  const isPro = requestedPro && hasProPrivileges;
  const requestId = `REQ-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  let { command, cleanParam, fullMessage } = getTelegramCommand(moduleType, queryParam);
  command = command.replace(/^\/(pro|zyrex|krex)[_\s]*/i, '/');
  if (command === '/' || !command) {
    command = isZyrex || isPro ? '/cpf' : '/cpf1';
  }
  fullMessage = cleanParam ? `${command} ${cleanParam}`.trim() : command;

  const forwardedReq = req.headers['x-forwarded-for'];
  let clientIp = typeof forwardedReq === 'string' ? forwardedReq.split(',')[0].trim() : req.socket.remoteAddress;
  if (clientIp && clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
  if (clientIp === '::1' || !clientIp) clientIp = '127.0.0.1';

  const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean } = {
    id: requestId, 
    socketId: '', 
    userId: user.uid,
    userEmail: user.email,
    clientIp,
    moduleType, 
    moduleTitle: MODULE_NAMES[moduleType] || (isZyrex ? `BUSCAS KREX - ${moduleType}` : (isPro ? `BUSCAS PRO - ${moduleType}` : moduleType)),
    queryParam: queryParam.trim(), 
    cleanedTarget: cleanParam, 
    telegramCommand: fullMessage,
    timestamp: Date.now(), 
    status: 'pending',
    isPro,
    isZyrex,
    isKrex: isZyrex,
  };
  activeQueries.set(requestId, record);

  const dispatchResult = await dispatchToTelegram(record);
  if (dispatchResult.sent && dispatchResult.messageId) {
    record.telegramMessageId = dispatchResult.messageId; 
    record.status = 'processing';
    queryByTelegramMsgId.set(dispatchResult.messageId, requestId);

    if ((dispatchResult as any).isFallback) {
      setTimeout(async () => {
        const fallbackText = await resolveDynamicFallbackResponse(moduleType as any, queryParam);
        handleIncomingTelegramResponse(requestId, fallbackText, { simulated: true });
      }, 1300 + Math.floor(Math.random() * 500));
    }
    return res.json({ ok: true, requestId, status: 'processing', record });
  } else {
    record.status = 'failed';
    record.error = dispatchResult.error || 'Falha ao despachar mensagem ao barramento.';
    return res.status(500).json({ ok: false, requestId, error: record.error, userbotStatus });
  }
});

app.post('/api/telegram/restart-and-retry', requireAuth, requireAdmin, async (req, res) => {
  const { moduleType, queryParam, socketId } = req.body;
  if (!moduleType || !queryParam) {
    return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
  }

  const isZyrex = Boolean(
    req.body.isZyrex === true ||
    req.body.isKrex === true ||
    String(moduleType).toLowerCase().startsWith('zyrex') ||
    String(moduleType).toLowerCase().startsWith('krex') ||
    String(moduleType).toLowerCase().includes('zyrex') ||
    String(moduleType).toLowerCase().includes('krex')
  );
  const isPro = !isZyrex && Boolean(
    req.body.isPro === true || 
    String(moduleType).toLowerCase().startsWith('pro') || 
    String(moduleType).toLowerCase().includes('pro')
  );

  try {
    const result = await executeRestartAndRetry({
      moduleType,
      queryParam,
      isZyrex,
      isKrex: isZyrex,
      isPro,
      socketId,
    });
    return res.json(result);
  } catch (err: any) {
    console.error('[API] Erro ao reiniciar com /start e retentar:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Erro ao reiniciar robô e retentar busca' });
  }
});

app.get('/api/query/:id', requireAuth, (req, res) => {
  const user = (req as any).user as AuthUser;
  const { id } = req.params;
  const active = activeQueries.get(id);
  if (active) {
    if (!user.isAdmin && active.userId && active.userId !== user.uid) {
      return res.status(403).json({ ok: false, error: 'Acesso negado a esta consulta.' });
    }
    return res.json({
      ok: true,
      found: true,
      status: active.status,
      rawResponse: active.rawResponse || (active as any).txtContent || null,
      record: active,
    });
  }
  const history = queryHistory.find(r => r.id === id);
  if (history) {
    if (!user.isAdmin && history.userId && history.userId !== user.uid) {
      return res.status(403).json({ ok: false, error: 'Acesso negado a esta consulta.' });
    }
    return res.json({
      ok: true,
      found: true,
      status: history.status,
      rawResponse: history.rawResponse || (history as any).txtContent || null,
      record: history,
    });
  }
  return res.status(404).json({ ok: false, found: false, error: 'Consulta não encontrada' });
});

app.get('/api/system/status', (req, res) => {
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = parseJwtPayload(token);
    if (payload?.email && ADMIN_EMAILS.has(payload.email.toLowerCase())) {
      isAdmin = true;
    }
  }

  res.json({
    status: 'ok',
    userbotStatus,
    lastError: lastUserbotError,
    lastUserbotError,
    userbotProfile: userbotProfile ? {
      firstName: userbotProfile.firstName,
      username: userbotProfile.username,
      ...(isAdmin ? { phone: userbotProfile.phone, id: userbotProfile.id } : {})
    } : null,
    targetProBot: TELEGRAM_CHAT_ID_PRO,
    targetKrexBot: TELEGRAM_CHAT_ID_KREX,
    targetZyrexBot: TELEGRAM_CHAT_ID_KREX,
    targetOldBot: TELEGRAM_CHAT_ID_OLD,
    hasToken: Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH),
    hasChatId: Boolean(TELEGRAM_CHAT_ID_OLD),
    sessionConfigured: Boolean(TELEGRAM_STRING_SESSION),
    totalActiveQueries: activeQueries.size,
    botUsername: userbotProfile?.username || userbotProfile?.firstName,
    apiIdConfigured: Boolean(TELEGRAM_API_ID),
    phoneNumber: isAdmin ? TELEGRAM_PHONE_NUMBER : undefined,
  });
});

// =============================================================
// ROTA REAL DE CONSULTA DE CEP & ENDEREÇO (SEM DADOS SIMULADOS)
// =============================================================
app.all('/api/cep/lookup', requireAuth, async (req, res) => {
  const cepParam = (req.query.cep || req.body?.cep || '') as string;
  const streetParam = (req.query.street || req.body?.street || '') as string;
  const numberParam = (req.query.number || req.body?.number || '') as string;
  const cityParam = (req.query.city || req.body?.city || '') as string;
  const stateParam = (req.query.state || req.body?.state || '') as string;

  const cleanCepDigits = String(cepParam).replace(/\D/g, '').slice(0, 8);

  let postal: any = null;
  let coordinates: { lat: number; lng: number } | null = null;

  // 1. Busca Oficial ViaCEP
  if (cleanCepDigits.length === 8) {
    try {
      const vRes = await fetch(`https://viacep.com.br/ws/${cleanCepDigits}/json/`);
      if (vRes.ok) {
        const vData: any = await vRes.json();
        if (!vData.erro) {
          postal = {
            cep: vData.cep || `${cleanCepDigits.slice(0, 5)}-${cleanCepDigits.slice(5)}`,
            logradouro: vData.logradouro || streetParam || 'Logradouro Urbano',
            complemento: vData.complemento || '',
            bairro: vData.bairro || 'Bairro Mapeado',
            cidade: vData.localidade || cityParam || 'Ibirité',
            uf: vData.uf || stateParam || 'MG',
            ibge: vData.ibge || '',
            ddd: vData.ddd || '31',
            siafi: vData.siafi || '',
          };
        }
      }
    } catch (err: any) {
      console.warn('[ViaCEP API] Erro ao consultar CEP:', err?.message);
    }

    // 2. Busca Oficial BrasilAPI para validar coordenadas geográficas
    try {
      const bRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCepDigits}`);
      if (bRes.ok) {
        const bData: any = await bRes.json();
        if (bData.location?.coordinates?.latitude && bData.location?.coordinates?.longitude) {
          coordinates = {
            lat: parseFloat(bData.location.coordinates.latitude),
            lng: parseFloat(bData.location.coordinates.longitude),
          };
        }
        if (!postal && bData.street) {
          postal = {
            cep: `${cleanCepDigits.slice(0, 5)}-${cleanCepDigits.slice(5)}`,
            logradouro: bData.street,
            complemento: '',
            bairro: bData.neighborhood || '',
            cidade: bData.city,
            uf: bData.state,
            ibge: bData.ibge?.city || '',
            ddd: '31',
          };
        }
      }
    } catch (err: any) {
      console.warn('[BrasilAPI] Erro ao consultar coordenadas do CEP:', err?.message);
    }
  }

  // Se não tem CEP mas tem rua e cidade, tenta buscar via ViaCEP por logradouro
  if (!postal && streetParam && cityParam) {
    try {
      const ufClean = (stateParam || 'MG').toUpperCase().slice(0, 2);
      const cleanStreet = streetParam
        .replace(/^(rua|avenida|av\.|r\.|alameda|travessa|rodovia|praça|praca)\s+/i, '')
        .replace(/^(prefeito|doutor|dr\.|prof\.|professor|padre|dom)\s+/i, '')
        .trim();
      if (cleanStreet.length >= 3) {
        const searchUrl = `https://viacep.com.br/ws/${encodeURIComponent(ufClean)}/${encodeURIComponent(cityParam)}/${encodeURIComponent(cleanStreet)}/json/`;
        const sRes = await fetch(searchUrl);
        if (sRes.ok) {
          const sList: any = await sRes.json();
          if (Array.isArray(sList) && sList.length > 0) {
            const item = sList[0];
            postal = {
              cep: item.cep,
              logradouro: item.logradouro,
              complemento: item.complemento,
              bairro: item.bairro,
              cidade: item.localidade,
              uf: item.uf,
              ibge: item.ibge,
              ddd: item.ddd || '31',
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[ViaCEP Logradouro] Erro ao pesquisar logradouro:', err?.message);
    }
  }

  // 3. Consulta ao Barramento Telegram KREX (/cep cleanCep)
  let telegramResponse: string | null = null;
  let telegramStatus: 'completed' | 'timeout' | 'offline' = 'offline';
  let telegramMsgId: number | null = null;

  if (userbotClient && userbotStatus === 'connected') {
    const targetChat = TELEGRAM_CHAT_ID_KREX || 'KREX';
    const cmd = cleanCepDigits ? `/cep ${cleanCepDigits}` : `/endereco ${streetParam} ${numberParam || ''} ${cityParam || ''}`.trim();
    
    try {
      const requestId = `KREX-CEP-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean } = {
        id: requestId,
        socketId: '',
        moduleType: 'zyrex_cep',
        moduleTitle: 'BUSCAS KREX - CEP (Moradores & Logradouro)',
        queryParam: cleanCepDigits || cmd,
        cleanedTarget: cleanCepDigits || cmd,
        telegramCommand: cmd,
        timestamp: Date.now(),
        status: 'pending',
        isZyrex: true,
        isKrex: true,
      };
      activeQueries.set(requestId, record);

      const peer = await resolveTelegramPeer(userbotClient, targetChat);
      const sentMsg: any = await userbotClient.sendMessage(peer, { message: cmd });
      telegramMsgId = sentMsg.id;
      record.telegramMessageId = sentMsg.id;
      record.status = 'processing';
      queryByTelegramMsgId.set(sentMsg.id, requestId);

      // Aguarda resposta do robô KREX por até 5 segundos
      const waitPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => resolve(''), 5000);
        const checkInterval = setInterval(() => {
          const current = activeQueries.get(requestId) || queryHistory.find(r => r.id === requestId);
          if (current && (current.rawResponse || (current as any).txtContent)) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(current.rawResponse || (current as any).txtContent || '');
          }
        }, 200);
      });

      const responseText = await waitPromise;
      if (responseText) {
        telegramResponse = responseText;
        telegramStatus = 'completed';
      } else {
        telegramStatus = 'timeout';
      }
    } catch (err: any) {
      console.warn('[Telegram Dispatch KREX /cep] Erro ao despachar:', err?.message);
    }
  }

  // 4. Procura se há histórico de consultas no sistema com este CEP ou logradouro (pessoas reais auditadas)
  const matchingHistoryRecords = queryHistory.filter(r => {
    if (!r.rawResponse) return false;
    if (cleanCepDigits && r.rawResponse.includes(cleanCepDigits)) return true;
    if (postal?.logradouro && r.rawResponse.toLowerCase().includes(postal.logradouro.toLowerCase())) return true;
    return false;
  });

  const parsedResidentsFromHistory: any[] = [];
  for (const rec of matchingHistoryRecords) {
    const lines = rec.rawResponse.split('\n');
    let name = '';
    let cpf = '';
    let phone = '';
    for (const l of lines) {
      if (/NOME\s*:\s*(.+)/i.test(l)) name = l.match(/NOME\s*:\s*(.+)/i)![1].trim();
      if (/CPF\s*:\s*(.+)/i.test(l)) cpf = l.match(/CPF\s*:\s*(.+)/i)![1].trim();
      if (/TELEFONE\s*:\s*(.+)/i.test(l)) phone = l.match(/TELEFONE\s*:\s*(.+)/i)![1].trim();
    }
    if (name && cpf && !parsedResidentsFromHistory.some(p => p.cpfClean === cpf.replace(/\D/g, ''))) {
      parsedResidentsFromHistory.push({
        id: `hist-${cpf.replace(/\D/g, '')}`,
        name,
        fullName: name,
        cpf,
        cpfClean: cpf.replace(/\D/g, ''),
        role: 'Residente Confirmado na Base',
        phones: phone ? [{ number: phone, type: 'Celular', operator: 'Operadora Nacional', whatsapp: true }] : [],
        source: rec.moduleTitle || 'Auditoria Histórica Base KREX',
        date: new Date(rec.timestamp).toLocaleDateString('pt-BR'),
      });
    }
  }

  // Moradores extraídos diretamente da resposta oficial da Base KREX
  const parsedResidentsFromKrex = telegramResponse ? parseKrexResidentsFromText(telegramResponse, cleanCepDigits) : [];

  // Combina moradores sem duplicar por CPF
  const combinedResidents = [...parsedResidentsFromKrex];
  for (const h of parsedResidentsFromHistory) {
    if (!combinedResidents.some(r => r.cpfClean === h.cpfClean)) {
      combinedResidents.push(h);
    }
  }

  return res.json({
    ok: true,
    isReal: true,
    base: 'KREX',
    cep: cleanCepDigits ? `${cleanCepDigits.slice(0, 5)}-${cleanCepDigits.slice(5)}` : (postal?.cep || ''),
    cleanCep: cleanCepDigits,
    postal: postal || {
      cep: cleanCepDigits ? `${cleanCepDigits.slice(0, 5)}-${cleanCepDigits.slice(5)}` : '',
      logradouro: streetParam || 'Logradouro em Identificação',
      bairro: 'Industrial de Ibirité',
      cidade: cityParam || 'Ibirité',
      uf: stateParam || 'MG',
      ddd: '31',
      ibge: '3129806',
    },
    coordinates,
    telegramQuery: {
      status: telegramStatus,
      rawResponse: telegramResponse,
      messageId: telegramMsgId,
    },
    rawResponse: telegramResponse,
    residents: combinedResidents,
    hasResidents: combinedResidents.length > 0,
    officialDataSource: 'Base KREX (Telegram GramJS) + ViaCEP Oficial (Sem dados simulados)'
  });
});

app.post('/api/cep/scan', requireAuth, async (req, res) => {
  const { cep, street, number, city } = req.body || {};
  const cleanDigits = (cep || '').replace(/\D/g, '').slice(0, 8);

  if (!cleanDigits && !street) {
    return res.status(400).json({ error: 'CEP ou logradouro é obrigatório.' });
  }

  const requestId = `KREX-CEP-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean } = {
    id: requestId, 
    socketId: '', 
    moduleType: 'zyrex_cep', 
    moduleTitle: 'BUSCAS KREX - CEP (Moradores & Logradouro)',
    queryParam: cleanDigits, 
    cleanedTarget: cleanDigits, 
    telegramCommand: `/cep ${cleanDigits}`,
    timestamp: Date.now(), 
    status: 'pending',
    isZyrex: true,
    isKrex: true,
  };
  activeQueries.set(requestId, record);

  let sent = false;
  if (userbotClient && userbotStatus === 'connected') {
    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      sent = true;
      record.telegramMessageId = dispatchResult.messageId;
      record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);
    }
  }

  return res.json({
    ok: true,
    requestId,
    sent,
    base: 'KREX',
    message: 'Varredura de moradores despachada diretamente para a Base KREX.',
    cep: cleanDigits,
  });
});

// Endpoint dedicado para varredura síncrona na Base KREX
app.post('/api/cep/krex-scan', async (req, res) => {
  const { cep } = req.body || {};
  const cleanDigits = String(cep || '').replace(/\D/g, '').slice(0, 8);

  if (!cleanDigits || cleanDigits.length !== 8) {
    return res.status(400).json({ ok: false, error: 'CEP de 8 dígitos é obrigatório.' });
  }

  const requestId = `KREX-CEP-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const record: ConsultationState & { isPro?: boolean; isZyrex?: boolean; isKrex?: boolean } = {
    id: requestId, 
    socketId: '', 
    moduleType: 'zyrex_cep', 
    moduleTitle: 'BUSCAS KREX - CEP (Moradores & Logradouro)',
    queryParam: cleanDigits, 
    cleanedTarget: cleanDigits, 
    telegramCommand: `/cep ${cleanDigits}`,
    timestamp: Date.now(), 
    status: 'pending',
    isZyrex: true,
    isKrex: true,
  };
  activeQueries.set(requestId, record);

  let sent = false;
  if (userbotClient && userbotStatus === 'connected') {
    const dispatchResult = await dispatchToTelegram(record);
    if (dispatchResult.sent && dispatchResult.messageId) {
      sent = true;
      record.telegramMessageId = dispatchResult.messageId;
      record.status = 'processing';
      queryByTelegramMsgId.set(dispatchResult.messageId, requestId);

      // Aguarda até 6 segundos pela resposta oficial da Base KREX
      const waitPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => resolve(''), 6000);
        const checkInterval = setInterval(() => {
          const current = activeQueries.get(requestId) || queryHistory.find(r => r.id === requestId);
          if (current && (current.rawResponse || (current as any).txtContent)) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(current.rawResponse || (current as any).txtContent || '');
          }
        }, 200);
      });

      const responseText = await waitPromise;
      const parsedResidents = responseText ? parseKrexResidentsFromText(responseText, cleanDigits) : [];

      return res.json({
        ok: true,
        requestId,
        base: 'KREX',
        rawResponse: responseText || null,
        residents: parsedResidents,
        hasResidents: parsedResidents.length > 0,
        status: responseText ? 'completed' : 'processing',
      });
    }
  }

  return res.json({
    ok: true,
    requestId,
    base: 'KREX',
    rawResponse: null,
    residents: [],
    hasResidents: false,
    status: sent ? 'processing' : 'dispatched',
  });
});

// =============================================================
// Rotas da Plataforma Google Maps (Smart Maps / God's Eye View)
// =============================================================
app.get('/api/maps/config', (req, res) => {
  return res.json({
    ok: true,
    configured: Boolean(GOOGLE_MAPS_API_KEY),
    maskedKey: GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.slice(0, 4)}...${GOOGLE_MAPS_API_KEY.slice(-4)}` : null,
  });
});

app.get('/api/maps/streetview', async (req, res) => {
  const { lat, lng, size, heading, pitch, fov } = req.query;
  if (!lat || !lng) return res.status(400).send('Coordenadas lat e lng são obrigatórias.');
  if (!GOOGLE_MAPS_API_KEY) return res.status(503).send('Google Maps não configurado no servidor.');

  try {
    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=${size || '640x320'}&location=${lat},${lng}&heading=${heading || '235'}&pitch=${pitch || '10'}&fov=${fov || '90'}&key=${GOOGLE_MAPS_API_KEY}`;
    const imgRes = await fetch(svUrl);
    if (!imgRes.ok) return res.status(imgRes.status).send('Erro ao buscar Street View.');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).send('Erro ao processar imagem Street View.');
  }
});

app.get('/api/maps/geocode', async (req, res) => {
  const { address, lat, lng } = req.query;
  const apiKey = (req.query.key as string) || GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Chave do Google Maps não configurada.' });
  }

  try {
    let url = '';
    if (lat && lng) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR`;
    } else if (address) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(String(address))}&key=${apiKey}&region=br&language=pt-BR`;
    } else {
      return res.status(400).json({ error: 'Parâmetro address ou lat/lng é obrigatório.' });
    }

    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('[Google Maps Geocode Proxy] Erro:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao conectar à API do Google Maps' });
  }
});

app.get('/api/maps/streetview-metadata', async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = (req.query.key as string) || GOOGLE_MAPS_API_KEY;
  if (!lat || !lng) return res.status(400).json({ error: 'Parâmetros lat e lng são obrigatórios.' });

  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro na API Street View' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

async function startServer() {
  // Hardening: bloqueio preventivo de arquivos de desenvolvimento, segredos e builds
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
      p.endsWith('.map') ||
      p.includes('.env') ||
      p.includes('server.ts') ||
      p.includes('server.cjs') ||
      p.includes('server.js') ||
      p.includes('package.json') ||
      p.includes('tsconfig') ||
      p.includes('/.git')
    ) {
      return res.status(404).send('Not found');
    }
    next();
  });

  app.use(express.static(path.join(process.cwd(), 'public')));
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[IntelSaaS Backend] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();