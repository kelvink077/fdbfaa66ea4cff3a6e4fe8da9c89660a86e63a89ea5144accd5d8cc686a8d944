import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  X, 
  ArrowRight,
  Clock,
  Star,
  Tag,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';
import { checkCouponValidity, redeemActivationCode, burnDiscountCoupon } from '../lib/couponService';
import { DiscountAttentionModal } from './DiscountAttentionModal';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onLoginGoogle?: () => void;
  onSelectPlanForPix?: (
    planId: 'weekly' | 'biweekly' | 'monthly', 
    options?: { discountedPrice?: number; discountCode?: string }
  ) => void;
  onProfileUpdated?: (updatedProfile: UserProfileData) => void;
}

export const PRICING_PLANS = [
  {
    id: 'weekly',
    name: 'Plano Semanal',
    price: '11,00',
    originalPrice: '15,00',
    period: 'semanal',
    perDay: 'R$ 1,57/dia',
    badge: 'FLEXIBILIDADE',
    badgeColor: 'bg-[#003734] text-[#cbfffc] border-[#00827c]/40',
    description: 'Ideal para demandas pontuais, checagens rápidas ou testes operacionais.',
    features: [
      '24 horas de teste grátis ao se cadastrar',
      'Acesso a todos os 8 módulos de inteligência',
      'Consultas veiculares (Placas Mercosul/Antiga)',
      'Consultas de CPF, CNPJ e Telefones',
      'Respostas em tempo real via Central de Inteligência',
      'Histórico seguro em nuvem Firestore',
    ],
    highlight: false,
    ctaText: 'Escolher Semanal',
  },
  {
    id: 'biweekly',
    name: 'Plano 15 Dias',
    price: '19,90',
    originalPrice: '28,00',
    period: '15 dias',
    perDay: 'R$ 1,32/dia',
    badge: 'MAIS POPULAR • CUSTO-BENEFÍCIO',
    badgeColor: 'bg-[#ffd166]/20 text-[#ffd166] border-[#ffd166]/50',
    description: 'O equilíbrio perfeito para profissionais autônomos, despachantes e consultores.',
    features: [
      '24 horas de teste grátis no primeiro acesso',
      'Todos os 8 módulos liberados',
      'Consultas ilimitadas no período',
      'Prioridade de processamento no despacho',
      'Exportação e cópia de relatórios estruturados',
      'Histórico completo na nuvem',
      'Suporte direto para dúvidas operacionais',
    ],
    highlight: true,
    ctaText: 'Escolher 15 Dias',
  },
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: '35,00',
    originalPrice: '55,00',
    period: 'mensal',
    perDay: 'Apenas R$ 1,16/dia',
    badge: 'MELHOR VALOR • ECONOMIA MÁXIMA',
    badgeColor: 'bg-[#cbfffc]/15 text-[#cbfffc] border-[#cbfffc]/40',
    description: 'A solução definitiva para empresas, escritórios e rotinas contínuas de pesquisa.',
    features: [
      '24 horas de teste grátis imediato',
      'Acesso contínuo 30 dias sem interrupção',
      'Máxima velocidade de resposta',
      'Sincronização em tempo real multi-dispositivo',
      'Consultas ilimitadas de veículos e pessoas',
      'Painel de telemetria e histórico completo',
      'Suporte prioritário VIP via WhatsApp',
    ],
    highlight: false,
    ctaText: 'Escolher Mensal',
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onLoginGoogle,
  onSelectPlanForPix,
  onProfileUpdated,
}) => {
  // Estados para Código de Desconto/Ativação (Somente Plano Mensal R$ 35)
  const [showCouponBox, setShowCouponBox] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMessage, setCouponSuccessMessage] = useState('');
  const [activationSuccessMessage, setActivationSuccessMessage] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; price: string; amount: number } | null>(null);
  
  // Modal de Atenção para Código de Desconto antes de ir para o pagamento
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [isBurningCoupon, setIsBurningCoupon] = useState(false);

  if (!isOpen) return null;

  // Handler para aplicar código no plano de 35 mensal
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Digite seu código de ativação ou desconto.');
      return;
    }

    if (!currentUser && onLoginGoogle) {
      onLoginGoogle();
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');
    setCouponSuccessMessage('');

    try {
      const check = await checkCouponValidity(cleanCode);
      if (!check.valid || !check.coupon) {
        setCouponError(check.error || 'Código inválido ou já utilizado.');
        return;
      }

      if (check.coupon.type === 'activation') {
        // CÓDIGO DE ATIVAÇÃO:
        // "se uma pessoa tiver um codigo de ativação e digitar o codigo valido o sistema não direciona ao chekout pois o codigo de ativação não necessita pagamento, se codigo for reconhecido deve ser informado: codigo de ativação aplicado sua conta já esta ativa por 30 dias"
        const res = await redeemActivationCode(check.coupon.code, currentUser!, userProfile);
        if (res.success) {
          setActivationSuccessMessage('Código de ativação aplicado, sua conta já está ativa por 30 dias');
          if (res.updatedProfile && onProfileUpdated) {
            onProfileUpdated(res.updatedProfile);
          }
        } else {
          setCouponError(res.error || 'Falha ao aplicar código de ativação.');
        }
      } else if (check.coupon.type === 'discount') {
        // CÓDIGO DE DESCONTO DE NOVO USUÁRIO:
        // "o mesmo vale para o codigo de desconto de novo usuario na qual o mesmo vai dar um desconto na qual o valor do plano de 35 reais cai apenas para 11 reais no primeiro mes para novos usuarios."
        setAppliedDiscount({
          code: check.coupon.code,
          price: '11,00',
          amount: 11.00,
        });
        setCouponSuccessMessage('Código de desconto aplicado com sucesso! Plano mensal de R$ 35,00 por apenas R$ 11,00 no primeiro mês.');
      }
    } catch (err: any) {
      setCouponError(err?.message || 'Erro ao validar o código.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    if (!currentUser && onLoginGoogle) {
      onLoginGoogle();
      return;
    }

    // Se for o plano mensal e tiver código de desconto ativo, deve exibir o aviso mandatório de atenção
    if (planId === 'monthly' && appliedDiscount) {
      setShowAttentionModal(true);
      return;
    }

    proceedToPlanCheckout(planId as 'weekly' | 'biweekly' | 'monthly');
  };

  const proceedToPlanCheckout = (planId: 'weekly' | 'biweekly' | 'monthly', discountOptions?: { discountedPrice?: number; discountCode?: string }) => {
    if (onSelectPlanForPix) {
      onClose();
      onSelectPlanForPix(planId, discountOptions);
      return;
    }

    // Fallback de contato
    const message = encodeURIComponent(
      `Olá! Tenho interesse em contratar o plano ${planId.toUpperCase()} do Shazam Buscas. Meu email é ${currentUser?.email || ''}.`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Confirmou pagamento no Modal de Atenção (Queima o cupom conforme regra exigida e abre o checkout PIX de R$ 11)
  const handleConfirmDiscountPayment = async () => {
    if (!appliedDiscount || !currentUser) return;
    setIsBurningCoupon(true);

    try {
      await burnDiscountCoupon(appliedDiscount.code, currentUser);
      setShowAttentionModal(false);
      proceedToPlanCheckout('monthly', {
        discountedPrice: appliedDiscount.amount,
        discountCode: appliedDiscount.code,
      });
    } catch (err) {
      console.warn('[PricingModal] Aviso ao queimar cupom:', err);
      setShowAttentionModal(false);
      proceedToPlanCheckout('monthly', {
        discountedPrice: appliedDiscount.amount,
        discountCode: appliedDiscount.code,
      });
    } finally {
      setIsBurningCoupon(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#011413]/85 backdrop-blur-md overflow-y-auto">
        <div 
          className="relative w-full max-w-5xl bg-[#012624] border border-[#00827c]/40 rounded-[20px] shadow-2xl p-6 sm:p-8 my-8 text-[#bbc7c6]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer border border-[#707777]/30"
            aria-label="Fechar modal de planos"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
              <span>TESTE GRÁTIS DE 24 HORAS EM TODOS OS PLANOS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight font-['DM_Sans',sans-serif]">
              Planos de Assinatura Simples e Transparentes
            </h2>
            <p className="text-sm text-[#bbc7c6]">
              Todos os novos clientes que entrarem com o Google ganham o <strong className="text-[#cbfffc]">Plano Premium</strong> com <strong className="text-[#ffd166]">24 horas de teste liberado</strong> sem compromisso.
            </p>
          </div>

          {/* Sucesso imediato se ativado por código */}
          {activationSuccessMessage && (
            <div className="mb-6 p-4 rounded-[14px] bg-[#00302d] border-2 border-emerald-500 text-center shadow-xl animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#ffffff] font-['DM_Sans',sans-serif]">
                {activationSuccessMessage}
              </h3>
              <p className="text-xs text-[#edfffe] mt-1 mb-3 font-mono">
                Seu acesso completo de 30 dias está liberado sem necessidade de pagamento.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-500 text-[#ffffff] font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-105"
              >
                Continuar para as Consultas
              </button>
            </div>
          )}

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_PLANS.map((plan) => {
              const isMonthly = plan.id === 'monthly';
              const displayPrice = isMonthly && appliedDiscount ? appliedDiscount.price : plan.price;
              const displayPerDay = isMonthly && appliedDiscount ? 'Apenas R$ 0,36/dia' : plan.perDay;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[16px] p-6 flex flex-col justify-between transition-all ${
                    plan.highlight
                      ? 'bg-gradient-to-b from-[#003734] to-[#012624] border-2 border-[#ffd166] shadow-[0_0_25px_rgba(255,209,102,0.15)] scale-[1.02]'
                      : isMonthly && appliedDiscount
                        ? 'bg-gradient-to-b from-[#00302d] to-[#012624] border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                        : 'bg-[#00302d]/70 border border-[#00827c]/30 hover:border-[#00827c]/60'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ffd166] text-[#012624] text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Destaque</span>
                    </div>
                  )}

                  {isMonthly && appliedDiscount && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-400 text-[#012624] text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span>Desconto de 68% Ativo</span>
                    </div>
                  )}

                  <div>
                    {/* Plan Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${
                        isMonthly && appliedDiscount ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : plan.badgeColor
                      }`}>
                        {isMonthly && appliedDiscount ? 'DESCONTO NOVO USUÁRIO' : plan.badge}
                      </span>
                      <span className="text-[11px] font-mono text-[#707777]">
                        {displayPerDay}
                      </span>
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-lg font-medium text-[#ffffff]">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#bbc7c6] mt-1 mb-5 min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Price Display */}
                    <div className="mb-4 p-4 rounded-[12px] bg-[#011d1c] border border-[#003734]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-mono text-[#bbc7c6]">R$</span>
                        <span className={`text-3xl sm:text-4xl font-mono font-semibold tracking-tight ${
                          isMonthly && appliedDiscount ? 'text-emerald-400' : 'text-[#ffffff]'
                        }`}>
                          {displayPrice}
                        </span>
                        <span className="text-xs text-[#bbc7c6] font-mono">
                          / {plan.period}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#707777]">
                        <span className="line-through">De R$ {isMonthly && appliedDiscount ? '35,00' : plan.originalPrice}</span>
                        <span className={`${isMonthly && appliedDiscount ? 'text-emerald-400 font-bold' : 'text-[#cbfffc]'} font-mono font-medium`}>
                          {isMonthly && appliedDiscount ? '1º mês por R$ 11,00' : 'Com teste 24h grátis'}
                        </span>
                      </div>
                    </div>

                    {/* OPÇÃO SOMENTE NO PLANO DE 35 MENSAL: Eu tenho código de desconto/ativação */}
                    {isMonthly && (
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCouponBox(!showCouponBox);
                            setCouponError('');
                          }}
                          className="w-full py-2 px-3 rounded-[8px] bg-[#002422] hover:bg-[#002e2b] border border-[#00827c]/60 hover:border-[#cbfffc] text-xs font-mono text-[#cbfffc] flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <Tag className="w-3.5 h-3.5 text-[#ffd166] group-hover:rotate-12 transition-transform" />
                            <span>Eu tenho código de desconto/ativação</span>
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCouponBox ? 'rotate-180 text-white' : 'text-[#707777]'}`} />
                        </button>

                        {showCouponBox && (
                          <div className="mt-2 p-3 rounded-[10px] bg-[#011716] border border-[#00827c]/70 space-y-2.5 animate-in fade-in duration-150">
                            <p className="text-[11px] font-mono text-[#bbc7c6]">
                              Digite seu código de ativação direta ou desconto para novo usuário:
                            </p>

                            <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => {
                                  setCouponInput(e.target.value.toUpperCase());
                                  setCouponError('');
                                }}
                                placeholder="CÓDIGO (ex: NOVO11)"
                                className="flex-1 px-3 py-2 rounded-[6px] bg-[#002523] border border-[#00827c]/50 text-xs font-mono text-white placeholder-[#707777] uppercase tracking-wider focus:outline-none focus:border-[#cbfffc]"
                              />
                              <button
                                type="submit"
                                disabled={isValidatingCoupon || !couponInput.trim()}
                                className="px-3.5 py-2 rounded-[6px] bg-[#00827c] hover:bg-[#009e96] text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                {isValidatingCoupon ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'Aplicar'
                                )}
                              </button>
                            </form>

                            {couponError && (
                              <div className="p-2 rounded-[6px] bg-rose-950/60 border border-rose-500/50 text-[11px] text-rose-300 font-mono flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{couponError}</span>
                              </div>
                            )}

                            {couponSuccessMessage && (
                              <div className="p-2 rounded-[6px] bg-emerald-950/60 border border-emerald-500/50 text-[11px] text-emerald-300 font-mono flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{couponSuccessMessage}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Features List */}
                    <ul className="space-y-2.5 mb-6 text-xs text-[#edfffe]">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-[#003734] flex items-center justify-center shrink-0 mt-0.5 text-[#cbfffc]">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div>
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full py-3 px-4 rounded-[8px] font-medium text-xs tracking-wider uppercase font-mono transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                        isMonthly && appliedDiscount
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-[#012624] font-extrabold hover:scale-[1.02] shadow-emerald-950/50'
                          : plan.highlight
                            ? 'bg-[#ffd166] hover:bg-[#ffdc85] text-[#012624] font-bold hover:scale-[1.02]'
                            : 'bg-[#003734] hover:bg-[#004d49] text-[#ffffff] border border-[#00827c]/60 hover:border-[#cbfffc]'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>
                        {!currentUser
                          ? 'Começar com Teste 24h Grátis'
                          : isMonthly && appliedDiscount
                            ? 'Pagar R$ 11,00 (1º Mês)'
                            : plan.ctaText}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <p className="text-[10px] text-center text-[#707777] mt-2 font-mono">
                      {isMonthly && appliedDiscount
                        ? 'Desconto único aplicado • 30 dias de acesso'
                        : 'Ativação imediata • Teste sem cobrança antecipada'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-8 p-4 rounded-[12px] bg-[#00302d]/60 border border-[#00827c]/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#bbc7c6]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#cbfffc] shrink-0" />
              <span>
                Precisa de volume sob medida ou integração de múltiplos operadores? Fale com nossa equipe técnica corporativa.
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[6px] bg-[#003734] hover:bg-[#004743] text-[#edfffe] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              Continuar no Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Modal Mandatório de Atenção com Código de Desconto */}
      {appliedDiscount && (
        <DiscountAttentionModal
          isOpen={showAttentionModal}
          onClose={() => setShowAttentionModal(false)}
          onConfirmPayment={handleConfirmDiscountPayment}
          discountCode={appliedDiscount.code}
          originalPrice="35,00"
          discountedPrice={appliedDiscount.price}
          isProcessing={isBurningCoupon}
        />
      )}
    </>
  );
};
