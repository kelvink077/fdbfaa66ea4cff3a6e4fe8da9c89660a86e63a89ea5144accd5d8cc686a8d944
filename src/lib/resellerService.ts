import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';
import type { ReferralLead, WithdrawalOrder, ResellerWallet } from '../types';

export const COMMISSION_PERCENT = 15; // 15% de comissão sobre qualquer plano contratado

export const PLAN_PRICING: Record<string, { title: string; price: number; commission: number }> = {
  weekly: {
    title: 'Plano Semanal (7 Dias)',
    price: 35.00,
    commission: +(35.00 * 0.15).toFixed(2), // R$ 5.25
  },
  biweekly: {
    title: 'Plano Quinzenal (15 Dias)',
    price: 60.00,
    commission: +(60.00 * 0.15).toFixed(2), // R$ 9.00
  },
  monthly: {
    title: 'Plano Mensal (30 Dias)',
    price: 99.00,
    commission: +(99.00 * 0.15).toFixed(2), // R$ 14.85
  },
  trial: {
    title: 'Teste Grátis (24 Horas)',
    price: 99.00, // Estimativa baseada no plano mensal padrão
    commission: +(99.00 * 0.15).toFixed(2), // R$ 14.85 potencial
  },
};

const STORAGE_REF_KEY = 'shazam_active_ref';
const STORAGE_LOCAL_REFERRALS = 'shazam_reseller_referrals_cache';
const STORAGE_LOCAL_WITHDRAWALS = 'shazam_reseller_withdrawals_cache';

/**
 * Captura o código do revendedor na URL (?ref=... ou ?r=... ou ?indicacao=...)
 */
export function captureReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('r') || urlParams.get('indicacao') || urlParams.get('afiliado');

    if (refParam && refParam.trim().length > 0) {
      const cleanRef = refParam.trim().toLowerCase();
      localStorage.setItem(STORAGE_REF_KEY, cleanRef);
      return cleanRef;
    }

    return localStorage.getItem(STORAGE_REF_KEY);
  } catch (err) {
    console.warn('[ResellerService] Erro ao capturar ref da URL:', err);
    return null;
  }
}

/**
 * Retorna o código de referência ativo armazenado
 */
export function getActiveReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_REF_KEY);
}

/**
 * Gera um código de revendedor limpo e amigável baseado no UID ou e-mail
 */
export function generateResellerCode(userId: string, email?: string): string {
  if (email && email.includes('@')) {
    const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10);
    const suffix = userId.slice(-4).toLowerCase();
    return `${prefix || 'operador'}-${suffix}`;
  }
  const cleanUid = userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `operador-${cleanUid.slice(0, 6)}`;
}

/**
 * Constrói a URL completa de indicação
 */
export function buildReferralUrl(resellerCode: string): string {
  if (typeof window === 'undefined') return `https://shazambuscas.com/?ref=${resellerCode}`;
  const origin = window.location.origin || 'https://shazambuscas.com';
  return `${origin}/?ref=${resellerCode}`;
}

/**
 * Carrega a carteira do revendedor e histórico completo de indicações e saques
 */
