import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { FinancialSummary, FinancialTransaction, BillReminder } from '../types/finance.ts';
import { PieChart as PieChartIcon, BarChart3, Layers, CheckCircle2 } from 'lucide-react';

interface FinancialChartsProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
  bills?: BillReminder[];
}

const COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#64748b', // slate-500
];

export const FinancialCharts: React.FC<FinancialChartsProps> = React.memo(({
  summary,
  transactions,
  bills = [],
}) => {
  const [expenseViewMode, setExpenseViewMode] = React.useState<'all' | 'realized'>('all');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  // 1. Pie chart data: Expenses by Category (Realized only OR Realized + Pending Bills)
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    // 1. Add realized expenses
    Object.entries(summary.expenseCategoryTotals || {}).forEach(([cat, val]) => {
      const c = cat.trim() || 'Outros';
      categoryTotals[c] = (categoryTotals[c] || 0) + (Number(val) || 0);
    });

    // 2. If 'all', also add pending bills
    if (expenseViewMode === 'all' && bills && bills.length > 0) {
      bills
        .filter((b) => !b.isPaid)
        .forEach((b) => {
          const c = (b.category || 'Outros').trim();
          categoryTotals[c] = (categoryTotals[c] || 0) + (Number(b.amount) || 0);
        });
    }

    const entries = Object.entries(categoryTotals)
      .filter(([, amount]) => amount > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    const total = entries.reduce((sum, item) => sum + item.value, 0);

    return { entries, total };
  }, [summary.expenseCategoryTotals, bills, expenseViewMode]);

  // 2. Bar chart data: Monthly Evolution (Revenues vs Expenses)
  const monthlyData = useMemo(() => {
    const monthsMap = new Map<
      string,
      { label: string; sortKey: string; Receitas: number; Despesas: number }
    >();

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    // Seed last 4 months for visual continuity
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = `${monthNames[d.getMonth()]}/${String(y).slice(-2)}`;
      monthsMap.set(key, {
        label,
        sortKey: key,
        Receitas: 0,
        Despesas: 0,
      });
    }

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const parts = tx.date.split('-');
      if (parts.length < 2) return;
      const key = `${parts[0]}-${parts[1]}`;
      const monthIdx = parseInt(parts[1], 10) - 1;
      const label = `${monthNames[monthIdx] || parts[1]}/${parts[0].slice(-2)}`;

      if (!monthsMap.has(key)) {
        monthsMap.set(key, { label, sortKey: key, Receitas: 0, Despesas: 0 });
      }
      const entry = monthsMap.get(key)!;
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'receita') {
        entry.Receitas += amount;
      } else {
        entry.Despesas += amount;
      }
    });

    return Array.from(monthsMap.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );
  }, [transactions]);

  const hasMonthlyData = useMemo(() => {
    return monthlyData.some((m) => m.Receitas > 0 || m.Despesas > 0);
  }, [monthlyData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Pie Chart Card: Expenses Distribution */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Distribuição de Gastos por Categoria
              </h3>
              <p className="text-[11px] text-neutral-500">
                {expenseViewMode === 'all'
                  ? 'Despesas pagas + contas a pagar previstas'
                  : 'Apenas despesas já debitadas no extrato'}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[10px] font-bold self-start sm:self-auto border border-neutral-200/60">
            <button
              type="button"
              onClick={() => setExpenseViewMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                expenseViewMode === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs font-extrabold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Inclui despesas pagas e contas agendadas a pagar"
            >
              Total (+ Contas)
            </button>
            <button
              type="button"
              onClick={() => setExpenseViewMode('realized')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                expenseViewMode === 'realized'
                  ? 'bg-white text-neutral-900 shadow-2xs font-extrabold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Apenas despesas que já foram pagas"
            >
              Apenas Pagas
            </button>
          </div>
        </div>

        {pieData.entries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-xs text-neutral-400 bg-neutral-50/60 rounded-2xl border border-dashed border-neutral-200">
            <PieChartIcon className="w-8 h-8 text-neutral-300 mb-2" />
            <span className="font-bold text-neutral-700 text-xs">Nenhuma despesa para exibir</span>
            <span className="text-[11px] text-neutral-400 mt-1 max-w-xs">
              {expenseViewMode === 'realized'
                ? 'Você ainda não registrou despesas pagas no extrato.'
                : 'Cadastre despesas ou contas a pagar para visualizar a distribuição.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
            <div className="sm:col-span-7 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.entries}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.entries.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e5e5',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-5 space-y-2 max-h-56 overflow-y-auto pr-1">
              {pieData.entries.map((item, idx) => {
                const percent =
                  pieData.total > 0
                    ? ((item.value / pieData.total) * 100).toFixed(1)
                    : '0.0';
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs gap-2 p-1 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-neutral-700 font-medium truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {formatCurrency(item.value)}
                      </span>
                      <span className="font-extrabold text-neutral-900 text-xs">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart Card: Monthly Evolution */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Evolução Mensal (Receitas vs. Despesas)
              </h3>
              <p className="text-[11px] text-neutral-500">
                Comparativo histórico de fluxo de caixa
              </p>
            </div>
          </div>
        </div>

        {!hasMonthlyData ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-xs text-neutral-400 bg-neutral-50/60 rounded-2xl border border-dashed border-neutral-200">
            <BarChart3 className="w-8 h-8 text-neutral-300 mb-2" />
            <span className="font-bold text-neutral-700 text-xs">Sem movimentações no histórico</span>
            <span className="text-[11px] text-neutral-400 mt-1 max-w-xs">
              Conforme você registrar movimentações ao longo dos meses, o gráfico comparativo de fluxo de caixa aparecerá aqui.
            </span>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#737373' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#737373' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `R$${(val / 1000).toFixed(0)}k` : `R$${val}`
                  }
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e5e5',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="Receitas"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Despesas"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});
