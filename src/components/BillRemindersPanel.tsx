import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  X,
  Filter,
  Check,
  Building,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  DollarSign,
  Layers,
  Info,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { BillReminder, AccountWallet, FinancialTransaction } from '../types/finance.ts';
import { fetchBillsFromSupabase, saveBillsToSupabase, deleteBillFromSupabase } from '../services/supabase.ts';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.tsx';

interface BillRemindersPanelProps {
  bills?: BillReminder[];
  onUpdateBills?: (updated: BillReminder[]) => void;
  accounts?: AccountWallet[];
  transactions?: FinancialTransaction[];
  userId?: string;
  onPayBill: (
    bill: BillReminder,
    paymentDetails?: { installmentsToPay?: number; paymentMethod?: string; accountName?: string; customAmount?: number }
  ) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

type StatusFilterType = 'all' | 'overdue' | 'today' | 'next7' | 'upcoming' | 'paid';

export const BillRemindersPanel: React.FC<BillRemindersPanelProps> = React.memo(({
  bills: propBills,
  onUpdateBills,
  accounts = [],
  transactions = [],
  userId,
  onPayBill,
  onShowToast,
}) => {
  const [bills, setBills] = useState<BillReminder[]>(() => {
    if (propBills) return propBills;
    try {
      const storageKey = userId ? `finai_bills_${userId}` : 'finai_local_bills';
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Keep internal bills synced with props
  useEffect(() => {
    if (propBills) {
      setBills(propBills);
    }
  }, [propBills]);

  // Form & Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [detailModalBill, setDetailModalBill] = useState<BillReminder | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState('Moradia');
  const [newAccount, setNewAccount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('Boleto');
  const [billType, setBillType] = useState<'recorrente' | 'parcelado' | 'unica'>('recorrente');
  const [newRecurrenceFreq, setNewRecurrenceFreq] = useState<'mensal' | 'semanal' | 'anual'>('mensal');
  const [newInstallmentCount, setNewInstallmentCount] = useState(3);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [viewScope, setViewScope] = useState<'month' | 'all'>('month');

  // Competência (Month/Year) state: defaults to YYYY-MM of current month
  const [competenceDate, setCompetenceDate] = useState<Date>(new Date());

  const currentCompetenceStr = useMemo(() => {
    const y = competenceDate.getFullYear();
    const m = String(competenceDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [competenceDate]);

  const monthNameYearLabel = useMemo(() => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[competenceDate.getMonth()]} ${competenceDate.getFullYear()}`;
  }, [competenceDate]);

  const handlePrevCompetence = () => {
    setCompetenceDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextCompetence = () => {
    setCompetenceDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentCompetence = () => {
    setCompetenceDate(new Date());
  };

  // Payment Options Modal state
  const [paymentModalBill, setPaymentModalBill] = useState<BillReminder | null>(null);
  const [payInstallmentCount, setPayInstallmentCount] = useState<number>(1);
  const [payPaymentMethod, setPayPaymentMethod] = useState<string>('PIX');
  const [payAccountName, setPayAccountName] = useState<string>('');

  const saveBills = (updated: BillReminder[]) => {
    setBills(updated);
    onUpdateBills?.(updated);
    try {
      const storageKey = userId ? `finai_bills_${userId}` : 'finai_local_bills';
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('finai_cached_bills', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const normalizeDateStr = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const getDaysUntilDue = (dueDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalized = normalizeDateStr(dueDateStr);
    const [y, m, d] = normalized.split('-').map(Number);
    const due = new Date(y, (m || 1) - 1, d || 1);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to extract YYYY-MM
  const getDueYearMonth = (dueDateStr: string): string => {
    const norm = normalizeDateStr(dueDateStr);
    const parts = norm.split('-');
    if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
    return '';
  };

  // Filter bills by Competência Month with recurring projection, credit card invoices and overdue inclusion
  const competenceBills = useMemo(() => {
    const [currY, currM] = currentCompetenceStr.split('-').map(Number);
    const maxDays = new Date(currY, currM, 0).getDate();

    const mappedBills = bills.map((b) => {
      if (viewScope === 'all') {
        return {
          ...b,
          dueDate: normalizeDateStr(b.dueDate),
        };
      }
      const ym = getDueYearMonth(b.dueDate);
      const isRecurring = Boolean(b.recurringMonthly || b.isRecurring || b.recurrenceFrequency === 'mensal');

      if (isRecurring && ym !== currentCompetenceStr) {
        const norm = normalizeDateStr(b.dueDate);
        const day = Number(norm.split('-')[2]) || 10;
        const safeDay = Math.min(day, maxDays);
        const projectedDueDate = `${currY}-${String(currM).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
        return {
          ...b,
          dueDate: projectedDueDate,
        };
      }
      return {
        ...b,
        dueDate: normalizeDateStr(b.dueDate),
      };
    }).filter((b) => {
      if (viewScope === 'all') return true;
      const ym = getDueYearMonth(b.dueDate);
      const isMatchMonth = ym === currentCompetenceStr;
      const isRecurring = Boolean(b.recurringMonthly || b.isRecurring || b.recurrenceFrequency === 'mensal');
      const days = getDaysUntilDue(b.dueDate);
      const isOverdueUnpaid = !b.isPaid && days < 0;

      return isMatchMonth || isRecurring || isOverdueUnpaid;
    });

    // Credit Card open invoice dynamic projection into Contas a Pagar
    const creditCards = accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0));
    const projectedCardBills: BillReminder[] = [];

    creditCards.forEach((card) => {
      const cardNorm = card.name.toLowerCase().trim();
      const cardToken = cardNorm.split(' ')[0];

      const cardTxs = transactions.filter((t) => {
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

      const txSum = cardTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Only use card.balance if card is strictly a credit card (card.type === 'credit')
      const invoiceAmount =
        txSum > 0
          ? txSum
          : card.type === 'credit' && card.balance && card.balance > 0
          ? card.balance
          : 0;

      if (invoiceAmount > 0) {
        const cardDueDay = Math.min(card.dueDay || 12, maxDays);
        const cardDueDate = `${currY}-${String(currM).padStart(2, '0')}-${String(cardDueDay).padStart(2, '0')}`;
        const cardTitle = `Fatura Cartão ${card.name}`;

        const alreadyExists = mappedBills.some(
          (b) =>
            b.title.toLowerCase().includes(card.name.toLowerCase()) ||
            (b.account &&
              b.account.toLowerCase().trim() === card.name.toLowerCase().trim() &&
              b.category === 'Cartão de Crédito')
        );

        if (!alreadyExists) {
          projectedCardBills.push({
            id: `cc-invoice-${card.id}-${currentCompetenceStr}`,
            title: cardTitle,
            amount: invoiceAmount,
            dueDate: cardDueDate,
            category: 'Cartão de Crédito',
            isPaid: false,
            account: card.name,
            paymentMethod: 'Cartão de Crédito',
            isRecurring: true,
            recurringMonthly: true,
          });
        }
      }
    });

    const combined = [...projectedCardBills, ...mappedBills];
    return combined.sort((a, b) => {
      const dateA = normalizeDateStr(a.dueDate);
      const dateB = normalizeDateStr(b.dueDate);
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return a.title.localeCompare(b.title);
    });
  }, [bills, accounts, transactions, currentCompetenceStr, viewScope]);

  // Compute status counts & sums for current Competência
  const statusMetrics = useMemo(() => {
    let overdueCount = 0, overdueTotal = 0;
    let todayCount = 0, todayTotal = 0;
    let next7Count = 0, next7Total = 0;
    let upcomingCount = 0, upcomingTotal = 0;
    let paidCount = 0, paidTotal = 0;

    competenceBills.forEach((b) => {
      const days = getDaysUntilDue(b.dueDate);
      if (b.isPaid) {
        paidCount++;
        paidTotal += b.amount;
      } else if (days < 0) {
        overdueCount++;
        overdueTotal += b.amount;
      } else if (days === 0) {
        todayCount++;
        todayTotal += b.amount;
      } else if (days > 0 && days <= 7) {
        next7Count++;
        next7Total += b.amount;
      } else {
        upcomingCount++;
        upcomingTotal += b.amount;
      }
    });

    return {
      overdueCount, overdueTotal,
      todayCount, todayTotal,
      next7Count, next7Total,
      upcomingCount, upcomingTotal,
      paidCount, paidTotal,
    };
  }, [competenceBills]);

  // Filtered bills by Search Query and Status Filter, strictly ordered by due date ascending
  const filteredBills = useMemo(() => {
    const list = competenceBills.filter((b) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(query);
        const matchCategory = b.category.toLowerCase().includes(query);
        const matchAccount = b.account ? b.account.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchCategory && !matchAccount) return false;
      }

      const days = getDaysUntilDue(b.dueDate);

      if (statusFilter === 'overdue') return !b.isPaid && days < 0;
      if (statusFilter === 'today') return !b.isPaid && days === 0;
      if (statusFilter === 'next7') return !b.isPaid && days > 0 && days <= 7;
      if (statusFilter === 'upcoming') return !b.isPaid && days > 7;
      if (statusFilter === 'paid') return b.isPaid;

      return true;
    });

    return list.sort((a, b) => {
      const dateA = normalizeDateStr(a.dueDate);
      const dateB = normalizeDateStr(b.dueDate);
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return a.title.localeCompare(b.title);
    });
  }, [competenceBills, searchQuery, statusFilter]);

  // Open payment modal
  const openPaymentModal = (bill: BillReminder) => {
    setPaymentModalBill(bill);
    setPayInstallmentCount(1);
    setPayPaymentMethod(bill.paymentMethod || 'PIX');
    setPayAccountName(bill.account || (accounts.length > 0 ? accounts[0].name : 'Nubank'));
  };

  // Submit payment modal
  const handleConfirmPaymentModal = async () => {
    if (!paymentModalBill) return;
    const bill = paymentModalBill;
    const installmentsToPay = payInstallmentCount;
    const paymentMethod = payPaymentMethod;
    const accountName = payAccountName || (accounts.length > 0 ? accounts[0].name : 'Nubank');
    const totalPayAmount = Math.round(bill.amount * installmentsToPay * 100) / 100;

    try {
      setIsPayingId(bill.id);
      setPaymentModalBill(null);

      await onPayBill(bill, {
        installmentsToPay,
        paymentMethod,
        accountName,
        customAmount: totalPayAmount,
      });

      let updated = [...bills];

      // Mark current bill as paid
      updated = updated.map((b) =>
        b.id === bill.id ? { ...b, isPaid: true, account: accountName, paymentMethod } : b
      );

      // If paying multiple installments of an installment bill
      if (bill.installments && installmentsToPay > 1) {
        const baseTitle = bill.title.replace(/\(\d+\/\d+\)/, '').trim();
        const currentNum = bill.installments.current;
        const targetMaxNum = currentNum + installmentsToPay - 1;

        updated = updated.map((b) => {
          if (b.installments && b.title.includes(baseTitle)) {
            if (b.installments.current > currentNum && b.installments.current <= targetMaxNum) {
              return { ...b, isPaid: true, account: accountName, paymentMethod };
            }
          }
          return b;
        });
      }

      // Auto-renew if recurring
      if (bill.recurringMonthly || bill.isRecurring) {
        const freq = bill.recurrenceFrequency || 'mensal';
        const [y, m, d] = bill.dueDate.split('-').map(Number);
        const nextDueDateObj = new Date(y, (m || 1) - 1, d || 1);

        for (let i = 0; i < installmentsToPay; i++) {
          if (freq === 'semanal') {
            nextDueDateObj.setDate(nextDueDateObj.getDate() + 7);
          } else if (freq === 'anual') {
            nextDueDateObj.setFullYear(nextDueDateObj.getFullYear() + 1);
          } else {
            nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 1);
          }
        }

        const nextDueDateStr = nextDueDateObj.toISOString().split('T')[0];

        const exists = updated.some(
          (b) => b.title.toLowerCase() === bill.title.toLowerCase() && b.dueDate === nextDueDateStr && !b.isPaid
        );

        if (!exists) {
          const nextBill: BillReminder = {
            ...bill,
            id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dueDate: nextDueDateStr,
            isPaid: false,
            account: accountName,
            paymentMethod,
          };
          updated = [nextBill, ...updated];
          onShowToast(
            `Pagamento de ${installmentsToPay}x parcela(s) da conta "${bill.title}" realizado via ${accountName}! Próximo vencimento (${freq}) gerado para ${nextDueDateStr.split('-').reverse().join('/')}.`
          );
        } else {
          onShowToast(`Pagamento de ${installmentsToPay}x parcela(s) da conta "${bill.title}" realizado via ${accountName}!`);
        }
      } else {
        onShowToast(
          installmentsToPay > 1
            ? `Pagamento de ${installmentsToPay} parcelas (${formatCurrency(totalPayAmount)}) da conta "${bill.title}" registrado via ${accountName}!`
            : `Conta "${bill.title}" paga via ${accountName} (${paymentMethod}) e debitada do saldo!`
        );
      }

      saveBills(updated);
    } catch (e: any) {
      onShowToast(e.message || 'Erro ao registrar pagamento', 'error');
    } finally {
      setIsPayingId(null);
    }
  };

