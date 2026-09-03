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
  serverTimestamp 
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

export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: 'premium' | 'weekly' | 'biweekly' | 'monthly' | 'free' | 'enterprise';
  planName?: string;
  planStatus: 'trial' | 'active' | 'expired';
  trialStartedAt: string;
  trialEndsAt: string;
  validUntil: string;
  trialDaysTotal: number;
  totalDaysCredited?: number;
  createdAt: string;
  lastLoginAt: string;
  recentPayments?: UserPaymentRecord[];
}

/**
 * Calcula a validade detalhada da conta do usuário em tempo real
 */
export function calculateAccountValidity(profile?: UserProfileData | null): {
  isValid: boolean;
  isTrial: boolean;
  isExpired: boolean;
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
      statusText: 'Desconectado',
      daysRemaining: 0,
      hoursRemaining: 0,
      expirationDateFormatted: 'Não autenticado',
      expirationIso: '',
      planDisplayName: 'Sem plano',
    };
  }

  const now = new Date();
  const rawExpiry = profile.validUntil || profile.trialEndsAt || profile.createdAt;
  const expiryDate = new Date(rawExpiry);
  const isValidDate = !isNaN(expiryDate.getTime());
  const targetDate = isValidDate ? expiryDate : new Date(now.getTime() + 7 * 86400000);

  const diffMs = targetDate.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  const isTrial = profile.planStatus === 'trial' || profile.plan === 'premium';
  
  let planDisplayName = 'Plano Shazam Premium';
  if (profile.plan === 'weekly') planDisplayName = 'Plano Semanal (7 Dias)';
  else if (profile.plan === 'biweekly') planDisplayName = 'Plano 15 Dias';
  else if (profile.plan === 'monthly') planDisplayName = 'Plano Mensal (30 Dias)';
  else if (profile.planName) planDisplayName = profile.planName;

  let statusText = 'Ativo';
  if (isExpired) {
    statusText = 'Assinatura Expirada';
  } else if (isTrial && profile.planStatus === 'trial') {
    statusText = `Teste Grátis (${daysRemaining}d restantes)`;
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
    statusText,
    daysRemaining,
    hoursRemaining,
    expirationDateFormatted: dateFormatted,
    expirationIso: targetDate.toISOString(),
    planDisplayName,
  };
}

/**
 * Sincroniza e garante o plano com teste de 7 dias para novos clientes ou recupera validade
 */
export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, 'users', user.uid);
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const existing = docSnap.data() as Partial<UserProfileData>;
      
      const trialEndsAt = existing.validUntil || existing.trialEndsAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile: UserProfileData = {
        id: user.uid,
        email: user.email || existing.email || '',
        displayName: user.displayName || existing.displayName || 'Operador',
        photoURL: user.photoURL || existing.photoURL || '',
        plan: existing.plan || 'premium',
        planName: existing.planName || 'Plano Shazam Premium',
        planStatus: existing.planStatus || 'trial',
        trialStartedAt: existing.trialStartedAt || nowIso,
        trialEndsAt: trialEndsAt,
        validUntil: existing.validUntil || trialEndsAt,
        trialDaysTotal: existing.trialDaysTotal || 7,
        totalDaysCredited: existing.totalDaysCredited || 7,
        createdAt: existing.createdAt || nowIso,
        lastLoginAt: nowIso,
        recentPayments: existing.recentPayments || [],
      };

      await setDoc(userRef, { lastLoginAt: nowIso }, { merge: true });
      return updatedProfile;
    } else {
      // Novo cliente cadastrado com o Google: ganha Plano Premium com 7 dias de teste grátis
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newProfile: UserProfileData = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Operador',
        photoURL: user.photoURL || '',
        plan: 'premium',
        planName: 'Teste Grátis 7 Dias (Premium)',
        planStatus: 'trial',
        trialStartedAt: nowIso,
        trialEndsAt: sevenDaysLater,
        validUntil: sevenDaysLater,
        trialDaysTotal: 7,
        totalDaysCredited: 7,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        recentPayments: [],
      };

      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (err) {
    console.warn('[Firebase] Erro ao sincronizar perfil do usuário no Firestore:', err);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Operador',
      photoURL: user.photoURL || '',
      plan: 'premium',
      planName: 'Teste Grátis 7 Dias (Premium)',
      planStatus: 'trial',
      trialStartedAt: nowIso,
      trialEndsAt: sevenDaysLater,
      validUntil: sevenDaysLater,
      trialDaysTotal: 7,
      totalDaysCredited: 7,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      recentPayments: [],
    };
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
        // Se a data existente ainda estiver no futuro, soma os dias a partir dela!
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
      createdAt: existingProfile.createdAt || nowIso,
      lastLoginAt: nowIso,
      recentPayments: updatedPayments,
    };

    await setDoc(userRef, updatedProfile, { merge: true });

    // Registra na subcoleção e coleção geral de pagamentos
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

    return updatedProfile;
  } catch (err) {
    console.error('[Firebase] Erro ao creditar validade do usuário:', err);
    // Fallback gracioso
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
    
    // Attach diagnostic domain information
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
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
  
  const mockUser: any = {
    uid: guestId,
    email: 'operador.demo@shazam.terminal',
    displayName: 'Operador Convidado (Modo Teste)',
    photoURL: '',
    isAnonymous: true,
  };

  const profile: UserProfileData = {
    id: guestId,
    email: 'operador.demo@shazam.terminal',
    displayName: 'Operador Convidado (Modo Teste)',
    photoURL: '',
    plan: 'premium',
    planName: 'Teste Grátis 7 Dias (Premium)',
    planStatus: 'trial',
    trialStartedAt: now.toISOString(),
    trialEndsAt: sevenDaysLater,
    validUntil: sevenDaysLater,
    trialDaysTotal: 7,
    totalDaysCredited: 7,
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
 */
export async function saveConsultaToFirestore(consulta: {
  parametro: string;
  modulo: string;
  modulo_titulo: string;
  status: string;
  tempo_resposta_ms?: number | null;
  resultado_resumo?: string | null;
  resposta_bruta?: string | null;
  telegram_msg_id?: number | string | null;
}, user: User | null) {
  if (!user) return null;

  try {
    const consultaPayload = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || 'Operador',
      parametro: consulta.parametro,
      modulo: consulta.modulo,
      modulo_titulo: consulta.modulo_titulo,
      status: consulta.status,
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      tempo_resposta_ms: consulta.tempo_resposta_ms || 0,
      resultado_resumo: consulta.resultado_resumo || '',
      resposta_bruta: consulta.resposta_bruta || '',
      telegram_msg_id: consulta.telegram_msg_id || null,
    };

    // Save in global consultas
    const docRef = await addDoc(collection(db, 'consultas'), consultaPayload);

    // Also save in user's subcollection for isolated history & quick filtering
    try {
      await addDoc(collection(db, 'users', user.uid, 'consultas'), {
        ...consultaPayload,
        consultaId: docRef.id,
      });
    } catch (subErr) {
      console.warn('[Firestore] Subcoleção do usuário não gravada:', subErr);
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
