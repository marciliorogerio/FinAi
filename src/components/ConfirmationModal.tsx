import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Building,
  Layers,
} from 'lucide-react';
import { FinancialTransaction, InstallmentInfo, AccountWallet } from '../types/finance.ts';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transaction: FinancialTransaction) => Promise<void>;
  transaction: FinancialTransaction | null;
  accounts?: AccountWallet[];
  isSaving: boolean;
  transcribedText?: string;
}

const CATEGORIES = [
  'Alimentação',
  'Cartão de Crédito',
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

const PAYMENT_METHODS = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Dinheiro',
  'Boleto',
  'Transferência Bancária',
  'Outro',
];

const DEFAULT_BANKS = [
  'Nubank',
  'Itaú',
  'Banco Inter',
  'Bradesco',
  'Santander',
  'C6 Bank',
  'Carteira Dinheiro',
];

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  accounts = [],
  isSaving,
  transcribedText,
}) => {
  const [formData, setFormData] = useState<FinancialTransaction>(() => transaction || {
    id: '',
    type: 'despesa',
    description: '',
    amount: 0,
    category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX',
    account: accounts[0]?.name || 'Nubank',
    notes: '',
  });

  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState<number>(3);
  const [isCustomAccount, setIsCustomAccount] = useState(false);
  const [customAccountName, setCustomAccountName] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData(transaction);
      // Auto-detect installments from notes or existing info
      if (transaction.installments && transaction.installments.total > 1) {
        setIsInstallment(true);
        setInstallmentTotal(transaction.installments.total);
      } else if (transaction.notes?.toLowerCase().includes('parcela')) {
        const match = transaction.notes.match(/(\d+)x/i);
        if (match && parseInt(match[1]) > 1) {
          setIsInstallment(true);
          setInstallmentTotal(parseInt(match[1]));
        }
      }
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleChange = (field: keyof FinancialTransaction, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'amount' ? Math.max(0, parseFloat(value) || 0) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalTx: FinancialTransaction = { ...formData };
    if (isInstallment && installmentTotal > 1) {
      finalTx.installments = {
        current: 1,
        total: installmentTotal,
        originalTotal: formData.amount,
      };
    } else {
      finalTx.installments = undefined;
    }

    await onConfirm(finalTx);
  };

  const isExpense = formData.type === 'despesa';
  const installmentValue = isInstallment && installmentTotal > 1 ? formData.amount / installmentTotal : formData.amount;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 bg-neutral-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                isExpense ? 'bg-rose-500' : 'bg-emerald-600'
              }`}
            >
              {isExpense ? '💸' : '💰'}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                {!transcribedText && (!transaction.id || transaction.id.startsWith('manual-'))
                  ? 'Novo Lançamento Manual'
                  : 'Confirmar Lançamento'}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                {!transcribedText && (!transaction.id || transaction.id.startsWith('manual-'))
                  ? 'Preencha os campos e salve direto na sua conta'
                  : 'Revise os dados antes de salvar na sua conta'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Cloud banner */}
        <div className="px-4 sm:px-6 py-2 bg-emerald-50/80 border-b border-emerald-100/60 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold text-emerald-800 text-[11px] sm:text-xs">
              Sincronização em Nuvem Ativa
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            Backup automático instantâneo
          </span>
        </div>

        {transcribedText && (
          <div className="px-4 sm:px-6 py-2 bg-neutral-100/90 border-b border-neutral-200 text-xs text-neutral-700 flex items-start gap-2 shrink-0">
            <span className="font-semibold text-emerald-800 shrink-0 text-[11px]">🎙️ Áudio:</span>
            <span className="italic truncate text-[11px]">"{transcribedText}"</span>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 text-xs sm:text-sm">
          {/* Type Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleChange('type', 'despesa')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
                formData.type === 'despesa'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              💸 Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => handleChange('type', 'receita')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation ${
                formData.type === 'receita'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              💰 Receita (Entrada)
            </button>
          </div>

          {/* Amount and Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Valor Total (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-neutral-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm font-bold text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Ex: Supermercado Pão de Açúcar"
                className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-neutral-400" />
                Categoria *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer min-h-[44px]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Data *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer min-h-[44px]"
              />
            </div>
          </div>

          {/* Payment Method & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                Forma de Pagamento
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer min-h-[44px]"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-neutral-400" />
                  {formData.paymentMethod === 'Cartão de Crédito' ? 'Qual Cartão de Crédito? *' : 'Conta / Banco *'}
                </label>
                <span className={`text-[10px] font-semibold ${formData.paymentMethod === 'Cartão de Crédito' ? 'text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200' : 'text-emerald-700'}`}>
                  {formData.paymentMethod === 'Cartão de Crédito' ? 'Lançado na fatura' : 'Saldo atualizado'}
                </span>
              </div>

              {!isCustomAccount ? (
                <div className="space-y-1">
                  <select
                    value={formData.account || (accounts[0]?.name || 'Nubank')}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomAccount(true);
                      } else {
                        handleChange('account', e.target.value);
                      }
                    }}
                    className={`w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 cursor-pointer min-h-[44px] ${
                      formData.paymentMethod === 'Cartão de Crédito'
                        ? 'border-purple-300 focus:ring-purple-500/30 focus:border-purple-600 font-bold'
                        : 'border-neutral-300 focus:ring-emerald-500/30 focus:border-emerald-600'
                    }`}
                  >
                    {formData.paymentMethod === 'Cartão de Crédito' ? (
                      <>
                        {accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0)).length > 0 ? (
                          <optgroup label="💳 Meus Cartões de Crédito Cadastrados">
                            {accounts
                              .filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0))
                              .map((acc) => (
                                <option key={acc.id} value={acc.name}>
                                  {acc.name} (Fechamento dia {acc.closingDay || 5})
                                </option>
                              ))}
                          </optgroup>
                        ) : null}

                        <optgroup label="💳 Cartões Populares">
                          {['Nubank', 'Bradesco', 'Itaú', 'Banco Inter', 'Santander', 'C6 Bank'].map((b) => (
                            <option key={b} value={b}>
                              Cartão {b}
                            </option>
                          ))}
                        </optgroup>

                        {accounts.filter((a) => a.type !== 'credit').length > 0 && (
                          <optgroup label="Outras Contas">
                            {accounts
                              .filter((a) => a.type !== 'credit')
                              .map((acc) => (
                                <option key={acc.id} value={acc.name}>
                                  {acc.name}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      <>
                        {accounts.length > 0 && (
                          <optgroup label="Minhas Contas & Carteiras">
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.name}>
                                {acc.name}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        <optgroup label="Bancos & Carteiras Comuns">
                          {DEFAULT_BANKS.filter(
                            (b) => !accounts.some((a) => a.name.toLowerCase() === b.toLowerCase())
                          ).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}

                    <option value="__custom__">+ Outro Banco / Novo Cartão...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome do Banco (ex: C6, XP, Santander)"
                    value={customAccountName}
                    onChange={(e) => {
                      setCustomAccountName(e.target.value);
                      handleChange('account', e.target.value);
                    }}
                    className="flex-1 px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-white border border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAccount(false);
                      setCustomAccountName('');
                      if (!formData.account) {
                        handleChange('account', accounts[0]?.name || 'Nubank');
                      }
                    }}
                    className="px-2.5 py-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl border border-neutral-300 min-h-[44px] cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Installment Option (Credit Card / Parcelamentos) */}
          {formData.type === 'despesa' && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-900">
                    Compra Parcelada?
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => setIsInstallment(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {isInstallment && (
                <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600">Parcelar em:</span>
                    <select
                      value={installmentTotal}
                      onChange={(e) => setInstallmentTotal(parseInt(e.target.value))}
                      className="px-2 py-1 text-xs font-bold bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                        <option key={n} value={n}>
                          {n}x parcelas
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs font-bold text-emerald-700">
                    {installmentTotal}x de {formatCurrency(installmentValue)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              Observações / Detalhes (opcional)
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Ex: Compra mensal, nota #4912"
              className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          {/* Modal Actions - Thumb Zone */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[48px] touch-manipulation"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando na Nuvem...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {isInstallment && installmentTotal > 1
                      ? `Lançar ${installmentTotal} Parcelas`
                      : 'Confirmar e Salvar'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
