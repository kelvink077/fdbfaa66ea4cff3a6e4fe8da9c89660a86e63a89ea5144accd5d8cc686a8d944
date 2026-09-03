import React from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  X, 
  ArrowRight,
  Clock,
  Star
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileData } from '../lib/firebase';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile?: UserProfileData | null;
  onLoginGoogle?: () => void;
  onSelectPlanForPix?: (planId: 'weekly' | 'biweekly' | 'monthly') => void;
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
      '7 dias de teste grátis ao se cadastrar',
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
      '7 dias de teste grátis no primeiro acesso',
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
      '7 dias de teste grátis imediato',
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
}) => {
  if (!isOpen) return null;

  const handleSelectPlan = (planId: string) => {
    if (!currentUser && onLoginGoogle) {
      onLoginGoogle();
      return;
    }

    if (onSelectPlanForPix) {
      onClose();
      onSelectPlanForPix(planId as 'weekly' | 'biweekly' | 'monthly');
      return;
    }

    // Fallback de contato
    const message = encodeURIComponent(
      `Olá! Tenho interesse em contratar o plano ${planId.toUpperCase()} do Shazam Buscas. Meu email é ${currentUser?.email || ''}.`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  return (
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
            <span>TESTE GRÁTIS DE 7 DIAS EM TODOS OS PLANOS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight font-['DM_Sans',sans-serif]">
            Planos de Assinatura Simples e Transparentes
          </h2>
          <p className="text-sm text-[#bbc7c6]">
            Todos os novos clientes que entrarem com o Google ganham o <strong className="text-[#cbfffc]">Plano Premium</strong> com <strong className="text-[#ffd166]">7 dias de teste liberado</strong> sem compromisso.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[16px] p-6 flex flex-col justify-between transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-b from-[#003734] to-[#012624] border-2 border-[#ffd166] shadow-[0_0_25px_rgba(255,209,102,0.15)] scale-[1.02]'
                  : 'bg-[#00302d]/70 border border-[#00827c]/30 hover:border-[#00827c]/60'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ffd166] text-[#012624] text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Destaque</span>
                </div>
              )}

              <div>
                {/* Plan Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <span className="text-[11px] font-mono text-[#707777]">
                    {plan.perDay}
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
                <div className="mb-6 p-4 rounded-[12px] bg-[#011d1c] border border-[#003734]">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-mono text-[#bbc7c6]">R$</span>
                    <span className="text-3xl sm:text-4xl font-mono font-semibold text-[#ffffff] tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#bbc7c6] font-mono">
                      / {plan.period}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#707777]">
                    <span className="line-through">De R$ {plan.originalPrice}</span>
                    <span className="text-[#cbfffc] font-mono font-medium">Com 7 dias grátis</span>
                  </div>
                </div>

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
                    plan.highlight
                      ? 'bg-[#ffd166] hover:bg-[#ffdc85] text-[#012624] font-bold hover:scale-[1.02]'
                      : 'bg-[#003734] hover:bg-[#004d49] text-[#ffffff] border border-[#00827c]/60 hover:border-[#cbfffc]'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{currentUser ? plan.ctaText : 'Começar com 7 Dias Grátis'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <p className="text-[10px] text-center text-[#707777] mt-2 font-mono">
                  Ativação imediata • Teste sem cobrança antecipada
                </p>
              </div>
            </div>
          ))}
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
  );
};