export async function loadResellerDashboard(
  resellerId: string,
  resellerCode: string
): Promise<{
  wallet: ResellerWallet;
  referrals: ReferralLead[];
  withdrawals: WithdrawalOrder[];
}> {
  let referrals: ReferralLead[] = [];
  let withdrawals: WithdrawalOrder[] = [];

  // 1. Tenta carregar do Firestore
  try {
    const refCol = collection(db, 'resellers', resellerId, 'referrals');
    const snap = await getDocs(refCol);
    if (!snap.empty) {
      referrals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }
  } catch (e) {
    console.warn('[ResellerService] Firestore offline ou sem permissão para referrals, usando cache local:', e);
  }

  try {
    const withCol = collection(db, 'resellers', resellerId, 'withdrawals');
    const snap = await getDocs(withCol);
    if (!snap.empty) {
      withdrawals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }
  } catch (e) {
    console.warn('[ResellerService] Firestore offline para withdrawals, usando cache local:', e);
  }

  // 2. Fallback / merge com cache local
  if (typeof window !== 'undefined') {
    try {
      const cachedRefRaw = localStorage.getItem(`${STORAGE_LOCAL_REFERRALS}_${resellerId}`);
      if (cachedRefRaw) {
        const cached: ReferralLead[] = JSON.parse(cachedRefRaw);
        const existingIds = new Set(referrals.map((r) => r.id));
        for (const item of cached) {
          if (!existingIds.has(item.id)) {
            referrals.push(item);
          }
        }
      }

      const cachedWithRaw = localStorage.getItem(`${STORAGE_LOCAL_WITHDRAWALS}_${resellerId}`);
      if (cachedWithRaw) {
        const cached: WithdrawalOrder[] = JSON.parse(cachedWithRaw);
        const existingWithIds = new Set(withdrawals.map((w) => w.id));
        for (const item of cached) {
          if (!existingWithIds.has(item.id)) {
            withdrawals.push(item);
          }
        }
      }
    } catch (parseErr) {
      console.warn('[ResellerService] Erro ao ler cache local:', parseErr);
    }
  }

  // Se for novo revendedor sem dados, inicializa com exemplo transparente para que a interface não fique vazia
  if (referrals.length === 0 && withdrawals.length === 0) {
    const samplePendingLead: ReferralLead = {
      id: `lead-demo-pending`,
      resellerId,
      resellerCode,
      referredName: 'Exemplo: Carlos Investigações',
      referredEmail: 'carlos.detetive@gmail.com',
      planId: 'monthly',
      planName: 'Plano Mensal (Demonstração)',
      planAmount: 99.00,
      commissionPercent: COMMISSION_PERCENT,
      commissionAmount: 14.85,
      status: 'pending', // Cadastrou no link mas aguarda pagamento (renda estimada)
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    };

    const samplePaidLead: ReferralLead = {
      id: `lead-demo-paid`,
      resellerId,
      resellerCode,
      referredName: 'Exemplo: Dra. Mariana Barros (Advocacia)',
      referredEmail: 'mariana.barros.adv@gmail.com',
      planId: 'monthly',
      planName: 'Plano Mensal (Demonstração)',
      planAmount: 99.00,
      commissionPercent: COMMISSION_PERCENT,
      commissionAmount: 14.85,
      status: 'paid', // Pagamento confirmado via PIX -> comissão liberada
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      paidAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
      depositId: 'DEP-DEMO-PIX',
    };

    referrals = [samplePaidLead, samplePendingLead];
  }

  // Ordena por data decrescente
  referrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  withdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 3. Cálculos de balanço financeiro
  // Regra fundamental: o revendedor SÓ RECEBE comissão dos planos que foram efetivamente PAGOS
  const totalEarnedPaid = referrals
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

  // Renda estimada de clientes cadastrados que ainda NÃO efetuaram o pagamento
  const estimatedPendingBalance = referrals
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

  // Saques solicitados e não rejeitados
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'completed' || w.status === 'pending' || w.status === 'processing')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const availableBalance = Math.max(0, +(totalEarnedPaid - totalWithdrawn).toFixed(2));

  const wallet: ResellerWallet = {
    resellerId,
    resellerCode,
    availableBalance,
    estimatedPendingBalance: +estimatedPendingBalance.toFixed(2),
    totalWithdrawn: +totalWithdrawn.toFixed(2),
    totalReferralsCount: referrals.length,
    paidReferralsCount: referrals.filter((r) => r.status === 'paid').length,
    pendingReferralsCount: referrals.filter((r) => r.status === 'pending').length,
    updatedAt: new Date().toISOString(),
  };

  return {
    wallet,
    referrals,
    withdrawals,
  };
}

/**
 * Registra um novo lead quando um usuário se cadastra utilizando o link do revendedor
 */
