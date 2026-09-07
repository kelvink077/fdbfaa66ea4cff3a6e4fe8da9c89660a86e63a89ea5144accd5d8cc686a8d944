import React from 'react';
import { Activity, Zap, Shield } from 'lucide-react';
import { TelegramConfigState } from '../types';

interface StatsBarProps {
  totalQueries: number;
  avgDurationMs?: number;
  telegramConfig: TelegramConfigState;
  activeRequestsCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  totalQueries,
  avgDurationMs,
  telegramConfig,
  activeRequestsCount,
}) => {
  const avgSec = avgDurationMs ? (avgDurationMs / 1000).toFixed(1) : '1.8';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      {/* Metric 1: Total Queries Processed */}
      <div className="p-3.5 sm:p-5 lg:p-6 rounded-[12px] sm:rounded-[16px] bg-[#003734] border border-[#003734] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif] truncate">
            Total Dossiês
          </span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-[6px] bg-[rgba(3,81,75,0.5)] flex items-center justify-center text-[#cbfffc] shrink-0">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div>
          {/* Lavender Phosphor pink emphasis */}
          <div className="text-2xl sm:text-3xl lg:text-4xl font-medium text-[#fde9ff] tracking-[-0.03em] leading-none font-['DM_Sans',sans-serif]">
            {totalQueries}
          </div>
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#bbc7c6] mt-1 sm:mt-2 block truncate">
            Consultas Despachadas
          </span>
        </div>
      </div>

      {/* Metric 2: Average Latency */}
      <div className="p-3.5 sm:p-5 lg:p-6 rounded-[12px] sm:rounded-[16px] bg-[#003734] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif] truncate">
            Latência Média
          </span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-[6px] bg-[rgba(3,81,75,0.5)] flex items-center justify-center text-[#cbfffc] shrink-0">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-medium text-[#fde9ff] tracking-[-0.03em] leading-none font-['DM_Sans',sans-serif]">
            {avgSec}s
          </div>
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#bbc7c6] mt-1 sm:mt-2 block truncate">
            Tempo Médio Resposta
          </span>
        </div>
      </div>

      {/* Metric 3: Active Processing Queue */}
      <div className="p-3.5 sm:p-5 lg:p-6 rounded-[12px] sm:rounded-[16px] bg-[#003734] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif] truncate">
            Fila Ativa
          </span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-[6px] bg-[rgba(3,81,75,0.5)] flex items-center justify-center text-[#cbfffc] shrink-0">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-medium text-[#fde9ff] tracking-[-0.03em] leading-none font-['DM_Sans',sans-serif]">
            {activeRequestsCount}
          </div>
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#bbc7c6] mt-1 sm:mt-2 block truncate">
            {activeRequestsCount === 1 ? 'Pacote Pendente' : 'Pacotes na Fila'}
          </span>
        </div>
      </div>

      {/* Metric 4: Protocol Engine */}
      <div className="p-3.5 sm:p-5 lg:p-6 rounded-[12px] sm:rounded-[16px] bg-[#003734] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-[#edfffe] font-medium font-['DM_Sans',sans-serif] truncate">
            Motor Engine
          </span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-[6px] bg-[rgba(3,81,75,0.5)] flex items-center justify-center text-[#cbfffc] shrink-0">
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-medium text-[#fde9ff] tracking-[-0.02em] leading-none font-['DM_Sans',sans-serif] truncate">
            v2.4
          </div>
          <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#bbc7c6] mt-1 sm:mt-2 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] shrink-0"></span>
            Criptografado (TLS/MTProto)
          </span>
        </div>
      </div>
    </div>
  );
};
