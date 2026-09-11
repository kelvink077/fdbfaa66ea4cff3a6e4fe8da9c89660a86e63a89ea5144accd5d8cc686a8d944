import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, creditUserPlanValidity, UserProfileData } from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { ACTIVATION_CODES, DISCOUNT_CODES } from './generatedCodes';

export type CouponType = 'activation' | 'discount';

export interface CouponRecord {
  code: string;
  type: CouponType;
  planTarget: 'monthly';
  originalPrice: number;
  discountedPrice: number; // 0 for activation, 11 for discount
  days: number; // 30 days
  used: boolean;
  usedByUserId?: string;
  usedByEmail?: string;
  usedAt?: string;
  createdAt: string;
  description: string;
}

// Lista inicial de códigos únicos globais
export const DEFAULT_COUPONS: Record<string, Omit<CouponRecord, 'used' | 'createdAt'>> = {
  // Códigos de Ativação (100% Grátis, 30 dias, sem checkout)
  'ATIVAR30DIAS': {
    code: 'ATIVAR30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação direta de 30 dias sem necessidade de pagamento',
  },
  'SHAZAM30ATIVAR': {
    code: 'SHAZAM30ATIVAR',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Código de ativação mensal VIP',
  },
  'SHAZAM30VIP': {
    code: 'SHAZAM30VIP',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Código de ativação 30 dias de acesso completo',
  },
  'PROMO30DIAS': {
    code: 'PROMO30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Código promocional de ativação de 30 dias',
  },
  'ACESSO30MENSAL': {
    code: 'ACESSO30MENSAL',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação imediata de 30 dias',
  },
  'LIBERAR30': {
    code: 'LIBERAR30',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Liberação de 30 dias sem checkout',
  },
  'VIP30DIAS': {
    code: 'VIP30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação VIP 30 dias',
  },

  // Códigos de Desconto de Novo Usuário (De R$ 35,00 cai para R$ 11,00 no primeiro mês)
  'NOVO11': {
    code: 'NOVO11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Desconto de novo usuário: Plano mensal de R$ 35 cai para apenas R$ 11',
  },
  'PRIMEIROMES11': {
    code: 'PRIMEIROMES11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Primeiro mês com super desconto: R$ 11 no plano mensal',
  },
  'BEMVINDO11': {
    code: 'BEMVINDO11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Boas-vindas para novos usuários: R$ 11 no plano mensal',
  },
  'DESCONTO11': {
    code: 'DESCONTO11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Cupom de desconto especial para novo usuário: de R$ 35 por R$ 11',
  },
  'SHAZAM11': {
    code: 'SHAZAM11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Desconto oficial de novo cliente: R$ 11 no plano de 30 dias',
  },
  'NOVOUSUARIO11': {
    code: 'NOVOUSUARIO11',
    type: 'discount',
    planTarget: 'monthly',
    originalPrice: 35.00,
    discountedPrice: 11.00,
    days: 30,
    description: 'Desconto exclusivo de novo usuário: de R$ 35 por R$ 11 no 1º mês',
  },
};

// Registra os 50 Códigos de Ativação Direta (30 Dias 100% Grátis)
for (const code of ACTIVATION_CODES) {
  if (!DEFAULT_COUPONS[code]) {
    DEFAULT_COUPONS[code] = {
      code,
      type: 'activation',
      planTarget: 'monthly',
      originalPrice: 35.00,
      discountedPrice: 0,
      days: 30,
      description: 'Código de Ativação Direta 30 Dias (100% Grátis sem checkout)',
    };
  }
}

// Registra os 50 Códigos de Desconto de Novo Usuário (De R$ 35,00 por R$ 11,00)
for (const code of DISCOUNT_CODES) {
  if (!DEFAULT_COUPONS[code]) {
    DEFAULT_COUPONS[code] = {
      code,
      type: 'discount',
      planTarget: 'monthly',
      originalPrice: 35.00,
      discountedPrice: 11.00,
      days: 30,
      description: 'Cupom de Desconto de Novo Usuário: Plano Mensal por R$ 11,00 no 1º mês',
    };
  }
}

/**
 * Valida se um código existe e se já foi utilizado.
 * Cada código é estritamente único e pode ser usado apenas UMA ÚNICA VEZ GLOBALMENTE.
 */
