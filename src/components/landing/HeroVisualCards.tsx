import React from 'react';
import { ShieldCheck, Check, Navigation, Car, AlertTriangle, Activity } from 'lucide-react';

export const HeroVisualCards: React.FC = () => {
  return (
    <div className="relative w-full h-[620px] hidden lg:block select-none">
      {/* ░░ CARD 1: DOSSIÊ PF (Topo / Direita) ░░ */}
      <div 
        className="absolute top-2 right-0 w-[275px] z-20 transition-transform duration-300 hover:scale-[1.02]"
        style={{ transform: 'rotate(1.5deg)' }}
      >
        <div className="relative bg-[#002422] rounded-2xl border border-[#00827c]/40 shadow-[0_22px_55px_-20px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-md">
          {/* Faixa Classificado */}
          <div className="flex items-center justify-between px-4 h-8 bg-[#011413] text-white border-b border-[#00827c]/30">
            <span className="font-mono text-[9px] tracking-[0.25em] text-[#cbfffc] font-bold">
              CONSULTA • PESSOA FÍSICA
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {/* Marca d'água digital */}
          <svg 
            className="absolute right-2 top-10 w-24 h-24 pointer-events-none opacity-10" 
            viewBox="0 0 64 64" 
            fill="none" 
            stroke="#cbfffc" 
            strokeWidth="1.2" 
            strokeLinecap="round"
          >
            <path d="M32 6c-12 0-22 9-22 22 0 6 1 10 1 14" />
            <path d="M32 12c-9 0-16 7-16 17 0 7 2 11 2 17" />
            <path d="M32 18c-6 0-11 5-11 12 0 9 3 13 3 20" />
            <path d="M32 24c-3 0-6 3-6 7 0 12 4 15 4 25" />
            <path d="M32 24c3 0 6 3 6 7 0 10-3 14-3 23" />
            <path d="M32 18c6 0 11 5 11 13 0 8-2 12-2 19" />
            <path d="M32 12c9 0 16 8 16 18 0 6-1 9-1 14" />
          </svg>

          <div className="relative p-4">
            {/* Identidade */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003431] to-[#004d49] border border-[#00827c]/50 flex items-center justify-center font-bold text-[#cbfffc] text-base font-mono">
                  ES
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#002422] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[#ffffff] text-[14px] leading-tight truncate">
                  Eduardo S. da Silva
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-mono text-[11px] text-[#edfffe]/80">142.</span>
                  <span className="inline-block w-10 h-3 rounded-[3px] bg-[#011615]"></span>
                  <span className="font-mono text-[11px] text-[#edfffe]/80">-08</span>
                </div>
              </div>
            </div>

            {/* Fontes Cruzadas */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#003734] text-[#cbfffc] border border-[#00827c]/40">
                <span className="text-emerald-400 font-bold">✓</span> Receita
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#003734] text-[#cbfffc] border border-[#00827c]/40">
                <span className="text-emerald-400 font-bold">✓</span> TSE
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#003734] text-[#cbfffc] border border-[#00827c]/40">
                <span className="text-emerald-400 font-bold">✓</span> Operadoras
              </span>
            </div>

            {/* Dados tabulares */}
            <dl className="space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-[#bbc7c6]/70">Nascimento</dt>
                <div className="flex-1 mx-2 border-b border-dotted border-[#00827c]/40"></div>
                <dd className="font-mono text-[#ffffff] font-medium">14/03/1989</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#bbc7c6]/70">Situação</dt>
                <div className="flex-1 mx-2 border-b border-dotted border-[#00827c]/40"></div>
                <dd className="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Regular
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#bbc7c6]/70">Score</dt>
                <div className="flex-1 mx-2 border-b border-dotted border-[#00827c]/40"></div>
                <dd className="flex items-center gap-1">
                  <span className="font-mono font-bold text-[#ffffff]">782</span>
                  <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">
                    Bom
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#bbc7c6]/70">Parentes</dt>
                <div className="flex-1 mx-2 border-b border-dotted border-[#00827c]/40"></div>
                <dd className="font-semibold text-[#cbfffc]">14 • 3 graus</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#bbc7c6]/70">Telefones</dt>
                <div className="flex-1 mx-2 border-b border-dotted border-[#00827c]/40"></div>
                <dd className="text-emerald-300 font-mono text-[11px]">7 ativos</dd>
              </div>
            </dl>

            <div className="mt-3 pt-2.5 border-t border-[#00827c]/30 flex items-center justify-between">
              <span className="text-[10px] text-[#bbc7c6]/70">Endereços • telefones • parentes</span>
              <span className="font-mono text-[9px] text-[#cbfffc] bg-[#003431] border border-[#00827c]/40 px-1.5 py-0.5 rounded">
                +3 fontes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ░░ CARD 2: PLACA MERCOSUL + TERMINAL (Base / Esquerda) ░░ */}
      <div 
        className="absolute bottom-2 left-0 w-[240px] z-20 transition-transform duration-300 hover:scale-[1.02]"
        style={{ transform: 'rotate(-2.5deg)' }}
      >
        {/* Placa Mercosul */}
        <div className="bg-white rounded-t-xl overflow-hidden border-2 border-white/20 shadow-[0_18px_45px_-18px_rgba(0,0,0,.7)]">
          <div className="flex items-center justify-between px-3 h-6 bg-[#1b3fae]">
            <span className="font-mono text-[8px] font-bold tracking-wider text-white/85 border border-white/40 rounded px-1 py-px">
              BR
            </span>
            <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-white">
              MERCOSUL
            </span>
            <span className="relative w-4 h-3 rounded-[2px] bg-green-600 overflow-hidden flex items-center justify-center">
              <span className="absolute w-2 h-2 rotate-45 bg-yellow-400"></span>
              <span className="absolute w-[5px] h-[5px] rounded-full bg-[#1b3fae]"></span>
            </span>
          </div>
          <div className="text-center py-1.5 bg-white">
            <span className="font-mono font-extrabold text-[#0a1929] text-[28px] tracking-[0.14em] leading-none">
              SDP2F88
            </span>
          </div>
        </div>

        {/* Painel Terminal Veicular */}
        <div className="relative bg-[#001c1a] text-white rounded-b-xl border-2 border-t-0 border-[#00827c]/40 p-3.5 overflow-hidden shadow-2xl">
          <div className="flex items-start justify-between mb-2.5 pb-2 border-b border-[#00827c]/30">
            <div>
              <div className="font-semibold text-sm leading-tight text-[#ffffff]">VW Golf GTI</div>
              <div className="font-mono text-[10px] text-[#cbfffc] mt-0.5">2022/2023 • Preto</div>
            </div>
            <span className="flex items-center gap-1 font-mono text-[8.5px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CIRCULAÇÃO
            </span>
          </div>

          <dl className="space-y-1.5 text-[11px] mb-2.5">
            <div className="flex items-center justify-between">
              <dt className="text-[#bbc7c6]/70">Proprietário</dt>
              <dd className="font-mono text-[#cbfffc] font-medium">F. de A••••</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#bbc7c6]/70">Restrição</dt>
              <dd className="text-[9px] font-semibold text-[#ffd166] bg-[#ffd166]/10 border border-[#ffd166]/30 px-1.5 py-0.5 rounded">
                Alienação fiduc.
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#bbc7c6]/70">Roubo / furto</dt>
              <dd className="text-emerald-400 font-medium text-[10px]">Nada consta</dd>
            </div>
          </dl>

          {/* Histórico de Passagem / Radar */}
          <div className="pt-2 border-t border-[#00827c]/30">
            <div className="flex items-center gap-1.5 mb-1.5 font-mono text-[9px] tracking-[0.12em] text-[#cbfffc]">
              <Navigation className="w-3 h-3 text-[#cbfffc]" />
              RADAR • ÚLTIMAS PASSAGENS
            </div>
            <ul className="space-y-1 text-[10px]">
              <li className="flex items-center gap-2 text-[#edfffe]/90">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827c] shrink-0"></span>
                <span className="font-mono text-[#bbc7c6]/60 text-[9px] w-[54px]">hoje 14:32</span>
                <span className="truncate">Anhanguera • km 32</span>
              </li>
              <li className="flex items-center gap-2 text-[#edfffe]/90">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827c]/70 shrink-0"></span>
                <span className="font-mono text-[#bbc7c6]/60 text-[9px] w-[54px]">ontem 09:10</span>
                <span className="truncate">Marginal Tietê • SP</span>
              </li>
            </ul>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#00827c]/20 flex items-center justify-between text-[9px] text-[#bbc7c6]/60 font-mono">
            <span>Renavam • IPVA • Leilão</span>
            <span className="text-[#cbfffc]">2.9s</span>
          </div>
        </div>
      </div>

      {/* ░░ CARD 3: SCORE / CRÉDITO GAUGE (Ao lado do Dossiê PF) ░░ */}
      <div 
        className="absolute top-0 left-4 w-[190px] z-30 transition-transform duration-300 hover:scale-[1.02]"
        style={{ transform: 'rotate(-3deg)' }}
      >
        <div className="relative bg-[#002825] rounded-2xl border border-[#00827c]/40 shadow-[0_22px_55px_-20px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between px-3 h-7 bg-[#011413] text-white border-b border-[#00827c]/30">
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#cbfffc] font-bold">
              SCORE • CRÉDITO
            </span>
            <Activity className="w-3 h-3 text-[#cbfffc]" />
          </div>

          <div className="p-3">
            <div className="relative flex flex-col items-center">
              <svg viewBox="0 0 120 70" className="w-full">
                <defs>
                  <linearGradient id="scoreGradientShazam" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="35%" stopColor="#f97316" />
                    <stop offset="65%" stopColor="#ffd166" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path 
                  d="M10 60 A50 50 0 0 1 110 60" 
                  fill="none" 
                  stroke="url(#scoreGradientShazam)" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                />
                {/* Ponteiro posicionado em 782 */}
                <circle cx="98.7" cy="28.4" r="5.5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
                <span className="font-mono text-2xl font-bold text-[#ffffff] leading-none">
                  782
                </span>
                <span className="font-mono text-[9px] text-[#bbc7c6]/70 leading-none mt-0.5">
                  /1000
                </span>
              </div>
            </div>

            <div className="flex justify-center mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Bom
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#00827c]/30 space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Renda est.</span>
                <span className="font-mono font-semibold text-[#ffffff]">R$ 4.250</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Risco</span>
                <span className="font-semibold text-emerald-400">Baixo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbc7c6]/70">Protestos</span>
                <span className="text-[#edfffe]/90">Nada consta</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
