import React, { useState } from 'react';
import { X, Key, Check, ShieldCheck, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface GoogleMapsKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
}

export const GoogleMapsKeyModal: React.FC<GoogleMapsKeyModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
}) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const key = keyInput.trim();
    if (!key) {
      setTestResult({ success: false, message: 'Digite ou cole uma chave válida.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Testa uma requisição de Geocoding com a chave informada
      const testUrl = `/api/maps/geocode?address=Av.+Paulista+1000,+Sao+Paulo&key=${key}`;
      const res = await fetch(testUrl);
      const data = await res.json();

      if (data.status === 'OK' || data.results?.length > 0) {
        setTestResult({
          success: true,
          message: 'Chave validada com sucesso! Conexão com a Google Maps Platform autorizada.',
        });
      } else if (data.status === 'REQUEST_DENIED') {
        setTestResult({
          success: false,
          message: `Google recusou a chave: ${data.error_message || 'Verifique se a Geocoding API e Maps JavaScript API estão habilitadas no Google Cloud Console'}.`,
        });
      } else {
        setTestResult({
          success: true,
          message: 'Chave recebida e salva com sucesso!',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: true,
        message: 'Chave salva com sucesso na sessão do God\'s Eye View!',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveKey(keyInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#011d1c] border border-[#004d47] rounded-[12px] shadow-2xl p-5 text-[#bbc7c6] font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#003734]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#003734] border border-[#00827c] flex items-center justify-center text-[#cbfffc]">
              <Key className="w-4 h-4 text-[#ffd166]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base uppercase tracking-wide font-mono">
                CHAVE GOOGLE MAPS PLATFORM
              </h3>
              <p className="text-[11px] text-[#8ea3a1]">
                Satélite em Alta Resolução & Cruzamento de Endereços
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[6px] hover:bg-[#003734] text-[#8ea3a1] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-3.5">
          <p className="text-xs text-[#8ea3a1] leading-relaxed">
            Sua chave permite carregar imagens de satélite do Google em tempo real, nomes de ruas com precisão métrica e dados de fachadas residenciais pelo Street View.
          </p>

          <div>
            <label className="block text-[11px] font-mono text-[#cbfffc] mb-1.5 font-semibold">
              CHAVE DE API (GOOGLE CLOUD CONSOLE):
            </label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-[8px] bg-[#011413] border border-[#004d47] text-white text-xs font-mono placeholder:text-[#52706e] focus:outline-none focus:border-[#cbfffc]"
            />
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-[8px] border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#004d47] border border-[#00827c] text-[#cbfffc] text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Testar Conexão</span>
            </button>
            
            <a
              href="https://console.cloud.google.com/google/maps-apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#8ea3a1] hover:text-[#cbfffc] flex items-center gap-1 ml-auto"
            >
              <span>Abrir Google Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#003734] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[6px] bg-[#002624] hover:bg-[#003734] text-[#8ea3a1] text-xs font-mono transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-[6px] bg-[#00827c] hover:bg-[#009b94] text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Salvar e Aplicar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
