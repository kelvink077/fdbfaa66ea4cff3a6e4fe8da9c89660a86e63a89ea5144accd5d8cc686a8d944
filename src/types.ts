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
  | 'telefone';

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

export type QueryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

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
  error?: string;
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
