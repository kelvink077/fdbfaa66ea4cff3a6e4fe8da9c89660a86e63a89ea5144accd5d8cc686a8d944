import React, { useState } from 'react';
import { X, Code2, Copy, Check, FileCode, Server, Layout, FileText } from 'lucide-react';
import { STANDALONE_CODES } from '../utils/sourceCodes';

interface SourceCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FileKey = 'serverJs' | 'indexHtml' | 'styleCss' | 'appJs';

export const SourceCodeViewerModal: React.FC<SourceCodeViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileKey>('serverJs');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files: Array<{ id: FileKey; label: string; icon: React.ReactNode; filename: string }> = [
    { id: 'serverJs', label: 'Backend (server.js)', icon: <Server className="w-3.5 h-3.5 text-[#cbfffc]" />, filename: 'server.js' },
    { id: 'indexHtml', label: 'Frontend (index.html)', icon: <Layout className="w-3.5 h-3.5 text-[#cbfffc]" />, filename: 'index.html' },
    { id: 'styleCss', label: 'Estilo (style.css)', icon: <FileText className="w-3.5 h-3.5 text-[#cbfffc]" />, filename: 'style.css' },
    { id: 'appJs', label: 'Lógica Cliente (app.js)', icon: <FileCode className="w-3.5 h-3.5 text-[#cbfffc]" />, filename: 'app.js' },
  ];

  const currentCode = STANDALONE_CODES[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#012624]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#011d1c] border border-[#003734] w-full max-w-5xl rounded-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#012624] px-7 py-5 border-b border-[#003734] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-[6px] bg-[#003734] text-[#cbfffc]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-[#ffffff] font-['DM_Sans',sans-serif] flex items-center gap-2.5">
                <span>Arquitetura Modular do Sistema</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] bg-[#003734] text-[#cbfffc] border border-[#00827c]/40 font-medium">
                  SHAZAM BUSCAS
                </span>
              </h3>
              <p className="text-xs text-[#bbc7c6] uppercase tracking-[0.1em] mt-0.5">
                Código autônomo com sanitização de dados brutos e barramento em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] text-[#bbc7c6] hover:text-[#ffffff] hover:bg-[#003734] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-[#003734] px-7 bg-[#011d1c] overflow-x-auto">
          <div className="flex space-x-1">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file.id)}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-mono uppercase tracking-[0.1em] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  selectedFile === file.id
                    ? 'border-[#cbfffc] text-[#ffffff] font-medium'
                    : 'border-transparent text-[#bbc7c6] hover:text-[#ffffff]'
                }`}
              >
                {file.icon}
                <span>{file.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-mono font-medium uppercase tracking-[0.08em] transition-opacity cursor-pointer ${
              copied
                ? 'bg-[#00827c] text-[#edfffe]'
                : 'bg-aurora-gradient text-[#012624] hover:opacity-90'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#012624]" /> : <Copy className="w-3.5 h-3.5 text-[#012624]" />}
            <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        {/* Code Body */}
        <div className="p-7 overflow-y-auto flex-1 bg-[#012624]">
          <pre className="text-xs font-mono text-[#edfffe] leading-relaxed overflow-x-auto p-4 rounded-[6px] bg-[#011d1c] border border-[#003734]">
            <code>{currentCode}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-[#012624] px-7 py-4 border-t border-[#003734] flex items-center justify-between text-xs text-[#bbc7c6] font-mono">
          <span className="flex items-center gap-2 uppercase tracking-[0.1em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc]"></span>
            Imediato para VPS / Cloud Run / Container
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#004743] text-[#edfffe] transition-colors cursor-pointer uppercase tracking-[0.08em]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
