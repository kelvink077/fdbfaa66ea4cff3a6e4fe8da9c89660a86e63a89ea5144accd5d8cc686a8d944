import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  updateDoc,
  increment,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific Database ID from config
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider configured with prompt selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface UserPaymentRecord {
  id: string;
  depositId: string;
  planId: 'weekly' | 'biweekly' | 'monthly';
  planName: string;
  amount: number;
  daysAdded: number;
  status: 'completed' | 'pending' | 'failed';
  payerDocument?: string;
  paidAt: string;
  qrCopyPaste?: string;
}

export const ADMIN_EMAILS = ['wrbatata6@gmail.com'];

export function isUserAdmin(profile?: UserProfileData | null, email?: string | null): boolean {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase().trim())) return true;
  if (profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase().trim())) return true;
  if (profile?.role === 'admin' || profile?.isAdmin || profile?.plan === 'lifetime') return true;
  return false;
}

export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: 'premium' | 'weekly' | 'biweekly' | 'monthly' | 'free' | 'enterprise' | 'trial' | 'lifetime';
  planName?: string;
  planStatus: 'trial' | 'active' | 'expired' | 'blocked';
  role?: 'admin' | 'user' | 'reseller';
  isAdmin?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  trialStartedAt: string;
  trialEndsAt: string;
  validUntil: string;
  trialDaysTotal: number;
  totalDaysCredited?: number;
  consultasRestantes?: number; // Cota de consultas grátis
  createdAt: string;
  lastLoginAt: string;
  recentPayments?: UserPaymentRecord[];
  latestNotification?: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'urgent';
    createdAt: string;
    read: boolean;
    sentBy?: string;
  };
  hasUnreadNotification?: boolean;
}

/**
 * Calcula a validade detalhada da conta do usuário em tempo real
 */
export function calculateAccountValidity(profile?: UserProfileData | null): {
  isValid: boolean;
  isTrial: boolean;
  isExpired: boolean;
  isQuotaExhausted?: boolean;
  isLifetime: boolean;
  isBlocked: boolean;
  statusText: string;
  daysRemaining: number;
  hoursRemaining: number;
  expirationDateFormatted: string;
  expirationIso: string;
  planDisplayName: string;
} {
  if (!profile) {
    return {
      isValid: false,
      isTrial: false,
      isExpired: true,
      isLifetime: false,
      isBlocked: false,
      statusText: 'Desconectado',
      daysRemaining: 0,
      hoursRemaining: 0,
      expirationDateFormatted: 'Não autenticado',
      expirationIso: '',
      planDisplayName: 'Sem plano',
    };
  }

  const isAdmin = isUserAdmin(profile, profile.email);
  const isBlocked = Boolean(profile.isBlocked || profile.planStatus === 'blocked' || profile.planStatus === 'expired');

  if ((isBlocked || profile.planStatus === 'expired') && !isAdmin) {
    return {
      isValid: false,
      isTrial: false,
      isExpired: true,
      isLifetime: false,
      isBlocked: Boolean(profile.isBlocked || profile.planStatus === 'blocked'),
      statusText: 'Expirado',
      daysRemaining: 0,
      hoursRemaining: 0,
      expirationDateFormatted: 'Expirado',
      expirationIso: '',
      planDisplayName: profile.planName || 'Expirado',
    };
  }

  if (isAdmin) {
    return {
      isValid: true,
      isTrial: false,
      isExpired: false,
      isLifetime: true,
      isBlocked: false,
      statusText: 'Acesso Administrador Lifetime (Vitalício)',
      daysRemaining: 99999,
      hoursRemaining: 999999,
      expirationDateFormatted: 'Eterno / Vitalício (Sem Expiração)',
      expirationIso: '2099-12-31T23:59:59.999Z',
      planDisplayName: 'Administrador Lifetime Eterno',
    };
  }

  const now = new Date();
  const rawExpiry = profile.validUntil || profile.trialEndsAt || profile.createdAt;
  const expiryDate = new Date(rawExpiry);
  const isValidDate = !isNaN(expiryDate.getTime());
  const targetDate = isValidDate ? expiryDate : new Date(now.getTime() + 24 * 3600000);

  const diffMs = targetDate.getTime() - now.getTime();
  const isTimeExpired = diffMs <= 0;
  const isQuotaExhausted = profile.plan === 'trial' && profile.consultasRestantes !== undefined && profile.consultasRestantes <= 0;
  const isExplicitlyExpired = profile.planStatus === 'expired';
  
  const isExpired = isTimeExpired || isExplicitlyExpired || isQuotaExhausted;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60)));

  const isTrial = profile.planStatus === 'trial' || profile.plan === 'trial';
  
  let planDisplayName = 'Plano Shazam Premium';
  if (profile.plan === 'weekly') planDisplayName = 'Plano Semanal (7 Dias)';
  else if (profile.plan === 'biweekly') planDisplayName = 'Plano 15 Dias';
  else if (profile.plan === 'monthly') planDisplayName = 'Plano Mensal (30 Dias)';
  else if (profile.plan === 'trial') planDisplayName = 'Teste Grátis (24 Horas)';
  else if (profile.planName) planDisplayName = profile.planName;

  let statusText = 'Ativo';
  if (isExpired) {
    statusText = isTrial ? 'Teste Grátis Expirado (24h encerradas)' : 'Assinatura Expirada';
  } else if (isTrial) {
    statusText = hoursRemaining > 1 
      ? `Teste Grátis (${hoursRemaining} horas restantes)`
      : `Teste Grátis (${minutesRemaining} min restantes)`;
  } else {
    statusText = `Plano Ativo (${daysRemaining}d restantes)`;
  }

  const dateFormatted = targetDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    isValid: !isExpired,
    isTrial,
    isExpired,
    isQuotaExhausted: Boolean(isQuotaExhausted),
    isLifetime: false,
    isBlocked: false,
    statusText,
    daysRemaining,
    hoursRemaining,
    expirationDateFormatted: dateFormatted,
    expirationIso: targetDate.toISOString(),
    planDisplayName,
  };
}

