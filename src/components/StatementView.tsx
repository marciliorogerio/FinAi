import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  Edit2,
  PlusCircle,
  Tag,
  CreditCard,
  Building,
  X,
  Upload,
} from 'lucide-react';
import { FinancialTransaction, AccountWallet } from '../types/finance.ts';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.tsx';

interface StatementViewProps {
  transactions: FinancialTransaction[];
  accounts?: AccountWallet[];
  initialAccountFilter?: string;
  onOpenInput: (mode?: 'manual' | 'voice' | 'receipt' | 'text' | 'statement') => void;
  onOpenImportStatement: () => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
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

export const StatementView: React.FC<StatementViewProps> = React.memo(({
  transactions,
  accounts = [],
  initialAccountFilter = 'all',
  onOpenInput,
  onOpenImportStatement,
  onEditTransaction,
  onDeleteTransaction,
  onShowToast,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'despesa' | 'receita'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>(initialAccountFilter);
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'last_30_days'>('this_month');

  // Edit transaction modal state
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);

  // Delete confirmation modal state
  const [deletingTx, setDeletingTx] = useState<FinancialTransaction | null>(null);

  const handleConfirmDeleteTransaction = () => {
    if (deletingTx) {
      onDeleteTransaction(deletingTx.id);
      setDeletingTx(null);
    }
  };

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
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Account filter
      if (selectedAccount !== 'all') {
        if (!t.account) return false;
        const tNorm = t.account.toLowerCase();
        const sNorm = selectedAccount.toLowerCase();
        const sToken = sNorm.split(' ')[0];
        if (!tNorm.includes(sToken) && !sNorm.includes(tNorm)) return false;
      }

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
        const matchMethod = t.paymentMethod?.toLowerCase().includes(q) || false;
        const matchAccount = t.account?.toLowerCase().includes(q) || false;
        return matchDesc || matchCat || matchMethod || matchAccount;
      }

      return true;
    });
  }, [transactions, filterType, selectedCategory, selectedAccount, dateFilter, searchQuery]);

  // Aggregated totals of filtered view
  const filteredExpenses = filteredTransactions
    .filter((t) => t.type === 'despesa')
    .reduce((s, t) => s + t.amount, 0);

  const filteredRevenues = filteredTransactions
    .filter((t) => t.type === 'receita')
    .reduce((s, t) => s + t.amount, 0);

  const filteredNet = filteredRevenues - filteredExpenses;

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      onShowToast('Não há transações no filtro para exportar.', 'error');
      return;
    }

    const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Forma de Pagamento', 'Conta/Banco', 'Observações'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.category,
      t.paymentMethod || '',
      t.account || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `extrato_finai_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Arquivo CSV exportado com sucesso!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-12 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Extrato Financeiro
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Lançamentos & Histórico
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Visualize, filtre, exporte ou importe novos lançamentos de extratos bancários.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportStatement}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[40px] touch-manipulation"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Importar OFX/CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenInput('manual')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer min-h-[40px] touch-manipulation"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Lançamento Manual</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Exportar CSV"
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Imprimir Extrato"
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs space-y-3.5">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Passado' },
            { id: 'last_30_days', label: 'Últimos 30 Dias' },
            { id: 'all', label: 'Todos os Períodos' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer min-h-[34px] ${
                dateFilter === tab.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Type, Category, and Account Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por descrição, banco ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50/50"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50/50"
            >
              <option value="all">Todas as Contas / Bancos</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.name}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50/50"
            >
              <option value="all">Todos os Tipos</option>
              <option value="despesa">Somente Despesas</option>
              <option value="receita">Somente Receitas</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50/50"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-xs">
          <span className="text-neutral-500">
            Mostrando <strong>{filteredTransactions.length}</strong> de {transactions.length} lançamento(s)
          </span>

          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-700">+{formatCurrency(filteredRevenues)}</span>
            <span className="text-rose-700">-{formatCurrency(filteredExpenses)}</span>
            <span className="text-neutral-300">|</span>
            <span className={filteredNet >= 0 ? 'text-neutral-900 font-bold' : 'text-rose-600 font-bold'}>
              Líquido: {formatCurrency(filteredNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List / Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold text-neutral-700">Nenhum lançamento encontrado</p>
            <p className="text-xs max-w-sm mx-auto">
              Tente ajustar os filtros acima ou importe um novo extrato bancário.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Conta / Banco</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {filteredTransactions.map((tx) => {
                    const isExp = tx.type === 'despesa';

                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-neutral-600 whitespace-nowrap">
                          {formatDate(tx.date)}
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
                                <span className="text-[11px] text-neutral-400 block truncate max-w-xs">
                                  {tx.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium text-[11px]">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                          {tx.account || tx.paymentMethod || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold">
                          <span className={isExp ? 'text-neutral-900' : 'text-emerald-600'}>
                            {isExp ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingTx(tx)}
                              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTx(tx)}
                              className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Excluir"
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

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-neutral-100">
              {filteredTransactions.map((tx) => {
                const isExp = tx.type === 'despesa';

                return (
                  <div key={tx.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {formatDate(tx.date)} • {tx.category} • {tx.account || tx.paymentMethod || 'Outro'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isExp ? 'text-neutral-900' : 'text-emerald-600'
                        }`}
                      >
                        {isExp ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[10px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Salvo em nuvem
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTx(tx)}
                          className="text-neutral-500 hover:text-neutral-800 font-semibold p-1"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTx(tx)}
                          className="text-rose-600 hover:text-rose-800 font-semibold p-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                Editar Lançamento
              </h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTx.amount}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Data</label>
                  <input
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Categoria</label>
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Conta / Banco</label>
                  <input
                    type="text"
                    list="account-edit-datalist"
                    placeholder="Ex: Nubank, Itaú"
                    value={editingTx.account || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, account: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="account-edit-datalist">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.name} />
                    ))}
                    <option value="Nubank" />
                    <option value="Itaú" />
                    <option value="Banco Inter" />
                    <option value="Bradesco" />
                    <option value="Santander" />
                    <option value="C6 Bank" />
                    <option value="Carteira Dinheiro" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  value={editingTx.notes || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 rounded-xl text-neutral-600 font-semibold hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onEditTransaction(editingTx);
                  setEditingTx(null);
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
        isOpen={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleConfirmDeleteTransaction}
        title="Excluir Lançamento"
        itemName={deletingTx?.description}
        description={`Deseja realmente remover o lançamento de ${
          deletingTx?.type === 'receita' ? 'receita' : 'despesa'
        } no valor de R$ ${(deletingTx?.amount || 0).toFixed(2)}?`}
      />
    </div>
  );
});
