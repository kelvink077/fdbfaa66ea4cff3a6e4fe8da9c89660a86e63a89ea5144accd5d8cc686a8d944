import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import geoip from 'geoip-lite';
import { Request, Response, NextFunction } from 'express';
import { adminDb } from './firebaseAdmin';
import { ACTIVATION_CODES, DISCOUNT_CODES } from './generatedCodes';

/**
 * Validação de Esquema Zod para Entrada da API
 */
export const queryRequestSchema = z.object({
  moduleType: z.string().min(1, 'moduleType é obrigatório').max(64),
  queryParam: z.string().min(1, 'queryParam é obrigatório').max(256),
});

export const createPixSchema = z.object({
  planId: z.enum(['weekly', 'biweekly', 'monthly']),
  userId: z.string().optional(),
  userEmail: z.string().email().optional().or(z.literal('')),
  userName: z.string().optional(),
  payerDocument: z.string().min(11, 'Documento inválido'),
  customAmount: z.number().optional(),
  discountCode: z.string().optional(),
});

export const couponRedeemSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
});

/**
 * Helmet Security Middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Vite e iFrame integration
  crossOriginEmbedderPolicy: false,
});

/**
 * Rate Limiter Global para rotas de API (200 reqs / 15 min)
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
  },
});

/**
 * Rate Limiter Estrito para Consultas (60 reqs / 15 min)
 */
export const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Limite de consultas atingido para este IP. Aguarde antes de realizar novas buscas.',
  },
});

/**
 * Geo-IP Limiter: Permite conexões apenas do Brasil (BR) e localhost/desenvolvimento
 */
export const geoIpFilter = (req: Request, res: Response, next: NextFunction) => {
  // Ignora chamadas de webhook de pagamento (UP DEPIX) e health check
  if (req.path.startsWith('/api/payment/webhook') || req.path === '/api/health') {
    return next();
  }

  // Em desenvolvimento, permitir livremente
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '';
  
  // IPs locais ou privados
  if (
    !rawIp ||
    rawIp === '127.0.0.1' ||
    rawIp === '::1' ||
    rawIp.startsWith('10.') ||
    rawIp.startsWith('192.168.') ||
    rawIp.startsWith('172.')
  ) {
    return next();
  }

  try {
    const geo = geoip.lookup(rawIp);
    // Se localizou e não for Brasil, bloqueia
    if (geo && geo.country && geo.country !== 'BR') {
      console.warn(`[GeoIP Security] Acesso bloqueado de IP internacional: ${rawIp} (${geo.country})`);
      return res.status(403).json({
        ok: false,
        error: 'Acesso restrito ao território nacional (Brasil).',
      });
    }
  } catch (err) {
    // Se falhar a verificação de IP, permite prosseguir sem quebrar usuários legítimos
  }

  next();
};

/**
 * Credita plano com segurança via Firebase Admin SDK
 */
export async function creditUserPlanAdmin(
  userId: string,
  planId: 'weekly' | 'biweekly' | 'monthly',
  paymentInfo: {
    depositId: string;
    amount: number;
    payerDocument?: string;
    qrCopyPaste?: string;
  }
) {
  const userRef = adminDb.collection('users').doc(userId);
  const now = new Date();
  const nowIso = now.toISOString();

  let daysToAdd = 7;
  let planTitle = 'Plano Semanal';
  if (planId === 'weekly') {
    daysToAdd = 7;
    planTitle = 'Plano Semanal';
  } else if (planId === 'biweekly') {
    daysToAdd = 15;
    planTitle = 'Plano 15 Dias';
  } else if (planId === 'monthly') {
    daysToAdd = 30;
    planTitle = 'Plano Mensal';
  }

  const docSnap = await userRef.get();
  let baseDate = now;
  let existingProfile: any = {};

  if (docSnap.exists) {
    existingProfile = docSnap.data() || {};
    const existingExpiry = existingProfile.validUntil || existingProfile.trialEndsAt;
    if (existingExpiry) {
      const parsedExisting = new Date(existingExpiry);
      if (parsedExisting.getTime() > now.getTime()) {
        baseDate = parsedExisting;
      }
    }
  }

  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const newExpiryIso = newExpiry.toISOString();

  const paymentRecord = {
    id: `PAY-${Date.now()}`,
    depositId: paymentInfo.depositId,
    planId,
    planName: planTitle,
    amount: paymentInfo.amount,
    daysAdded: daysToAdd,
    status: 'completed',
    payerDocument: paymentInfo.payerDocument,
    paidAt: nowIso,
    qrCopyPaste: paymentInfo.qrCopyPaste,
  };

  const currentPayments = existingProfile.recentPayments || [];
  const updatedPayments = [paymentRecord, ...currentPayments].slice(0, 20);

  const updatedProfile = {
    plan: planId,
    planName: planTitle,
    planStatus: 'active',
    trialEndsAt: newExpiryIso,
    validUntil: newExpiryIso,
    recentPayments: updatedPayments,
    totalDaysCredited: (existingProfile.totalDaysCredited || 0) + daysToAdd,
  };

  await userRef.set(updatedProfile, { merge: true });

  // Também grava na coleção segura /payments/{depositId}
  try {
    await adminDb.collection('payments').doc(paymentInfo.depositId).set({
      ...paymentRecord,
      userId,
      userEmail: existingProfile.email || '',
      verifiedBy: 'server_admin_sdk',
      createdAt: nowIso,
    });
  } catch (e) {
    console.warn('[FirebaseAdmin] Erro ao gravar payment audit:', e);
  }

  return {
    ...existingProfile,
    ...updatedProfile,
  };
}

