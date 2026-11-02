import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  Filter,
  FileSpreadsheet,
  Mic,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Tag,
  Calendar,
  Download,
  Printer,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  X,
  CreditCard,
  Database,
  Sparkles,
} from 'lucide-react';
import {
  FinancialSummary,
  FinancialTransaction,
  SpreadsheetInfo,
  BillReminder,
  AccountWallet,
} from '../types/finance.ts';
import { MonthlyForecastWidget } from './MonthlyForecastWidget.tsx';
import { BillRemindersPanel } from './BillRemindersPanel.tsx';
import { AccountsWalletsPanel } from './AccountsWalletsPanel.tsx';

interface DashboardViewProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
  accounts?: AccountWallet[];
  onUpdateAccounts?: (updated: AccountWallet[]) => void;
  spreadsheet?: SpreadsheetInfo | null;
  onOpenInput: (mode: 'voice' | 'receipt' | 'text') => void;
  onOpenImportStatement?: () => void;
  onPayBill?: (bill: BillReminder) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
  onRefreshData?: () => void;
  onDeleteTransaction?: (id: string) => void;
  onEditTransaction?: (transaction: FinancialTransaction) => void;
  onSyncAllPending?: () => void;
  isSyncingAll?: boolean;
}

const DEFAULT_BUDGETS: Record<string, number> = {
  Alimentação: 1500,
  Transporte: 600,
  Moradia: 2200,
  Saúde: 400,
  Lazer: 500,
  Educação: 600,
  Compras: 500,
  'Serviços & Contas': 400,
  Outros: 300,
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  transactions,
  accounts,
  onUpdateAccounts,
  spreadsheet,
  onOpenInput,
  onOpenImportStatement,
  onPayBill,
  onShowToast,
  onRefreshData,
  onDeleteTransaction,
  onEditTransaction,
  onSyncAllPending,
  isSyncingAll = false,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'despesa' | 'receita'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'last_30_days'>('all');

  // Budget management state
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('finai_category_budgets');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_BUDGETS;
  });
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);

  // Edit transaction modal state
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);

  // Delete confirmation
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const saveBudgets = (newBudgets: Record<string, number>) => {
    setCategoryBudgets(newBudgets);
    try {
      localStorage.setItem('finai_category_budgets', JSON.stringify(newBudgets));
    } catch {
      // ignore
    }
  };

  // Date filtering logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Period filter
      if (dateFilter !== 'all' && t.date) {
        const [y, m, d] = t.date.split('-').map(Number);
        const txDate = new Date(y, (m || 1) - 1, d || 1);

        if (dateFilter === 'this_month') {
          if (txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) {
            return false;
          }
        } else if (dateFilter === 'last_month') {
          const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
          if (
            txDate.getFullYear() !== prevMonthDate.getFullYear() ||
            txDate.getMonth() !== prevMonthDate.getMonth()
          ) {
            return false;
          }
        } else if (dateFilter === 'last_30_days') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (txDate < thirtyDaysAgo) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchMethod = t.paymentMethod.toLowerCase().includes(q);
        return matchDesc || matchCat || matchMethod;
      }
      return true;
    });
  }, [transactions, filterType, selectedCategory, dateFilter, searchQuery]);

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.category))).filter(Boolean);
  }, [transactions]);

  const pendingSyncCount = useMemo(() => {
    return transactions.filter((t) => !t.syncedToSupabase).length;
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Financial Health Score Calculation (0 - 100)
  const healthDiagnosis = useMemo(() => {
    const rev = summary.totalRevenues;
    const exp = summary.totalExpenses;
    if (rev <= 0 && exp <= 0) {
      return { score: 75, status: 'Sem Dados', color: 'emerald', message: 'Faça lançamentos para calcular sua nota.' };
    }

    let score = 50;
    const savingsRatio = rev > 0 ? (rev - exp) / rev : 0;
    if (savingsRatio >= 0.25) score += 35;
    else if (savingsRatio >= 0.15) score += 25;
    else if (savingsRatio >= 0.05) score += 15;
    else if (savingsRatio >= 0) score += 5;
    else score -= 30;

    const topCatExpense = Math.max(...Object.values(summary.expenseCategoryTotals), 0);
    if (exp > 0 && topCatExpense / exp > 0.55) {
      score -= 10;
    } else {
      score += 15;
    }

    score = Math.max(10, Math.min(100, Math.round(score)));

    let status = 'Excelente';
    let color = 'emerald';
    let message = 'Parabéns! Suas finanças estão controladas e você poupa mais de 20% do que ganha.';

    if (score < 40) {
      status = 'Crítico';
      color = 'rose';
      message = 'Alerta: seus gastos estão superando suas receitas. Priorize cortar despesas não essenciais.';
    } else if (score < 70) {
      status = 'Atenção';
      color = 'amber';
      message = 'Sua taxa de poupança está apertada. Busque reduzir despesas nas maiores categorias.';
    }

    return { score, status, color, message };
  }, [summary]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Forma de Pagamento', 'Valor (R$)', 'Backend Supabase', 'Notas'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type === 'despesa' ? 'Despesa' : 'Receita',
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.paymentMethod}"`,
      t.amount.toFixed(2).replace('.', ','),
      t.syncedToSupabase ? 'Supabase (Nuvem)' : 'Local',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extrato_finai_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Statement
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner indicating Cloud status */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sincronização em Tempo Real Ativa
            </span>
          </div>
          <h3 className="font-bold text-base sm:text-lg text-white">
            Suas Finanças Sempre Atualizadas
          </h3>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 max-w-xl">
            Todos os seus lançamentos e análises ficam salvos na nuvem com segurança máxima e alta velocidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onOpenImportStatement && (
            <button
              type="button"
              onClick={onOpenImportStatement}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer min-h-[44px] touch-manipulation"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Importar Extrato</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenInput('voice')}
            className="flex-1 sm:flex-initial text-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all shrink-0 cursor-pointer min-h-[44px] flex items-center justify-center touch-manipulation"
          >
            Fazer Novo Lançamento
          </button>
        </div>
      </div>

      {/* Quick Access Bar & Shortcuts */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-neutral-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Acesso Rápido:</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenImportStatement && (
            <button
              type="button"
              onClick={onOpenImportStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[36px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar Extrato (OFX/CSV)</span>
            </button>
          )}

          <a
            href="#section-bills"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[36px]"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Contas a Pagar</span>
          </a>

          <a
            href="#section-accounts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[36px]"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Bancos & Carteiras</span>
          </a>

          <a
            href="#section-forecast"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[36px]"
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>Previsão do Mês</span>
          </a>
        </div>
      </div>

      {/* KPI Cards (Responsive 2x2 on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Saldo Líquido */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Saldo</span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                summary.totalBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className={`text-base sm:text-2xl font-bold tracking-tight truncate ${
              summary.totalBalance >= 0 ? 'text-neutral-900' : 'text-rose-600'
            }`}>
              {formatCurrency(summary.totalBalance)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-medium">
              <span
                className={`px-1.5 py-0.5 rounded-md ${
                  summary.totalBalance >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {summary.totalBalance >= 0 ? 'Positivo' : 'Déficit'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Receitas */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Receitas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-bold text-emerald-600 tracking-tight truncate">
              {formatCurrency(summary.totalRevenues)}
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-500 mt-1 truncate">
              {transactions.filter((t) => t.type === 'receita').length} entrada(s)
            </div>
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Despesas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-bold text-rose-600 tracking-tight truncate">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-500 mt-1 truncate">
              {transactions.filter((t) => t.type === 'despesa').length} gasto(s)
            </div>
          </div>
        </div>

        {/* Saúde Financeira & Poupança */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Saúde</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {healthDiagnosis.score}
              </span>
              <span className="text-[10px] sm:text-xs text-neutral-400 font-semibold">/100</span>
              <span
                className={`ml-auto text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  healthDiagnosis.color === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700'
                    : healthDiagnosis.color === 'amber'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {healthDiagnosis.status}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-500 mt-1 truncate">
              Poupança: <strong>{summary.savingsRate > 0 ? `${summary.savingsRate.toFixed(1)}%` : '0%'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Projeção de Fim de Mês & Comparativo Mensal */}
      <div id="section-forecast" className="scroll-mt-20">
        <MonthlyForecastWidget summary={summary} transactions={transactions} />
      </div>

      {/* Contas a Pagar & Lembretes de Vencimento */}
      {onPayBill && onShowToast && (
        <div id="section-bills" className="scroll-mt-20">
          <BillRemindersPanel onPayBill={onPayBill} onShowToast={onShowToast} />
        </div>
      )}

      {/* Multi-Contas & Carteiras */}
      {accounts && onUpdateAccounts && onShowToast && (
        <div id="section-accounts" className="scroll-mt-20">
          <AccountsWalletsPanel accounts={accounts} onUpdateAccounts={onUpdateAccounts} onShowToast={onShowToast} />
        </div>
      )}

      {/* Grid: Category Budgets + Fast Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Expenses by Category with Budgets */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>Orçamento por Categoria</span>
                <span className="text-xs font-normal text-neutral-500">
                  ({formatCurrency(summary.totalExpenses)})
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
                Consumo do teto mensal estipulado para cada área.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingBudgets(!isEditingBudgets)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditingBudgets ? 'Concluir' : 'Ajustar Metas'}</span>
            </button>
          </div>

          {Object.keys(summary.expenseCategoryTotals).length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs">
              Nenhuma despesa lançada para calcular categorias.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary.expenseCategoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([catName, totalAmount]) => {
                  const budgetLimit = categoryBudgets[catName] || 1000;
                  const percentageOfBudget = Math.round((totalAmount / budgetLimit) * 100);
                  const isOverBudget = totalAmount > budgetLimit;
                  const isNearBudget = !isOverBudget && percentageOfBudget >= 80;

                  return (
                    <div key={catName} className="space-y-1.5 p-2 rounded-xl hover:bg-neutral-50/70 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-neutral-900 truncate">{catName}</span>
                          {isOverBudget && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 rounded shrink-0">
                              Excedido
                            </span>
                          )}
                        </div>

                        <div className="text-neutral-600 text-right shrink-0">
                          <span className="font-bold text-neutral-900">{formatCurrency(totalAmount)}</span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span className="text-neutral-500 font-medium">{formatCurrency(budgetLimit)}</span>
                          <span className="ml-1 text-[11px] font-semibold text-neutral-400">
                            ({percentageOfBudget}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(percentageOfBudget, 100)}%` }}
                        />
                      </div>

                      {/* Quick editor if editing mode is active */}
                      {isEditingBudgets && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-neutral-500">Teto R$:</span>
                          <input
                            type="number"
                            min="50"
                            step="50"
                            value={categoryBudgets[catName] || 1000}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              saveBudgets({ ...categoryBudgets, [catName]: val });
                            }}
                            className="w-24 px-2 py-1 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Quick Launchpad & Status Box */}
        <div className="bg-neutral-50/70 rounded-2xl p-4 sm:p-6 border border-neutral-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                Lançar Dados
              </h3>
              {pendingSyncCount > 0 && onSyncAllPending && (
                <button
                  type="button"
                  onClick={onSyncAllPending}
                  disabled={isSyncingAll}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[36px]"
                  title="Gravar lançamentos locais na planilha do Google"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>Sincronizar ({pendingSyncCount})</span>
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Escolha seu método favorito para cadastrar receitas e despesas.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onOpenInput('voice')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-neutral-100/80 border border-neutral-200 text-neutral-800 transition-all cursor-pointer group shadow-2xs min-h-[52px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-neutral-900">Gravar Áudio</div>
                    <div className="text-[11px] text-neutral-500">"Almoço 35 reais no PIX"</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onOpenInput('receipt')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-neutral-100/80 border border-neutral-200 text-neutral-800 transition-all cursor-pointer group shadow-2xs min-h-[52px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-neutral-900">Foto de Nota Fiscal</div>
                    <div className="text-[11px] text-neutral-500">Câmera e Leitura OCR</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onOpenInput('text')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-neutral-100/80 border border-neutral-200 text-neutral-800 transition-all cursor-pointer group shadow-2xs min-h-[52px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-neutral-900">Digitar em Texto</div>
                    <div className="text-[11px] text-neutral-500">Lançamento instantâneo</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span className="truncate max-w-[160px]">
                {spreadsheet ? spreadsheet.name : 'Modo Local'}
              </span>
              {spreadsheet ? (
                <a
                  href={spreadsheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                >
                  <span>Abrir Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[11px] text-amber-700 font-semibold">Sem planilha</span>
              )}
            </div>

            {onRefreshData && spreadsheet && (
              <button
                type="button"
                onClick={onRefreshData}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer min-h-[40px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Dados</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Section (Mobile Card List + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {/* Table Controls & Filter Bar */}
        <div className="p-3 sm:p-5 border-b border-neutral-200/80 space-y-2.5">
          {/* Top row: Type Selector & Period */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  filterType === 'all'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Todos ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('despesa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  filterType === 'despesa'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Despesas
              </button>
              <button
                type="button"
                onClick={() => setFilterType('receita')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  filterType === 'receita'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Receitas
              </button>
            </div>

            {/* Export and Print Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs min-h-[36px]"
                title="Exportar CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs min-h-[36px]"
                title="Imprimir"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Search + Period + Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar lançamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Period Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[40px]"
              >
                <option value="all">Todo o Período</option>
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Anterior</option>
                <option value="last_30_days">Últimos 30 Dias</option>
              </select>

              {/* Category Dropdown */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[40px]"
                >
                  <option value="all">Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredTransactions.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400 mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-800">Nenhum lançamento encontrado</h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Experimente ajustar os filtros ou faça um novo lançamento por áudio ou foto de nota fiscal.
            </p>
          </div>
        ) : (
          <>
            {/* 1. MOBILE TOUCH CARD LIST (Active on phones < md) */}
            <div className="block md:hidden divide-y divide-neutral-100">
              {filteredTransactions.map((tx) => {
                const isExp = tx.type === 'despesa';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 hover:bg-neutral-50 active:bg-neutral-100/70 transition-colors flex items-start gap-3"
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isExp ? (
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.3]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.3]" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-neutral-900 truncate">
                          {tx.description}
                        </span>
                        <span className={`font-bold text-sm shrink-0 ${isExp ? 'text-neutral-900' : 'text-emerald-600'}`}>
                          {isExp ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-500">
                        <span className="font-medium text-neutral-700">{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                          {tx.category}
                        </span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[90px]">{tx.paymentMethod}</span>
                          </>
                        )}
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-neutral-400 truncate mt-1 italic">
                          {tx.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-100">
                        {tx.syncedToSupabase ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            Local
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTxId(tx.id)}
                            className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. DESKTOP FULL TABLE (Active on tablets & laptops md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {filteredTransactions.map((tx) => {
                    const isExp = tx.type === 'despesa';

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-neutral-50/80 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-medium text-neutral-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{formatDate(tx.date)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {isExp ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {tx.description}
                              </span>
                              {tx.notes && (
                                <span className="text-[11px] text-neutral-400 truncate max-w-xs block">
                                  {tx.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium text-[11px] border border-neutral-200/50">
                            {tx.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                          {tx.paymentMethod || '—'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold">
                          <span className={isExp ? 'text-neutral-900' : 'text-emerald-600'}>
                            {isExp ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {tx.syncedToSupabase ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200/60">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                              Local
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingTx(tx)}
                              title="Editar lançamento"
                              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTxId(tx.id)}
                              title="Excluir lançamento"
                              className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Edit Transaction Modal (Responsive Bottom Sheet / Modal) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-neutral-200 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-1 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">Editar Lançamento</h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm flex-1">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx({ ...editingTx, type: 'despesa' })}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer border min-h-[44px] touch-manipulation ${
                      editingTx.type === 'despesa'
                        ? 'bg-rose-500 text-white border-rose-600'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTx({ ...editingTx, type: 'receita' })}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer border min-h-[44px] touch-manipulation ${
                      editingTx.type === 'receita'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-base sm:text-sm min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTx.amount}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, amount: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-base sm:text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-base sm:text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-base sm:text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pagamento</label>
                  <input
                    type="text"
                    value={editingTx.paymentMethod}
                    onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-base sm:text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={editingTx.notes || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="w-full sm:flex-1 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs sm:text-sm cursor-pointer min-h-[48px] touch-manipulation"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onEditTransaction && editingTx) {
                    onEditTransaction(editingTx);
                  }
                  setEditingTx(null);
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs min-h-[48px] touch-manipulation"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTxId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-1 sm:hidden shrink-0 mb-3" />

            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 mb-1">Excluir Lançamento?</h3>
            <p className="text-xs text-neutral-600 mb-5">
              Esta ação removerá este item do seu histórico e da planilha do Google Sheets.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setDeletingTxId(null)}
                className="w-full sm:flex-1 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold cursor-pointer min-h-[48px] touch-manipulation"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTransaction && deletingTxId) {
                    onDeleteTransaction(deletingTxId);
                  }
                  setDeletingTxId(null);
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-xs min-h-[48px] touch-manipulation"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