  // Delete confirmation modal state
  const [deletingBill, setDeletingBill] = useState<BillReminder | null>(null);

  const handleDeleteBill = async (id: string) => {
    const updated = bills.filter((b) => b.id !== id);
    saveBills(updated);
    await deleteBillFromSupabase(id, userId);
    onShowToast('Lembrete de conta removido.');
  };

  const handleConfirmDeleteBill = async () => {
    if (deletingBill) {
      await handleDeleteBill(deletingBill.id);
      setDeletingBill(null);
    }
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      onShowToast('Informe um valor válido', 'error');
      return;
    }
    if (!newDueDate) {
      onShowToast('Informe a data de vencimento', 'error');
      return;
    }

    const targetAccount = newAccount || (accounts[0]?.name || 'Nubank');
    const targetPaymentMethod = newPaymentMethod || 'Boleto';

    if (billType === 'parcelado' && newInstallmentCount > 1) {
      const installmentValue = Math.round((amount / newInstallmentCount) * 100) / 100;
      const [startYear, startMonth, startDay] = newDueDate.split('-').map(Number);
      const generatedBills: BillReminder[] = [];

      for (let i = 1; i <= newInstallmentCount; i++) {
        const dueObj = new Date(startYear, (startMonth - 1) + (i - 1), startDay || 1);
        const dateStr = dueObj.toISOString().split('T')[0];

        generatedBills.push({
          id: `bill-inst-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          title: `${newTitle.trim()} (${i}/${newInstallmentCount})`,
          amount: installmentValue,
          dueDate: dateStr,
          category: newCategory,
          isPaid: false,
          paymentMethod: targetPaymentMethod,
          account: targetAccount,
          installments: {
            current: i,
            total: newInstallmentCount,
            originalTotal: amount,
          },
        });
      }

      const updated = [...generatedBills, ...bills];
      saveBills(updated);
      onShowToast(`${newInstallmentCount} parcelas de ${formatCurrency(installmentValue)} cadastradas em Contas a Pagar!`);
    } else {
      const isRec = billType === 'recorrente';
      const newBill: BillReminder = {
        id: `bill-${Date.now()}`,
        title: newTitle.trim(),
        amount,
        dueDate: newDueDate,
        category: newCategory,
        isPaid: false,
        recurringMonthly: isRec && newRecurrenceFreq === 'mensal',
        isRecurring: isRec,
        recurrenceFrequency: isRec ? newRecurrenceFreq : undefined,
        paymentMethod: targetPaymentMethod,
        account: targetAccount,
      };

      const updated = [newBill, ...bills];
      saveBills(updated);
      onShowToast(`Conta "${newBill.title}" cadastrada em Contas a Pagar!`);
    }

    setIsAdding(false);
    setNewTitle('');
    setNewAmount('');
    setNewDueDate('');
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight">
                Contas a Pagar & Vencimentos
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                {competenceBills.length} no mês
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              Acompanhe faturas, boletos, aluguéis e compromissos por competência mensal
            </p>
          </div>
        </div>
      </div>

      {/* 1. Competência Navigation Banner (Compact) */}
      <div className="bg-neutral-900 text-white rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 shadow-md border border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handlePrevCompetence}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-0.5">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-emerald-400">
            {viewScope === 'all' ? 'VISUALIZAÇÃO GERAL' : 'COMPETÊNCIA MENSAL'}
          </span>
          <h2 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight">
            {viewScope === 'all' ? `Todas as Contas (${bills.length})` : monthNameYearLabel}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewScope(viewScope === 'month' ? 'all' : 'month')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
              viewScope === 'all'
                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-black shadow-xs'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
            title="Alternar entre filtro por mês ou todas as contas"
          >
            {viewScope === 'all' ? 'Por Mês' : 'Ver Todas'}
          </button>

          {viewScope === 'month' && (
            <button
              type="button"
              onClick={handleCurrentCompetence}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-[11px] font-bold transition-all cursor-pointer"
              title="Ir para o mês atual"
            >
              Mês Atual
            </button>
          )}

          <button
            type="button"
            onClick={handleNextCompetence}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Compact Semantic KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* ATRASADOS */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'overdue'
              ? 'ring-2 ring-rose-500 bg-rose-50 border-rose-300 shadow-xs'
              : 'bg-rose-50/50 hover:bg-rose-50 border-rose-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Atrasados
            </span>
            <AlertCircle className="w-4 h-4 text-rose-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-lg sm:text-xl font-black text-rose-900 tracking-tight leading-none">
              {statusMetrics.overdueCount}
            </p>
            <p className="text-[10px] font-bold text-rose-700/90 truncate">
              {formatCurrency(statusMetrics.overdueTotal)}
            </p>
          </div>
        </button>

        {/* HOJE */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'today' ? 'all' : 'today')}
          className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'today'
              ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-300 shadow-xs'
              : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Hoje
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-lg sm:text-xl font-black text-amber-950 tracking-tight leading-none">
              {statusMetrics.todayCount}
            </p>
            <p className="text-[10px] font-bold text-amber-800/90 truncate">
              {formatCurrency(statusMetrics.todayTotal)}
            </p>
          </div>
        </button>

        {/* EM 7 DIAS */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'next7' ? 'all' : 'next7')}
          className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'next7'
              ? 'ring-2 ring-yellow-500 bg-yellow-50 border-yellow-300 shadow-xs'
              : 'bg-yellow-50/50 hover:bg-yellow-50 border-yellow-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-yellow-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-600" />
              Em 7 Dias
            </span>
            <Clock className="w-4 h-4 text-yellow-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-lg sm:text-xl font-black text-yellow-950 tracking-tight leading-none">
              {statusMetrics.next7Count}
            </p>
            <p className="text-[10px] font-bold text-yellow-800/90 truncate">
              {formatCurrency(statusMetrics.next7Total)}
            </p>
          </div>
        </button>

        {/* A VENCER */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
          className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'upcoming'
              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300 shadow-xs'
              : 'bg-blue-50/50 hover:bg-blue-50 border-blue-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              A Vencer
            </span>
            <Calendar className="w-4 h-4 text-blue-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-lg sm:text-xl font-black text-blue-950 tracking-tight leading-none">
              {statusMetrics.upcomingCount}
            </p>
            <p className="text-[10px] font-bold text-blue-800/90 truncate">
              {formatCurrency(statusMetrics.upcomingTotal)}
            </p>
          </div>
        </button>

        {/* EM DIA / PAGAS */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          className={`col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'paid'
              ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Pagas / Em Dia
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight leading-none">
              {statusMetrics.paidCount}
            </p>
            <p className="text-[10px] font-bold text-emerald-800/90 truncate">
              {formatCurrency(statusMetrics.paidTotal)}
            </p>
          </div>
        </button>
      </div>

      {/* 3. Search Bar & Status Filter Pills Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-neutral-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar conta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 bg-neutral-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[36px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* New Bill Button */}
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer min-h-[36px] shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAdding ? 'Fechar Form' : '+ Nova Conta'}</span>
          </button>
        </div>

        {/* Filter Pills Row with Semantic KPI Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            {
              id: 'all',
              label: 'Todos',
              count: competenceBills.length,
              activeClass: 'bg-neutral-900 text-white border-neutral-900 shadow-2xs',
              inactiveClass: 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200/80',
              dotBg: 'bg-neutral-500',
            },
            {
              id: 'overdue',
              label: 'Atraso',
              count: statusMetrics.overdueCount,
              activeClass: 'bg-rose-600 text-white border-rose-600 shadow-2xs',
              inactiveClass: 'bg-rose-50/80 hover:bg-rose-100 text-rose-800 border-rose-200/80',
              dotBg: 'bg-rose-500',
            },
            {
              id: 'today',
              label: 'Hoje',
              count: statusMetrics.todayCount,
              activeClass: 'bg-amber-600 text-white border-amber-600 shadow-2xs',
              inactiveClass: 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200/80',
              dotBg: 'bg-amber-500',
            },
            {
              id: 'next7',
              label: '7 Dias',
              count: statusMetrics.next7Count,
              activeClass: 'bg-yellow-500 text-white border-yellow-500 shadow-2xs',
              inactiveClass: 'bg-yellow-50/80 hover:bg-yellow-100 text-yellow-950 border-yellow-200/80',
              dotBg: 'bg-yellow-500',
            },
            {
              id: 'upcoming',
              label: 'A Vencer',
              count: statusMetrics.upcomingCount,
              activeClass: 'bg-blue-600 text-white border-blue-600 shadow-2xs',
              inactiveClass: 'bg-blue-50/80 hover:bg-blue-100 text-blue-900 border-blue-200/80',
              dotBg: 'bg-blue-500',
            },
            {
              id: 'paid',
              label: 'Pagos',
              count: statusMetrics.paidCount,
              activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs',
              inactiveClass: 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80',
              dotBg: 'bg-emerald-500',
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as StatusFilterType)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer min-h-[30px] flex items-center gap-1.5 shrink-0 border text-xs ${
                  isActive ? tab.activeClass : tab.inactiveClass
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white' : tab.dotBg}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-black/10 text-current'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Bill Form Expansion */}
        {isAdding && (
          <form
            onSubmit={handleAddBill}
            className="p-3 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3.5 animate-in fade-in duration-150 mt-2 overflow-hidden w-full max-w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 pb-2.5 max-w-full overflow-hidden">
              <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider shrink-0">
                Cadastrar Novo Vencimento
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 text-xs max-w-full w-full sm:w-auto">
                <label className="font-semibold text-neutral-600 shrink-0">Tipo de Lançamento:</label>
                <select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value as any)}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 max-w-full focus:ring-2 focus:ring-emerald-500/30 outline-none truncate"
                >
                  <option value="recorrente">🔄 Recorrente (Mensal / Semanal)</option>
                  <option value="parcelado">💳 Parcelado em x vezes</option>
                  <option value="unica">📌 Única (Pontual)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  Nome da Conta / Fornecedor *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Net, Cartão Itaú..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  {billType === 'parcelado' ? 'Valor Total da Compra (R$)' : 'Valor da Conta (R$)'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  {billType === 'parcelado' ? 'Data 1ª Parcela' : 'Vencimento'} *
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  Categoria da Conta
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  {['Moradia', 'Serviços & Contas', 'Alimentação', 'Saúde', 'Transporte', 'Lazer', 'Educação', 'Compras', 'Outros'].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  Conta Bancária / Banco Padrão
                </label>
                <select
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  {accounts && accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))
                  ) : (
                    ['Nubank', 'Itaú', 'Banco Inter', 'Bradesco', 'Carteira Dinheiro'].map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                  Forma de Pagamento Padrão
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  {['Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência Bancária', 'Dinheiro', 'Outro'].map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditional parameters based on type */}
            {billType === 'recorrente' && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                <span className="font-semibold text-indigo-900">Recorrência:</span>
                <select
                  value={newRecurrenceFreq}
                  onChange={(e) => setNewRecurrenceFreq(e.target.value as any)}
                  className="px-2 py-0.5 bg-white border border-indigo-200 rounded font-bold text-indigo-900 text-xs"
                >
                  <option value="mensal">Mensal (Todo Mês)</option>
                  <option value="semanal">Semanal (Toda Semana)</option>
                  <option value="anual">Anual (Todo Ano)</option>
                </select>
              </div>
            )}

            {billType === 'parcelado' && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                <span className="font-semibold text-emerald-900">Parcelas:</span>
                <select
                  value={newInstallmentCount}
                  onChange={(e) => setNewInstallmentCount(parseInt(e.target.value))}
                  className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-bold text-emerald-900 text-xs"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((n) => (
                    <option key={n} value={n}>
                      {n}x parcelas
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-2xs cursor-pointer"
              >
                Salvar Lembrete
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Streamlined & Spacious Semantic Bill Cards */}
      {filteredBills.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 bg-white rounded-2xl border border-dashed border-neutral-300 space-y-3 shadow-2xs">
          <Calendar className="w-8 h-8 text-neutral-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-800">Nenhum vencimento encontrado</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {searchQuery
                ? `Sem correspondências para a busca "${searchQuery}".`
                : viewScope === 'month'
                ? `Sem contas para ${monthNameYearLabel}.`
                : 'Nenhuma conta cadastrada no momento.'}
            </p>
          </div>

          {bills.length > 0 && viewScope === 'month' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Todas as Contas ({bills.length} cadastradas)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBills.map((bill) => {
            const days = getDaysUntilDue(bill.dueDate);
            const isOverdue = days < 0 && !bill.isPaid;
            const isDueToday = days === 0 && !bill.isPaid;
            const isDueNext7 = days > 0 && days <= 7 && !bill.isPaid;
            const isPaid = bill.isPaid;

            // Compact Semantic Colors & Status Badges
            let leftBorderClass = 'border-l-blue-500';
            let badgeClass = 'bg-blue-100 text-blue-900 border-blue-200';
            let badgeText = `A vencer (${days}d)`;

            if (isPaid) {
              leftBorderClass = 'border-l-emerald-500';
              badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-200';
              badgeText = 'Pago';
            } else if (isOverdue) {
              leftBorderClass = 'border-l-rose-500';
              badgeClass = 'bg-rose-100 text-rose-900 border-rose-200 font-bold';
              badgeText = `Atrasado (${Math.abs(days)}d)`;
            } else if (isDueToday) {
              leftBorderClass = 'border-l-amber-500';
              badgeClass = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
              badgeText = 'Hoje';
            } else if (isDueNext7) {
              leftBorderClass = 'border-l-yellow-500';
              badgeClass = 'bg-yellow-100 text-yellow-950 border-yellow-300';
              badgeText = `Vence em ${days}d`;
            }

            const dueDayNum = bill.dueDate.split('-')[2];
            const isRecurringBill = Boolean(bill.recurringMonthly || bill.isRecurring || bill.recurrenceFrequency === 'mensal');

            return (
              <div
                key={bill.id}
                className={`bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-all p-3.5 sm:p-4 border-l-4 ${leftBorderClass} flex flex-col justify-between gap-3 ${
                  isPaid ? 'opacity-75 bg-neutral-50/70' : ''
                }`}
              >
                {/* Top Row: Title, Date Info & Top-Right Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-neutral-900 leading-tight truncate">
                        {bill.title}
                      </span>

                      {bill.installments && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                          {bill.installments.current}/{bill.installments.total}
                        </span>
                      )}

                      {isRecurringBill && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200/80 shrink-0 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5 text-neutral-500" />
                          <span>Recorrente</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-500 flex-wrap">
                      <span className="font-medium text-neutral-700">
                        Vence dia {dueDayNum} ({bill.dueDate.split('-').reverse().join('/')})
                      </span>
                      <span>•</span>
                      <span className="text-neutral-500">{bill.category}</span>
                      {bill.account && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] truncate">
                            {bill.account}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Right Status Tag */}
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-2xs ${badgeClass}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Amount & Action Buttons (Detalhes + Pagar) */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-0.5 gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                      Valor
                    </span>
                    <p className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
                      {formatCurrency(bill.amount)}
                    </p>
                  </div>

                  {/* Actions Group: Detalhar, Editar, Excluir, Pagar as Icons in the bottom right corner */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 1. Detalhar */}
                    <button
                      type="button"
                      onClick={() => setDetailModalBill(bill)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer flex items-center justify-center border border-neutral-200/80 shadow-2xs active:scale-95"
                      title="Ver Detalhes da Conta"
                      aria-label="Ver Detalhes da Conta"
                    >
                      <Info className="w-4 h-4 text-neutral-600" />
                    </button>

                    {/* 2. Editar */}
                    <button
                      type="button"
                      onClick={() => setEditingBill(bill)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-100 hover:bg-blue-50 text-neutral-600 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-center border border-neutral-200/80 shadow-2xs active:scale-95"
                      title="Editar Conta"
                      aria-label="Editar Conta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* 3. Excluir */}
                    <button
                      type="button"
                      onClick={() => setDeletingBill(bill)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer flex items-center justify-center border border-neutral-200/80 shadow-2xs active:scale-95"
                      title="Excluir Conta"
                      aria-label="Excluir Conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* 4. Pagar */}
                    {!isPaid ? (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(bill)}
                        disabled={isPayingId === bill.id}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-all shadow-xs cursor-pointer flex items-center justify-center active:scale-95 font-bold"
                        title="Pagar Conta"
                        aria-label="Pagar Conta"
                      >
                        <DollarSign className="w-4 h-4 font-bold" />
                      </button>
                    ) : (
                      <span
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs"
                        title="Conta Paga"
                        aria-label="Conta Paga"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Bill Details Modal */}
      {detailModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-neutral-900">
                    Detalhes do Vencimento
                  </h3>
                  <p className="text-[11px] text-neutral-500">Informações consolidadas da conta</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalBill(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Core Summary Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-neutral-900">{detailModalBill.title}</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border uppercase ${
                    detailModalBill.isPaid
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : getDaysUntilDue(detailModalBill.dueDate) < 0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : getDaysUntilDue(detailModalBill.dueDate) === 0
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {detailModalBill.isPaid
                    ? 'Pago'
                    : getDaysUntilDue(detailModalBill.dueDate) < 0
                    ? `Atrasada (${Math.abs(getDaysUntilDue(detailModalBill.dueDate))}d)`
                    : getDaysUntilDue(detailModalBill.dueDate) === 0
                    ? 'Vence Hoje'
                    : `A Vencer (${getDaysUntilDue(detailModalBill.dueDate)}d)`}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-neutral-500 font-semibold">Valor da Conta:</span>
                <span className="text-lg font-black text-emerald-700">
                  {formatCurrency(detailModalBill.amount)}
                </span>
              </div>
            </div>

            {/* Detailed Key-Value Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Data de Vencimento</span>
                <span className="font-bold text-neutral-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {detailModalBill.dueDate.split('-').reverse().join('/')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Categoria</span>
                <span className="font-bold text-neutral-800">{detailModalBill.category}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Banco / Conta Origem</span>
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  {detailModalBill.account || 'Não especificado'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Forma de Pagamento</span>
                <span className="font-bold text-neutral-800 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                  {detailModalBill.paymentMethod || 'Boleto'}
                </span>
              </div>
            </div>

            {/* Additional info badge: Recurrence or Installments */}
            {detailModalBill.installments ? (
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Compra Parcelada
                </span>
                <span className="font-extrabold text-indigo-800">
                  Parcela {detailModalBill.installments.current} de {detailModalBill.installments.total}
                </span>
              </div>
            ) : (detailModalBill.isRecurring || detailModalBill.recurringMonthly) ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5" /> Despesa Recorrente
                </span>
                <span className="font-extrabold text-emerald-800 uppercase">
                  Frequência: {detailModalBill.recurrenceFrequency || 'mensal'}
                </span>
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const billToEdit = detailModalBill;
                    setDetailModalBill(null);
                    setEditingBill(billToEdit);
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const billToDelete = detailModalBill;
                    setDetailModalBill(null);
                    setDeletingBill(billToDelete);
                  }}
                  className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>

              {!detailModalBill.isPaid && (
                <button
                  type="button"
                  onClick={() => {
                    const billToPay = detailModalBill;
                    setDetailModalBill(null);
                    openPaymentModal(billToPay);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pagar Agora</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Modal */}
      {paymentModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  💳
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Realizar Pagamento de Conta
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Escolha a conta bancária, parcelas e forma de pagamento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalBill(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Info Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">
                  {paymentModalBill.title}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                  Vencimento: {paymentModalBill.dueDate.split('-').reverse().join('/')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Categoria: <strong>{paymentModalBill.category}</strong></span>
                <span>Valor Unitário: <strong className="text-emerald-700">{formatCurrency(paymentModalBill.amount)}</strong></span>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Installments selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quantidade de Parcelas a Pagar Agora:
                </label>
                <select
                  value={payInstallmentCount}
                  onChange={(e) => setPayInstallmentCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[44px]"
                >
                  {paymentModalBill.installments ? (
                    Array.from(
                      { length: Math.max(1, paymentModalBill.installments.total - paymentModalBill.installments.current + 1) },
                      (_, i) => i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num} parcela(s) {num === 1 ? '(1x Padrão)' : `(${formatCurrency(paymentModalBill.amount * num)})`}
                      </option>
                    ))
                  ) : (
                    [1, 2, 3, 4, 6, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'parcela / ciclo (Padrão)' : `parcelas / ciclos (${formatCurrency(paymentModalBill.amount * num)})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Payment Method selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Forma de Pagamento:
                </label>
                <select
                  value={payPaymentMethod}
                  onChange={(e) => setPayPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[44px]"
                >
                  {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência Bancária', 'Dinheiro', 'Outro'].map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Account / Wallet selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-neutral-500" />
                    Qual Conta / Banco Usar para Pagamento:
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Atualiza Saldo</span>
                </label>
                <select
                  value={payAccountName}
                  onChange={(e) => setPayAccountName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[44px]"
                >
                  {accounts && accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name} (Saldo: {formatCurrency(acc.balance)})
                      </option>
                    ))
                  ) : (
                    ['Nubank', 'Itaú', 'Banco Inter', 'Bradesco', 'Carteira Dinheiro'].map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Total a Debitar de {payAccountName}:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatCurrency(paymentModalBill.amount * payInstallmentCount)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPaymentModalBill(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmPaymentModal}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pagamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                Editar Lembrete de Conta
              </h3>
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Nome da Conta</label>
                <input
                  type="text"
                  value={editingBill.title}
                  onChange={(e) => setEditingBill({ ...editingBill, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingBill.amount}
                    onChange={(e) =>
                      setEditingBill({ ...editingBill, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={editingBill.dueDate}
                    onChange={(e) => setEditingBill({ ...editingBill, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Categoria</label>
                <select
                  value={editingBill.category}
                  onChange={(e) => setEditingBill({ ...editingBill, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {['Moradia', 'Serviços & Contas', 'Alimentação', 'Saúde', 'Transporte', 'Lazer', 'Outros'].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-xs font-semibold text-neutral-700">Recorrente Mensal</span>
                <input
                  type="checkbox"
                  checked={Boolean(editingBill.recurringMonthly || editingBill.isRecurring)}
                  onChange={(e) =>
                    setEditingBill({
                      ...editingBill,
                      recurringMonthly: e.target.checked,
                      isRecurring: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="px-4 py-2 rounded-xl text-neutral-600 font-semibold hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = bills.map((b) => (b.id === editingBill.id ? editingBill : b));
                  saveBills(updated);
                  setEditingBill(null);
                  onShowToast(`Conta "${editingBill.title}" atualizada com sucesso!`);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingBill)}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleConfirmDeleteBill}
        title="Excluir Lembrete de Conta"
        itemName={deletingBill?.title}
        description={`Tem certeza de que deseja excluir o lembrete de conta "${
          deletingBill?.title
        }" no valor de R$ ${(deletingBill?.amount || 0).toFixed(2)}?`}
      />
    </div>
  );
});
