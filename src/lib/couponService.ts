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
  const cleanCode = (rawCode || "").trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: "Digite um código de ativação ou desconto." };
  }

  // 1. Tenta validar no servidor backend protegido (Admin SDK)
  try {
    const backendUrl = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${backendUrl}/api/coupons/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: cleanCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid && data.coupon) {
        return { valid: true, coupon: data.coupon };
      }
      return { valid: false, error: data.error || "Código inválido ou já utilizado." };
    }
  } catch (apiErr) {
    console.warn("[CouponService] Backend indisponível para checagem, usando validação local:", apiErr);
  }

  // Fallback seguro se backend não responder
  const defaultData = DEFAULT_COUPONS[cleanCode];
  if (defaultData) {
    return {
      valid: true,
      coupon: {
        ...defaultData,
        used: false,
        createdAt: new Date().toISOString(),
      },
    };
  }
  return { valid: false, error: "Código inválido ou inexistente." };
}

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
  const cleanCode = (rawCode || "").trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: "", error: "Código inválido." };
  }

  try {
    const idToken = await user.getIdToken();
    const backendUrl = import.meta.env.VITE_API_URL || "";

    const res = await fetch(`${backendUrl}/api/coupons/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ code: cleanCode, action: "redeem_activation" }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || "Código de ativação aplicado, sua conta já está ativa por 30 dias",
        updatedProfile: data.updatedProfile,
      };
    }

    return {
      success: false,
      message: "",
      error: data.error || "Falha ao ativar o código promocional no servidor.",
    };
  } catch (err: any) {
    console.error("[CouponService] Erro ao resgatar código:", err);
    return {
      success: false,
      message: "",
      error: err?.message || "Falha ao processar código de ativação.",
    };
  }
}

export async function burnDiscountCoupon(
  rawCode: string,
  user: FirebaseUser
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = (rawCode || "").trim().toUpperCase();
  if (!cleanCode) return { success: false, error: "Código inválido." };

  try {
    const idToken = await user.getIdToken();
    const backendUrl = import.meta.env.VITE_API_URL || "";

    const res = await fetch(`${backendUrl}/api/coupons/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ code: cleanCode, action: "burn_discount" }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || "Erro ao aplicar cupom de desconto." };
  } catch (err: any) {
    console.warn("[CouponService] Erro ao queimar cupom:", err);
    return { success: false, error: err?.message };
  }
}
