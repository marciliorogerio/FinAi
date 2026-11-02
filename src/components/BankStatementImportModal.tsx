import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { BankStatementItem, FinancialTransaction } from '../types/finance.ts';
import { parseOFX, parseCSV } from '../services/statementParser.ts';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (transactions: FinancialTransaction[]) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

const AVAILABLE_ACCOUNTS = [
  'Nubank',
  'Itaú',
  'Banco Inter',
  'Bradesco',
  'Santander',
  'C6 Bank',
  'Caixa Econômica',
  'Carteira / Dinheiro',
];

const AVAILABLE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Serviços & Contas',
  'Salário',
  'Freelance / Extra',
  'Investimentos',
  'Outros',
];

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
  onShowToast,
}) => {
  const [items, setItems] = useState<BankStatementItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('Nubank');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lowerName = file.name.toLowerCase();

        let parsed: BankStatementItem[] = [];
        if (lowerName.endsWith('.ofx')) {
          parsed = parseOFX(text, selectedAccount);
        } else {
          // Assume CSV or text
          parsed = parseCSV(text, selectedAccount);
        }

        if (parsed.length === 0) {
          onShowToast('Nenhuma transação válida identificada no arquivo.', 'error');
        } else {
          setItems(parsed);
          onShowToast(`${parsed.length} lançamento(s) lidos do extrato com sucesso!`);
        }
      } catch (err: any) {
        console.error('Error parsing statement:', err);
        onShowToast('Falha ao processar o extrato. Verifique o formato do arquivo.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      onShowToast('Erro na leitura do arquivo', 'error');
    };

    reader.readAsText(file);
  };

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const updateItemCategory = (id: string, category: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, category } : i))
    );
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const totalAmountSelected = items
    .filter((i) => i.selected)
    .reduce((sum, i) => (i.type === 'despesa' ? sum - i.amount : sum + i.amount), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const handleConfirmImport = async () => {
    const toImport = items.filter((i) => i.selected);
    if (toImport.length === 0) {
      onShowToast('Selecione ao menos um lançamento para importar', 'error');
      return;
    }

    try {
      setIsImporting(true);
      const converted: FinancialTransaction[] = toImport.map((i) => ({
        id: `stmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: i.type,
        description: i.description,
        amount: i.amount,
        category: i.category,
        date: i.date,
        paymentMethod: i.paymentMethod,
        account: selectedAccount,
        syncedToSupabase: true,
      }));

      await onImportTransactions(converted);
      onShowToast(`${converted.length} lançamentos importados e sincronizados!`);
      onClose();
      setItems([]);
      setFileName('');
    } catch (e: any) {
      onShowToast(e.message || 'Erro ao importar extrato', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                Importar Extrato Bancário
              </h3>
              <p className="text-xs text-neutral-500">
                Suporta arquivos <strong>.OFX</strong> e <strong>.CSV</strong> de qualquer banco
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="space-y-4">
              {/* Account Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Vincular à Conta / Banco:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_ACCOUNTS.map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setSelectedAccount(acc)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedAccount === acc
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span>{acc}</span>
                      {selectedAccount === acc && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-neutral-50/50 hover:bg-emerald-50/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".ofx,.csv,.txt"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-neutral-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform text-emerald-600">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-1">
                  Selecione o arquivo do extrato
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Baixe o extrato no app do seu banco no formato <strong>OFX</strong> (recomendado) ou <strong>CSV</strong>.
                </p>
                <span className="inline-block mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold shadow-xs">
                  Procurar Arquivo
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Toolbar & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    {items.every((i) => i.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs text-neutral-600 font-medium">
                    {selectedCount} de {items.length} selecionados
                  </span>
                </div>

                <div className="text-xs font-bold">
                  <span>Impacto Líquido: </span>
                  <span
                    className={
                      totalAmountSelected >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {formatCurrency(totalAmountSelected)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="border border-neutral-200 rounded-2xl divide-y divide-neutral-100 max-h-[380px] overflow-y-auto">
                {items.map((item) => {
                  const isExp = item.type === 'despesa';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        item.selected ? 'bg-white' : 'bg-neutral-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItem(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />

                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {isExp ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {item.date} • {item.account}
                          </p>
                        </div>
                      </div>

                      {/* Right: Category selector + Amount */}
                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={item.category}
                          onChange={(e) => updateItemCategory(item.id, e.target.value)}
                          className="text-[11px] font-semibold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {AVAILABLE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>

                        <span
                          className={`text-xs font-bold text-right min-w-[80px] ${
                            isExp ? 'text-neutral-900' : 'text-emerald-600'
                          }`}
                        >
                          {isExp ? `- ${formatCurrency(item.amount)}` : `+ ${formatCurrency(item.amount)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3 shrink-0">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setItems([]);
                setFileName('');
              }}
              className="px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Escolher outro arquivo
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || selectedCount === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center gap-2"
              >
                {isImporting ? (
                  <span>Importando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importar {selectedCount} Lançamento(s)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
