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
  | 'cep'
  | 'endereco'
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

export interface CepResident {
  id: string;
  name: string;
  cpf: string;
  cpfClean: string;
  propertyNumber: string;
  unitOrComplement?: string;
  role: 'Proprietário' | 'Locatário / Inquilino' | 'Cônjuge' | 'Dependente' | 'Responsável' | 'Residente KREX';
  age: number;
  birthDate: string;
  incomePresumed: string;
  creditScore: number;
  phones: Array<{ number: string; operator: string; whatsapp: boolean; type: string }>;
  status: string;
  hasDeepDossier?: boolean;
  deepDossier?: DeepPersonDossier;
}

export interface DeepPersonDossier {
  id: string;
  personName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  age: number;
  motherName: string;
  fatherName: string;
  statusReceita: string;
  creditScore: number;
  scoreClassification: string;
  incomePresumed: string;
  occupation: string;
  phones: Array<{ number: string; operator: string; whatsapp: boolean; type: string }>;
  emails: string[];
  vehicles: Array<{ plate: string; model: string; year: number; color: string; renavam: string; status: string }>;
  companies: Array<{ cnpj: string; name: string; role: string; status: string; capital: string }>;
  judicialRecords: Array<{ court: string; processNumber: string; subject: string; status: string }>;
  addressHistory: string[];
  notes: string;
  compiledAt: string;
}

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

export interface ReferralLead {
  id: string;
  resellerId: string;
  resellerCode: string;
  referredUserId?: string;
  referredName: string;
  referredEmail: string;
  referredPhotoURL?: string;
  planId: 'weekly' | 'biweekly' | 'monthly' | 'trial' | string;
  planName: string;
  planAmount: number;
  commissionPercent: number; // 15
  commissionAmount: number; // 15% do valor do plano contratado
  status: 'pending' | 'paid'; // 'pending' = apenas cadastrado/teste grátis (renda estimada); 'paid' = pagamento efetuado (comissão liberada)
  createdAt: string;
  paidAt?: string;
  depositId?: string;
}

export interface WithdrawalOrder {
  id: string;
  resellerId: string;
  resellerEmail: string;
  resellerName: string;
  amount: number;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  pixKey: string;
  accountHolder: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  estimatedPaymentHours: number; // 24h prazo médio
  notes?: string;
}

export interface ResellerWallet {
  resellerId: string;
  resellerCode: string;
  availableBalance: number; // Liberado apenas se o indicado pagou o plano contratado (15%)
  estimatedPendingBalance: number; // Renda estimada de indicações cadastradas ainda não pagas
  totalWithdrawn: number; // Total já pago via PIX
  totalReferralsCount: number;
  paidReferralsCount: number;
  pendingReferralsCount: number;
  updatedAt: string;
}
