import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { AccountWallet, FinancialTransaction, BillReminder } from '../types/finance.ts';
import { ACCOUNT_COLORS } from './AccountsWalletsPanel.tsx';
import { deleteAccountFromSupabase } from '../services/supabase.ts';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.tsx';

interface CreditCardsPanelProps {
  accounts: AccountWallet[];
  onUpdateAccounts: (updated: AccountWallet[]) => void;
  transactions: FinancialTransaction[];
  bills: BillReminder[];
  onPayBill: (
    bill: BillReminder,
    paymentDetails?: { installmentsToPay?: number; paymentMethod?: string; accountName?: string; customAmount?: number }
  ) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
  userId?: string;
}

export const CreditCardsPanel: React.FC<CreditCardsPanelProps> = ({
  accounts,
  onUpdateAccounts,
  transactions,
  bills,
  onPayBill,
  onShowToast,
  userId,
}) => {
  // Filter credit card accounts
  const creditCards = useMemo(() => {
    return accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0));
  }, [accounts]);

  // Form & Edit states
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardName, setCardName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('12');
  const [cardColor, setCardColor] = useState(ACCOUNT_COLORS[0].class);

  // Edit Card modal/inline
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editClosingDay, setEditClosingDay] = useState('5');
  const [editDueDay, setEditDueDay] = useState('12');
  const [editColor, setEditColor] = useState('');

  // Delete Card modal state
  const [deletingCard, setDeletingCard] = useState<AccountWallet | null>(null);

  // Expanded card details state (which card shows invoice item list)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Pay Invoice Modal state
  const [payingCard, setPayingCard] = useState<{ card: AccountWallet; invoiceAmount: number } | null>(null);
  const [selectedPayAccount, setSelectedPayAccount] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Get transactions belonging to invoice of a specific credit card
  const getCardTransactions = (cardName: string) => {
    const cardNorm = cardName.toLowerCase().trim();
    const cardToken = cardNorm.split(' ')[0];

    return transactions.filter((t) => {
      if (t.type !== 'despesa') return false;

      const isCreditMethod = t.paymentMethod === 'Cartão de Crédito';
      const txAccountNorm = (t.account || '').toLowerCase().trim();

      const matchesAccount =
        txAccountNorm === cardNorm ||
        txAccountNorm === `cartão ${cardNorm}` ||
        txAccountNorm === `cartao ${cardNorm}` ||
        txAccountNorm.includes(cardToken) ||
        cardNorm.includes(txAccountNorm.split(' ')[0]);

      return isCreditMethod && matchesAccount;
    });
  };

  // Get invoice payments registered for this credit card
  const getCardPayments = (cardName: string) => {
    const cardNorm = cardName.toLowerCase().trim();
    const cardToken = cardNorm.split(' ')[0];

    return transactions.filter((t) => {
      if (t.type !== 'despesa') return false;
      // Do not count credit card purchases as payments
      if (t.paymentMethod === 'Cartão de Crédito') return false;

      const descNorm = (t.description || '').toLowerCase();
      const notesNorm = (t.notes || '').toLowerCase();
      const isInvoicePayment =
        descNorm.includes('fatura') ||
        descNorm.includes('pagamento:') ||
        notesNorm.includes('fatura') ||
        t.category === 'Cartão de Crédito';

      const matchesCard =
        descNorm.includes(cardNorm) ||
        descNorm.includes(cardToken) ||
        notesNorm.includes(cardNorm) ||
        notesNorm.includes(cardToken) ||
        (t.account || '').toLowerCase().trim() === cardNorm;

      return isInvoicePayment && matchesCard;
    });
  };

  // Compute current open invoice total for a credit card (deducting settled payments)
  const getCardInvoiceTotal = (cardName: string) => {
    const cardTxs = getCardTransactions(cardName);
    const txSum = cardTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const payments = getCardPayments(cardName);
    const paymentsSum = payments.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const baseAmount =
      txSum > 0
        ? txSum
        : (() => {
            const cardAcc = accounts.find(
              (a) => a.type === 'credit' && a.name.toLowerCase().trim() === cardName.toLowerCase().trim()
            );
            return cardAcc && cardAcc.type === 'credit' && cardAcc.balance && cardAcc.balance > 0
              ? cardAcc.balance
              : 0;
          })();

    return Math.max(0, Math.round((baseAmount - paymentsSum) * 100) / 100);
  };

  const handleNameChange = (val: string) => {
    setCardName(val);
    const lower = val.toLowerCase();
    if (lower.includes('nu')) setCardColor(ACCOUNT_COLORS[0].class);
    else if (lower.includes('itaú') || lower.includes('itau')) setCardColor(ACCOUNT_COLORS[1].class);
    else if (lower.includes('inter') || lower.includes('bb')) setCardColor(ACCOUNT_COLORS[2].class);
    else if (lower.includes('bradesco') || lower.includes('santander')) setCardColor(ACCOUNT_COLORS[3].class);
    else if (lower.includes('pagbank')) setCardColor(ACCOUNT_COLORS[4].class);
    else if (lower.includes('caixa') || lower.includes('btg')) setCardColor(ACCOUNT_COLORS[5].class);
    else if (lower.includes('xp') || lower.includes('neon')) setCardColor(ACCOUNT_COLORS[6].class);
    else if (lower.includes('c6')) setCardColor(ACCOUNT_COLORS[7].class);
    else if (lower.includes('nomad')) setCardColor(ACCOUNT_COLORS[8].class);
    else if (lower.includes('safra')) setCardColor(ACCOUNT_COLORS[9].class);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    const limit = parseFloat(creditLimit) || 3000;

    const newAcc: AccountWallet = {
      id: `acc-card-${Date.now()}`,
      name: cardName.trim(),
      type: 'credit',
      balance: 0,
      initialBalance: 0,
      color: cardColor,
      creditLimit: limit,
      closingDay: parseInt(closingDay, 10) || 5,
      dueDay: parseInt(dueDay, 10) || 12,
    };

    onUpdateAccounts([...accounts, newAcc]);
    setIsAddingCard(false);
    setCardName('');
    setCreditLimit('');
    onShowToast(`Cartão de Crédito "${newAcc.name}" cadastrado com sucesso!`);
  };

  const handleStartEdit = (card: AccountWallet) => {
    setEditingCardId(card.id);
    setEditName(card.name);
    setEditLimit((card.creditLimit || 3000).toString());
    setEditClosingDay((card.closingDay || 5).toString());
    setEditDueDay((card.dueDay || 12).toString());
    setEditColor(card.color || ACCOUNT_COLORS[0].class);
  };

  const handleSaveEdit = (id: string) => {
    const limit = parseFloat(editLimit) || 3000;
    const updated = accounts.map((a) =>
      a.id === id
        ? {
            ...a,
            name: editName.trim() || a.name,
            creditLimit: limit,
            closingDay: parseInt(editClosingDay, 10) || 5,
            dueDay: parseInt(editDueDay, 10) || 12,
            color: editColor,
          }
        : a
    );
    onUpdateAccounts(updated);
    setEditingCardId(null);
    onShowToast('Cartão de crédito e limites atualizados com sucesso!');
  };

  const handleDeleteCard = (id: string) => {
    const card = accounts.find((a) => a.id === id);
    const updated = accounts.filter((a) => a.id !== id);
    onUpdateAccounts(updated);
    deleteAccountFromSupabase(id, userId);
    setDeletingCard(null);
    onShowToast(`Cartão "${card?.name || 'Cartão'}" removido.`);
  };

  // Open Pay Invoice modal
  const handleOpenPayInvoice = (card: AccountWallet) => {
    const invoiceTotal = getCardInvoiceTotal(card.name);
    if (invoiceTotal <= 0) {
      onShowToast(`A fatura do cartão ${card.name} não possui saldo a pagar.`, 'error');
      return;
    }
    const checkingAccounts = accounts.filter((a) => a.type !== 'credit');
    const defaultPayAcc = checkingAccounts.length > 0 ? checkingAccounts[0].name : 'Bradesco';
    setSelectedPayAccount(defaultPayAcc);
    setPayingCard({ card, invoiceAmount: invoiceTotal });
  };

  // Confirm Pay Invoice
  const handleConfirmPayInvoice = async () => {
    if (!payingCard) return;
    setIsProcessingPay(true);

    const { card, invoiceAmount } = payingCard;
    const payAccName = selectedPayAccount || 'Bradesco';

    try {
      // Find matching Bill Reminder or construct one
      const matchingBill: BillReminder = {
        id: `bill-card-${card.id}-${Date.now()}`,
        title: `Fatura Cartão ${card.name}`,
        amount: invoiceAmount,
        dueDate: new Date().toISOString().split('T')[0],
        category: 'Cartão de Crédito',
        isPaid: false,
        paymentMethod: 'Boleto',
        account: card.name,
      };

      await onPayBill(matchingBill, {
        accountName: payAccName,
        paymentMethod: 'Boleto',
        customAmount: invoiceAmount,
      });

      setPayingCard(null);
      onShowToast(`Fatura do ${card.name} (${formatCurrency(invoiceAmount)}) paga via ${payAccName}! Saldo atualizado.`);
    } catch (err) {
      console.warn('Pay invoice error:', err);
      onShowToast('Erro ao processar pagamento da fatura.', 'error');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900">
                Cartões de Crédito & Faturas
              </h3>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {creditCards.length} Cartão(ões)
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Compras no crédito <strong>não debitam a conta na hora</strong> — acumulam na fatura do mês.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingCard(!isAddingCard)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto min-h-[38px] shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddingCard ? 'Cancelar' : 'Novo Cartão'}</span>
        </button>
      </div>

      {/* Form Add New Card */}
      {isAddingCard && (
        <form
          onSubmit={handleAddCard}
          className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3.5 animate-in fade-in duration-150"
        >
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Cadastrar Novo Cartão de Crédito
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Nome do Cartão:
              </label>
              <input
                type="text"
                placeholder="Ex: Nubank, Bradesco Black"
                value={cardName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-neutral-900 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[40px]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Limite do Cartão (R$):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 5000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-neutral-900 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[40px]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Dia Fechamento Fatura:
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-neutral-900 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Dia Vencimento Fatura:
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-neutral-900 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[40px]"
              />
            </div>
          </div>

          {/* Color palette picker */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
              Cor de Destaque do Cartão:
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardColor(c.class)}
                  className={`w-7 h-7 rounded-xl border-2 cursor-pointer flex items-center justify-center transition-all ${c.badgeBg} ${
                    cardColor === c.class ? 'border-neutral-900 scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
            >
              Salvar Cartão
            </button>
          </div>
        </form>
      )}

      {/* Credit Cards Grid */}
      {creditCards.length === 0 ? (
        <div className="p-8 text-center bg-purple-50/40 rounded-2xl border border-dashed border-purple-200 space-y-2">
          <CreditCard className="w-8 h-8 text-purple-400 mx-auto" />
          <p className="text-xs font-bold text-purple-900">Nenhum cartão de crédito cadastrado</p>
          <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
            Cadastre seus cartões (ex: Nubank, Bradesco) com o limite e dia de vencimento para acompanhar faturas sem impactar a conta corrente na hora da compra.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900 text-white text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Meu Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {creditCards.map((card) => {
            const isEditing = editingCardId === card.id;
            const invoiceTotal = getCardInvoiceTotal(card.name);
            const totalLimit = card.creditLimit || 3000;
            const availableLimit = Math.max(0, totalLimit - invoiceTotal);
            const limitPercentage = Math.min(100, Math.round((invoiceTotal / totalLimit) * 100));
            const cardTxs = getCardTransactions(card.name);
            const isExpanded = expandedCardId === card.id;

            if (isEditing) {
              return (
                <div key={card.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Editar Cartão</span>
                    <button
                      type="button"
                      onClick={() => setEditingCardId(null)}
                      className="text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-500">Nome:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500">Limite (R$):</label>
                      <input
                        type="number"
                        value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500">Dia Fechamento:</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editClosingDay}
                        onChange={(e) => setEditClosingDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500">Dia Vencimento:</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editDueDay}
                        onChange={(e) => setEditDueDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(card.id)}
                    className="w-full py-2 bg-purple-900 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-purple-800"
                  >
                    Salvar Alterações
                  </button>
                </div>
              );
            }

            return (
              <div
                key={card.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 shadow-2xs ${card.color || 'border-purple-200 bg-purple-50/60 text-purple-900'}`}
              >
                {/* Card Top Row: Name, Edit & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-neutral-800" />
                      <h4 className="text-base font-extrabold text-neutral-900 leading-tight">
                        {card.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-2">
                      <span>Fechamento: Dia {card.closingDay || 5}</span>
                      <span>•</span>
                      <span className="font-semibold text-purple-900">Vencimento: Dia {card.dueDay || 12}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(card)}
                      className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Editar Limite e Datas do Cartão"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCard(card)}
                      className="w-8 h-8 rounded-xl bg-white/80 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Excluir Cartão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 bg-white/80 p-3 rounded-xl border border-black/5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Fatura Atual em Aberto
                    </span>
                    <span className="text-lg font-black text-rose-600">
                      {formatCurrency(invoiceTotal)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Limite Disponível
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {formatCurrency(availableLimit)}
                    </span>
                  </div>
                </div>

                {/* Credit Limit Usage Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                    <span>Uso do Limite ({limitPercentage}%)</span>
                    <span>Limite Total: {formatCurrency(totalLimit)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        limitPercentage > 85
                          ? 'bg-rose-600'
                          : limitPercentage > 60
                          ? 'bg-amber-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${limitPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Actions: Pay Invoice & Toggle Transactions */}
                <div className="flex items-center justify-between pt-2 border-t border-black/10 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                    className="text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-purple-700" />
                    <span>{cardTxs.length} Compra(s) na Fatura</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPayInvoice(card)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pagar Fatura</span>
                  </button>
                </div>

                {/* Expanded Invoice Items List */}
                {isExpanded && (
                  <div className="pt-2 border-t border-black/10 space-y-2 animate-in fade-in duration-150">
                    <h5 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                      Lançamentos da Fatura do Mês:
                    </h5>
                    {cardTxs.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-1">
                        Nenhuma compra registrada neste cartão para o mês.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {cardTxs.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-2 rounded-lg bg-white/90 border border-neutral-200/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-neutral-900">{tx.description}</p>
                              <p className="text-[10px] text-neutral-500">
                                {tx.date.split('-').reverse().join('/')} • {tx.category}
                              </p>
                            </div>
                            <span className="font-extrabold text-rose-600">
                              -{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Invoice Modal */}
      {payingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 font-black" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">
                  Pagar Fatura do Cartão
                </h3>
                <p className="text-xs text-neutral-500">
                  {payingCard.card.name}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                Valor Total da Fatura:
              </span>
              <span className="text-2xl font-black text-purple-900">
                {formatCurrency(payingCard.invoiceAmount)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-neutral-500" />
                <span>Escolha a Conta Bancária para Debitar o Pagamento:</span>
              </label>
              <select
                value={selectedPayAccount}
                onChange={(e) => setSelectedPayAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px] cursor-pointer"
              >
                {accounts
                  .filter((a) => a.type !== 'credit')
                  .map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} (Saldo: {formatCurrency(acc.balance)})
                    </option>
                  ))}
              </select>
            </div>

            <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              💡 Ao confirmar, R$ {payingCard.invoiceAmount.toFixed(2)} será debitado do saldo do <strong>{selectedPayAccount}</strong> e a fatura do cartão será baixada.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPayingCard(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-50 cursor-pointer min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayInvoice}
                disabled={isProcessingPay}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer min-h-[42px] transition-all"
              >
                {isProcessingPay ? 'Debitando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCard && (
        <DeleteConfirmationModal
          isOpen={Boolean(deletingCard)}
          onClose={() => setDeletingCard(null)}
          onConfirm={() => handleDeleteCard(deletingCard.id)}
          title={`Excluir Cartão "${deletingCard.name}"`}
          description="Tem certeza que deseja excluir este cartão de crédito? Os lançamentos já realizados no cartão continuarão preservados no seu extrato."
        />
      )}
    </div>
  );
};
