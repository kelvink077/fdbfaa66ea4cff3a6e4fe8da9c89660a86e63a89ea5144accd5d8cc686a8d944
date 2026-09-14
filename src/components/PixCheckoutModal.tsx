import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Loader2, 
  Clock, 
  ShieldCheck, 
  X, 
  Sparkles, 
  AlertCircle, 
  AlertTriangle,
  Crown,
  Calendar,
  ArrowRight,
  Shield,
  FileCheck,
  Tag,
  ChevronDown
} from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { creditUserPlanValidity, calculateAccountValidity } from '../lib/firebase';
import { checkCouponValidity, redeemActivationCode, burnDiscountCoupon } from '../lib/couponService';
import { DiscountAttentionModal } from './DiscountAttentionModal';

export interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'weekly' | 'biweekly' | 'monthly';
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onPaymentSuccess?: (updatedProfile: UserProfileData) => void;
  initialDiscountCode?: string;
  initialDiscountedPrice?: number;
  socket?: Socket | null;
}

const PLAN_META: Record<string, { name: string; price: string; amount: number; days: number; desc: string }> = {
  weekly: {
    name: 'Plano Semanal',
    price: '11,00',
    amount: 11.00,
    days: 7,
    desc: 'Adiciona 7 dias de acesso irrestrito aos 8 módulos de inteligência',
  },
  biweekly: {
    name: 'Plano 15 Dias',
    price: '19,90',
    amount: 19.90,
    days: 15,
    desc: 'Adiciona 15 dias de consultas ilimitadas em tempo real',
  },
  monthly: {
    name: 'Plano Mensal',
    price: '35,00',
    amount: 35.00,
    days: 30,
    desc: 'Adiciona 30 dias com prioridade máxima e suporte VIP',
  },
};

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  isOpen,
  onClose,
  planId,
  currentUser,
  userProfile,
  onPaymentSuccess,
  initialDiscountCode,
  initialDiscountedPrice,
  socket,
}) => {
  const plan = PLAN_META[planId] || PLAN_META.weekly;

  const [step, setStep] = useState<'form' | 'qr' | 'success'>('form');
  const [payerDocument, setPayerDocument] = useState('');
  const [payerName, setPayerName] = useState(currentUser?.displayName || 'Operador');
  const [docError, setDocError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Estados de Desconto e Ativação (Somente Plano Mensal R$ 35)
  const isMonthlyPlan = planId === 'monthly';
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');
  const [activeDiscountCode, setActiveDiscountCode] = useState<string | undefined>(initialDiscountCode);
  const [activeDiscountPrice, setActiveDiscountPrice] = useState<number | undefined>(initialDiscountedPrice);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [isDirectActivation, setIsDirectActivation] = useState(false);
  const [activationMsg, setActivationMsg] = useState('');

  // PIX Data returned by UP DEPIX
  const [depositId, setDepositId] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [creditedProfile, setCreditedProfile] = useState<UserProfileData | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<any>(null);

  // Preço calculado dinamicamente
  const currentAmount = (isMonthlyPlan && activeDiscountPrice) ? activeDiscountPrice : plan.amount;
  const currentPriceFormatted = (isMonthlyPlan && activeDiscountPrice) ? activeDiscountPrice.toFixed(2).replace('.', ',') : plan.price;

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setDocError('');
      setErrorMessage('');
      setDepositId(null);
      setQrCodeText('');
      setQrImageUrl('');
      setIsLoading(false);
      setCopied(false);
      setTermsAccepted(false);
      setTermsError('');
      setShowTermsModal(false);
      setCreditedProfile(null);
      setShowCouponInput(false);
      setCouponCodeInput('');
      setCouponError('');
      setCouponSuccessMsg('');
      setIsDirectActivation(false);
      setActivationMsg('');
      setActiveDiscountCode(initialDiscountCode);
      setActiveDiscountPrice(initialDiscountedPrice);
      if (currentUser?.displayName) {
        setPayerName(currentUser.displayName);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen, currentUser, planId, initialDiscountCode, initialDiscountedPrice]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Real-time automatic confirmation via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleSocketPaymentConfirmed = async (data: any) => {
      console.log('[PixCheckoutModal] Pagamento confirmado em tempo real via WebSocket:', data);
      const isMyDeposit = depositId && data?.depositId === depositId;
      const isMyUser = currentUser?.uid && data?.userId === currentUser.uid;

      if (isMyDeposit || isMyUser) {
        await handlePaymentConfirmed(
          depositId || data?.depositId || 'pix-confirmed',
          payerDocument.replace(/\D/g, ''),
          qrCodeText
        );
      }
    };

    socket.on('payment:confirmed', handleSocketPaymentConfirmed);
    return () => {
      socket.off('payment:confirmed', handleSocketPaymentConfirmed);
    };
  }, [socket, depositId, currentUser?.uid, planId, payerDocument, qrCodeText]);

  if (!isOpen) return null;

  // Handler para validar código dentro do Checkout Modal (Somente Plano Mensal)
  const handleApplyCouponInModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Digite seu código.');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');
    setCouponSuccessMsg('');

    try {
      const check = await checkCouponValidity(cleanCode);
      if (!check.valid || !check.coupon) {
        setCouponError(check.error || 'Código inválido ou já utilizado.');
        return;
      }

      if (check.coupon.type === 'activation') {
        // CÓDIGO DE ATIVAÇÃO DIRETA (100% GRÁTIS):
        // "se uma pessoa tiver um codigo de ativação e digitar o codigo valido o sistema não direciona ao chekout pois o codigo de ativação não necessita pagamento, se codigo for reconhecido deve ser informado: codigo de ativação aplicado sua conta já esta ativa por 30 dias"
        if (!currentUser) {
          setCouponError('Você precisa estar autenticado para ativar sua conta.');
          return;
        }

        const res = await redeemActivationCode(check.coupon.code, currentUser, userProfile);
        if (res.success) {
          setIsDirectActivation(true);
          setActivationMsg('Código de ativação aplicado, sua conta já está ativa por 30 dias');
          if (res.updatedProfile) {
            setCreditedProfile(res.updatedProfile);
            if (onPaymentSuccess) {
              onPaymentSuccess(res.updatedProfile);
            }
          }
          setStep('success');
        } else {
          setCouponError(res.error || 'Falha ao ativar com este código.');
        }
      } else if (check.coupon.type === 'discount') {
        // CÓDIGO DE DESCONTO DE NOVO USUÁRIO:
        // "o mesmo vale para o codigo de desconto de novo usuario na qual o mesmo vai dar um desconto na qual o valor do plano de 35 reais cai apenas para 11 reais no primeiro mes para novos usuarios."
        setActiveDiscountCode(check.coupon.code);
        setActiveDiscountPrice(11.00);
        setCouponSuccessMsg('Código de desconto aplicado! Plano mensal de R$ 35,00 por apenas R$ 11,00 no 1º mês.');
      }
    } catch (err: any) {
      setCouponError(err?.message || 'Erro ao consultar código.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Mask CPF (000.000.000-00) or CNPJ (00.000.000/0000-00)
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;

    if (raw.length <= 11) {
      // CPF format
      formatted = raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ format
      formatted = raw
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }

    setPayerDocument(formatted);
    if (setDocError) setDocError('');
  };

  // Submissão do formulário: se tiver código de desconto ativo, deve exigir a confirmação de atenção
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanDoc = payerDocument.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setDocError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para compliance do PIX.');
      return;
    }

    if (!termsAccepted) {
      setTermsError('É obrigatório clicar em "ACEITAR TERMOS" para confirmar que a conta pagadora possui o mesmo CPF/CNPJ.');
      return;
    }

    // Regra mandatória com código de desconto:
    // "quando o cliente for pagar e digitar o codigo de desconto valido o sistema deve informar para ele: antes de clicar no botão pagar tenha atenção pois caso o pagamento não seja concluido esse codigo de desconto será perdido deseja efetuar o pagamento agora ou em outro momento ?"
    if (isMonthlyPlan && activeDiscountCode) {
      setShowAttentionModal(true);
      return;
    }

    // Se não tem desconto pendente de confirmação, prossegue normalmente
    executeGeneratePix();
  };

  // Confirmou pagamento no Modal de Atenção (Queima o cupom de desconto e gera a chave PIX)
  const handleConfirmDiscountPayment = async () => {
    setShowAttentionModal(false);
    if (activeDiscountCode && currentUser) {
      try {
        await burnDiscountCoupon(activeDiscountCode, currentUser);
      } catch (err) {
        console.warn('[PixCheckoutModal] Erro ao consumir cupom:', err);
      }
    }
    executeGeneratePix();
  };

  // Executa a chamada à API UP DEPIX
  const executeGeneratePix = async () => {
    const cleanDoc = payerDocument.replace(/\D/g, '');
    setIsLoading(true);
    setErrorMessage('');

    try {
      const backendUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${backendUrl}/api/payment/create-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: currentUser?.uid || 'anon',
          userEmail: currentUser?.email || '',
          userName: payerName,
          payerDocument: cleanDoc,
          customAmount: currentAmount,
          discountCode: activeDiscountCode || undefined,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.detail || 'Não foi possível gerar a cobrança PIX.');
      }

      const { id, qrCopyPaste, qrImageUrl: imgUrl, expiresAt: exp } = resData.data;

      setDepositId(id);
      setQrCodeText(qrCopyPaste);
      setQrImageUrl(imgUrl);
      setExpiresAt(exp);
      setStep('qr');

      // Start automatic polling every 3.5 seconds
      startStatusPolling(id, cleanDoc, qrCopyPaste);
    } catch (err: any) {
      console.error('[PixCheckoutModal] Erro:', err);
      setErrorMessage(err?.message || 'Falha na comunicação com o gateway UP DEPIX.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start status polling
  const startStatusPolling = (depId: string, docClean: string, qrCodeStr: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      await checkStatus(depId, docClean, qrCodeStr, false);
    }, 3500);
  };

  // Confirmação e ativação automática da conta via API segura de Backend
  const handlePaymentConfirmed = async (depId: string, docClean?: string, qrCodeStr?: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        const backendUrl = import.meta.env.VITE_API_URL || '';
        const confirmRes = await fetch(`${backendUrl}/api/payment/confirm-deposit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            depositId: depId,
            planId,
            amount: currentAmount,
            payerDocument: docClean || payerDocument.replace(/\D/g, ''),
            qrCopyPaste: qrCodeStr || qrCodeText,
          }),
        });

        const confirmData = await confirmRes.json();
        if (confirmRes.ok && confirmData.success && confirmData.updatedProfile) {
          setCreditedProfile(confirmData.updatedProfile);
          if (onPaymentSuccess) {
            onPaymentSuccess(confirmData.updatedProfile);
          }
        } else {
          // Fallback se webhook já confirmou
          const fallbackProfile = await creditUserPlanValidity(currentUser.uid, planId, {
            depositId: depId,
            amount: currentAmount,
            payerDocument: docClean || payerDocument.replace(/\D/g, ''),
            qrCopyPaste: qrCodeStr || qrCodeText,
          });
          setCreditedProfile(fallbackProfile);
          if (onPaymentSuccess) onPaymentSuccess(fallbackProfile);
        }
      } catch (err) {
        console.warn('[PixCheckoutModal] Erro ao creditar validade:', err);
      }
    }

    setStep('success');
  };

  // Check deposit status via backend -> UP DEPIX
  const checkStatus = async (depId: string, docClean: string, qrCodeStr: string, isManual = false) => {
    if (isManual) setIsCheckingStatus(true);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${backendUrl}/api/payment/check-status/${depId}`);
      const json = await res.json();

      if (json.success && json.data?.isPaid) {
        await handlePaymentConfirmed(depId, docClean, qrCodeStr);
      }
    } catch (err) {
      console.warn('[PixCheckoutModal] Erro ao checar status:', err);
    } finally {
      if (isManual) setIsCheckingStatus(false);
    }
  };

  const handleCopyCode = async () => {
    if (!qrCodeText) return;
    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = qrCodeText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const validitySummary = calculateAccountValidity(creditedProfile || userProfile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#011413]/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-[#012624] border border-[#00827c]/40 rounded-[20px] shadow-2xl p-6 sm:p-8 my-8 text-[#bbc7c6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
          aria-label="Fechar checkout"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP 1: FORM TO COLLECT PAYER CPF/CNPJ (UP DEPIX COMPLIANCE) */}
        {step === 'form' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-[4px] bg-[#cbfffc]/15 text-[#cbfffc] text-[10px] font-mono font-medium uppercase tracking-wider border border-[#cbfffc]/30">
                CHECKOUT PIX UP DEPIX
              </span>
              <span className="text-xs text-[#707777] font-mono">
                {plan.days} DIAS DE ACESSO
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold text-[#ffffff] font-['DM_Sans',sans-serif]">
              Assinar {plan.name}
            </h3>
            <p className="text-xs text-[#bbc7c6] mt-1 mb-5">
              {plan.desc}
            </p>

            {/* Price Card */}
            <div className="p-4 rounded-[12px] bg-[#011d1c] border border-[#003734] mb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#707777] block">
                  {activeDiscountCode ? 'Valor com Desconto de Novo Usuário' : 'Valor a pagar via PIX'}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xs font-mono text-[#cbfffc]">R$</span>
                  <span className={`text-2xl sm:text-3xl font-mono font-bold ${activeDiscountCode ? 'text-emerald-400' : 'text-[#ffffff]'}`}>
                    {currentPriceFormatted}
                  </span>
                  {activeDiscountCode && (
                    <span className="text-[11px] font-mono text-[#707777] line-through ml-2">
                      De R$ 35,00
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#ffd166] bg-[#ffd166]/10 px-2 py-1 rounded-[6px] border border-[#ffd166]/30">
                  <Crown className="w-3 h-3 text-[#ffd166]" />
                  +{plan.days} dias de validade
                </span>
              </div>
            </div>

            {/* OPÇÃO SOMENTE NO PLANO DE 35 MENSAL: Eu tenho código de desconto/ativação */}
            {isMonthlyPlan && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponInput(!showCouponInput);
                    setCouponError('');
                  }}
                  className="w-full py-2 px-3 rounded-[8px] bg-[#002422] hover:bg-[#002e2b] border border-[#00827c]/60 hover:border-[#cbfffc] text-xs font-mono text-[#cbfffc] flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Tag className="w-3.5 h-3.5 text-[#ffd166] group-hover:rotate-12 transition-transform" />
                    <span>Eu tenho código de desconto/ativação</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCouponInput ? 'rotate-180 text-white' : 'text-[#707777]'}`} />
                </button>

                {showCouponInput && (
                  <div className="mt-2 p-3 rounded-[10px] bg-[#011716] border border-[#00827c]/70 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[11px] font-mono text-[#bbc7c6]">
                      Código de ativação de 30 dias (sem checkout) ou cupom de desconto de novo usuário:
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        placeholder="EX: ATIVAR30DIAS ou NOVO11"
                        className="flex-1 px-3 py-2 rounded-[6px] bg-[#002523] border border-[#00827c]/50 text-xs font-mono text-white placeholder-[#707777] uppercase tracking-wider focus:outline-none focus:border-[#cbfffc]"
                      />
                      <button
                        type="button"
                        disabled={isValidatingCoupon || !couponCodeInput.trim()}
                        onClick={handleApplyCouponInModal}
                        className="px-3 py-2 rounded-[6px] bg-[#00827c] hover:bg-[#009e96] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                      </button>
                    </div>

                    {couponError && (
                      <div className="p-2 rounded-[6px] bg-rose-950/60 border border-rose-500/50 text-[11px] text-rose-300 font-mono flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{couponError}</span>
                      </div>
                    )}

                    {couponSuccessMsg && (
                      <div className="p-2 rounded-[6px] bg-emerald-950/60 border border-emerald-500/50 text-[11px] text-emerald-300 font-mono flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{couponSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 rounded-[8px] bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#edfffe] mb-1.5">
                  Nome do Pagador
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#00302d] border border-[#00827c]/40 text-xs text-[#ffffff] font-mono placeholder-[#707777] focus:outline-none focus:border-[#cbfffc]"
                  placeholder="Nome completo ou razão social"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#edfffe]">
                    CPF ou CNPJ do Pagador *
                  </label>
                  <span className="text-[10px] text-[#707777] font-mono">Exigência antifraude UP DEPIX</span>
                </div>
                <input
                  type="text"
                  value={payerDocument}
                  onChange={handleDocumentChange}
                  className={`w-full px-3.5 py-2.5 rounded-[8px] bg-[#00302d] border text-xs text-[#ffffff] font-mono placeholder-[#707777] focus:outline-none ${
                    docError ? 'border-rose-500' : 'border-[#00827c]/40 focus:border-[#cbfffc]'
                  }`}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  required
                />
                {docError && (
                  <p className="text-[11px] text-rose-400 mt-1 font-mono">{docError}</p>
                )}
              </div>

              {/* Termos de Identificação do Pagador (Estilo idêntico ao alerta vermelho da imagem) */}
              <div className={`p-3.5 rounded-[10px] border transition-all ${
                termsAccepted 
                  ? 'bg-[#002b28] border-emerald-500/60' 
                  : termsError 
                    ? 'bg-[#2a1013] border-rose-500/80 ring-1 ring-rose-500/60' 
                    : 'bg-[#221013]/95 border border-rose-500/40'
              }`}>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${termsAccepted ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong className={`text-xs font-mono font-bold uppercase tracking-wider ${termsAccepted ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Termos de Identificação do Pagador
                      </strong>
                      {termsAccepted && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          TERMOS ACEITOS
                        </span>
                      )}
                    </div>

                    <p className={`text-[11px] leading-relaxed ${termsAccepted ? 'text-[#edfffe]' : 'text-rose-200/95'}`}>
                      Por medidas de segurança da <strong>rede DEPIX</strong>, é necessário informar o CPF ou CNPJ do titular pagador. 
                      <span className="font-semibold text-[#ffffff]"> Caso o cliente não digitar o CPF ou CNPJ da conta que está efetuando o pagamento PIX de maneira correta, o valor será estornado e o pagamento não será creditado.</span>
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !termsAccepted;
                          setTermsAccepted(next);
                          if (next) setTermsError('');
                        }}
                        className={`px-4 py-2 rounded-[8px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                          termsAccepted
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-[#ffffff]'
                            : 'bg-rose-600 hover:bg-rose-500 text-[#ffffff] hover:scale-[1.02] shadow-rose-950/60'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{termsAccepted ? 'TERMOS ACEITOS ✓' : 'ACEITAR TERMOS'}</span>
                      </button>

                      <span className={`text-[10px] font-mono ${termsAccepted ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>
                        {termsAccepted ? '✓ Declaração confirmada' : '* Clique para aceitar antes de pagar'}
                      </span>
                    </div>

                    {termsError && (
                      <p className="text-[11px] text-rose-300 mt-2 font-mono flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{termsError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Pagar estilizado em destaque Laranja/Amber (conforme layout) */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-[10px] bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#fb923c] hover:to-[#f97316] text-[#ffffff] font-bold text-sm font-['DM_Sans',sans-serif] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 hover:scale-[1.01] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#ffffff]" />
                      <span>Gerando QR Code na UP DEPIX...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Pagar R$ {currentPriceFormatted}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Box 3: Pagamento 100% Seguro (conforme layout da imagem) */}
              <div className="p-3 rounded-[10px] bg-[#022c22]/50 border border-emerald-500/40 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ffffff]">Pagamento 100% Seguro</div>
                  <div className="text-[11px] text-emerald-400/90 font-mono">Processado pelo UPDEPIX via PIX</div>
                </div>
              </div>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[#707777] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#cbfffc]" />
              <span>Ambiente Criptografado • Processamento Instantâneo via UP DEPIX v1</span>
            </div>
          </div>
        )}

        {/* STEP 2: DISPLAY QR CODE AND COPY-PASTE KEY */}
        {step === 'qr' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#cbfffc]/15 text-[#cbfffc] text-xs font-mono font-medium mb-3 border border-[#cbfffc]/30">
              <Clock className="w-3.5 h-3.5 animate-pulse text-[#cbfffc]" />
              <span>Aguardando Pagamento PIX...</span>
            </div>

            <h3 className="text-xl font-medium text-[#ffffff] font-['DM_Sans',sans-serif]">
              Pague R$ {currentPriceFormatted} via PIX
            </h3>
            <p className="text-xs text-[#bbc7c6] mt-1 mb-4">
              Escaneie o QR Code com o app do seu banco ou utilize o código Copia e Cola.
            </p>

            {/* QR Code Container */}
            <div className="inline-block p-3 rounded-[16px] bg-[#ffffff] shadow-lg mb-4 border border-[#00827c]/40">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR Code PIX UP DEPIX"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-[8px]"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-[#f0f0f0] text-[#012624]">
                  <QrCode className="w-32 h-32 text-[#012624]" />
                </div>
              )}
            </div>

            {/* Aviso de titularidade do QR code */}
            <div className="mb-4 p-2.5 rounded-[8px] bg-[#002422] border border-[#00827c]/40 text-[11px] text-[#edfffe] flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#ffd166] shrink-0" />
              <span>
                Conta pagadora obrigatória: <strong className="text-[#ffd166] font-mono">{payerDocument}</strong>
              </span>
            </div>

            {/* Copy-and-Paste Code */}
            <div className="mb-4">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#707777] mb-1">
                PIX Copia e Cola
              </label>
              <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[#00302d] border border-[#00827c]/40">
                <input
                  type="text"
                  readOnly
                  value={qrCodeText}
                  className="w-full bg-transparent text-xs font-mono text-[#ffffff] truncate focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-[6px] bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#011d1c]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#011d1c]" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verification status and button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => checkStatus(depositId!, payerDocument.replace(/\D/g, ''), qrCodeText, true)}
                disabled={isCheckingStatus}
                className="w-full py-2.5 px-4 rounded-[8px] bg-[#003734] hover:bg-[#004743] border border-[#00827c]/60 hover:border-[#cbfffc] text-[#edfffe] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#cbfffc]" />
                    <span>Verificando no Banco Parceiro...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>Já Efetuei o Pagamento (Verificar Agora)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-[#707777] font-mono mt-4 text-center">
              O sistema verifica a cada 3.5 segundos. A confirmação é processada automaticamente via API assim que o PIX for pago.
            </p>
          </div>
        )}

        {/* STEP 3: SUCCESS AND CREDITED ACCOUNT */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-bounce">
              <Check className="w-8 h-8 text-emerald-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold mb-2 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDirectActivation ? 'CONTA ATIVADA COM SUCESSO' : 'PAGAMENTO IDENTIFICADO COM SUCESSO'}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-[#ffffff] font-['DM_Sans',sans-serif] mt-1 tracking-tight leading-snug">
              {isDirectActivation ? activationMsg : 'Agradecemos o seu pagamento seu plano já esta ativo'}
            </h3>
            <p className="text-xs sm:text-sm text-[#cbfffc] mt-2 max-w-md mx-auto font-mono">
              {isDirectActivation ? (
                <span>Código de ativação aplicado com sucesso. Sua conta possui acesso completo liberado por 30 dias.</span>
              ) : (
                <span>Identificamos a confirmação da sua transação. Foram creditados com sucesso <strong className="text-[#ffffff]">+{plan.days} dias de acesso irrestrito</strong> aos módulos de inteligência do Shazam Buscas.</span>
              )}
            </p>

            {/* Validity Information Box */}
            <div className="my-6 p-4 rounded-[12px] bg-[#011d1c] border border-emerald-500/30 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
                <span className="text-xs text-[#707777] font-mono">Status da Conta:</span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ATIVO
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
                <span className="text-xs text-[#707777] font-mono">Plano:</span>
                <span className="text-xs font-mono font-medium text-[#ffffff]">
                  {plan.name} {isDirectActivation ? '(Ativação por Código - 30 Dias)' : activeDiscountCode ? `(R$ ${currentPriceFormatted} - Desconto Aplicado)` : `(R$ ${plan.price})`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#707777] font-mono">Nova Validade:</span>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#cbfffc] block">
                    {validitySummary.expirationDateFormatted}
                  </span>
                  <span className="text-[10px] font-mono text-[#ffd166]">
                    ({validitySummary.daysRemaining} dias restantes)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-[8px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01]"
            >
              <span>Continuar para as Consultas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Mandatório de Atenção com Código de Desconto */}
      {activeDiscountCode && (
        <DiscountAttentionModal
          isOpen={showAttentionModal}
          onClose={() => setShowAttentionModal(false)}
          onConfirmPayment={handleConfirmDiscountPayment}
          discountCode={activeDiscountCode}
          originalPrice="35,00"
          discountedPrice={currentPriceFormatted}
        />
      )}
    </div>
  );
};