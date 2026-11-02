import React, { useState } from 'react';
import {
  CreditCard,
  Wallet,
  Building,
  Plus,
  Edit2,
  Check,
  X,
  Trash2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Palette,
} from 'lucide-react';
import { AccountWallet, FinancialTransaction } from '../types/finance.ts';
import { deleteAccountFromSupabase } from '../services/supabase.ts';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.tsx';

interface AccountsWalletsPanelProps {
  accounts: AccountWallet[];
  onUpdateAccounts: (updated: AccountWallet[]) => void;
  transactions?: FinancialTransaction[];
  onFilterStatementByAccount?: (accountName: string) => void;
  onRecalculateBalances?: () => void;
  userId?: string;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const ACCOUNT_COLORS = [
  { id: 'purple', label: 'Roxo (Nubank)', class: 'border-purple-200 bg-purple-50/60 text-purple-900', badgeBg: 'bg-purple-600' },
  { id: 'orange', label: 'Laranja (Itaú / BMG)', class: 'border-orange-200 bg-orange-50/60 text-orange-900', badgeBg: 'bg-orange-500' },
  { id: 'amber', label: 'Amarelo (Inter / BB)', class: 'border-amber-200 bg-amber-50/60 text-amber-900', badgeBg: 'bg-amber-500' },
  { id: 'rose', label: 'Vermelho (Bradesco / Santander)', class: 'border-rose-200 bg-rose-50/60 text-rose-900', badgeBg: 'bg-rose-600' },
  { id: 'emerald', label: 'Verde (Dinheiro / PagBank)', class: 'border-emerald-200 bg-emerald-50/60 text-emerald-900', badgeBg: 'bg-emerald-600' },
  { id: 'blue', label: 'Azul (Caixa / BTG Pactual)', class: 'border-blue-200 bg-blue-50/60 text-blue-900', badgeBg: 'bg-blue-600' },
  { id: 'cyan', label: 'Ciano (XP / Neon)', class: 'border-cyan-200 bg-cyan-50/60 text-cyan-900', badgeBg: 'bg-cyan-500' },
  { id: 'neutral', label: 'Grafite (C6 / Black)', class: 'border-neutral-300 bg-neutral-100 text-neutral-900', badgeBg: 'bg-neutral-800' },
  { id: 'pink', label: 'Rosa (Nomad)', class: 'border-pink-200 bg-pink-50/60 text-pink-900', badgeBg: 'bg-pink-500' },
  { id: 'indigo', label: 'Índigo (Safra)', class: 'border-indigo-200 bg-indigo-50/60 text-indigo-900', badgeBg: 'bg-indigo-600' },
];

const PRESET_ACCOUNTS = [
  { name: 'Nubank', type: 'checking' as const, color: 'border-purple-200 bg-purple-50/60 text-purple-900' },
  { name: 'Itaú', type: 'checking' as const, color: 'border-orange-200 bg-orange-50/60 text-orange-900' },
  { name: 'Banco Inter', type: 'savings' as const, color: 'border-amber-200 bg-amber-50/60 text-amber-900' },
  { name: 'Bradesco', type: 'checking' as const, color: 'border-rose-200 bg-rose-50/60 text-rose-900' },
  { name: 'C6 Bank', type: 'checking' as const, color: 'border-neutral-300 bg-neutral-100 text-neutral-900' },
  { name: 'Carteira Dinheiro', type: 'cash' as const, color: 'border-emerald-200 bg-emerald-50/60 text-emerald-900' },
];

export const AccountsWalletsPanel: React.FC<AccountsWalletsPanelProps> = ({
  accounts,
  onUpdateAccounts,
  transactions = [],
  onFilterStatementByAccount,
  onRecalculateBalances,
  userId,
  onShowToast,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editColor, setEditColor] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newType, setNewType] = useState<'checking' | 'credit' | 'savings' | 'cash'>('checking');
  const [selectedColor, setSelectedColor] = useState(ACCOUNT_COLORS[0].class);

