import React, { useState } from 'react';
import {
  Tag,
  Calendar,
  CreditCard,
  Building,
  FileText,
  Layers,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Repeat,
  Plus,
} from 'lucide-react';
import { FinancialTransaction, AccountWallet } from '../types/finance.ts';
import { getDefaultAccountColor } from '../services/supabase.ts';

interface ManualTransactionFormProps {
  accounts: AccountWallet[];
  onSubmit: (transaction: FinancialTransaction) => Promise<void>;
  onUpdateAccounts?: (updated: AccountWallet[]) => void;
  isSubmitting?: boolean;
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

export const ManualTransactionForm: React.FC<ManualTransactionFormProps> = ({
  accounts,
  onSubmit,
  onUpdateAccounts,
  isSubmitting = false,
}) => {
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [account, setAccount] = useState(() => accounts[0]?.name || 'Nubank');
  const [isCustomAccount, setIsCustomAccount] = useState(false);
  const [customAccountName, setCustomAccountName] = useState('');

  // Inline new credit card creation state
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('3000');
  const [newCardClosingDay, setNewCardClosingDay] = useState('5');
  const [newCardDueDay, setNewCardDueDay] = useState('12');

  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState(3);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'mensal' | 'semanal' | 'anual'>('mensal');
  const [notes, setNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const handleReset = () => {
    setDescription('');
    setAmount('');
    setCategory(type === 'receita' ? 'Salário' : 'Alimentação');
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsInstallment(false);
    setIsRecurring(false);
    setRecurrenceFrequency('mensal');
    setIsCustomAccount(false);
    setCustomAccountName('');
    setNewCardName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    let finalAccount = account;

    // Handle creating a new card on the fly if user selected __new_card__
    if (paymentMethod === 'Cartão de Crédito' && account === '__new_card__') {
      const cardTitle = newCardName.trim() || 'Meu Novo Cartão';
      const createdCard: AccountWallet = {
        id: `acc-card-${Date.now()}`,
        name: cardTitle,
        type: 'credit',
        balance: 0,
        initialBalance: 0,
        color: getDefaultAccountColor(cardTitle),
        creditLimit: parseFloat(newCardLimit) || 3000,
        closingDay: parseInt(newCardClosingDay, 10) || 5,
        dueDay: parseInt(newCardDueDay, 10) || 12,
      };

      if (onUpdateAccounts) {
        onUpdateAccounts([...accounts, createdCard]);
      }
      finalAccount = cardTitle;
    } else if (isCustomAccount && customAccountName.trim()) {
      finalAccount = customAccountName.trim();
    } else if (!finalAccount || finalAccount === '__new_card__') {
      finalAccount = accounts[0]?.name || 'Nubank';
    }

    const newTx: FinancialTransaction = {
      id: `manual-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      description: description.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      category,
      date,
      paymentMethod,
      account: finalAccount,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      notes: notes.trim() || undefined,
      syncedToSupabase: false,
    };


    if (type === 'despesa' && isInstallment && installmentTotal > 1) {
      newTx.installments = {
        current: 1,
        total: installmentTotal,
        originalTotal: newTx.amount,
      };
    }

    await onSubmit(newTx);
    handleReset();
  };

  const numAmount = parseFloat(amount) || 0;
  const installmentValue = isInstallment && installmentTotal > 1 ? numAmount / installmentTotal : numAmount;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/80 shadow-xs max-w-2xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Form Title & Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span>Formulário Manual</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              Sem IA
            </span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Preencha os campos abaixo para salvar seu lançamento diretamente
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl self-start sm:self-auto border border-emerald-200/60 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sincroniza saldo bancário</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Type Toggle: Despesa vs Receita */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setType('despesa');
              if (category === 'Salário' || category === 'Freelance / Extra') {
                setCategory('Alimentação');
              }
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer min-h-[44px] ${
              type === 'despesa'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            💸 Despesa (Saída)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('receita');
              if (category === 'Alimentação' || category === 'Transporte') {
                setCategory('Salário');
              }
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer min-h-[44px] ${
              type === 'receita'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            💰 Receita (Entrada)
          </button>
        </div>

        {/* Amount & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Valor (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-xs font-bold text-neutral-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm font-bold text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Descrição do Lançamento *
            </label>
            <input
              type="text"
              required
              placeholder={type === 'despesa' ? 'Ex: Supermercado Pão de Açúcar' : 'Ex: Salário da Empresa ou Freela'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
            />
          </div>
        </div>

        {/* Category, Date & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-neutral-400" />
              Categoria *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              Data do Lançamento *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Data do Vencimento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
                {paymentMethod === 'Cartão de Crédito' ? 'Qual Cartão de Crédito? *' : 'Conta / Banco *'}
              </label>
              <span className={`text-[10px] font-semibold ${paymentMethod === 'Cartão de Crédito' ? 'text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200' : 'text-emerald-700'}`}>
                {paymentMethod === 'Cartão de Crédito' ? 'Lançado na fatura' : 'Atualiza saldo'}
              </span>
            </div>

            {!isCustomAccount ? (
              <select
                value={account || (accounts[0]?.name || 'Nubank')}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomAccount(true);
                  } else {
                    setAccount(e.target.value);
                  }
                }}
                className={`w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 cursor-pointer min-h-[44px] ${
                  paymentMethod === 'Cartão de Crédito'
                    ? 'border-purple-300 focus:ring-purple-500/30 focus:border-purple-600 font-bold'
                    : 'border-neutral-300 focus:ring-emerald-500/30 focus:border-emerald-600'
                }`}
              >
                {/* When payment method is Credit Card, prioritize Credit Cards */}
                {paymentMethod === 'Cartão de Crédito' ? (
                  <>
                    <optgroup label="✨ Ações Rápidas">
                      <option value="__new_card__">➕ Cadastrar Novo Cartão de Crédito...</option>
                    </optgroup>

                    {accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0)).length > 0 ? (
                      <optgroup label="💳 Meus Cartões Cadastrados">
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
                    {accounts.filter((a) => a.type !== 'credit').length > 0 && (
                      <optgroup label="Minhas Contas & Carteiras">
                        {accounts
                          .filter((a) => a.type !== 'credit')
                          .map((acc) => (
                            <option key={acc.id} value={acc.name}>
                              {acc.name} ({acc.type === 'savings' ? 'Reserva' : acc.type === 'cash' ? 'Dinheiro' : 'Conta Corrente'})
                            </option>
                          ))}
                      </optgroup>
                    )}

                    <optgroup label="Bancos & Carteiras Populares">
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
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Nome do Banco (ex: C6, XP, Santander)"
                  value={customAccountName}
                  onChange={(e) => setCustomAccountName(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-white border border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomAccount(false);
                    setCustomAccountName('');
                  }}
                  className="px-2.5 py-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl border border-neutral-300 min-h-[44px] cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            )}

            {/* Inline New Credit Card Registration Panel */}
            {paymentMethod === 'Cartão de Crédito' && account === '__new_card__' && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/90 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-900 border-b border-purple-200/60 pb-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Cadastrar Novo Cartão de Crédito na Carteira</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                      Nome do Cartão *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: XP Infinite, Itaú Personnalité..."
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-purple-950"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                      Limite de Crédito Total (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="3000"
                      value={newCardLimit}
                      onChange={(e) => setNewCardLimit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                      Dia Fechamento Fatura
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="5"
                      value={newCardClosingDay}
                      onChange={(e) => setNewCardClosingDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                      Dia Vencimento Fatura
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="12"
                      value={newCardDueDay}
                      onChange={(e) => setNewCardDueDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-purple-950"
                    />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-purple-700/80">
                  Ao salvar, o cartão será cadastrado automaticamente em Cartões de Crédito e adicionado à sua carteira.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Installment Option for Expenses */}
        {type === 'despesa' && (
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Compra Parcelada no Cartão?
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    A 1ª parcela é gravada hoje; parcelas 2 a N vão para Contas a Pagar
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsInstallment(checked);
                    if (checked) setIsRecurring(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {isInstallment && (
              <div className="pt-2 border-t border-neutral-200/80 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600">Parcelar em:</span>
                    <select
                      value={installmentTotal}
                      onChange={(e) => setInstallmentTotal(parseInt(e.target.value))}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((n) => (
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
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  ℹ️ <strong>Abordagem Recomendada:</strong> 1ª parcela de {formatCurrency(installmentValue)} será lançada no extrato de hoje, e as outras {installmentTotal - 1} parcelas serão agendadas mensalmente em <strong>Contas a Pagar</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recurrence Option (Despesa / Receita Recorrente) */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-neutral-900 block">
                  Lançamento Recorrente?
                </span>
                <span className="text-[10px] text-neutral-500">
                  Aluguel, Luz, Internet, Assinatura mensal ou Salário
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsRecurring(checked);
                  if (checked) setIsInstallment(false);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {isRecurring && (
            <div className="pt-2 border-t border-neutral-200/80 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-600">Frequência da recorrência:</span>
                <select
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                  className="px-2.5 py-1 text-xs font-bold bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="mensal">Mensal (Todo Mês)</option>
                  <option value="semanal">Semanal (Toda Semana)</option>
                  <option value="anual">Anual (Todo Ano)</option>
                </select>
              </div>
              <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                ℹ️ <strong>Sincronização Automática:</strong> O lançamento de hoje é salvo no extrato e o próximo vencimento ({recurrenceFrequency}) será agendado automaticamente em <strong>Contas a Pagar & Vencimentos</strong>.
              </p>
            </div>
          )}
        </div>


        {/* Notes (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            Observações / Detalhes (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Compra mensal, farmácia da esquina"
            className="w-full px-3 py-2.5 text-base sm:text-sm text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !description.trim() || !amount}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {type === 'despesa' && isInstallment && installmentTotal > 1
                    ? `Salvar ${installmentTotal} Parcelas`
                    : 'Salvar Lançamento'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
