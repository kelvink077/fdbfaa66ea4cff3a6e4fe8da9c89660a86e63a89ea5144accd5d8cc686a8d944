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
  Zap, 
  Crown,
  Calendar,
  ArrowRight
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { creditUserPlanValidity, calculateAccountValidity } from '../lib/firebase';

export interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'weekly' | 'biweekly' | 'monthly';
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onPaymentSuccess?: (updatedProfile: UserProfileData) => void;
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
}) => {
  const plan = PLAN_META[planId] || PLAN_META.weekly;

  const [step, setStep] = useState<'form' | 'qr' | 'success'>('form');
  const [payerDocument, setPayerDocument] = useState('');
  const [payerName, setPayerName] = useState(currentUser?.displayName || 'Operador');
  const [docError, setDocError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // PIX Data returned by UP DEPIX
  const [depositId, setDepositId] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [creditedProfile, setCreditedProfile] = useState<UserProfileData | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<any>(null);

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
      setCreditedProfile(null);
      if (currentUser?.displayName) {
        setPayerName(currentUser.displayName);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen, currentUser, planId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

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

  // Step 1: Submit to UP DEPIX /api/payment/create-pix no backend
  const handleGeneratePix = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanDoc = payerDocument.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setDocError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para compliance do PIX.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // URL base do Backend no Render
      const backendUrl = import.meta.env.VITE_API_URL || 'https://shazam-ygad.onrender.com';

      const response = await fetch(`${backendUrl}/api/payment/create-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: currentUser?.uid || 'anon',
          userEmail: currentUser?.email || '',
          userName: payerName,
          payerDocument: cleanDoc,
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

      // Start automatic polling every 3 seconds
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

  // Check deposit status via backend -> UP DEPIX
  const checkStatus = async (depId: string, docClean: string, qrCodeStr: string, isManual = false) => {
    if (isManual) setIsCheckingStatus(true);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://shazam-ygad.onrender.com';
      const res = await fetch(`${backendUrl}/api/payment/check-status/${depId}`);
      const json = await res.json();

      if (json.success && json.data?.isPaid) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        // Credit user account in Firestore and update profile
        if (currentUser) {
          const updated = await creditUserPlanValidity(currentUser.uid, planId, {
            depositId: depId,
            amount: plan.amount,
            payerDocument: docClean,
            qrCopyPaste: qrCodeStr,
          });

          setCreditedProfile(updated);
          if (onPaymentSuccess) {
            onPaymentSuccess(updated);
          }
        }

        setStep('success');
      }
    } catch (err) {
      console.warn('[PixCheckoutModal] Erro ao checar status:', err);
    } finally {
      if (isManual) setIsCheckingStatus(false);
    }
  };

  // Simulate Instant Confirmation (for testing & immediate validation)
  const handleSimulateInstantPayment = async () => {
    if (!depositId) return;
    setIsCheckingStatus(true);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://shazam-ygad.onrender.com';
      const res = await fetch(`${backendUrl}/api/payment/simulate-confirm/${depositId}`, {
        method: 'POST',
      });
      const json = await res.json();

      if (json.success) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        if (currentUser) {
          const updated = await creditUserPlanValidity(currentUser.uid, planId, {
            depositId,
            amount: plan.amount,
            payerDocument: payerDocument.replace(/\D/g, ''),
            qrCopyPaste: qrCodeText,
          });

          setCreditedProfile(updated);
          if (onPaymentSuccess) {
            onPaymentSuccess(updated);
          }
        }

        setStep('success');
      }
    } catch (err: any) {
      alert('Erro na confirmação: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsCheckingStatus(false);
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
            <div className="p-4 rounded-[12px] bg-[#011d1c] border border-[#003734] mb-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#707777] block">Valor a pagar via PIX</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xs font-mono text-[#cbfffc]">R$</span>
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-[#ffffff]">
                    {plan.price}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#ffd166] bg-[#ffd166]/10 px-2 py-1 rounded-[6px] border border-[#ffd166]/30">
                  <Crown className="w-3 h-3 text-[#ffd166]" />
                  +{plan.days} dias de validade
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-[8px] bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleGeneratePix} className="space-y-4">
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-[8px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00827c]/20 hover:scale-[1.01] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#011d1c]" />
                      <span>Gerando QR Code na UP DEPIX...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Gerar PIX para Pagamento (R$ {plan.price})</span>
                    </>
                  )}
                </button>
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
              Pague R$ {plan.price} via PIX
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

            {/* Verification status and buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => checkStatus(depositId!, payerDocument.replace(/\D/g, ''), qrCodeText, true)}
                disabled={isCheckingStatus}
                className="w-full py-2.5 px-4 rounded-[8px] bg-[#003734] hover:bg-[#004743] border border-[#00827c]/60 hover:border-[#cbfffc] text-[#edfffe] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

              {/* Dev/Test Simulator Button */}
              <button
                type="button"
                onClick={handleSimulateInstantPayment}
                disabled={isCheckingStatus}
                className="w-full py-2 px-3 rounded-[6px] bg-[#ffd166]/15 hover:bg-[#ffd166]/25 border border-[#ffd166]/40 text-[#ffd166] font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Simula a confirmação imediata do pagamento para testes e validação de crédito"
              >
                <Zap className="w-3 h-3 text-[#ffd166]" />
                <span>Simular Confirmação Instantânea (Teste)</span>
              </button>
            </div>

            <p className="text-[10px] text-[#707777] font-mono mt-4">
              O sistema verifica a cada 3 segundos. O crédito de +{plan.days} dias é aplicado automaticamente após a confirmação.
            </p>
          </div>
        )}

        {/* STEP 3: SUCCESS AND CREDITED ACCOUNT */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#cbfffc]/20 border border-[#cbfffc] flex items-center justify-center mx-auto mb-4 text-[#cbfffc] shadow-[0_0_20px_rgba(203,255,252,0.3)] animate-bounce">
              <Check className="w-8 h-8 text-[#cbfffc]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
              PAGAMENTO CONFIRMADO COM SUCESSO!
            </div>

            <h3 className="text-2xl font-bold text-[#ffffff] font-['DM_Sans',sans-serif] mt-1">
              {plan.name} Ativado!
            </h3>
            <p className="text-xs text-[#bbc7c6] mt-1 max-w-sm mx-auto">
              Foram creditados com sucesso <strong className="text-[#cbfffc]">+{plan.days} dias de acesso irrestrito</strong> à sua conta no Shazam Buscas.
            </p>

            {/* Validity Information Box */}
            <div className="my-6 p-4 rounded-[12px] bg-[#011d1c] border border-[#00827c]/40 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
                <span className="text-xs text-[#707777] font-mono">Status da Conta:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold">
                  ATIVO
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#003734] pb-2.5">
                <span className="text-xs text-[#707777] font-mono">Plano Contratado:</span>
                <span className="text-xs font-mono font-medium text-[#ffffff]">
                  {plan.name} (R$ {plan.price})
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
    </div>
  );
};