  // Delete confirmation modal state
  const [deletingAccount, setDeletingAccount] = useState<AccountWallet | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const totalPatrimony = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  // Auto-detect color based on name input
  const handleNameChange = (val: string) => {
    setNewName(val);
    const lower = val.toLowerCase();
    if (lower.includes('nu')) setSelectedColor(ACCOUNT_COLORS[0].class);
    else if (lower.includes('itaú') || lower.includes('itau')) setSelectedColor(ACCOUNT_COLORS[1].class);
    else if (lower.includes('inter') || lower.includes('bb') || lower.includes('brasil')) setSelectedColor(ACCOUNT_COLORS[2].class);
    else if (lower.includes('bradesco') || lower.includes('santander')) setSelectedColor(ACCOUNT_COLORS[3].class);
    else if (lower.includes('dinheiro') || lower.includes('espécie') || lower.includes('pagbank')) setSelectedColor(ACCOUNT_COLORS[4].class);
    else if (lower.includes('caixa') || lower.includes('btg')) setSelectedColor(ACCOUNT_COLORS[5].class);
    else if (lower.includes('xp') || lower.includes('neon')) setSelectedColor(ACCOUNT_COLORS[6].class);
    else if (lower.includes('c6')) setSelectedColor(ACCOUNT_COLORS[7].class);
    else if (lower.includes('nomad')) setSelectedColor(ACCOUNT_COLORS[8].class);
    else if (lower.includes('safra')) setSelectedColor(ACCOUNT_COLORS[9].class);
  };