/**
 * Sincroniza e garante o plano com teste grátis (24 horas) para novos clientes
 */
export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, 'users', user.uid);
  const now = new Date();
  const nowIso = now.toISOString();
  const trialDurationMs = 24 * 60 * 60 * 1000; // 24 horas
  const isAdmin = isUserAdmin(null, user.email);

  try {
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const existing = docSnap.data() as Partial<UserProfileData>;
      
      const trialEndsAt = isAdmin 
        ? '2099-12-31T23:59:59.999Z'
        : (existing.validUntil || existing.trialEndsAt || new Date(now.getTime() + trialDurationMs).toISOString());

      const updatedProfile: UserProfileData = {
        id: user.uid,
        email: user.email || existing.email || '',
        displayName: user.displayName || existing.displayName || (isAdmin ? 'Administrador' : 'Operador'),
        photoURL: user.photoURL || existing.photoURL || '',
        plan: isAdmin ? 'lifetime' : (existing.plan || 'trial'),
        planName: isAdmin ? 'Administrador Lifetime Eterno' : (existing.plan === 'trial' ? 'Teste Grátis (24 Horas)' : (existing.planName || 'Plano Shazam Premium')),
        planStatus: isAdmin ? 'active' : (existing.planStatus || 'trial'),
        role: isAdmin ? 'admin' : (existing.role || 'user'),
        isAdmin: isAdmin ? true : Boolean(existing.isAdmin),
        isBlocked: isAdmin ? false : Boolean(existing.isBlocked),
        blockedReason: existing.blockedReason,
        blockedAt: existing.blockedAt,
        trialStartedAt: existing.trialStartedAt || nowIso,
        trialEndsAt: trialEndsAt,
        validUntil: isAdmin ? '2099-12-31T23:59:59.999Z' : (existing.validUntil || trialEndsAt),
        trialDaysTotal: isAdmin ? 99999 : 1,
        totalDaysCredited: existing.totalDaysCredited || 0,
        consultasRestantes: isAdmin ? 999999 : (existing.consultasRestantes !== undefined ? existing.consultasRestantes : 999),
        createdAt: existing.createdAt || nowIso,
        lastLoginAt: nowIso,
        recentPayments: existing.recentPayments || [],
        latestNotification: existing.latestNotification,
        hasUnreadNotification: existing.hasUnreadNotification,
      };

      await setDoc(userRef, {
        lastLoginAt: nowIso,
        ...(isAdmin ? {
          plan: 'lifetime',
          planName: 'Administrador Lifetime Eterno',
          planStatus: 'active',
          role: 'admin',
          isAdmin: true,
          isBlocked: false,
          validUntil: '2099-12-31T23:59:59.999Z',
          trialEndsAt: '2099-12-31T23:59:59.999Z',
          consultasRestantes: 999999,
        } : {})
      }, { merge: true });
      return updatedProfile;
    } else {
      // Novo cliente cadastrado com o Google: se for admin recebe Lifetime direto, senão Teste Gratuito de 24 Horas
      const trialExpiration = isAdmin ? '2099-12-31T23:59:59.999Z' : new Date(now.getTime() + trialDurationMs).toISOString();
      const newProfile: UserProfileData = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || (isAdmin ? 'Administrador' : 'Operador'),
        photoURL: user.photoURL || '',
        plan: isAdmin ? 'lifetime' : 'trial',
        planName: isAdmin ? 'Administrador Lifetime Eterno' : 'Teste Grátis (24 Horas)',
        planStatus: 'active',
        role: isAdmin ? 'admin' : 'user',
        isAdmin: isAdmin ? true : false,
        isBlocked: false,
        trialStartedAt: nowIso,
        trialEndsAt: trialExpiration,
        validUntil: trialExpiration,
        trialDaysTotal: isAdmin ? 99999 : 1,
        totalDaysCredited: 0,
        consultasRestantes: isAdmin ? 999999 : 999,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        recentPayments: [],
      };

      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (err) {
    console.warn('[Firebase] Erro ao sincronizar perfil do usuário no Firestore:', err);
    const trialExpiration = isAdmin ? '2099-12-31T23:59:59.999Z' : new Date(now.getTime() + trialDurationMs).toISOString();
    return {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || (isAdmin ? 'Administrador' : 'Operador'),
      photoURL: user.photoURL || '',
      plan: isAdmin ? 'lifetime' : 'trial',
      planName: isAdmin ? 'Administrador Lifetime Eterno' : 'Teste Grátis (24 Horas)',
      planStatus: 'active',
      role: isAdmin ? 'admin' : 'user',
      isAdmin: isAdmin ? true : false,
      isBlocked: false,
      trialStartedAt: nowIso,
      trialEndsAt: trialExpiration,
      validUntil: trialExpiration,
      trialDaysTotal: isAdmin ? 99999 : 1,
      totalDaysCredited: 0,
      consultasRestantes: isAdmin ? 999999 : 999,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      recentPayments: [],
    };
  }
}

