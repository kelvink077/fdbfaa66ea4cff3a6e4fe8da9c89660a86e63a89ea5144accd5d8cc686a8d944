import React from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Car, 
  FileText, 
  Phone, 
  Clock, 
  Terminal, 
  Star, 
  ChevronRight,
  Database,
  Lock,
  Loader2,
  Users,
  Search,
  Building,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { PRICING_PLANS } from './PricingModal';
import { ShazamLogo } from './ShazamLogo';
import type { AuthErrorDetails } from './AuthErrorModal';

interface SaaSLandingLoginPageProps {
  onLoginGoogle: () => void;
  isAuthLoading: boolean;
  authError?: AuthErrorDetails | null;
  onOpenAuthHelp?: () => void;
  onContinueAsGuest?: () => void;
}

export const SaaSLandingLoginPage: React.FC<SaaSLandingLoginPageProps> = ({
  onLoginGoogle,
  isAuthLoading,
  authError,
  onOpenAuthHelp,
  onContinueAsGuest,
}) => {
  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col font-['DM_Sans',sans-serif] selection:bg-[#00827c]/40 selection:text-[#edfffe]">
      {/* 1. Top Announcement Bar */}
      <div className="bg-gradient-to-r from-[#003431] via-[#014743] to-[#003431] border-b border-[#00827c]/40 px-4 py-2.5 text-center text-xs text-[#edfffe]">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-[4px] bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166] text-[10px] font-mono font-medium tracking-wider uppercase flex items-center gap-1">
            <Crown className="w-3 h-3 text-[#ffd166]" />
            NOVO CLIENTE
          </span>
          <span>
            Cadastre-se com o Google e ganhe o <strong className="text-[#ffd166]">Plano Premium</strong> com <strong className="text-[#cbfffc] underline decoration-[#00827c]">teste grátis válido por 7 dias</strong>!
          </span>
          <button
            onClick={onLoginGoogle}
            disabled={isAuthLoading}
            className="ml-2 text-[#cbfffc] hover:text-[#ffffff] font-medium underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ativar Agora</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <header className="h-20 border-b border-[#003734] px-6 lg:px-12 flex items-center justify-between bg-[#012624]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <ShazamLogo size="md" isPulseSpeedFast={isAuthLoading} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-[#ffffff] uppercase font-['DM_Sans',sans-serif]">
                SHAZAM <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent font-bold">BUSCAS</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium">
                B2B OFICIAL
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#bbc7c6]">
              Inteligência Cadastral & Investigativa
            </span>
          </div>
        </div>

        {/* Right Nav Auth Action */}
        <div className="flex items-center gap-3">
          <button
            id="btn-landing-login-header"
            onClick={onLoginGoogle}
            disabled={isAuthLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-medium text-xs font-mono uppercase tracking-[0.08em] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            {isAuthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#011d1c]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#011d1c"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#011d1c"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#011d1c"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#011d1c"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Entrar com Google</span>
          </button>
        </div>
      </header>

      {/* 3. Hero Section with Dynamic Animated Logo */}
      <section className="relative px-6 lg:px-12 pt-14 pb-20 overflow-hidden border-b border-[#003734]">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-[#00827c]/20 blur-[130px] pointer-events-none rounded-full"></div>

        <div className="max-w-5xl mx-auto text-center space-y-7 relative z-10">
          {/* Dynamic Animated Shazam Logo Hero Centerpiece */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3.5 rounded-2xl bg-[#002f2c]/80 border border-[#00827c]/50 shadow-[0_0_40px_rgba(0,130,124,0.35)] backdrop-blur-sm">
              <ShazamLogo size="xl" isPulseSpeedFast={isAuthLoading} />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#003734] border border-[#00827c]/60 text-[#cbfffc] text-xs font-mono tracking-wide shadow-sm mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#cbfffc]" />
              <span>SHAZAM BUSCAS • ACESSO RESTRITO A OPERADORES AUTORIZADOS</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium text-[#ffffff] tracking-tight leading-[1.15]">
            Inteligência Cadastral <br />
            <span className="bg-gradient-to-r from-[#cbfffc] via-[#85fff7] to-[#ffd166] bg-clip-text text-transparent">
              e Dossiês em Tempo Real
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#bbc7c6] max-w-3xl mx-auto leading-relaxed">
            Acesse a central de busca e validação investigativa <strong className="text-[#ffffff]">Shazam Buscas</strong>. 
            Dossiês completos de veículos, pessoas físicas, CNPJ e localização com criptografia ponta a ponta. 
            O sistema exige autenticação corporativa segura e disponibiliza <strong className="text-[#ffd166]">7 dias de teste grátis no Plano Premium</strong> ao entrar com o Google.
          </p>

          {/* Direct CTA Box (Authentication required to enter system) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="btn-hero-google-login"
              onClick={onLoginGoogle}
              disabled={isAuthLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-[10px] bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] hover:opacity-95 text-[#012624] font-semibold text-sm uppercase tracking-wider font-mono transition-all cursor-pointer shadow-[0_0_30px_rgba(203,255,252,0.25)] hover:scale-[1.02]"
            >
              {isAuthLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#012624]" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#012624"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#012624"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#012624"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#012624"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Entrar com Google & Ativar 7 Dias Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Diagnostic Banner if Google Auth popup closes due to unauthorized domain */}
          {authError && (
            <div className="w-full max-w-xl mx-auto p-4 rounded-[12px] bg-amber-950/40 border border-amber-500/50 text-left space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                  Autorização Necessária no Firebase: {authError.domain || 'dapper-seahorse-f49b35.netlify.app'}
                </span>
                {onOpenAuthHelp && (
                  <button
                    type="button"
                    onClick={onOpenAuthHelp}
                    className="text-[11px] text-[#cbfffc] hover:underline font-mono cursor-pointer shrink-0"
                  >
                    Ver Passo a Passo →
                  </button>
                )}
              </div>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                A janela de login do Google fecha automaticamente porque o domínio <code className="text-[#ffffff] bg-[#011413] px-1.5 py-0.5 rounded">{authError.domain || 'dapper-seahorse-f49b35.netlify.app'}</code> precisa ser adicionado na lista de <strong>Domínios Autorizados</strong> no Firebase Console.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                {onOpenAuthHelp && (
                  <button
                    type="button"
                    onClick={onOpenAuthHelp}
                    className="px-3 py-1.5 rounded-[6px] bg-[#00827c] hover:bg-[#009b94] text-[#011d1c] font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Como Autorizar em 1 Minuto
                  </button>
                )}
                {onContinueAsGuest && (
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="px-3 py-1.5 rounded-[6px] bg-[#ffd166]/15 hover:bg-[#ffd166]/25 border border-[#ffd166]/40 text-[#ffd166] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Entrar como Operador Demo (Teste)
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#bbc7c6] font-mono pt-2">
            <span className="flex items-center gap-1.5 text-[#cbfffc]">
              <Lock className="w-3.5 h-3.5 text-[#cbfffc]" />
              Autenticação Obrigatória
            </span>
            <span className="flex items-center gap-1.5 text-[#cbfffc]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#cbfffc]" />
              Sem Cartão de Crédito
            </span>
            <span className="flex items-center gap-1.5 text-[#cbfffc]">
              <Activity className="w-3.5 h-3.5 text-[#cbfffc]" />
              Sincronização em Tempo Real
            </span>
          </div>
        </div>
      </section>

      {/* 4. Pricing Section (Semanal R$ 11, 15 Dias R$ 19,90, Mensal R$ 35) */}
      <section id="planos" className="px-6 lg:px-12 py-20 bg-[#01201e] border-b border-[#003734]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
              <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
              <span>TABELA OFICIAL DE ASSINATURA SHAZAM BUSCAS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-[#ffffff] tracking-tight">
              Planos Transparentes e Acessíveis
            </h2>
            <p className="text-sm text-[#bbc7c6] max-w-2xl mx-auto">
              Selecione o plano ideal para suas operações. Todos contam com o período de teste de 7 dias liberado imediatamente ao autenticar com o Google.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-[18px] p-7 flex flex-col justify-between transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-[#003734] to-[#012624] border-2 border-[#ffd166] shadow-[0_0_35px_rgba(255,209,102,0.18)] scale-[1.03] z-10'
                    : 'bg-[#002b28]/80 border border-[#00827c]/35 hover:border-[#00827c]/70'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#ffd166] text-[#012624] text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>MAIS POPULAR • MELHOR ESCOLHA</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-[4px] border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                    <span className="text-xs font-mono text-[#707777]">
                      {plan.perDay}
                    </span>
                  </div>

                  <h3 className="text-xl font-medium text-[#ffffff]">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[#bbc7c6] mt-1.5 mb-6 min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Price Box */}
                  <div className="mb-6 p-4 rounded-[12px] bg-[#011d1c] border border-[#003734]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-mono text-[#bbc7c6]">R$</span>
                      <span className="text-4xl font-mono font-semibold text-[#ffffff] tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-xs text-[#bbc7c6] font-mono">
                        / {plan.period}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#707777]">
                      <span className="line-through">De R$ {plan.originalPrice}</span>
                      <span className="text-[#cbfffc] font-mono font-medium">7 dias de teste grátis</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 text-xs text-[#edfffe]">
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

                <div>
                  <button
                    onClick={onLoginGoogle}
                    disabled={isAuthLoading}
                    className={`w-full py-3.5 px-4 rounded-[8px] font-semibold text-xs tracking-wider uppercase font-mono transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                      plan.highlight
                        ? 'bg-[#ffd166] hover:bg-[#ffdc85] text-[#012624] font-bold hover:scale-[1.02]'
                        : 'bg-[#003734] hover:bg-[#004d49] text-[#ffffff] border border-[#00827c]/60 hover:border-[#cbfffc]'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Cadastrar e Ganhar 7 Dias</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <p className="text-[10px] text-center text-[#707777] mt-2 font-mono">
                    Ativação imediata com Google
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Platform Capabilities Grid */}
      <section className="px-6 lg:px-12 py-20 border-b border-[#003734]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight">
              Módulos de Inteligência Shazam Buscas
            </h2>
            <p className="text-sm text-[#bbc7c6]">
              Acesso a bases de dados integradas com emissão de relatórios instantâneos e estruturados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">Veículos & Frotas</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Consulta completa por placa Mercosul ou padrão antigo. Retorna marca, modelo, ano, chassi, motor, restrições e proprietário.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">CPF & Dossiês Pessoais</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Situação cadastral na Receita Federal, data de nascimento, filiação, score presumido, patrimônio e processos vinculados.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">CNPJ & Sociedades (QSA)</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Quadro societário, capital social, CNAE primário/secundário, matriz/filial, faturamento estimado e situação fiscal.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">Telefonia & Operadora</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Identificação de titularidade, operadora atual, portabilidade, status da linha e região DDD vinculada.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">Motor em Tempo Real Shazam Buscas</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Processamento instantâneo via WebSockets e barramento de alta velocidade para respostas completas em ~1.5s.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#00302d]/60 border border-[#00827c]/30 space-y-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#ffffff]">Nuvem Cloud Firestore</h3>
              <p className="text-xs text-[#bbc7c6] leading-relaxed">
                Histórico confidencial, criptografado e sincronizado por operador. Retome investigações anteriores a qualquer hora.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Quick FAQ Section */}
      <section className="px-6 lg:px-12 py-16 bg-[#01201e] border-b border-[#003734]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-medium text-[#ffffff]">Perguntas Frequentes</h2>
            <p className="text-xs text-[#bbc7c6]">Informações sobre acesso, segurança e funcionamento do Shazam Buscas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#bbc7c6]">
            <div className="p-4 rounded-[10px] bg-[#00302d]/70 border border-[#00827c]/25 space-y-1.5">
              <h4 className="font-medium text-[#ffffff] text-sm">Como obter acesso ao sistema?</h4>
              <p>
                O sistema é estritamente autenticado. Basta entrar com sua conta Google para liberar o acesso ao terminal e receber os 7 dias de teste do Plano Premium.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#00302d]/70 border border-[#00827c]/25 space-y-1.5">
              <h4 className="font-medium text-[#ffffff] text-sm">Quais os valores dos planos de assinatura?</h4>
              <p>
                Você pode contratar o Plano Semanal por R$ 11,00, o Plano 15 Dias por R$ 19,90 ou o Plano Mensal por R$ 35,00 com ativação imediata.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#00302d]/70 border border-[#00827c]/25 space-y-1.5">
              <h4 className="font-medium text-[#ffffff] text-sm">Preciso instalar algum software?</h4>
              <p>
                Não. A plataforma Shazam Buscas opera 100% no navegador com conexão segura em tempo real e armazenamento criptografado na nuvem.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#00302d]/70 border border-[#00827c]/25 space-y-1.5">
              <h4 className="font-medium text-[#ffffff] text-sm">Como os dados são protegidos?</h4>
              <p>
                Utilizamos o Firebase Firestore com regras de segurança estritas. Cada operador tem isolamento total e visualiza apenas suas próprias consultas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-8 px-6 lg:px-12 bg-[#011a19] text-xs text-[#707777] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShazamLogo size="sm" />
          <span className="text-[#bbc7c6]">SHAZAM BUSCAS • PLATAFORMA DE INTELIGÊNCIA CADASTRAL B2B</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <span>Planos: Semanal R$11 • 15 Dias R$19,90 • Mensal R$35</span>
          <span>© {new Date().getFullYear()} Shazam Buscas. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};