  const handleStartEdit = (acc: AccountWallet) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditBalance(acc.balance.toString());
    setEditColor(acc.color || ACCOUNT_COLORS[0].class);
  };

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editBalance);
    if (isNaN(val)) return;

    const updated = accounts.map((a) =>
      a.id === id
        ? { ...a, name: editName.trim() || a.name, balance: val, color: editColor }
        : a
    );
    onUpdateAccounts(updated);
    setEditingId(null);
    onShowToast('Conta, saldo e cor atualizados com sucesso!');
  };

  const handleDeleteAccount = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    const updated = accounts.filter((a) => a.id !== id);
    onUpdateAccounts(updated);
    deleteAccountFromSupabase(id, userId);
    setDeletingAccount(null);
    onShowToast(`Conta "${acc?.name || 'Conta'}" removida.`);
  };

  const handleConfirmDeleteAccount = () => {
    if (deletingAccount) {
      handleDeleteAccount(deletingAccount.id);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const bal = parseFloat(newBalance) || 0;

    const newAcc: AccountWallet = {
      id: `acc-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      balance: bal,
      initialBalance: bal,
      color: selectedColor,
    };

    onUpdateAccounts([...accounts, newAcc]);
    setIsAdding(false);
    setNewName('');
    setNewBalance('');
    onShowToast(`Conta "${newAcc.name}" cadastrada com saldo de ${formatCurrency(bal)}!`);
  };

  const handleQuickAdd = (preset: typeof PRESET_ACCOUNTS[0]) => {
    const alreadyExists = accounts.some(
      (a) => a.name.toLowerCase() === preset.name.toLowerCase()
    );
    if (alreadyExists) {
      onShowToast(`A conta "${preset.name}" já está cadastrada.`);
      return;
    }

    const newAcc: AccountWallet = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: preset.name,
      type: preset.type,
      balance: 0,
      initialBalance: 0,
      color: preset.color,
    };

    onUpdateAccounts([...accounts, newAcc]);
    onShowToast(`Conta "${preset.name}" adicionada com sucesso!`);
  };

  const getAccountTransactions = (accountName: string) => {
    const norm = accountName.toLowerCase();
    const token = norm.split(' ')[0];
    return transactions.filter((t) => {
      if (!t.account) return false;
      const tNorm = t.account.toLowerCase();
      return tNorm.includes(token) || norm.includes(tNorm);
    });
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900">
                Minhas Contas & Carteiras
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Sincronização Ativa
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Patrimônio consolidado:{' '}
              <strong className="text-emerald-600 font-bold">{formatCurrency(totalPatrimony)}</strong>
              {' • '}
              <span className="text-[11px] text-neutral-400">
                Lançamentos atualizam os saldos automaticamente
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRecalculateBalances && accounts.length > 0 && transactions.length > 0 && (
            <button
              type="button"
              onClick={onRecalculateBalances}
              title="Recalcular saldos com base no histórico de transações"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold cursor-pointer min-h-[36px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Recalcular Saldos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Fechar' : 'Nova Conta'}</span>
          </button>
        </div>
      </div>

      {/* Add Account Form with Color Picker */}
      {isAdding && (
        <form
          onSubmit={handleAddAccount}
          className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Cadastrar Banco ou Carteira
            </h4>
            <span className="text-[11px] text-neutral-500">
              Os lançamentos creditarão ou debitarão este banco
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Nome da Instituição *
              </label>
              <input
                type="text"
                placeholder="Ex: C6 Bank, Santander, XP, Nomad..."
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Tipo da Conta
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer"
              >
                <option value="checking">Conta Corrente</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="savings">Investimento / Reserva</option>
                <option value="cash">Dinheiro em Espécie</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Saldo Atual / Inicial (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Color Selector Strip */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-neutral-500" />
              <span>Escolha a Cor do Cartão / Banco:</span>
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {ACCOUNT_COLORS.map((c) => {
                const isSelected = selectedColor === c.class;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 ring-offset-1 bg-white font-bold text-neutral-900 border-neutral-300 shadow-2xs'
                        : 'bg-white/80 hover:bg-white text-neutral-600 border-neutral-200'
                    }`}
                    title={c.label}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.badgeBg} shrink-0`} />
                    <span className="text-[11px]">{c.label.split(' ')[0]}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-600 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-xs cursor-pointer"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      )}

      {/* Empty State when no accounts exist */}
      {accounts.length === 0 && !isAdding && (
        <div className="p-6 sm:p-8 rounded-2xl bg-neutral-50/70 border border-neutral-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-900">
              Nenhum banco ou carteira cadastrado ainda
            </h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Cadastre suas contas bancárias para que receitas e despesas atualizem seus saldos automaticamente em tempo real!
            </p>
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Adicione rapidamente:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleQuickAdd(preset)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Cards Grid (Contas Correntes, Poupanças e Dinheiro) */}
      {accounts.filter((a) => a.type !== 'credit').length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts
            .filter((a) => a.type !== 'credit')
            .map((acc) => {
              const isEditing = editingId === acc.id;
              const isDeleting = deletingAccount?.id === acc.id;
              const linkedTxs = getAccountTransactions(acc.name);

            return (
              <div
                key={acc.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between relative group ${
                  isEditing ? editColor : (acc.color || ACCOUNT_COLORS[0].class)
                }`}
              >
                {/* Top: Name & Type */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-xs truncate" title={acc.name}>{acc.name}</span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/70 border border-black/5 shrink-0">
                    {acc.type === 'checking'
                      ? 'Corrente'
                      : acc.type === 'credit'
                      ? 'Cartão'
                      : acc.type === 'savings'
                      ? 'Reserva'
                      : 'Espécie'}
                  </span>
                </div>

                {/* Balance & Edit Area */}
                <div className="my-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                      Saldo Atual
                    </p>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {linkedTxs.length} lançamento(s)
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-2 p-2 bg-white/90 rounded-xl border border-black/10 shadow-xs animate-in fade-in duration-100">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nome do Banco:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-xs font-semibold rounded bg-white border border-neutral-300"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Saldo (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editBalance}
                          onChange={(e) => setEditBalance(e.target.value)}
                          className="w-full px-2 py-1 text-xs font-bold rounded bg-white border border-emerald-500"
                        />
                      </div>

                      {/* Color swatch picker for editing card */}
                      <div>
                        <label className="text-[10px] font-bold text-neutral-600 block mb-1">Cor do Cartão:</label>
                        <div className="flex flex-wrap gap-1">
                          {ACCOUNT_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setEditColor(c.class)}
                              className={`w-5 h-5 rounded-full ${c.badgeBg} border ${
                                editColor === c.class ? 'ring-2 ring-emerald-600 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'
                              } transition-all cursor-pointer`}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-neutral-200">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 rounded bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(acc.id)}
                          className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span
                        className={`text-base sm:text-lg font-black tracking-tight ${
                          acc.balance < 0 ? 'text-rose-600' : 'text-neutral-900'
                        }`}
                      >
                        {formatCurrency(acc.balance)}
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(acc)}
                          className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                          title="Editar nome, saldo e cor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAccount(acc)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Excluir conta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer action: Filter statement by this account */}
                <div className="pt-2 mt-1 border-t border-black/5 flex items-center justify-between text-[11px]">
                  {onFilterStatementByAccount ? (
                    <button
                      type="button"
                      onClick={() => onFilterStatementByAccount(acc.name)}
                      className="text-neutral-600 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver extrato</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </button>
                  ) : (
                    <span className="text-neutral-400 text-[10px]">Conta sincronizada</span>
                  )}
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Auto-sincronizado
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Account Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingAccount)}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleConfirmDeleteAccount}
        title="Excluir Conta Bancária"
        itemName={deletingAccount?.name}
        description={`Tem certeza de que deseja excluir a conta "${deletingAccount?.name}" com saldo atual de R$ ${(deletingAccount?.balance || 0).toFixed(2)}? Os lançamentos históricos permanecerão preservados no seu extrato.`}
      />
    </div>
  );
};