export async function trackNewUserReferral(
  resellerCode: string,
  newUser: FirebaseUser
): Promise<ReferralLead | null> {
  if (!resellerCode || !newUser) return null;

  const leadId = `lead-${newUser.uid}-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Plano padrão para estimativa (Plano Mensal R$ 99,00 -> 15% = R$ 14,85)
  const defaultPlan = PLAN_PRICING['monthly'];

  const newLead: ReferralLead = {
    id: leadId,
    resellerId: resellerCode,
    resellerCode,
    referredUserId: newUser.uid,
    referredName: newUser.displayName || 'Novo Usuário Cadastrado',
    referredEmail: newUser.email || 'e-mail não informado',
    referredPhotoURL: newUser.photoURL || undefined,
    planId: 'trial',
    planName: 'Teste Grátis (24 Horas)',
    planAmount: defaultPlan.price,
    commissionPercent: COMMISSION_PERCENT,
    commissionAmount: defaultPlan.commission,
    status: 'pending', // Regra: Inicialmente pendente pois não efetuou pagamento ainda
    createdAt: nowIso,
  };

  try {
    // 1. Salva no Firestore se disponível
    await setDoc(doc(db, 'referrals', leadId), newLead);
    await setDoc(doc(db, 'resellers', resellerCode, 'referrals', leadId), newLead);
  } catch (err) {
    console.warn('[ResellerService] Gravação remota falhou, salvando no cache local:', err);
  }

  // 2. Salva no cache local do revendedor
  try {
    const key = `${STORAGE_LOCAL_REFERRALS}_${resellerCode}`;
    const raw = localStorage.getItem(key);
    const list: ReferralLead[] = raw ? JSON.parse(raw) : [];
    list.unshift(newLead);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (cacheErr) {
    console.warn('[ResellerService] Erro ao salvar lead no cache local:', cacheErr);
  }

  return newLead;
}

/**
 * Atualiza o status da indicação para 'paid' e credita a comissão real de 15% quando o cliente paga via PIX
 */
export async function markReferralAsPaid(
  referredUserId: string,
  planId: string,
  paidAmount: number,
  payerDocument?: string
): Promise<boolean> {
  const planInfo = PLAN_PRICING[planId] || {
    title: 'Plano Shazam Buscas',
    price: paidAmount,
    commission: +(paidAmount * 0.15).toFixed(2),
  };

  const realCommission = +(paidAmount * (COMMISSION_PERCENT / 100)).toFixed(2);
  const nowIso = new Date().toISOString();

  let foundUpdated = false;

  // Atualiza no cache local em todas as chaves de revendedores
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_LOCAL_REFERRALS)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list: ReferralLead[] = JSON.parse(raw);
          let changed = false;
          const updated = list.map((lead) => {
            if (lead.referredUserId === referredUserId || lead.id.includes(referredUserId)) {
              changed = true;
              foundUpdated = true;
              return {
                ...lead,
                planId,
                planName: planInfo.title,
                planAmount: paidAmount,
                commissionAmount: realCommission,
                status: 'paid' as const, // Agora o pagamento foi efetuado, comissão liberada!
                paidAt: nowIso,
              };
            }
            return lead;
          });

          if (changed) {
            localStorage.setItem(k, JSON.stringify(updated));
          }
        }
      }
    }
  } catch (err) {
    console.warn('[ResellerService] Erro ao atualizar referrals locais:', err);
  }

  // Tenta atualizar no Firestore
  try {
    const q = query(collection(db, 'referrals'), where('referredUserId', '==', referredUserId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      for (const d of snap.docs) {
        await setDoc(
          d.ref,
          {
            planId,
            planName: planInfo.title,
            planAmount: paidAmount,
            commissionAmount: realCommission,
            status: 'paid',
            paidAt: nowIso,
            payerDocument: payerDocument || null,
          },
          { merge: true }
        );
      }
      foundUpdated = true;
    }
  } catch (e) {
    console.warn('[ResellerService] Erro ao atualizar status no Firestore:', e);
  }

  return foundUpdated;
}

/**
 * Cria uma ordem de saque via PIX com prazo médio de 24 horas
 */
export async function requestWithdrawalOrder(params: {
  resellerId: string;
  resellerEmail: string;
  resellerName: string;
  amount: number;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  pixKey: string;
  accountHolder: string;
}): Promise<WithdrawalOrder> {
  const orderId = `SAQ-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newOrder: WithdrawalOrder = {
    id: orderId,
    resellerId: params.resellerId,
    resellerEmail: params.resellerEmail,
    resellerName: params.resellerName,
    amount: params.amount,
    pixKeyType: params.pixKeyType,
    pixKey: params.pixKey,
    accountHolder: params.accountHolder,
    status: 'pending',
    createdAt: nowIso,
    estimatedPaymentHours: 24, // Prazo médio de 24h
    notes: 'Ordem de saque emitida para processamento via PIX em até 24h úteis.',
  };

  // 1. Salva no Firestore
  try {
    await setDoc(doc(db, 'withdrawals', orderId), newOrder);
    await setDoc(doc(db, 'resellers', params.resellerId, 'withdrawals', orderId), newOrder);
  } catch (err) {
    console.warn('[ResellerService] Falha ao gravar ordem de saque no Firestore:', err);
  }

  // 2. Salva no cache local
  try {
    const key = `${STORAGE_LOCAL_WITHDRAWALS}_${params.resellerId}`;
    const raw = localStorage.getItem(key);
    const list: WithdrawalOrder[] = raw ? JSON.parse(raw) : [];
    list.unshift(newOrder);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (cacheErr) {
    console.warn('[ResellerService] Falha ao salvar ordem no cache local:', cacheErr);
  }

  return newOrder;
}

/**
 * Utilitário de simulação para testar o fluxo de indicações e comissões
 */
export async function createSimulatedReferral(params: {
  resellerId: string;
  resellerCode: string;
  referredName: string;
  referredEmail: string;
  planId: 'weekly' | 'biweekly' | 'monthly';
  isPaid: boolean;
}): Promise<ReferralLead> {
  const planInfo = PLAN_PRICING[params.planId] || PLAN_PRICING['monthly'];
  const leadId = `sim-lead-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const lead: ReferralLead = {
    id: leadId,
    resellerId: params.resellerId,
    resellerCode: params.resellerCode,
    referredName: params.referredName,
    referredEmail: params.referredEmail,
    planId: params.planId,
    planName: planInfo.title,
    planAmount: planInfo.price,
    commissionPercent: COMMISSION_PERCENT,
    commissionAmount: planInfo.commission,
    status: params.isPaid ? 'paid' : 'pending',
    createdAt: nowIso,
    paidAt: params.isPaid ? nowIso : undefined,
    depositId: params.isPaid ? `SIM-PIX-${Date.now()}` : undefined,
  };

  // Grava localmente
  const key = `${STORAGE_LOCAL_REFERRALS}_${params.resellerId}`;
  try {
    const raw = localStorage.getItem(key);
    const list: ReferralLead[] = raw ? JSON.parse(raw) : [];
    list.unshift(lead);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn('[ResellerService] Erro ao gravar simulação local:', err);
  }

  // Tenta gravar no Firestore
  try {
    await setDoc(doc(db, 'resellers', params.resellerId, 'referrals', leadId), lead);
  } catch (err) {
    console.warn('[ResellerService] Firestore offline na simulação:', err);
  }

  return lead;
}
