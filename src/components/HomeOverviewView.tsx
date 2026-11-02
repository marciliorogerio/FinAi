import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Mic,
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Bot,
  PlusCircle,
  Compass,
  PenTool,
} from 'lucide-react';
import {
  FinancialSummary,
  FinancialTransaction,
  BillReminder,
  AccountWallet,
} from '../types/finance.ts';
import { AppTab } from './Header.tsx';
import { FinancialCharts } from './FinancialCharts.tsx';

interface HomeOverviewViewProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
  bills: BillReminder[];
  accounts?: AccountWallet[];
  onNavigateTab: (tab: AppTab) => void;
  onOpenInput: (mode?: 'manual' | 'voice' | 'receipt' | 'text' | 'statement') => void;
  onOpenImportStatement: () => void;
  onPayBill: (
    bill: BillReminder,
    paymentDetails?: { installmentsToPay?: number; paymentMethod?: string; accountName?: string; customAmount?: number }
  ) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const HomeOverviewView: React.FC<HomeOverviewViewProps> = React.memo(({
  summary,
  transactions,
  bills,
  accounts = [],
  onNavigateTab,
  onOpenInput,
  onOpenImportStatement,
  onPayBill,
  onShowToast,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  // Imminent and pending bills
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingBills = bills
    .filter((b) => !b.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const pendingBillsTotal = pendingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const imminentBills = pendingBills.slice(0, 3);

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // Month closing projection: Saldo Líquido do Mês menos Contas Pendentes a Pagar
  const projectedFinalBalance = summary.totalBalance - pendingBillsTotal;

  const totalPatrimony = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-12 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* 1. Hero Balance & Consolidated Status Card */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-neutral-800 relative overflow-hidden">
        {/* Top: Consolidated Balance & Big Financial Highlights */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-neutral-400 tracking-wider">
                Saldo Consolidado
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Nuvem Ativa
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(summary.totalBalance)}
            </div>
            <p className="text-xs text-neutral-400">
              {summary.totalBalance >= 0
                ? 'Superávit líquido mantido este mês.'
                : 'Atenção ao fechamento de contas.'}
            </p>
          </div>

          {/* Secondary Core Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 self-start md:self-center bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Patrimônio Bancário
              </span>
              <span className="text-sm sm:text-base font-black text-neutral-100">
                {formatCurrency(totalPatrimony)}
              </span>
            </div>
            <div className="border-l border-white/10 pl-4 sm:pl-6">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Taxa de Poupança
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-400">
                {Math.max(0, summary.savingsRate).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Month Summary Bar inside Hero: Directly tied to real bills and transactions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
          <div>
            <p className="text-neutral-400 text-[11px] font-medium">Receitas do Mês</p>
            <p className="font-bold text-emerald-400 text-sm sm:text-base mt-0.5">
              +{formatCurrency(summary.totalRevenues)}
            </p>
          </div>
          <div>
            <p className="text-neutral-400 text-[11px] font-medium">Despesas Realizadas</p>
            <p className="font-bold text-rose-400 text-sm sm:text-base mt-0.5">
              -{formatCurrency(summary.totalExpenses)}
            </p>
          </div>
          <div
            onClick={() => onNavigateTab('accounts')}
            className="cursor-pointer group hover:opacity-90 transition-opacity"
          >
            <p className="text-neutral-400 text-[11px] font-medium flex items-center gap-1">
              <span>Contas a Pagar</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                {pendingBills.length}
              </span>
            </p>
            <p className="font-bold text-amber-300 text-sm sm:text-base mt-0.5">
              -{formatCurrency(pendingBillsTotal)}
            </p>
          </div>
          <div>
            <p className="text-neutral-400 text-[11px] font-medium">Previsão de Fechamento</p>
            <p
              className={`font-bold text-sm sm:text-base mt-0.5 ${
                projectedFinalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(projectedFinalBalance)}
            </p>
          </div>
        </div>

        {/* Bottom Bar: Context note on the left & Action Icons on the bottom-right corner */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            FinAI Inteligência Financeira
          </span>

          {/* Action Buttons as compact icons on the bottom right */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenInput('manual')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white text-neutral-200 hover:text-neutral-900 border border-white/15 flex items-center justify-center transition-all shadow-sm cursor-pointer group active:scale-95"
              title="Lançamento Manual"
              aria-label="Lançamento Manual"
            >
              <PenTool className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => onOpenInput('voice')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 flex items-center justify-center transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
              title="Gravar Despesa com IA"
              aria-label="Gravar Despesa com IA"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenImportStatement}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white text-neutral-200 hover:text-neutral-900 border border-white/15 flex items-center justify-center transition-all shadow-sm cursor-pointer group active:scale-95"
              title="Importar Extrato Bancário (OFX/CSV)"
              aria-label="Importar Extrato"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 Live Accounts Glance Strip (Sincronização em tempo real - Apenas contas bancárias/carteiras) */}
      {accounts.filter((a) => a.type !== 'credit').length > 0 && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Saldos das Contas & Carteiras
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('accounts')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar Contas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {accounts
              .filter((a) => a.type !== 'credit')
              .map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => onNavigateTab('accounts')}
                  className={`p-3 rounded-2xl border cursor-pointer hover:shadow-xs transition-all ${acc.color}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold truncate">{acc.name}</span>
                    <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-white/70">
                      {acc.type === 'checking'
                        ? 'Corrente'
                        : acc.type === 'savings'
                        ? 'Reserva'
                        : 'Dinheiro'}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Saldo</p>
                  <p className="text-sm sm:text-base font-black tracking-tight mt-0.5">
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. Quick Navigation Tiles (Access specialized modules in 1 click) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('statement')}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 flex items-center justify-between">
              <span>Extrato Completo</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {transactions.length} transações registradas
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('accounts')}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 flex items-center justify-between">
              <span>Contas a Pagar</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {pendingBills.length} conta(s) pendente(s)
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('accounts')}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 flex items-center justify-between">
              <span>Bancos & Carteiras</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {accounts.length > 0
                ? `${accounts.length} conta(s) • ${formatCurrency(totalPatrimony)}`
                : 'Cadastre e acompanhe seus saldos'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('planning')}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 flex items-center justify-between">
              <span>Metas & Orçamentos</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Tetos, Regra 50/30/20 e Sonhos</p>
          </div>
        </button>
      </div>

      {/* 2.5 Recharts: Expense Distribution PieChart & Monthly Evolution BarChart */}
      <FinancialCharts summary={summary} transactions={transactions} bills={bills} />

      {/* 3. Grid: Upcoming Bills (Actionable) + Recent Transactions (Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Imminent Bills to Pay */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                    Contas Próximas do Vencimento
                  </h3>
                  <p className="text-[11px] text-neutral-500">Pague com 1 clique</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('bills')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {imminentBills.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <span>Nenhuma conta pendente para os próximos dias! Parabéns.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {imminentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{bill.title}</p>
                      <p className="text-[11px] text-neutral-500">
                        Venc: <strong>{formatDate(bill.dueDate)}</strong> • {bill.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-bold text-neutral-900">
                        {formatCurrency(bill.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onPayBill(bill)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pagar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Total a pagar:{' '}
              <strong className="text-neutral-900">
                {formatCurrency(pendingBills.reduce((s, b) => s + b.amount, 0))}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('bills')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              + Adicionar nova conta
            </button>
          </div>
        </div>

        {/* Recent Transactions Preview */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                    Últimos Lançamentos
                  </h3>
                  <p className="text-[11px] text-neutral-500">Histórico recente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('statement')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
              >
                <span>Abrir Extrato</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl space-y-2">
                <p className="font-semibold text-neutral-700">Nenhum lançamento registrado ainda.</p>
                <p className="text-[11px] text-neutral-400">
                  Grave seu primeiro gasto falando por áudio, enviando foto de comprovante ou digitando.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenInput('voice')}
                  className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Fazer Primeiro Lançamento</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => {
                  const isExp = tx.type === 'despesa';

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/40 hover:bg-white transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {formatDate(tx.date)} • {tx.category} • {tx.paymentMethod || 'Outro'}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isExp ? 'text-neutral-900' : 'text-emerald-600'
                        }`}
                      >
                        {isExp ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Mostrando os 5 mais recentes
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('statement')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Filtros, Busca & Exportação →
            </button>
          </div>
        </div>
      </div>

      {/* 4. AI Financial Advisor Callout */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              Precisa de ajuda com suas finanças?
            </h4>
            <p className="text-[11px] sm:text-xs text-emerald-800/80">
              O consultor de IA pode analisar seu padrão de gastos, calcular reservas e sugerir cortes inteligentes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('chat')}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
        >
          Conversar com o Chat IA
        </button>
      </div>
    </div>
  );
});
