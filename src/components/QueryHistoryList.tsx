import React, { useState } from 'react';
import { History, Clock, Download, Trash2, ArrowUpRight } from 'lucide-react';
import { QueryRecord } from '../types';

interface QueryHistoryListProps {
  history: QueryRecord[];
  activeRecordId?: string;
  onSelectRecord: (record: QueryRecord) => void;
  onClearHistory?: () => void;
}

export const QueryHistoryList: React.FC<QueryHistoryListProps> = ({
  history,
  activeRecordId,
  onSelectRecord,
  onClearHistory,
}) => {
  const [filterText, setFilterText] = useState('');

  if (history.length === 0) return null;

  const filteredHistory = history.filter((h) => {
    if (!filterText) return true;
    const term = filterText.toLowerCase();
    return (
      h.queryParam.toLowerCase().includes(term) ||
      h.moduleTitle.toLowerCase().includes(term) ||
      h.id.toLowerCase().includes(term)
    );
  });

  const handleExportAll = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-auros-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#003734] border border-[#707777]/20 rounded-[16px] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-[#cbfffc]" />
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#ffffff] font-['DM_Sans',sans-serif]">
            Histórico Recente de Dossiês
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[6px] bg-[#011d1c] text-[#cbfffc] border border-[#003734] font-medium">
            {history.length} SALVOS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 3 && (
            <div className="relative">
              <input
                type="text"
                placeholder="FILTRAR HISTÓRICO..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-36 sm:w-48 px-3 py-1.5 text-xs bg-[#011d1c] border border-[#003734] focus:border-[#cbfffc] rounded-[6px] text-[#ffffff] placeholder:text-[#707777] focus:outline-none font-mono transition-colors"
              />
            </div>
          )}

          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#011d1c] hover:bg-[#012624] text-[#edfffe] rounded-[6px] border border-[#003734] font-mono transition-colors cursor-pointer uppercase tracking-[0.08em]"
            title="Exportar todo o histórico em JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {onClearHistory && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-[#011d1c] hover:bg-[#012624] text-[#bbc7c6] hover:text-[#fde9ff] rounded-[6px] border border-[#003734] font-mono transition-colors cursor-pointer"
              title="Limpar histórico"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="p-5 text-center text-xs text-[#bbc7c6] font-mono bg-[#011d1c] rounded-[16px] border border-[#003734]">
          Nenhum registro encontrado para "{filterText}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
          {filteredHistory.map((item) => {
            const isSelected = activeRecordId === item.id;
            const timeStr = new Date(item.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <button
                key={item.id}
                onClick={() => onSelectRecord(item)}
                className={`text-left p-4 rounded-[6px] border transition-colors flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#004743] border-[#cbfffc]'
                    : 'bg-[#011d1c] hover:bg-[#012624] border-[#003734]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-mono font-medium text-[#cbfffc] uppercase truncate tracking-[0.08em]">
                    {item.moduleTitle}
                  </span>
                  <span className="text-[10px] font-mono text-[#bbc7c6] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#707777]" />
                    {timeStr}
                  </span>
                </div>

                <div className="text-xs font-mono text-[#ffffff] font-medium mt-1.5 truncate">
                  {item.queryParam}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#bbc7c6] mt-2 pt-2 border-t border-[#003734]">
                  <span>
                    {item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '1.8s'}
                  </span>
                  <span className="text-[#edfffe] flex items-center gap-1 uppercase tracking-[0.08em]">
                    Abrir <ArrowUpRight className="w-3 h-3 text-[#cbfffc]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
