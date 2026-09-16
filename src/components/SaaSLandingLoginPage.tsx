import React, { useState } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Star, 
  ChevronRight,
  Loader2,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { PRICING_PLANS } from './PricingModal';
import { ShazamLogo } from './ShazamLogo';
import type { AuthErrorDetails } from './AuthErrorModal';
import { HeroVisualCards } from './landing/HeroVisualCards';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { ModulesFilterSection } from './landing/ModulesFilterSection';
import { FaqAccordionSection } from './landing/FaqAccordionSection';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#011d1c] text-[#bbc7c6] flex flex-col font-['DM_Sans',sans-serif] selection:bg-[#00827c]/40 selection:text-[#edfffe]">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#001413] border-b border-[#003734] text-white text-xs">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
            <span className="hidden sm:inline">
              Pagamento <strong className="text-[#cbfffc]">somente via PIX</strong> • ativação instantânea • sem renovação automática • <strong className="text-[#ffd166]">teste grátis de 24h</strong>
            </span>
            <span className="sm:hidden">
              Pagamento via PIX • ativação na hora • teste 24h grátis
            </span>
          </p>
          <a href="#modulos" className="hidden md:inline-flex items-center gap-1.5 text-[#cbfffc] hover:text-[#ffffff] transition text-xs font-mono">
            Ver 37 módulos <span>→</span>
          </a>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#012624]/95 border-b border-[#003734] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Brand */}
          <a href="#" className="flex items-center gap-3">
            <ShazamLogo size="md" isPulseSpeedFast={isAuthLoading} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-[#ffffff] uppercase font-['DM_Sans',sans-serif]">
                  SHAZAM <span className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] bg-clip-text text-transparent font-bold">BUSCAS</span>
                </span>
                <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-mono font-medium">
                  B2B OFICIAL
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#bbc7c6]/70">
                Inteligência Cadastral & Investigativa
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#bbc7c6]">
            <a href="#como" className="px-3 py-2 rounded-md hover:text-[#cbfffc] transition">Como Funciona</a>
            <a href="#planos" className="px-3 py-2 rounded-md hover:text-[#cbfffc] transition">Planos</a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onLoginGoogle}
              disabled={isAuthLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-r from-[#00827c] to-[#00a8a0] hover:opacity-95 text-[#011d1c] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.02]"
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

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onLoginGoogle}
              disabled={isAuthLoading}
              className="px-3 py-1.5 rounded-[6px] bg-[#00827c] text-[#011d1c] font-bold text-xs font-mono uppercase"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-md border border-[#003734] flex items-center justify-center text-[#bbc7c6] hover:text-[#cbfffc]"
              aria-label="Abrir Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#003734] bg-[#011d1c] px-6 py-4 flex flex-col gap-3 font-mono text-xs uppercase tracking-wider">
            <a href="#como" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#003734]/60 hover:text-[#cbfffc]">Como Funciona</a>
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#cbfffc]">Planos</a>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION WITH VISUAL FLOATING CARDS */}
      <section className="relative px-6 lg:px-12 pt-12 pb-20 overflow-hidden border-b border-[#003734]">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#00827c]/15 blur-[150px] pointer-events-none rounded-full"></div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 relative z-10 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/60 text-[#cbfffc] text-xs font-mono tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
                <span>37 MÓDULOS DE CONSULTA • COBERTURA NACIONAL</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium text-[#ffffff] tracking-tight leading-[1.08]">
                A plataforma de <br />
                <span className="bg-gradient-to-r from-[#cbfffc] via-[#85fff7] to-[#ffd166] bg-clip-text text-transparent">
                  investigação e dossiês
                </span><br />
                dos profissionais que não erram.
              </h1>

              <p className="text-base sm:text-lg text-[#bbc7c6] leading-relaxed max-w-xl">
                CPF, placa, CNPJ, telefone, e-mail, parentes, score, radar de passagens. 
                <strong className="text-[#ffffff]"> Tudo em um só painel</strong> com fontes cruzadas e criptografia ponta a ponta. 
                Entre com o Google e ganhe <strong className="text-[#ffd166]">teste grátis de 24 horas</strong>.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  id="btn-hero-google-login"
                  onClick={onLoginGoogle}
                  disabled={isAuthLoading}
                  className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-[10px] bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] hover:opacity-95 text-[#012624] font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_30px_rgba(203,255,252,0.25)] hover:scale-[1.02]"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#012624]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Começar Agora & Ativar Teste 24h</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#bbc7c6]/70 font-mono">
                ▸ Sem cartão de crédito • Pagamento 100% via PIX • Sem renovação automática
              </div>

              {/* Stats Row */}
              <div className="pt-6 grid grid-cols-3 gap-6 max-w-lg border-t border-[#003734]">
                <div>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-[#ffffff]">
                    37
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#bbc7c6]/70 mt-1">
                    Módulos Ativos
                  </div>
                </div>
                <div className="border-l border-[#003734] pl-6">
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-[#cbfffc]">
                    2-4<span className="text-xs font-normal">s</span>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#bbc7c6]/70 mt-1">
                    Tempo por Consulta
                  </div>
                </div>
                <div className="border-l border-[#003734] pl-6">
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400">
                    100<span className="text-xs font-normal">%</span>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#bbc7c6]/70 mt-1">
                    Disponibilidade
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Floating Showcase Cards */}
            <div className="lg:col-span-5 relative">
              <HeroVisualCards />
            </div>
          </div>

          {/* Diagnostic Banner if Google Auth popup closes */}
          {authError && 
           authError.code !== 'auth/popup-closed-by-user' && 
           authError.code !== 'auth/cancelled-popup-request' && 
           authError.code !== 'auth/user-cancelled' && (
            <div className="w-full max-w-2xl mx-auto mt-8 p-4 rounded-[12px] bg-amber-950/40 border border-amber-500/50 text-left space-y-2">
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
        </div>
      </section>

      {/* 4. COMO FUNCIONA (3 ETAPAS COM MOCKUPS) */}
      <HowItWorksSection />

      {/* 5. MÓDULOS DE CONSULTA COM ABAS FILTRÁVEIS */}
      <ModulesFilterSection onSelectModule={onLoginGoogle} />

      {/* 8. TABELA DE PLANOS OFICIAIS */}
      <section id="planos" className="px-6 lg:px-12 py-20 bg-[#011d1c] border-b border-[#003734]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-xs font-mono font-medium tracking-wide">
              <Crown className="w-3.5 h-3.5 text-[#ffd166]" />
              <span>TABELA OFICIAL DE ASSINATURA SHAZAM BUSCAS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
              Planos Transparentes e Acessíveis
            </h2>
            <p className="text-sm text-[#bbc7c6] max-w-2xl mx-auto">
              Pagamento <strong className="text-[#ffffff]">somente via PIX</strong>. Ativação na hora. 
              <strong className="text-[#ffd166]"> Sem renovação automática</strong> nem surpresa na fatura.
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
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#ffd166] text-[#012624] text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 whitespace-nowrap">
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
                        / {plan.period} • PIX único
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#707777]">
                      <span className="line-through">De R$ {plan.originalPrice}</span>
                      <span className="text-[#cbfffc] font-mono font-medium">Teste 24h grátis incluso</span>
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
                    <span>Cadastrar & Ativar Teste 24h</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <p className="text-[10px] text-center text-[#707777] mt-2 font-mono">
                    Ativação imediata ao autenticar com o Google
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <FaqAccordionSection />

      {/* 11. FINAL CTA BANNER */}
      <section className="py-20 lg:py-28 bg-[#011413]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#003431] via-[#012624] to-[#001c1a] border border-[#00827c]/50 p-10 lg:p-16 shadow-2xl">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#00827c]/20 blur-3xl pointer-events-none"></div>

            <div className="relative grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003734] border border-[#00827c]/50 text-[#cbfffc] text-xs font-mono">
                  <span>▸ COMECE EM MENOS DE 1 MINUTO</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-medium text-[#ffffff] tracking-tight leading-[1.1]">
                  Pronto para ter <span className="text-[#cbfffc]">o dossiê</span> em mãos?
                </h2>
                <p className="text-[#bbc7c6] text-base max-w-xl leading-relaxed">
                  37 módulos, cobertura nacional, ativação instantânea via PIX e teste gratuito de 24 horas liberado ao entrar.
                </p>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-3">
                <button
                  onClick={onLoginGoogle}
                  disabled={isAuthLoading}
                  className="bg-gradient-to-r from-[#cbfffc] to-[#79fbf5] hover:opacity-95 text-[#012624] font-bold font-mono text-xs uppercase tracking-wider rounded-xl py-4 px-6 text-center transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  <span>Cadastrar & Ativar Teste 24h →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-[#011413] border-t border-[#003734] text-xs text-[#bbc7c6]/75">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-12 gap-10 mb-10">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <ShazamLogo size="sm" />
                <span className="font-semibold text-[#ffffff] tracking-wide uppercase font-mono">
                  SHAZAM BUSCAS
                </span>
              </div>
              <p className="leading-relaxed max-w-sm text-[11px] text-[#bbc7c6]/70">
                Sistema profissional de inteligência cadastral e investigativa. 
                <strong className="text-[#ffffff]"> 37 módulos • cobertura nacional • dados cruzados • suporte humano.</strong>
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h4 className="font-semibold text-[#ffffff] uppercase font-mono text-xs">Produto</h4>
              <ul className="space-y-2 text-[11px]">
                <li><a href="#modulos" className="hover:text-[#cbfffc] transition">37 Módulos</a></li>
                <li><a href="#como" className="hover:text-[#cbfffc] transition">Como funciona</a></li>
                <li><a href="#planos" className="hover:text-[#cbfffc] transition">Planos</a></li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h4 className="font-semibold text-[#ffffff] uppercase font-mono text-xs">Acesso</h4>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <button onClick={onLoginGoogle} className="hover:text-[#cbfffc] transition cursor-pointer text-left">
                    Entrar com Google
                  </button>
                </li>
                <li><a href="#planos" className="hover:text-[#cbfffc] transition">Assinar via PIX</a></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="font-semibold text-[#ffffff] uppercase font-mono text-xs">Conformidade Legal</h4>
              <p className="text-[11px] text-[#707777] leading-relaxed">
                Uso restrito em conformidade com a LGPD (Lei Geral de Proteção de Dados). A responsabilidade pela finalidade do uso ético é estritamente do operador autenticado.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#003734] flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] text-[#707777]">
            <span>© {new Date().getFullYear()} Shazam Buscas. Todos os direitos reservados.</span>
            <span>Segurança Criptografada • Terminal de Alta Velocidade</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
