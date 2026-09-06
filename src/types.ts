import type { ExactMatchResult } from './utils/telegramCommandHelper';
export type { ExactMatchResult };

export type QueryModuleType =
  | 'cpf_1'
  | 'cpf_2'
  | 'cpf_3'
  | 'cnpj'
  | 'nome'
  | 'email'
  | 'placa'
  | 'telefone'
  | 'pro_cpf'
  | 'pro_telefone'
  | 'pro_nome'
  | 'pro_email'
  | 'pro_endereco'
  | 'pro_cep'
  | 'pro_cnpj'
  | 'pro_titulo'
  | 'pro_mae'
  | 'pro_foto'
  | 'pro_placa'
  | (string & {});

export interface QueryModuleInfo {
  id: QueryModuleType;
  title: string;
  subtitle: string;
  category: 'Pessoa Física' | 'Pessoa Jurídica' | 'Veículos & Contato';
  placeholder: string;
  iconName: string;
  badge: string;
  description: string;
  defaultSample: string;
}

export type QueryStatus = 'pending' | 'processing' | 'waiting_selection' | 'completed' | 'failed' | 'timeout' | 'error';

export interface QueryOption {
  text: string;
  data?: any;
  rowIndex?: number;
  colIndex?: number;
  description?: string;
  isPrimary?: boolean;
}

export interface QueryRecord {
  id: string; // e.g. REQ-8942-CPF1
  socketId: string;
  moduleType: QueryModuleType;
  moduleTitle: string;
  queryParam: string;
  cleanedTarget?: string;
  telegramCommand?: string;
  timestamp: number;
  status: QueryStatus;
  telegramMessageId?: number;
  telegramChatId?: string | number;
  telegramSentAt?: number;
  telegramAnsweredAt?: number;
  durationMs?: number;
  rawResponse?: string;
  parsedReport?: ParsedIntelligenceReport;
  exactMatch?: ExactMatchResult;
  txtContent?: string;
  txtFileName?: string;
  photoUrl?: string;
  photos?: Array<{ url: string; fileName?: string; caption?: string; sizeBytes?: number }>;
  options?: QueryOption[];
  selectionPrompt?: string;
  selectedOption?: string;
  isNotFound?: boolean;
  isPro?: boolean;
  isKrex?: boolean;
  isZyrex?: boolean;
  error?: string;
  hasInternalError?: boolean;
  errorMessage?: string;
  needsRestart?: boolean;
}

export interface ParsedIntelligenceReport {
  title: string;
  target: string;
  module: string;
  telegramCommand?: string;
  exactMatch?: ExactMatchResult;
  riskLevel?: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'Regular';
  score?: number;
  summary: string;
  sections: Array<{
    title: string;
    items: Array<{
      label: string;
      value: string;
      highlight?: boolean;
      status?: 'success' | 'warning' | 'danger' | 'info';
    }>;
  }>;
  alerts?: string[];
  rawText: string;
}

export interface TelegramConfigState {
  hasToken: boolean; // Legacy flag or apiId configured
  hasChatId: boolean;
  botUsername?: string;
  isPollingOrWebhookActive: boolean;
  webhookUrl?: string;
  activeRequestsCount: number;
  // GramJS Userbot specific properties
  isUserbot?: boolean;
  userbotStatus?: 'disconnected' | 'connecting' | 'awaiting_code' | 'awaiting_password' | 'connected' | 'error';
  sessionConfigured?: boolean;
  apiIdConfigured?: boolean;
  userName?: string;
  phone?: string;
  lastError?: string | null;
}


export interface SystemStats {
  totalQueries: number;
  completedQueries: number;
  pendingQueries: number;
  avgResponseTimeMs: number;
}
