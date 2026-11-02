import React, { useState, useEffect } from 'react';
import {
  Target,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Plus,
  ShieldCheck,
  Compass,
  Sparkles,
  Edit3,
  Edit2,
  Trash2,
  Check,
  X,
  CloudCheck,
  ArrowRight,
  PieChart as PieChartIcon,
  Flame,
} from 'lucide-react';
import { FinancialSummary, FinancialTransaction, SavingsGoal } from '../types/finance.ts';
import { fetchGoalsFromSupabase, saveGoalsToSupabase, deleteGoalFromSupabase } from '../services/supabase.ts';
import { FinancialCharts } from './FinancialCharts.tsx';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.tsx';

interface PlanningViewProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
  categoryBudgets: Record<string, number>;
  userId?: string;
  onUpdateBudget: (category: string, newLimit: number) => Promise<void>;
  onDeleteBudget?: (category: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
  onOpenInput: () => void;
}

const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Reserva de Emergência (6 meses)',
    targetAmount: 18000,
    currentAmount: 8500,
    deadline: 'Dez 2026',
    category: 'emergencia',
  },
  {
    id: 'goal-2',
    title: 'Viagem de Férias',
    targetAmount: 5000,
    currentAmount: 2800,
    deadline: 'Jul 2026',
    category: 'sonho',
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Alimentação: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  'Cartão de Crédito': { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-600' },
  Transporte: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  Moradia: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  Saúde: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  Lazer: { bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-500' },
  Educação: { bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  Compras: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  'Serviços & Contas': { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
  Outros: { bg: 'bg-neutral-100', text: 'text-neutral-700', bar: 'bg-neutral-500' },
};

export const PlanningView: React.FC<PlanningViewProps> = ({
  summary,
  transactions,
  categoryBudgets,
  userId,
  onUpdateBudget,
  onDeleteBudget,
  onShowToast,
  onOpenInput,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // New category creation
  const STANDARD_CATEGORIES = [
    'Alimentação',
    'Cartão de Crédito',
    'Transporte',
    'Moradia',
    'Saúde',
    'Lazer',
    'Educação',
    'Compras',
    'Serviços & Contas',
    'Investimentos',
    'Outros',
    'Outra (Personalizada)',
  ];

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCategorySelect, setSelectedCategorySelect] = useState('Alimentação');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');

  // Savings goals state isolated by user
  const goalsStorageKey = userId ? `finai_savings_goals_${userId}` : 'finai_savings_goals';
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(goalsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Keep goals in sync when user changes
  useEffect(() => {
    (async () => {
      let loaded: SavingsGoal[] = [];
      try {
        loaded = await fetchGoalsFromSupabase(userId);
      } catch {
        loaded = [];
      }

      if (loaded.length === 0) {
        try {
          const saved = localStorage.getItem(goalsStorageKey);
          if (saved) {
            loaded = JSON.parse(saved);
          }
        } catch {
          // ignore
        }
      }

      setGoals(loaded);
    })();
  }, [goalsStorageKey, userId]);

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<string>('sonho');

  // Editing existing goal deposit
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Delete confirmation modals state
  const [deletingCategoryBudget, setDeletingCategoryBudget] = useState<string | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);

  const handleConfirmDeleteCategoryBudget = async () => {
    if (deletingCategoryBudget) {
      await handleDeleteCategoryBudget(deletingCategoryBudget);
      setDeletingCategoryBudget(null);
    }
  };

  const handleConfirmDeleteGoal = async () => {
    if (deletingGoal) {
      await handleDeleteGoal(deletingGoal.id);
      setDeletingGoal(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Calculations
  const totalBudgeted = Object.values(categoryBudgets).reduce((acc, v) => acc + (v || 0), 0);
  const totalSpent = summary.totalExpenses || 0;
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const remainingBudget = totalBudgeted - totalSpent;

  // 50/30/20 Rule Analysis
  const hasIncomeOrExpense = summary.totalRevenues > 0 || totalSpent > 0;
  const effectiveIncome = Math.max(summary.totalRevenues, totalSpent, 0);
  const needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Serviços & Contas'];
  const wantsCategories = ['Lazer', 'Compras', 'Outros'];

  const actualNeedsSpent = Object.entries(summary.expenseCategoryTotals || {}).reduce(
    (sum, [cat, val]) => (needsCategories.includes(cat) ? sum + val : sum),
    0
  );
  const actualWantsSpent = Object.entries(summary.expenseCategoryTotals || {}).reduce(
    (sum, [cat, val]) => (wantsCategories.includes(cat) ? sum + val : sum),
    0
  );

  const idealNeeds = effectiveIncome * 0.5;
  const idealWants = effectiveIncome * 0.3;
  const idealSavings = effectiveIncome * 0.2;

  const handleStartEdit = (category: string, currentVal: number) => {
    setEditingCategory(category);
    setEditValue(currentVal.toString());
  };

  const handleSaveEdit = async (category: string) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      onShowToast('Informe um valor de teto válido', 'error');
      return;
    }

    try {
      setIsSavingBudget(true);
      await onUpdateBudget(category, num);
      setEditingCategory(null);
      onShowToast(`Meta de ${category} atualizada para ${formatCurrency(num)}!`);
    } catch (e: any) {
      onShowToast(e.message || 'Erro ao salvar meta', 'error');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleDeleteCategoryBudget = async (category: string) => {
    if (onDeleteBudget) {
      await onDeleteBudget(category);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategoryName =
      selectedCategorySelect === 'Outra (Personalizada)'
        ? customCategoryName.trim()
        : selectedCategorySelect.trim();

    if (!finalCategoryName) {
      onShowToast('Informe ou selecione a categoria', 'error');
      return;
    }
    const limit = parseFloat(newCategoryLimit);
    if (isNaN(limit) || limit <= 0) {
      onShowToast('Informe um limite mensal válido', 'error');
      return;
    }

    try {
      setIsSavingBudget(true);
      await onUpdateBudget(finalCategoryName, limit);
      setSelectedCategorySelect('Alimentação');
      setCustomCategoryName('');
      setNewCategoryLimit('');
      setIsAddingCategory(false);
      onShowToast(`Categoria "${finalCategoryName}" adicionada com meta de ${formatCurrency(limit)}!`);
    } catch (e: any) {
      onShowToast(e.message || 'Erro ao criar categoria', 'error');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    const target = parseFloat(newGoalTarget);
    const current = parseFloat(newGoalCurrent) || 0;
    if (isNaN(target) || target <= 0) {
      onShowToast('Informe um valor alvo válido', 'error');
      return;
    }

    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: newGoalDeadline.trim() || undefined,
      category: newGoalCategory,
    };

    const updated = [...goals, newGoal];
    setGoals(updated);
    localStorage.setItem(goalsStorageKey, JSON.stringify(updated));
    saveGoalsToSupabase(updated, userId);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setNewGoalDeadline('');
    setNewGoalCategory('sonho');
    setIsAddingGoal(false);
    onShowToast(`Objetivo "${newGoal.title}" criado com sucesso!`);
  };

  const handleSaveGoalEdit = (edited: SavingsGoal) => {
    const updated = goals.map((g) => (g.id === edited.id ? edited : g));
    setGoals(updated);
    localStorage.setItem(goalsStorageKey, JSON.stringify(updated));
    saveGoalsToSupabase(updated, userId);
    setEditingGoal(null);
    onShowToast(`Objetivo "${edited.title}" atualizado!`);
  };

  const handleDepositToGoal = (goalId: string) => {
    const add = parseFloat(depositAmount);
    if (isNaN(add) || add <= 0) {
      onShowToast('Informe um valor de aporte válido', 'error');
      return;
    }

    const updated = goals.map((g) => {
      if (g.id === goalId) {
        return { ...g, currentAmount: g.currentAmount + add };
      }
      return g;
    });

    setGoals(updated);
    localStorage.setItem(goalsStorageKey, JSON.stringify(updated));
    saveGoalsToSupabase(updated, userId);
    setDepositGoalId(null);
    setDepositAmount('');
    onShowToast(`Aporte de ${formatCurrency(add)} registrado com sucesso!`);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    setGoals(updated);
    localStorage.setItem(goalsStorageKey, JSON.stringify(updated));
    saveGoalsToSupabase(updated, userId);
    await deleteGoalFromSupabase(goalId);
    onShowToast('Objetivo removido.');
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-12 max-w-7xl mx-auto">
      {/* Hero Overview Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-neutral-900 to-teal-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-neutral-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Target className="w-3.5 h-3.5" />
              <span>Planejamento & Metas Mensais</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Seu Orçamento do Mês
            </h2>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-xl">
              Monitore os tetos de gastos que você definiu e mantenha suas finanças sob controle
              com dados salvos com segurança em tempo real.
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-4 shrink-0">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
                {totalBudgeted === 0
                  ? 'Teto Orçamentário'
                  : remainingBudget >= 0
                  ? 'Disponível no Teto'
                  : 'Estouro do Orçamento'}
              </p>
              <p
                className={`text-xl sm:text-2xl font-black ${
                  totalBudgeted === 0
                    ? 'text-neutral-300'
                    : remainingBudget >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {totalBudgeted === 0 ? 'Não definido' : formatCurrency(Math.abs(remainingBudget))}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                totalBudgeted === 0
                  ? 'bg-white/10 text-neutral-300'
                  : remainingBudget >= 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {totalBudgeted === 0 ? (
                <Target className="w-6 h-6" />
              ) : remainingBudget >= 0 ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 font-medium">
            <span className="text-neutral-300">
              Gasto total:{' '}
              <strong className="text-white font-bold">{formatCurrency(totalSpent)}</strong>
              {totalBudgeted > 0 && (
                <>
                  {' '}de{' '}
                  <strong className="text-emerald-400 font-bold">{formatCurrency(totalBudgeted)}</strong>
                </>
              )}
            </span>
            {totalBudgeted > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  overallPercentage <= 80
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : overallPercentage <= 100
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {overallPercentage.toFixed(0)}% consumido
              </span>
            )}
          </div>
          {totalBudgeted > 0 && (
            <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallPercentage <= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : overallPercentage <= 100
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                    : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Recharts: Expense Distribution PieChart & Monthly Evolution BarChart */}
      <FinancialCharts summary={summary} transactions={transactions} />

      {/* Grid: Category Budgets (Main) + 50/30/20 Distribution (Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Spending Limits (Col Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <span>Limites por Categoria</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Clique no valor para personalizar o limite mensal de cada área.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px] touch-manipulation self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingCategory ? 'Fechar' : 'Nova Categoria'}</span>
              </button>
            </div>

            {/* Inline Add Category Form */}
            {isAddingCategory && (
              <form
                onSubmit={handleCreateCategory}
                className="mb-5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 animate-in fade-in duration-150 space-y-3"
              >
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Criar Nova Categoria com Limite
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Categoria
                    </label>
                    <select
                      value={selectedCategorySelect}
                      onChange={(e) => setSelectedCategorySelect(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-neutral-800 cursor-pointer"
                    >
                      {STANDARD_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {selectedCategorySelect === 'Outra (Personalizada)' && (
                      <input
                        type="text"
                        placeholder="Digite o nome da categoria personalizada..."
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Limite Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="10"
                      placeholder="Ex: 250"
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-3 py-1.5 rounded-lg text-neutral-600 text-xs font-semibold hover:bg-neutral-200/60 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBudget}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs"
                  >
                    Salvar Categoria
                  </button>
                </div>
              </form>
            )}

            {/* Categories List */}
            {Object.entries(categoryBudgets).length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50/80 rounded-2xl border border-dashed border-neutral-200 space-y-3">
                <Sliders className="w-8 h-8 text-neutral-400 mx-auto" />
                <div>
                  <p className="font-bold text-neutral-800 text-sm">Nenhum teto de categoria cadastrado</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 max-w-sm mx-auto">
                    Defina limites mensais para controlar seus gastos em alimentação, moradia, transporte e mais.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setSelectedCategorySelect(sug);
                        setIsAddingCategory(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200 hover:border-emerald-500 hover:text-emerald-700 text-neutral-700 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {Object.entries(categoryBudgets).map(([cat, limit]) => {
                  const spent = summary.expenseCategoryTotals[cat] || 0;
                  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                  const remaining = limit - spent;
                  const isOver = remaining < 0;
                  const colorConfig = CATEGORY_COLORS[cat] || {
                    bg: 'bg-neutral-100',
                    text: 'text-neutral-700',
                    bar: 'bg-neutral-500',
                  };
                  const isEditing = editingCategory === cat;

                  return (
                    <div
                      key={cat}
                      className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/70 hover:border-neutral-300 transition-all bg-neutral-50/50 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${colorConfig.bg} ${colorConfig.text}`}
                          >
                            {cat}
                          </span>
                          <div className="truncate">
                            <span className="text-xs text-neutral-500">
                              Gasto: <strong className="text-neutral-900 font-bold">{formatCurrency(spent)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Right limit controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-neutral-500 font-semibold">R$</span>
                              <input
                                type="number"
                                step="50"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-900"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(cat)}
                                disabled={isSavingBudget}
                                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                                title="Confirmar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="p-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(cat, limit)}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-neutral-200/60 transition-colors text-right cursor-pointer"
                                title="Clique para editar teto"
                              >
                                <span className="text-xs font-bold text-neutral-800">
                                  Meta: {formatCurrency(limit)}
                                </span>
                                <Edit3 className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingCategoryBudget(cat)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir teto da categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar & Indicators */}
                      <div className="space-y-1.5">
                        <div className="w-full h-2 rounded-full bg-neutral-200/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentage > 100
                                ? 'bg-rose-500'
                                : percentage > 85
                                ? 'bg-amber-500'
                                : colorConfig.bar
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
                          <span
                            className={
                              isOver ? 'text-rose-600 font-bold' : percentage > 80 ? 'text-amber-600 font-semibold' : ''
                            }
                          >
                            {isOver
                              ? `Estouro de ${formatCurrency(Math.abs(remaining))}`
                              : `Resta ${formatCurrency(remaining)}`}
                          </span>
                          <span
                            className={`font-semibold ${
                              isOver ? 'text-rose-600' : percentage > 80 ? 'text-amber-600' : 'text-neutral-600'
                            }`}
                          >
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: 50-30-20 Rule + Savings Goals */}
        <div className="space-y-6">
          {/* 50-30-20 Rule Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Método 50 / 30 / 20</h4>
                <p className="text-[11px] text-neutral-500">Equilíbrio financeiro saudável</p>
              </div>
            </div>

            {!hasIncomeOrExpense ? (
              <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 text-center text-xs text-neutral-400 mt-4 space-y-1">
                <p className="font-semibold text-neutral-700">Sem movimentações suficientes</p>
                <p className="text-[11px] text-neutral-500">
                  Adicione receitas e despesas para ver a divisão ideal de 50% necessidades, 30% desejos e 20% poupança calculada para você.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 mt-4">
                {/* Necessidades 50% */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-neutral-800">Necessidades (50%)</span>
                    <span className="text-[11px] text-neutral-500">Ideal: {formatCurrency(idealNeeds)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-semibold text-neutral-600">
                      Gasto Real: <strong>{formatCurrency(actualNeedsSpent)}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        actualNeedsSpent <= idealNeeds
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {effectiveIncome > 0
                        ? `${((actualNeedsSpent / effectiveIncome) * 100).toFixed(0)}% da receita`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        actualNeedsSpent <= idealNeeds ? 'bg-indigo-500' : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${idealNeeds > 0 ? Math.min((actualNeedsSpent / idealNeeds) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Desejos 30% */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-neutral-800">Estilo & Desejos (30%)</span>
                    <span className="text-[11px] text-neutral-500">Ideal: {formatCurrency(idealWants)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-semibold text-neutral-600">
                      Gasto Real: <strong>{formatCurrency(actualWantsSpent)}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        actualWantsSpent <= idealWants
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {effectiveIncome > 0
                        ? `${((actualWantsSpent / effectiveIncome) * 100).toFixed(0)}% da receita`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        actualWantsSpent <= idealWants ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${idealWants > 0 ? Math.min((actualWantsSpent / idealWants) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Poupança 20% */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-neutral-800">Futuro & Poupança (20%)</span>
                    <span className="text-[11px] text-neutral-500">Ideal: {formatCurrency(idealSavings)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-semibold text-neutral-600">
                      Sua taxa atual: <strong>{summary.savingsRate > 0 ? `${summary.savingsRate.toFixed(1)}%` : '0%'}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        summary.savingsRate >= 20
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {summary.savingsRate >= 20 ? 'Excelente' : 'A evoluir'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min((summary.savingsRate / 20) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Savings Goals / Cofrinhos */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Metas & Objetivos</h4>
                  <p className="text-[11px] text-neutral-500">Seus sonhos e reserva</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingGoal(!isAddingGoal)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                title="Novo objetivo"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add Goal Form */}
            {isAddingGoal && (
              <form
                onSubmit={handleAddGoal}
                className="mb-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5 animate-in fade-in duration-150"
              >
                <input
                  type="text"
                  placeholder="Nome do objetivo (ex: Trocar de Carro)"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Valor Alvo (R$)"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Já guardado (R$)"
                    value={newGoalCurrent}
                    onChange={(e) => setNewGoalCurrent(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Prazo (ex: Dez 2026)"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="emergencia">🛡️ Emergência</option>
                    <option value="sonho">✈️ Sonho / Viagem</option>
                    <option value="investimento">📈 Investimentos</option>
                    <option value="veiculo">🚗 Veículo</option>
                    <option value="imovel">🏠 Imóvel</option>
                    <option value="educacao">🎓 Educação</option>
                    <option value="outros">🎯 Outros</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(false)}
                    className="px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            )}

            {/* Goals List */}
            <div className="space-y-3">
              {goals.map((g) => {
                const prog = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                const isDepositing = depositGoalId === g.id;

                const categoryLabels: Record<string, string> = {
                  emergencia: '🛡️ Emergência',
                  sonho: '✈️ Viagem / Sonho',
                  investimento: '📈 Investimento',
                  veiculo: '🚗 Veículo',
                  imovel: '🏠 Imóvel',
                  educacao: '🎓 Educação',
                  outros: '🎯 Outros',
                };

                return (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl border border-neutral-200/70 bg-neutral-50/40 hover:bg-white transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 inline-block">
                          {categoryLabels[g.category] || g.category || '🎯 Objetivo'}
                        </span>
                        <p className="text-xs font-bold text-neutral-900 truncate">{g.title}</p>
                        {g.deadline && (
                          <p className="text-[10px] text-neutral-400">Meta: {g.deadline}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingGoal(g)}
                          className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                          title="Editar objetivo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGoal(g)}
                          className="text-neutral-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remover objetivo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-extrabold text-neutral-900">
                        {formatCurrency(g.currentAmount)}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        de {formatCurrency(g.targetAmount)}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${Math.min(prog, 100)}%` }}
                      />
                    </div>

                    {/* Deposit inline input */}
                    {isDepositing ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-xs text-neutral-500 font-semibold">+ R$</span>
                        <input
                          type="number"
                          placeholder="Valor"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-24 px-2 py-1 text-xs rounded-lg border border-emerald-400 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleDepositToGoal(g.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositGoalId(null)}
                          className="px-1.5 py-1 text-neutral-400 hover:text-neutral-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDepositGoalId(g.id);
                          setDepositAmount('');
                        }}
                        className="w-full py-1 text-center rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-[11px] font-semibold text-emerald-700 transition-colors cursor-pointer"
                      >
                        + Registrar Aporte
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                Editar Objetivo / Meta
              </h3>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Nome do Objetivo
                </label>
                <input
                  type="text"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={editingGoal.targetAmount}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        targetAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Já Salvo (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={editingGoal.currentAmount}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        currentAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Prazo / Data
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dez 2026"
                    value={editingGoal.deadline || ''}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, deadline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Categoria
                  </label>
                  <select
                    value={editingGoal.category}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="emergencia">🛡️ Emergência</option>
                    <option value="sonho">✈️ Sonho / Viagem</option>
                    <option value="investimento">📈 Investimentos</option>
                    <option value="veiculo">🚗 Veículo</option>
                    <option value="imovel">🏠 Imóvel</option>
                    <option value="educacao">🎓 Educação</option>
                    <option value="outros">🎯 Outros</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2 rounded-xl text-neutral-600 font-semibold hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveGoalEdit(editingGoal)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Persistence Guarantee Footnote */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between gap-3 text-emerald-800 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Armazenamento Seguro em Nuvem:</strong> Seus orçamentos e objetivos são
            sincronizados e preservados na nuvem.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenInput}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap cursor-pointer"
        >
          Lançar despesa agora →
        </button>
      </div>

      {/* Delete Category Budget Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingCategoryBudget)}
        onClose={() => setDeletingCategoryBudget(null)}
        onConfirm={handleConfirmDeleteCategoryBudget}
        title="Excluir Teto de Categoria"
        itemName={deletingCategoryBudget || undefined}
        description={`Tem certeza de que deseja remover o teto de gastos definido para a categoria "${deletingCategoryBudget}"?`}
      />

      {/* Delete Savings Goal Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingGoal)}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleConfirmDeleteGoal}
        title="Excluir Objetivo / Meta"
        itemName={deletingGoal?.title}
        description={`Tem certeza de que deseja excluir o objetivo "${
          deletingGoal?.title
        }" no valor de R$ ${(deletingGoal?.targetAmount || 0).toFixed(2)}?`}
      />
    </div>
  );
};