export async function checkCouponValidity(rawCode: string): Promise<{
  valid: boolean;
  coupon?: CouponRecord;
  error?: string;
}> {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: 'Digite um código de ativação ou desconto.' };
  }

  try {
    const couponRef = doc(db, 'coupons', cleanCode);
    const snap = await getDoc(couponRef);

    if (snap.exists()) {
      const data = snap.data() as CouponRecord;
      if (data.used) {
        return { 
          valid: false, 
          error: 'Este código já foi utilizado e não pode ser reutilizado. Cada código é único e de uso único.' 
        };
      }
      return { valid: true, coupon: data };
    }

    // Se ainda não existe no Firestore, verifica a lista padrão
    const defaultData = DEFAULT_COUPONS[cleanCode];
    if (defaultData) {
      const newCouponRecord: CouponRecord = {
        ...defaultData,
        used: false,
        createdAt: new Date().toISOString(),
      };
      // Salva no Firestore para controle de unicidade
      try {
        await setDoc(couponRef, newCouponRecord);
      } catch (err) {
        console.warn('[CouponService] Aviso ao persistir cupom inicial:', err);
      }
      return { valid: true, coupon: newCouponRecord };
    }

    return { 
      valid: false, 
      error: 'Código inválido ou inexistente. Verifique os caracteres e tente novamente.' 
    };
  } catch (err: any) {
    console.warn('[CouponService] Erro ao consultar cupom:', err);
    // Fallback para lista em memória se houver oscilação
    const defaultData = DEFAULT_COUPONS[cleanCode];
    if (defaultData) {
      return {
        valid: true,
        coupon: {
          ...defaultData,
          used: false,
          createdAt: new Date().toISOString(),
        }
      };
    }
    return { valid: false, error: 'Não foi possível validar o código no momento.' };
  }
}

/**
 * Aplica um Código de Ativação (100% grátis):
 * - Não redireciona ao checkout;
 * - Marca o código como USADO imediatamente (impedindo qualquer reuso global);
 * - Credita 30 dias de acesso no plano mensal da conta do usuário.
 */
export async function redeemActivationCode(
  rawCode: string,
  user: FirebaseUser,
  currentProfile?: UserProfileData | null
): Promise<{
  success: boolean;
  message: string;
  updatedProfile?: UserProfileData;
  error?: string;
}> {
  const check = await checkCouponValidity(rawCode);
  if (!check.valid || !check.coupon) {
    return {
      success: false,
      message: '',
      error: check.error || 'Código inválido.',
    };
  }

  if (check.coupon.type !== 'activation') {
    return {
      success: false,
      message: '',
      error: 'Este é um código de desconto, não de ativação direta.',
    };
  }

  const cleanCode = check.coupon.code;
  const now = new Date().toISOString();

  try {
    // 1. Marca como usado no Firestore imediatamente
    const couponRef = doc(db, 'coupons', cleanCode);
    await setDoc(couponRef, {
      ...check.coupon,
      used: true,
      usedByUserId: user.uid,
      usedByEmail: user.email || '',
      usedAt: now,
    }, { merge: true });

    // 2. Credita 30 dias de Plano Mensal na conta do usuário
    const updated = await creditUserPlanValidity(user.uid, 'monthly', {
      depositId: `ATIVACAO-${cleanCode}-${Date.now()}`,
      amount: 0,
      payerDocument: 'CODIGO-ATIVACAO',
      qrCopyPaste: `ATIVACAO_30_DIAS_${cleanCode}`,
    });

    return {
      success: true,
      message: 'Código de ativação aplicado, sua conta já está ativa por 30 dias',
      updatedProfile: updated,
    };
  } catch (err: any) {
    console.error('[CouponService] Erro ao resgatar código de ativação:', err);
    return {
      success: false,
      message: '',
      error: err?.message || 'Falha ao ativar o plano com o código.',
    };
  }
}

/**
 * Queima/Consome o código de desconto antes de ir para o pagamento:
 * Conforme exigido: "caso o pagamento não seja concluído esse código de desconto será perdido"
 */
export async function burnDiscountCoupon(
  rawCode: string,
  user: FirebaseUser
): Promise<{ success: boolean; error?: string }> {
  const check = await checkCouponValidity(rawCode);
  if (!check.valid || !check.coupon) {
    return { success: false, error: check.error || 'Código inválido.' };
  }

  const cleanCode = check.coupon.code;
  const now = new Date().toISOString();

  try {
    const couponRef = doc(db, 'coupons', cleanCode);
    await setDoc(couponRef, {
      ...check.coupon,
      used: true,
      usedByUserId: user.uid,
      usedByEmail: user.email || '',
      usedAt: now,
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.warn('[CouponService] Erro ao consumir cupom:', err);
    return { success: false, error: err?.message };
  }
}
