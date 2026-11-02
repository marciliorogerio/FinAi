import React, { useState } from 'react';
import {
  PenTool,
  Mic,
  Receipt,
  Sparkles,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { FinancialTransaction, AccountWallet } from '../types/finance.ts';
import { ManualTransactionForm } from './ManualTransactionForm.tsx';
import { VoiceRecorder } from './VoiceRecorder.tsx';
import { ReceiptUploader } from './ReceiptUploader.tsx';

interface InputCenterViewProps {
  accounts: AccountWallet[];
  onSaveManualTransaction: (transaction: FinancialTransaction) => Promise<void>;
  onUpdateAccounts?: (updated: AccountWallet[]) => void;
  onProcessInput: (options: {
    text?: string;
    audioBase64?: string;
    audioMimeType?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  defaultMode?: 'manual' | 'voice' | 'receipt' | 'statement';
  onOpenImportStatement?: () => void;
}

export const InputCenterView: React.FC<InputCenterViewProps> = ({
  accounts,
  onSaveManualTransaction,
  onUpdateAccounts,
  onProcessInput,
  isProcessing,
  defaultMode = 'manual',
  onOpenImportStatement,
}) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'voice' | 'receipt' | 'statement'>(defaultMode);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Lançamento Direto ou Inteligente com IA</span>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Lançar Nova Transação
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
          Preencha o formulário manual ou prefira gravar um áudio por voz, foto de comprovante ou importar o extrato do seu banco.
        </p>
      </div>

      {/* Mode Switcher Tabs (4 Clean Modes) */}
      <div className="grid grid-cols-4 p-1.5 bg-neutral-100 rounded-2xl max-w-lg mx-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveMode('manual')}
          className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
            activeMode === 'manual'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Formulário manual direto (sem IA)"
        >
          <PenTool className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Manual</span>
          <span className="sm:hidden text-[11px]">Manual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('voice')}
          className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
            activeMode === 'voice'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Gravar por voz"
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">Voz</span>
          <span className="sm:hidden text-[11px]">Voz</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('receipt')}
          className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
            activeMode === 'receipt'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Foto da nota fiscal"
        >
          <Receipt className="w-4 h-4" />
          <span className="hidden sm:inline">Nota Fiscal</span>
          <span className="sm:hidden text-[11px]">Foto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('statement')}
          className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
            activeMode === 'statement'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Importar extrato bancário"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">Extrato</span>
          <span className="sm:hidden text-[11px]">OFX</span>
        </button>
      </div>

      {/* Active Component */}
      <div>
        {activeMode === 'manual' && (
          <ManualTransactionForm
            accounts={accounts}
            onSubmit={onSaveManualTransaction}
            onUpdateAccounts={onUpdateAccounts}
          />
        )}

        {activeMode === 'voice' && (
          <VoiceRecorder
            onProcessAudio={async (base64, mime, textHint) => {
              const cleanText = textHint?.trim();
              const cleanBase64 = base64?.trim();
              if (cleanText) {
                await onProcessInput({ text: cleanText });
              } else if (cleanBase64) {
                await onProcessInput({ audioBase64: cleanBase64, audioMimeType: mime });
              }
            }}
            isProcessing={isProcessing}
            onSwitchToManual={() => setActiveMode('manual')}
          />
        )}

        {activeMode === 'receipt' && (
          <ReceiptUploader
            onProcessImage={async (base64, mime, noteHint) => {
              await onProcessInput({ imageBase64: base64, imageMimeType: mime, text: noteHint });
            }}
            isProcessing={isProcessing}
          />
        )}

        {activeMode === 'statement' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xs text-center space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-900">
                Importação de Extrato Bancário
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                Exporte o extrato do app do seu banco (formato <strong>.OFX</strong> ou <strong>.CSV</strong>) e o FinAI categoriza todas as transações automaticamente.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenImportStatement}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all cursor-pointer min-h-[48px] touch-manipulation"
              >
                <Upload className="w-4 h-4" />
                <span>Abrir Importador de Extrato</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-neutral-100 text-[11px] text-neutral-500 font-semibold">
              <span className="p-1.5 rounded-lg bg-neutral-50">✓ Nubank</span>
              <span className="p-1.5 rounded-lg bg-neutral-50">✓ Itaú</span>
              <span className="p-1.5 rounded-lg bg-neutral-50">✓ Banco Inter</span>
              <span className="p-1.5 rounded-lg bg-neutral-50">✓ Bradesco / Outros</span>
            </div>
          </div>
        )}
      </div>

      {/* Friendly Footer Banner */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Sincronização em Nuvem:</strong> Seus lançamentos ficam salvos e protegidos com segurança.
          </span>
        </div>
        <span className="text-neutral-400 font-mono text-[11px] hidden sm:inline">FinAI v2.0</span>
      </div>
    </div>
  );
};