/**
 * Escuta em tempo real atualizações do perfil do usuário no Firestore (bloqueios, planos, notificações)
 */
export function subscribeUserProfile(
  userId: string, 
  onUpdate: (profile: UserProfileData) => void
): () => void {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as UserProfileData;
      onUpdate({ ...data, id: snapshot.id });
    }
  }, (err) => {
    console.warn('[Firestore] Erro no listener em tempo real do perfil:', err);
  });
}

/**
 * Marca notificação do usuário como lida
 */
export async function markNotificationAsRead(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      hasUnreadNotification: false,
    });
  } catch (err) {
    console.warn('[Firestore] Erro ao marcar notificação como lida:', err);
  }
}

/**
 * Credita tempo de uso e atualiza a validade da conta do usuário após pagamento PIX aprovado
 */
export async function creditUserPlanValidity(
  userId: string,
  planId: 'weekly' | 'biweekly' | 'monthly',
  paymentInfo: {
    depositId: string;
    amount: number;
    payerDocument?: string;
    qrCopyPaste?: string;
  }
): Promise<UserProfileData> {
  const userRef = doc(db, 'users', userId);
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

  try {
    const docSnap = await getDoc(userRef);
    let baseDate = now;
    let existingProfile: Partial<UserProfileData> = {};

    if (docSnap.exists()) {
      existingProfile = docSnap.data() as Partial<UserProfileData>;
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

    const paymentRecord: UserPaymentRecord = {
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

    const updatedProfile: UserProfileData = {
      id: userId,
      email: existingProfile.email || '',
      displayName: existingProfile.displayName || 'Operador',
      photoURL: existingProfile.photoURL || '',
      plan: planId,
      planName: planTitle,
      planStatus: 'active',
      trialStartedAt: existingProfile.trialStartedAt || nowIso,
      trialEndsAt: newExpiryIso,
      validUntil: newExpiryIso,
      trialDaysTotal: (existingProfile.trialDaysTotal || 7),
      totalDaysCredited: (existingProfile.totalDaysCredited || 0) + daysToAdd,
      consultasRestantes: existingProfile.consultasRestantes, // Mantém o histórico
      createdAt: existingProfile.createdAt || nowIso,
      lastLoginAt: nowIso,
      recentPayments: updatedPayments,
    };

    await setDoc(userRef, updatedProfile, { merge: true });

    try {
      await addDoc(collection(db, 'users', userId, 'payments'), {
        ...paymentRecord,
        userId,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'payments'), {
        ...paymentRecord,
        userId,
        createdAt: serverTimestamp(),
      });
    } catch (payErr) {
      console.warn('[Firestore] Log de pagamento complementar não gravado:', payErr);
    }

    // Libera a comissão de 15% para o revendedor responsável caso o usuário tenha sido indicado
    try {
      const { markReferralAsPaid } = await import('./resellerService');
      await markReferralAsPaid(userId, planId, paymentInfo.amount, paymentInfo.payerDocument);
    } catch (refErr) {
      console.warn('[Referral] Erro ao creditar comissão do revendedor:', refErr);
    }

    return updatedProfile;
  } catch (err) {
    console.error('[Firebase] Erro ao creditar validade do usuário:', err);
    const fallbackExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: userId,
      email: '',
      displayName: 'Operador',
      photoURL: '',
      plan: planId,
      planName: planTitle,
      planStatus: 'active',
      trialStartedAt: nowIso,
      trialEndsAt: fallbackExpiry,
      validUntil: fallbackExpiry,
      trialDaysTotal: 7,
      totalDaysCredited: daysToAdd,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      recentPayments: [],
    };
  }
}

/**
 * Sign in with Google Popup and update user profile in Firestore
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: UserProfileData }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const profile = await syncUserProfile(user);

    return { user, profile };
  } catch (err: any) {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    console.error('[Firebase Auth] Erro ao autenticar via Google:', err?.code, err?.message);
    
    err.detectedDomain = currentDomain;
    if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
      err.friendlyMessage = `O domínio "${currentDomain}" ainda não está na lista de Domínios Autorizados no Firebase Console.`;
    }
    throw err;
  }
}

/**
 * Cria sessão de Operador Convidado (Modo Demonstração) para testes locais ou ambientes não autorizados
 */
export function createGuestOperatorUser(): { user: any; profile: UserProfileData } {
  const now = new Date();
  const trialExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
  
  const mockUser: any = {
    uid: guestId,
    email: 'operador.demo@shazam.terminal',
    displayName: 'Operador Convidado (Modo Teste 24h)',
    photoURL: '',
    isAnonymous: true,
  };

  const profile: UserProfileData = {
    id: guestId,
    email: 'operador.demo@shazam.terminal',
    displayName: 'Operador Convidado (Modo Teste 24h)',
    photoURL: '',
    plan: 'trial',
    planName: 'Teste Grátis (24 Horas)',
    planStatus: 'trial',
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialExpiration,
    validUntil: trialExpiration,
    trialDaysTotal: 1,
    totalDaysCredited: 0,
    consultasRestantes: 999,
    createdAt: now.toISOString(),
    lastLoginAt: now.toISOString(),
    recentPayments: [],
  };

  return { user: mockUser, profile };
}

/**
 * Sign out current Firebase user
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to Firebase Auth state changes
 */
export function onAuthUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Persist consultation into Firestore under global 'consultas' and user-specific collection
 * Includes full details: research parameters, complete raw result, timestamp, and client IP
 */
export async function saveConsultaToFirestore(consulta: {
  parametro: string;
  modulo: string;
  modulo_titulo: string;
  status: string;
  tempo_resposta_ms?: number | null;
  resultado_resumo?: string | null;
  resposta_bruta?: string | null;
  resultado_completo?: string | null;
  telegram_msg_id?: number | string | null;
  ip?: string | null;
  client_ip?: string | null;
}, user: User | null | { uid: string; email?: string | null; displayName?: string | null }) {
  try {
    const ipAddress = consulta.ip || consulta.client_ip || '127.0.0.1';
    const fullResult = consulta.resultado_completo || consulta.resposta_bruta || consulta.resultado_resumo || '';
    const userId = user?.uid || 'guest_user';
    const userEmail = user?.email || 'cliente@shazam.terminal';
    const userName = user?.displayName || 'Operador Shazam';
    const userPhotoURL = (user as any)?.photoURL || '';

    const consultaPayload = {
      userId,
      userEmail,
      userName,
      userPhotoURL,
      parametro: consulta.parametro,
      modulo: consulta.modulo,
      modulo_titulo: consulta.modulo_titulo,
      status: consulta.status || 'concluida',
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      tempo_resposta_ms: consulta.tempo_resposta_ms || 0,
      resultado_resumo: consulta.resultado_resumo || (fullResult ? fullResult.slice(0, 300) : ''),
      resposta_bruta: consulta.resposta_bruta || fullResult,
      resultado_completo: fullResult,
      telegram_msg_id: consulta.telegram_msg_id || null,
      ip: ipAddress,
      client_ip: ipAddress,
    };

    const docRef = await addDoc(collection(db, 'consultas'), consultaPayload);

    if (user?.uid) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'consultas'), {
          ...consultaPayload,
          consultaId: docRef.id,
        });
      } catch (subErr) {
        console.warn('[Firestore] Subcoleção do usuário não gravada:', subErr);
      }
    }

    return docRef.id;
  } catch (err: any) {
    console.warn('[Firestore] Erro ao gravar consulta no Firestore:', err?.message || err);
    return null;
  }
}

/**
 * Fetch consultation history for current user from Firestore
 */
export async function fetchUserHistoryFromFirestore(userId: string) {
  try {
    const q = query(
      collection(db, 'consultas'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err: any) {
    console.warn('[Firestore] Erro ao buscar histórico de consultas:', err?.message || err);
    return [];
  }
}

/**
 * Deduz 1 consulta do saldo do usuário no Firestore (Apenas para usuários Trial)
 */
export async function deduzirConsulta(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      consultasRestantes: increment(-1)
    });
  } catch (err) {
    console.error('[Firestore] Erro ao deduzir consulta:', err);
    throw err;
  }
}