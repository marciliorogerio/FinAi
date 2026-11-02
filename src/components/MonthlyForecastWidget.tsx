import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Compass,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { FinancialTransaction, FinancialSummary } from '../types/finance.ts';

interface MonthlyForecastWidgetProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
}

export const MonthlyForecastWidget: React.FC<MonthlyForecastWidgetProps> = ({
  summary,
  transactions,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(0, totalDaysInMonth - currentDay);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Calculate current month's expenses and revenues
  const currentMonthTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const [y, m] = t.date.split('-').map(Number);
    return y === currentYear && (m || 1) - 1 === currentMonth;
  });

  const currentMonthExpenses = currentMonthTransactions
    .filter((t) => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthRevenues = currentMonthTransactions
    .filter((t) => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate last month's expenses
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const lastMonthTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const [y, m] = t.date.split('-').map(Number);
    return y === prevYear && (m || 1) - 1 === prevMonth;
  });

  const lastMonthExpenses = lastMonthTransactions
    .filter((t) => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  // Burn rate and projections
  const daysElapsed = Math.max(1, currentDay);
  const dailyBurnRate = currentMonthExpenses / daysElapsed;
  const projectedExtraExpenses = dailyBurnRate * daysRemaining;
  const projectedTotalExpenses = currentMonthExpenses + projectedExtraExpenses;
  const projectedFinalBalance = (currentMonthRevenues || summary.totalRevenues) - projectedTotalExpenses;

  // Comparison with last month
  const diffFromLastMonth =
    lastMonthExpenses > 0
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Projeção de Fim de Mês */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-5 border border-neutral-700 shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Projeção de Fim de Mês
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
            {daysRemaining} dias restantes
          </span>
        </div>

        <div className="space-y-2 my-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-400">Ritmo Diário Atual:</span>
            <span className="text-xs font-bold text-white">{formatCurrency(dailyBurnRate)} / dia</span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-400">Despesa Prevista:</span>
            <span className="text-xs font-bold text-rose-300">{formatCurrency(projectedTotalExpenses)}</span>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
            <span className="text-xs text-neutral-300 font-semibold">Saldo Final Estimado:</span>
            <span
              className={`text-lg sm:text-xl font-black ${
                projectedFinalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(projectedFinalBalance)}
            </span>
          </div>
        </div>

        <div className="mt-2 pt-2 text-[11px] text-neutral-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {projectedFinalBalance >= 0
              ? 'Mantendo o ritmo diário, você fechará o mês com superávit!'
              : 'Atenção: no ritmo atual há risco de fechar o mês no negativo.'}
          </span>
        </div>
      </div>

      {/* 2. Comparativo Mês a Mês */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Comparativo Mensal
            </span>
          </div>

          {lastMonthExpenses > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                diffFromLastMonth <= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {diffFromLastMonth <= 0 ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  {Math.abs(diffFromLastMonth).toFixed(0)}% menos gastos
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3" />
                  +{diffFromLastMonth.toFixed(0)}% gastos
                </>
              )}
            </span>
          )}
        </div>

        <div className="space-y-2.5 my-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Mês Atual (Até hoje):</span>
            <strong className="text-neutral-900 font-bold">{formatCurrency(currentMonthExpenses)}</strong>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Mês Anterior (Total):</span>
            <strong className="text-neutral-600 font-semibold">
              {lastMonthExpenses > 0 ? formatCurrency(lastMonthExpenses) : 'Sem registros'}
            </strong>
          </div>

          <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${
                currentMonthExpenses <= lastMonthExpenses || lastMonthExpenses === 0
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
              style={{
                width: `${
                  lastMonthExpenses > 0
                    ? Math.min((currentMonthExpenses / lastMonthExpenses) * 100, 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            {lastMonthExpenses > 0 && currentMonthExpenses < lastMonthExpenses
              ? `Economia acumulada de ${formatCurrency(lastMonthExpenses - currentMonthExpenses)} em relação ao mês anterior.`
              : 'Seus dados de despesas estão sendo comparados continuamente.'}
          </span>
        </div>
      </div>
    </div>
  );
};
