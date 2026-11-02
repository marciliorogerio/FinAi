import React, { useState } from 'react';
import { CreditCard, Wallet, Calendar, Building, Sparkles } from 'lucide-react';
import { BillReminder, AccountWallet, FinancialTransaction } from '../types/finance.ts';
import { AccountsWalletsPanel } from './AccountsWalletsPanel.tsx';
import { BillRemindersPanel } from './BillRemindersPanel.tsx';
import { CreditCardsPanel } from './CreditCardsPanel.tsx';

interface AccountsAndBillsViewProps {
  bills: BillReminder[];
  onUpdateBills?: (updated: BillReminder[]) => void;
  accounts: AccountWallet[];
  onUpdateAccounts: (updated: AccountWallet[]) => void;
  transactions?: FinancialTransaction[];
  onFilterStatementByAccount?: (accountName: string) => void;
  onRecalculateBalances?: () => void;
  userId?: string;
  onPayBill: (
    bill: BillReminder,
    paymentDetails?: { installmentsToPay?: number; paymentMethod?: string; accountName?: string; customAmount?: number }
  ) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const AccountsAndBillsView: React.FC<AccountsAndBillsViewProps> = ({
  bills,
  onUpdateBills,
  accounts,
  onUpdateAccounts,
  transactions = [],
  onFilterStatementByAccount,
  onRecalculateBalances,
  userId,
  onPayBill,
  onShowToast,
}) => {
  const [activeSection, setActiveSection] = useState<'accounts' | 'cards' | 'bills'>('accounts');

  const creditCardCount = accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0)).length;
  const pendingBillsCount = bills.filter((b) => !b.isPaid).length;

  return (
    <div className="space-y-6 pb-20 sm:pb-12 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-neutral-800">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Módulo Integrado de Gestão Financeira</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
          Contas, Cartões de Crédito & Obrigações
        </h2>
        <p className="text-neutral-300 text-xs sm:text-sm mt-1 max-w-xl">
          Acompanhe o saldo líquido das suas contas correntes, controle as faturas e limites dos seus cartões e gerencie compromissos a vencer em um só lugar.
        </p>

        {/* Module Sub-Navigation Segmented Control */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white/10 border border-white/15 rounded-2xl mt-5 overflow-x-auto max-w-fit">
          <button
            type="button"
            onClick={() => setActiveSection('accounts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
              activeSection === 'accounts'
                ? 'bg-white text-neutral-900 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Wallet className="w-4 h-4 text-blue-500" />
            <span>Contas & Carteiras ({accounts.filter((a) => a.type !== 'credit').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('cards')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
              activeSection === 'cards'
                ? 'bg-white text-neutral-900 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4 text-purple-500" />
            <span>Cartões de Crédito ({creditCardCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('bills')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
              activeSection === 'bills'
                ? 'bg-white text-neutral-900 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Contas a Pagar ({pendingBillsCount})</span>
          </button>
        </div>
      </div>

      {/* Render Active Section or Consolidated Overview */}
      {activeSection === 'accounts' && (
        <AccountsWalletsPanel
          accounts={accounts}
          onUpdateAccounts={onUpdateAccounts}
          transactions={transactions}
          onFilterStatementByAccount={onFilterStatementByAccount}
          onRecalculateBalances={onRecalculateBalances}
          userId={userId}
          onShowToast={onShowToast}
        />
      )}

      {activeSection === 'cards' && (
        <CreditCardsPanel
          accounts={accounts}
          onUpdateAccounts={onUpdateAccounts}
          transactions={transactions}
          bills={bills}
          onPayBill={onPayBill}
          onShowToast={onShowToast}
          userId={userId}
        />
      )}

      {activeSection === 'bills' && (
        <BillRemindersPanel
          bills={bills}
          onUpdateBills={onUpdateBills}
          accounts={accounts}
          transactions={transactions}
          userId={userId}
          onPayBill={onPayBill}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