/**
 * Resgate e queima de cupons no servidor com Firestore Admin
 */
const DEFAULT_COUPONS_SERVER: Record<string, any> = {
  ATIVAR30DIAS: {
    code: 'ATIVAR30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação direta de 30 dias',
  },
  SHAZAM30ATIVAR: {
    code: 'SHAZAM30ATIVAR',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Código de ativação mensal VIP',
  },
  SHAZAM30VIP: {
    code: 'SHAZAM30VIP',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Código de ativação 30 dias de acesso completo',
  },
  PROMO30DIAS: {
    code: 'PROMO30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Código promocional de ativação de 30 dias',
  },
  ACESSO30MENSAL: {
    code: 'ACESSO30MENSAL',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação imediata de 30 dias',
  },
  LIBERAR30: {
    code: 'LIBERAR30',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Liberação de 30 dias sem checkout',
  },
  VIP30DIAS: {
    code: 'VIP30DIAS',
    type: 'activation',
    planTarget: 'monthly',
    originalPrice: 35.0,
    discountedPrice: 0,
    days: 30,
    description: 'Ativação VIP 30 dias',
  },
};

// Adiciona códigos gerados
for (const c of ACTIVATION_CODES) {
  if (!DEFAULT_COUPONS_SERVER[c]) {
    DEFAULT_COUPONS_SERVER[c] = {
      code: c,
      type: 'activation',
      planTarget: 'monthly',
      originalPrice: 35.0,
      discountedPrice: 0,
      days: 30,
      description: 'Código de Ativação 30 Dias Grátis',
    };
  }
}
for (const c of DISCOUNT_CODES) {
  if (!DEFAULT_COUPONS_SERVER[c]) {
    DEFAULT_COUPONS_SERVER[c] = {
      code: c,
      type: 'discount',
      planTarget: 'monthly',
      originalPrice: 35.0,
      discountedPrice: 11.0,
      days: 30,
      description: 'Cupom de Desconto de Novo Usuário (R$ 11,00)',
    };
  }
}

export async function checkAndRedeemCouponServer(
  rawCode: string,
  userId: string,
  userEmail: string,
  action: 'check' | 'redeem_activation' | 'burn_discount'
) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { valid: false, error: 'Código não informado.' };
  }

  const couponRef = adminDb.collection('coupons').doc(code);
  const snap = await couponRef.get();

  let couponData: any = null;
  if (snap.exists) {
    couponData = snap.data();
  } else if (DEFAULT_COUPONS_SERVER[code]) {
    couponData = {
      ...DEFAULT_COUPONS_SERVER[code],
      used: false,
      createdAt: new Date().toISOString(),
    };
    await couponRef.set(couponData);
  } else {
    return { valid: false, error: 'Código inválido ou inexistente.' };
  }

  if (couponData.used) {
    return { valid: false, error: 'Este código já foi utilizado.' };
  }

  if (action === 'check') {
    return { valid: true, coupon: couponData };
  }

  const nowIso = new Date().toISOString();

  if (action === 'redeem_activation') {
    if (couponData.type !== 'activation') {
      return { valid: false, error: 'Este é um código de desconto, não de ativação direta.' };
    }

    // Queima o código no Firestore via Admin SDK
    await couponRef.update({
      used: true,
      usedByUserId: userId,
      usedByEmail: userEmail,
      usedAt: nowIso,
    });

    // Credita 30 dias na conta do usuário
    const updatedProfile = await creditUserPlanAdmin(userId, 'monthly', {
      depositId: `ATIVACAO-${code}-${Date.now()}`,
      amount: 0,
      payerDocument: 'CODIGO-ATIVACAO',
      qrCopyPaste: `ATIVACAO_30_DIAS_${code}`,
    });

    return {
      valid: true,
      success: true,
      message: 'Código de ativação aplicado, sua conta já está ativa por 30 dias',
      updatedProfile,
    };
  }

  if (action === 'burn_discount') {
    // Queima o código de desconto antes do checkout
    await couponRef.update({
      used: true,
      usedByUserId: userId,
      usedByEmail: userEmail,
      usedAt: nowIso,
    });

    return { valid: true, success: true };
  }

  return { valid: false, error: 'Ação não suportada.' };
}
