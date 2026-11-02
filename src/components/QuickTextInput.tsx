import React, { useState } from 'react';
import { Send, Sparkles, MessageSquare } from 'lucide-react';

interface QuickTextInputProps {
  onProcessText: (text: string) => Promise<void>;
  isProcessing: boolean;
}

export const QuickTextInput: React.FC<QuickTextInputProps> = ({
  onProcessText,
  isProcessing,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onProcessText(inputText);
  };

  const sampleTexts = [
    'Uber até o aeroporto R$ 42,90 cartão de crédito',
    'Mercado Extra R$ 185,50 compras do mês',
    'Aluguel do apartamento R$ 1.450 transferência bancária',
    'Recebi R$ 3.200 de salário hoje',
    'Cinema com pipoca R$ 65 no débito',
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Lançamento Rápido por Texto
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Escreva como quiser (ex: "Jantar 75 reais no crédito" ou "Recebi 500 do freela no PIX").
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ex: Almoço executivo no restaurante da esquina R$ 36,90 pago no PIX..."
          className="w-full rounded-xl border border-neutral-300 p-3.5 pb-16 sm:pb-3.5 sm:pr-28 text-base sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all resize-none min-h-[100px]"
        />

        <div className="mt-2 sm:mt-0 sm:absolute sm:bottom-3 sm:right-3 flex justify-end">
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Processar com IA</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggested text chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
          Sugestões:
        </span>
        {sampleTexts.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setInputText(sample);
            }}
            className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-neutral-200/50 text-neutral-600 transition-colors cursor-pointer text-left"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
};
