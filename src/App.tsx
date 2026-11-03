import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FinancialTransaction,
  FinancialSummary,
  BillReminder,
  AccountWallet,
} from './types/finance.ts';
import { Header, AppTab } from './components/Header.tsx';
import { HomeOverviewView } from './components/HomeOverviewView.tsx';
import { StatementView } from './components/StatementView.tsx';
import { AccountsAndBillsView } from './components/AccountsAndBillsView.tsx';
import { CreditCardsPanel } from './components/CreditCardsPanel.tsx';
import { BillRemindersPanel } from './components/BillRemindersPanel.tsx';
import { AccountsWalletsPanel } from './components/AccountsWalletsPanel.tsx';
import { ServicesView } from './components/ServicesView.tsx';
import { ChatAdvisorView } from './components/ChatAdvisorView.tsx';
import { InputCenterView } from './components/InputCenterView.tsx';
import { PlanningView } from './components/PlanningView.tsx';
import { ConfirmationModal } from './components/ConfirmationModal.tsx';
import { BankStatementImportModal } from './components/BankStatementImportModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { BottomTabBar } from './components/BottomTabBar.tsx';
import {
  AuthUserProfile,
  getCurrentSupabaseUser,
  subscribeToSupabaseAuth,
  signOutFromSupabase,
  handleEmailConfirmationUrl,
} from './services/supabaseAuth.ts';
import {
  fetchTransactionsFromSupabase,
  saveTransactionToSupabase,
  batchSaveTransactionsToSupabase,
  updateTransactionInSupabase,
  deleteTransactionFromSupabase,
  testSupabaseConnection,
  fetchBudgetsFromSupabase,
  saveBudgetToSupabase,
  deleteBudgetFromSupabase,
  fetchAccountsFromSupabase,
  saveAccountsToSupabase,
  deleteAccountFromSupabase,
  getDefaultAccountColor,
  fetchBillsFromSupabase,
  saveBillsToSupabase,
} from './services/supabase.ts';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {
  Alimentação: 1500,
  'Cartão de Crédito': 2000,
  Transporte: 600,
  Moradia: 2200,
  Saúde: 400,
  Lazer: 500,
  Educação: 600,
  Compras: 500,
  'Serviços & Contas': 400,
  Outros: 300,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [isBankStatementModalOpen, setIsBankStatementModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [bills, setBills] = useState<BillReminder[]>(() => {
    try {
      const saved =
        localStorage.getItem('finai_cached_bills') ||
        localStorage.getItem('finai_local_bills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved =
        localStorage.getItem('finai_cached_budgets') ||
        localStorage.getItem('finai_category_budgets') ||
        localStorage.getItem('finai_local_budgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_CATEGORY_BUDGETS;
  });
  const [accounts, setAccounts] = useState<AccountWallet[]>(() => {
    try {
      const saved =
        localStorage.getItem('finai_cached_accounts') ||
        localStorage.getItem('finai_local_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const isInitialDataLoaded = useRef(false);
  const [statementAccountFilter, setStatementAccountFilter] = useState<string>('all');
  const [inputDefaultMode, setInputDefaultMode] = useState<'manual' | 'voice' | 'receipt' | 'statement'>('manual');

  const handleOpenInput = (mode: 'manual' | 'voice' | 'receipt' | 'text' | 'statement' = 'manual') => {
    const targetMode = mode === 'text' ? 'manual' : mode;
    setInputDefaultMode(targetMode);
    setActiveTab('input');
  };

  // Transactions: empty by default for new real accounts, loaded from Supabase or demo mode
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Input & Modal states (supports queue for multiple items)
  const [isProcessingInput, setIsProcessingInput] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<FinancialTransaction[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<FinancialTransaction | null>(null);
  const [currentTranscribedText, setCurrentTranscribedText] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Sync a transaction amount with the respective bank/wallet account balance
  const syncAccountBalance = useCallback(
    (
      targetAccounts: AccountWallet[],
      accountName: string | undefined,
      amount: number,
      type: 'receita' | 'despesa',
      direction: 'apply' | 'revert',
      paymentMethod?: string
    ): AccountWallet[] => {
      const name = (accountName || 'Nubank').trim();
      const norm = name.toLowerCase();
      const token = norm.split(' ')[0];

      const idx = targetAccounts.findIndex((a) => {
        const aNorm = a.name.toLowerCase();
        return aNorm.includes(token) || norm.includes(aNorm.split(' ')[0]);
      });

      // Purchases made on Credit Card do NOT debit checking or cash accounts immediately!
      const isCreditPurchase = type === 'despesa' && paymentMethod === 'Cartão de Crédito';

      if (idx >= 0) {
        const targetAcc = targetAccounts[idx];

        // If it's a purchase made on credit and the target account is checking/cash/savings, do NOT debit checking balance
        if (isCreditPurchase && targetAcc.type !== 'credit') {
          return targetAccounts;
        }

        const delta = type === 'receita' ? amount : -amount;
        const effectiveDelta = direction === 'apply' ? delta : -delta;

        return targetAccounts.map((a, i) =>
          i === idx
            ? {
                ...a,
                balance: Math.round((a.balance + effectiveDelta) * 100) / 100,
                color: a.color ? a.color : getDefaultAccountColor(a.name),
              }
            : a
        );
      }

      // If applying and account does not exist yet, auto-create it (if credit purchase, create as credit card)
      if (direction === 'apply') {
        // Do not auto-create checking account for credit purchases unless no accounts exist
        if (isCreditPurchase) {
          const newCard: AccountWallet = {
            id: `acc-${Date.now()}`,
            name,
            type: 'credit',
            balance: amount,
            initialBalance: 0,
            color: getDefaultAccountColor(name),
            creditLimit: 3000,
            closingDay: 5,
            dueDay: 12,
          };
          return [...targetAccounts, newCard];
        }

        const delta = type === 'receita' ? amount : -amount;
        const effectiveDelta = direction === 'apply' ? delta : -delta;
        const color = getDefaultAccountColor(name);

        const newAcc: AccountWallet = {
          id: `acc-${Date.now()}`,
          name,
          type: 'checking',
          balance: Math.round(effectiveDelta * 100) / 100,
          initialBalance: 0,
          color,
        };
        return [...targetAccounts, newAcc];
      }

      return targetAccounts;
    },
    []
  );

  // Directly persist accounts state, local cache and Supabase cloud metadata synchronously
  const persistAccounts = useCallback(
    async (updatedAccounts: AccountWallet[]) => {
      setAccounts(updatedAccounts);
      const accStorageKey = user?.id ? `finai_accounts_${user.id}` : 'finai_local_accounts';
      try {
        localStorage.setItem(accStorageKey, JSON.stringify(updatedAccounts));
        localStorage.setItem('finai_cached_accounts', JSON.stringify(updatedAccounts));
      } catch {}
      await saveAccountsToSupabase(updatedAccounts, user?.id, true);
    },
    [user?.id]
  );

  // Directly persist bills state, local cache and Supabase cloud metadata synchronously
  const persistBills = useCallback(
    async (updatedBills: BillReminder[]) => {
      setBills(updatedBills);
      const storageKey = user?.id ? `finai_bills_${user.id}` : 'finai_local_bills';
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedBills));
        localStorage.setItem('finai_cached_bills', JSON.stringify(updatedBills));
      } catch {}
      await saveBillsToSupabase(updatedBills, user?.id, true);
    },
    [user?.id]
  );

  // Reload data directly from Supabase, strictly isolating by authenticated user
  const reloadFromSupabase = useCallback(async (currentUserId?: string) => {
    setIsLoadingSupabase(true);
    try {
      const status = await testSupabaseConnection();
      setIsSupabaseConnected(status.ok);

      if (status.ok) {
        const remoteData = await fetchTransactionsFromSupabase(currentUserId);
        setTransactions(remoteData);
      }

      try {
        const remoteBudgets = await fetchBudgetsFromSupabase(currentUserId);
        const storageKey = currentUserId ? `finai_category_budgets_${currentUserId}` : 'finai_category_budgets';
        const savedBudgetsStr = localStorage.getItem(storageKey);
        const localBudgets = savedBudgetsStr ? JSON.parse(savedBudgetsStr) : null;

        let activeBudgets: Record<string, number>;
        if (remoteBudgets && Object.keys(remoteBudgets).length > 0) {
          activeBudgets = remoteBudgets;
          localStorage.setItem(storageKey, JSON.stringify(activeBudgets));
          localStorage.setItem('finai_cached_budgets', JSON.stringify(activeBudgets));
        } else if (localBudgets && Object.keys(localBudgets).length > 0) {
          activeBudgets = localBudgets;
        } else {
          activeBudgets = DEFAULT_CATEGORY_BUDGETS;
        }
        setCategoryBudgets(activeBudgets);
      } catch {
        const storageKey = currentUserId ? `finai_category_budgets_${currentUserId}` : 'finai_category_budgets';
        const savedBudgetsStr = localStorage.getItem(storageKey);
        setCategoryBudgets(savedBudgetsStr ? JSON.parse(savedBudgetsStr) : DEFAULT_CATEGORY_BUDGETS);
      }
    } catch (err: any) {
      console.warn('Supabase fetch error:', err);
    } finally {
      setIsLoadingSupabase(false);
    }
  }, []);

  // Synchronize data whenever user changes or when demo mode is toggled
  useEffect(() => {
    if (isCheckingAuth) return;

    if (user?.id) {
      // Authenticated account: load user's real transactions and budgets from Supabase + local cache
      reloadFromSupabase(user.id);

      (async () => {
        let loadedAccounts: AccountWallet[] = [];
        let loadedBills: BillReminder[] = [];

        // 1. Check local cache first for instant display
        try {
          const savedAccounts = localStorage.getItem(`finai_accounts_${user.id}`) || localStorage.getItem('finai_cached_accounts');
          if (savedAccounts) {
            const parsed = JSON.parse(savedAccounts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedAccounts = parsed;
              setAccounts(parsed);
            }
          }
        } catch {}

        try {
          const storageKey = `finai_bills_${user.id}`;
          const savedBills = localStorage.getItem(storageKey) || localStorage.getItem('finai_cached_bills');
          if (savedBills) {
            const parsed = JSON.parse(savedBills);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedBills = parsed;
              setBills(parsed);
            }
          }
        } catch {}

        // 2. Fetch from Supabase in parallel
        try {
          const [remoteAccounts, remoteBills] = await Promise.all([
            fetchAccountsFromSupabase(user.id),
            fetchBillsFromSupabase(user.id),
          ]);

          if (Array.isArray(remoteAccounts) && remoteAccounts.length > 0) {
            loadedAccounts = remoteAccounts;
            setAccounts(remoteAccounts);
            try {
              localStorage.setItem(`finai_accounts_${user.id}`, JSON.stringify(remoteAccounts));
              localStorage.setItem('finai_cached_accounts', JSON.stringify(remoteAccounts));
            } catch {}
          }

          if (Array.isArray(remoteBills) && remoteBills.length > 0) {
            loadedBills = remoteBills;
            setBills(remoteBills);
            try {
              localStorage.setItem(`finai_bills_${user.id}`, JSON.stringify(remoteBills));
              localStorage.setItem('finai_cached_bills', JSON.stringify(remoteBills));
            } catch {}
          }
        } catch (err) {
          console.warn('Error loading remote accounts/bills for user:', err);
        } finally {
          isInitialDataLoaded.current = true;
        }
      })();
    } else {
      // Unauthenticated local/guest mode: synchronize with local cache AND Supabase cloud metadata
      reloadFromSupabase();

      (async () => {
        let guestAccounts: AccountWallet[] = [];
        let guestBills: BillReminder[] = [];

        try {
          const localAccs = localStorage.getItem('finai_local_accounts') || localStorage.getItem('finai_cached_accounts');
          if (localAccs) {
            const parsed = JSON.parse(localAccs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              guestAccounts = parsed;
              setAccounts(parsed);
            }
          }
        } catch {}

        try {
          const localBills = localStorage.getItem('finai_local_bills') || localStorage.getItem('finai_cached_bills');
          if (localBills) {
            const parsed = JSON.parse(localBills);
            if (Array.isArray(parsed) && parsed.length > 0) {
              guestBills = parsed;
              setBills(parsed);
            }
          }
        } catch {}

        try {
          const [remoteAccounts, remoteBills] = await Promise.all([
            fetchAccountsFromSupabase(),
            fetchBillsFromSupabase(),
          ]);

          if (Array.isArray(remoteAccounts) && remoteAccounts.length > 0) {
            guestAccounts = remoteAccounts;
            setAccounts(remoteAccounts);
            try {
              localStorage.setItem('finai_local_accounts', JSON.stringify(remoteAccounts));
              localStorage.setItem('finai_cached_accounts', JSON.stringify(remoteAccounts));
            } catch {}
          }

          if (Array.isArray(remoteBills) && remoteBills.length > 0) {
            guestBills = remoteBills;
            setBills(remoteBills);
            try {
              localStorage.setItem('finai_local_bills', JSON.stringify(remoteBills));
              localStorage.setItem('finai_cached_bills', JSON.stringify(remoteBills));
            } catch {}
          }
        } catch (err) {
          console.warn('Error loading remote guest accounts/bills:', err);
        } finally {
          isInitialDataLoaded.current = true;
        }
      })();

      try {
        const localTxs = localStorage.getItem('finai_local_transactions');
        setTransactions(localTxs ? JSON.parse(localTxs) : []);
      } catch {
        setTransactions([]);
      }
      try {
        const localBudgets = localStorage.getItem('finai_local_budgets') || localStorage.getItem('finai_cached_budgets');
        setCategoryBudgets(localBudgets ? JSON.parse(localBudgets) : DEFAULT_CATEGORY_BUDGETS);
      } catch {
        setCategoryBudgets(DEFAULT_CATEGORY_BUDGETS);
      }
    }
  }, [user?.id, isCheckingAuth, reloadFromSupabase]);

  // Check Supabase authentication state and listen for session changes (Google / Email / Confirmation link)
  useEffect(() => {
    // 1. If returning from an email confirmation link with tokens, authenticate session immediately
    handleEmailConfirmationUrl().then((confirmedUser) => {
      if (confirmedUser) {
        setUser(confirmedUser);
        showToast('E-mail verificado com sucesso! Bem-vindo ao FinAI.');
      }
    });

    getCurrentSupabaseUser()
      .then((initialUser) => {
        if (initialUser) {
          setUser(initialUser);
        }
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });

    const unsubscribe = subscribeToSupabaseAuth((currentUser) => {
      setUser(currentUser);
    });

    return () => {
      unsubscribe();
    };
  }, [showToast]);

  const handleLogout = async () => {
    try {
      await signOutFromSupabase();
    } catch (err: any) {
      console.warn('Signout note:', err);
    }
    setUser(null);
    setTransactions([]);
    setBills([]);
    setAccounts([]);
    showToast('Sessão encerrada com sucesso.');
  };

  // Persist user-specific data in localStorage as resilient cache
  useEffect(() => {
    try {
      if (user?.id) {
        localStorage.setItem(`finai_tx_${user.id}`, JSON.stringify(transactions));
      } else {
        localStorage.setItem('finai_local_transactions', JSON.stringify(transactions));
      }
    } catch (e) {
      console.warn('Error saving transactions to localStorage:', e);
    }
  }, [transactions, user?.id]);

  useEffect(() => {
    if (!isInitialDataLoaded.current) return;
    try {
      const storageKey = user?.id ? `finai_bills_${user.id}` : 'finai_local_bills';
      localStorage.setItem(storageKey, JSON.stringify(bills));
      localStorage.setItem('finai_cached_bills', JSON.stringify(bills));
    } catch (e) {
      console.warn('Error saving bills to localStorage:', e);
    }
  }, [bills, user?.id]);

  useEffect(() => {
    if (!isInitialDataLoaded.current) return;
    try {
      const storageKey = user?.id ? `finai_accounts_${user.id}` : 'finai_local_accounts';
      localStorage.setItem(storageKey, JSON.stringify(accounts));
      localStorage.setItem('finai_cached_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn('Error saving accounts to localStorage:', e);
    }
  }, [accounts, user?.id]);

  // Compute summary stats dynamically
  const summary: FinancialSummary = useMemo(() => {
    let totalExpenses = 0;
    let totalRevenues = 0;
    const categoryTotals: Record<string, number> = {};
    const expenseCategoryTotals: Record<string, number> = {};
    const revenueCategoryTotals: Record<string, number> = {};

    transactions.forEach((t) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'despesa') {
        totalExpenses += val;
        expenseCategoryTotals[t.category] = (expenseCategoryTotals[t.category] || 0) + val;
      } else {
        totalRevenues += val;
        revenueCategoryTotals[t.category] = (revenueCategoryTotals[t.category] || 0) + val;
      }
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + val;
    });

    const totalBalance = totalRevenues - totalExpenses;
    const savingsRate = totalRevenues > 0 ? ((totalRevenues - totalExpenses) / totalRevenues) * 100 : 0;

    return {
      totalBalance,
      totalExpenses,
      totalRevenues,
      savingsRate,
      categoryTotals,
      expenseCategoryTotals,
      revenueCategoryTotals,
      monthlyTrends: [],
      recentTransactions: transactions,
    };
  }, [transactions]);

  // Process input with AI (Voice, Image, or Text)
  const handleProcessInput = async (options: {
    text?: string;
    audioBase64?: string;
    audioMimeType?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => {
    setIsProcessingInput(true);
    try {
      const res = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          currentDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar com a IA.');
      }

      const result = await res.json();
      if (!result.transactions || result.transactions.length === 0) {
        throw new Error('Nenhum dado financeiro claro foi detectado.');
      }

      if (result.transcribedText) {
        setCurrentTranscribedText(result.transcribedText);
      } else {
        setCurrentTranscribedText('');
      }

      // Convert all parsed items, preserving extracted bank account
      const newItems: FinancialTransaction[] = result.transactions.map((item: any, idx: number) => ({
        id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        type: item.type || 'despesa',
        description: item.description || 'Lançamento',
        amount: Number(item.amount) || 0,
        category: item.category || 'Outros',
        date: item.date || new Date().toISOString().split('T')[0],
        paymentMethod: item.paymentMethod || 'Outro',
        account: item.account || (accounts[0]?.name || 'Nubank'),
        notes: item.notes || result.summaryText || '',
        syncedToSupabase: false,
      }));

      // Set first item for immediate confirmation, queue remaining
      setPendingTransaction(newItems[0]);
      setPendingQueue(newItems.slice(1));
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      console.error('Error processing input with Gemini:', err);
      showToast(err.message || 'Erro ao processar dados com IA.', 'error');
    } finally {
      setIsProcessingInput(false);
    }
  };

  // Confirm and save transaction directly to Supabase Backend and synchronize Account Balance
  const handleConfirmTransaction = async (confirmedTx: FinancialTransaction) => {
    setIsSavingToDb(true);
    try {
      const baseId = confirmedTx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const targetAccount = confirmedTx.account || (accounts[0]?.name || 'Nubank');

      // If purchase is divided into multiple installments
      if (confirmedTx.installments && confirmedTx.installments.total > 1) {
        const total = confirmedTx.installments.total;
        const installmentAmount = Math.round((confirmedTx.amount / total) * 100) / 100;

        // 1. Immediate 1st installment registered as today's transaction
        const firstTx: FinancialTransaction = {
          ...confirmedTx,
          id: `${baseId}-part-1`,
          description: `${confirmedTx.description} (1/${total})`,
          amount: installmentAmount,
          date: confirmedTx.date || new Date().toISOString().split('T')[0],
          account: targetAccount,
          notes: `${confirmedTx.notes ? confirmedTx.notes + ' • ' : ''}Parcela 1/${total}`,
          installments: {
            current: 1,
            total,
            originalTotal: confirmedTx.amount,
          },
          syncedToSupabase: true,
        };

        try {
          await saveTransactionToSupabase(firstTx, user?.id);
        } catch (err) {
          console.warn('Save 1st installment error:', err);
        }

        setTransactions((prev) => [firstTx, ...prev]);

        // Sync account balance (apply immediate first installment to account)
        setAccounts((prev) =>
          syncAccountBalance(prev, targetAccount, installmentAmount, confirmedTx.type, 'apply', confirmedTx.paymentMethod)
        );

        // 2. Schedule remaining installments (2..total) in Contas a Pagar
        const [startYear, startMonth, startDay] = (firstTx.date || new Date().toISOString().split('T')[0])
          .split('-')
          .map(Number);

        const futureInstallmentBills: BillReminder[] = [];
        for (let i = 2; i <= total; i++) {
          const dueObj = new Date(startYear, (startMonth - 1) + (i - 1), startDay || 1);
          const dateStr = dueObj.toISOString().split('T')[0];

          futureInstallmentBills.push({
            id: `bill-part-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            title: `${confirmedTx.description} (${i}/${total})`,
            amount: installmentAmount,
            dueDate: dateStr,
            category: confirmedTx.category,
            isPaid: false,
            account: targetAccount,
            paymentMethod: confirmedTx.paymentMethod || 'Cartão de Crédito',
            installments: {
              current: i,
              total,
              originalTotal: confirmedTx.amount,
            },
          });
        }

        setBills((prevBills) => {
          const updated = [...futureInstallmentBills, ...prevBills];
          const storageKey = user?.id ? `finai_bills_${user.id}` : 'finai_local_bills';
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch {
            // ignore
          }
          saveBillsToSupabase(updated, user?.id, true);
          return updated;
        });

        showToast(
          `Compra parcelada em ${total}x de R$ ${installmentAmount.toFixed(2)} cadastrada! 1ª parcela gravada hoje e parcelas 2 a ${total} agendadas em Contas a Pagar.`,
          'success'
        );
      } else {
        let finalTx: FinancialTransaction = {
          ...confirmedTx,
          id: baseId,
          account: targetAccount,
        };

        try {
          const saved = await saveTransactionToSupabase(finalTx, user?.id);
          finalTx = { ...saved, syncedToSupabase: true, account: targetAccount };
        } catch (err: any) {
          console.warn('Supabase save error (will fallback to cache):', err);
        }

        setTransactions((prev) => [finalTx, ...prev]);

        // Synchronize account balance automatically and persist to Supabase
        const updatedAccounts = syncAccountBalance(accounts, targetAccount, finalTx.amount, finalTx.type, 'apply', finalTx.paymentMethod);
        await persistAccounts(updatedAccounts);

        // If transaction is marked as recurring, schedule next cycle in Contas a Pagar!
        if (finalTx.isRecurring) {
          const freq = finalTx.recurrenceFrequency || 'mensal';
          const [y, m, d] = (finalTx.date || new Date().toISOString().split('T')[0]).split('-').map(Number);
          const nextDateObj = new Date(y, (m || 1) - 1, d || 1);

          if (freq === 'semanal') {
            nextDateObj.setDate(nextDateObj.getDate() + 7);
          } else if (freq === 'anual') {
            nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
          } else {
            // mensal
            nextDateObj.setMonth(nextDateObj.getMonth() + 1);
          }
          const nextDueDateStr = nextDateObj.toISOString().split('T')[0];

          const recurringBill: BillReminder = {
            id: `bill-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: finalTx.description,
            amount: finalTx.amount,
            dueDate: nextDueDateStr,
            category: finalTx.category,
            isPaid: false,
            recurringMonthly: freq === 'mensal',
            isRecurring: true,
            recurrenceFrequency: freq,
            account: targetAccount,
            paymentMethod: finalTx.paymentMethod || 'Boleto',
          };

          setBills((prevBills) => {
            const updated = [recurringBill, ...prevBills];
            const storageKey = user?.id ? `finai_bills_${user.id}` : 'finai_local_bills';
            try {
              localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch {
              // ignore
            }
            saveBillsToSupabase(updated, user?.id, true);
            return updated;
          });

          showToast(
            `Lançamento de R$ ${finalTx.amount.toFixed(2)} gravado! Próximo vencimento (${freq}) agendado para ${nextDueDateStr.split('-').reverse().join('/')} em Contas a Pagar.`,
            'success'
          );
        } else {
          showToast(
            `Lançamento de R$ ${finalTx.amount.toFixed(2)} gravado! Saldo de ${targetAccount} atualizado automaticamente.`,
            'success'
          );
        }
      }

      // If more items in queue, step to next
      if (pendingQueue.length > 0) {
        const nextItem = pendingQueue[0];
        setPendingTransaction(nextItem);
        setPendingQueue((prev) => prev.slice(1));
        showToast(`Revise o próximo item (${pendingQueue.length} restante(s)).`);
      } else {
        setIsConfirmModalOpen(false);
        setPendingTransaction(null);
      }
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      showToast(err.message || 'Erro ao gravar transação.', 'error');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Batch import transactions from Bank Statement (OFX/CSV) and synchronize accounts
  const handleImportTransactions = async (newTxs: FinancialTransaction[]) => {
    try {
      await batchSaveTransactionsToSupabase(newTxs, user?.id);
      setTransactions((prev) => [...newTxs, ...prev]);

      // Apply imported transactions to accounts and persist to Supabase
      let updated = [...accounts];
      newTxs.forEach((tx) => {
        updated = syncAccountBalance(updated, tx.account, tx.amount, tx.type, 'apply', tx.paymentMethod);
      });
      await persistAccounts(updated);

      showToast(`${newTxs.length} lançamento(s) importados e saldos bancários atualizados!`);
    } catch (err: any) {
      console.error('Error batch importing statement:', err);
      showToast('Erro ao gravar lançamentos importados.', 'error');
    }
  };

  // Pay scheduled bill - deducts from chosen account and records payment in statement
  const handlePayBill = async (
    bill: BillReminder,
    paymentDetails?: { installmentsToPay?: number; paymentMethod?: string; accountName?: string; customAmount?: number }
  ) => {
    const targetAccount = paymentDetails?.accountName || bill.account || (accounts[0]?.name || 'Nubank');
    const paymentMethod = paymentDetails?.paymentMethod || bill.paymentMethod || 'Boleto';
    const numInstallments = paymentDetails?.installmentsToPay || 1;
    const payAmount = paymentDetails?.customAmount || Math.round(bill.amount * numInstallments * 100) / 100;

    const paymentTx: FinancialTransaction = {
      id: `bill-pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'despesa',
      description: numInstallments > 1 ? `Pagamento: ${bill.title} (${numInstallments}x parcelas)` : `Pagamento: ${bill.title}`,
      amount: payAmount,
      category: bill.category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      account: targetAccount,
      notes: numInstallments > 1 ? `Pagamento de ${numInstallments} parcelas` : 'Conta agendada paga',
      syncedToSupabase: true,
    };

    try {
      await saveTransactionToSupabase(paymentTx, user?.id);
    } catch (err) {
      console.warn('Save bill payment error:', err);
    }

    setTransactions((prev) => [paymentTx, ...prev]);

    // Deduct bill payment from target account and persist to Supabase
    let updatedAccounts = syncAccountBalance(accounts, targetAccount, payAmount, 'despesa', 'apply', paymentMethod);

    // If it's a credit card invoice payment, also decrease the credit card's debt/balance
    const isCreditCardInvoice =
      bill.category === 'Cartão de Crédito' ||
      bill.id.startsWith('cc-invoice-') ||
      bill.id.startsWith('bill-card-') ||
      bill.title.toLowerCase().includes('fatura');

    if (isCreditCardInvoice) {
      const cardName = (bill.account || bill.title.replace(/fatura\s*(cartão)?/i, '')).trim();
      const cardNorm = cardName.toLowerCase();
      const cardToken = cardNorm.split(' ')[0];

      updatedAccounts = updatedAccounts.map((acc) => {
        const accNorm = acc.name.toLowerCase().trim();
        const matches = accNorm === cardNorm || accNorm.includes(cardToken) || cardNorm.includes(accNorm.split(' ')[0]);
        if (matches && acc.type === 'credit') {
          return {
            ...acc,
            balance: Math.max(0, Math.round(((acc.balance || 0) - payAmount) * 100) / 100),
          };
        }
        return acc;
      });
    }
    await persistAccounts(updatedAccounts);

    const billExists = bills.some((b) => b.id === bill.id);
    const updatedBills = billExists
      ? bills.map((b) => (b.id === bill.id ? { ...b, isPaid: true } : b))
      : [{ ...bill, isPaid: true }, ...bills];

    setBills(updatedBills);
    try {
      const storageKey = user?.id ? `finai_bills_${user.id}` : 'finai_local_bills';
      localStorage.setItem(storageKey, JSON.stringify(updatedBills));
      localStorage.setItem('finai_cached_bills', JSON.stringify(updatedBills));
    } catch {
      // ignore
    }
    await saveBillsToSupabase(updatedBills, user?.id, true);

    showToast(
      numInstallments > 1
        ? `Pagamento de ${numInstallments} parcelas (${bill.title}) realizado! R$ ${payAmount.toFixed(2)} debitado de ${targetAccount}.`
        : `Conta "${bill.title}" paga! Saldo de ${targetAccount} debitado em R$ ${payAmount.toFixed(2)}.`
    );
  };

  // Delete transaction: revert amount from account balance
  const handleDeleteTransaction = async (txId: string) => {
    const txToDelete = transactions.find((t) => t.id === txId);

    // Remove from state immediately for responsive UI
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    if (txToDelete) {
      const updatedAccounts = syncAccountBalance(accounts, txToDelete.account, txToDelete.amount, txToDelete.type, 'revert', txToDelete.paymentMethod);
      await persistAccounts(updatedAccounts);
    }

    try {
      await deleteTransactionFromSupabase(txId);
      showToast(`Lançamento excluído e saldo de ${txToDelete?.account || 'conta'} estornado com sucesso!`);
    } catch (err: any) {
      console.warn('Could not delete from Supabase:', err);
      showToast('Removido da visualização local.', 'error');
    }
  };

  // Edit transaction: revert old impact, apply updated impact to accounts
  const handleEditTransaction = async (updatedTx: FinancialTransaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);

    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));

    if (oldTx) {
      let current = syncAccountBalance(accounts, oldTx.account, oldTx.amount, oldTx.type, 'revert', oldTx.paymentMethod);
      current = syncAccountBalance(current, updatedTx.account, updatedTx.amount, updatedTx.type, 'apply', updatedTx.paymentMethod);
      await persistAccounts(current);
    }

    try {
      await updateTransactionInSupabase(updatedTx);
      showToast(`Lançamento "${updatedTx.description}" e saldo da conta atualizados.`);
    } catch (err) {
      console.warn('Could not update in Supabase:', err);
      showToast(`Lançamento "${updatedTx.description}" atualizado.`);
    }
  };

  // Recalculate all account balances based on transaction history + initial balances
  const handleRecalculateBalances = useCallback(async () => {
    const recalculated = accounts.map((acc) => {
      const norm = acc.name.toLowerCase();
      const token = norm.split(' ')[0];
      const accTxs = transactions.filter((t) => {
        if (!t.account) return false;
        const tNorm = t.account.toLowerCase();
        return tNorm.includes(token) || norm.includes(tNorm);
      });

      const totalRev = accTxs.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
      const totalExp = accTxs.filter((t) => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
      const base = acc.initialBalance || 0;
      return {
        ...acc,
        balance: Math.round((base + totalRev - totalExp) * 100) / 100,
      };
    });
    await persistAccounts(recalculated);
    showToast('Saldos de todas as contas recalculados com sucesso a partir do histórico!');
  }, [accounts, transactions, persistAccounts, showToast]);

  const handleFilterStatementByAccount = (accountName: string) => {
    setStatementAccountFilter(accountName);
    setActiveTab('statement');
  };

  // Update category budget and persist to cloud
  const handleUpdateBudget = async (category: string, newLimit: number) => {
    const updated = { ...categoryBudgets, [category]: newLimit };
    setCategoryBudgets(updated);
    const storageKey = user?.id ? `finai_category_budgets_${user.id}` : 'finai_category_budgets';
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('finai_cached_budgets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    await saveBudgetToSupabase(category, newLimit, user?.id);
  };

  // Delete category budget and persist to cloud
  const handleDeleteBudget = async (category: string) => {
    const updated = { ...categoryBudgets };
    delete updated[category];
    setCategoryBudgets(updated);
    const storageKey = user?.id ? `finai_category_budgets_${user.id}` : 'finai_category_budgets';
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('finai_cached_budgets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    await deleteBudgetFromSupabase(category, user?.id);
    showToast(`Categoria "${category}" removida dos limites.`);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-2xl mb-4 shadow-xl shadow-emerald-500/20 animate-pulse">
          F
        </div>
        <p className="text-xs text-neutral-400 font-semibold tracking-wide">Carregando FinAI...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          showToast(`Bem-vindo ao FinAI, ${loggedUser.name}!`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 font-sans selection:bg-emerald-500 selection:text-white pb-28 sm:pb-32 md:pb-12">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Toast Alert - Raised above mobile bottom bar */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
              toast.type === 'success'
                ? 'bg-neutral-900 text-white border-neutral-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-neutral-400 hover:text-white cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'statement') setStatementAccountFilter('all');
          setActiveTab(tab);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3.5 sm:pt-6">
        {activeTab === 'home' && (
          <HomeOverviewView
            summary={summary}
            transactions={transactions}
            bills={bills}
            accounts={accounts}
            onNavigateTab={setActiveTab}
            onOpenInput={handleOpenInput}
            onOpenImportStatement={() => setIsBankStatementModalOpen(true)}
            onPayBill={handlePayBill}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'statement' && (
          <StatementView
            transactions={transactions}
            accounts={accounts}
            initialAccountFilter={statementAccountFilter}
            onOpenInput={handleOpenInput}
            onOpenImportStatement={() => setIsBankStatementModalOpen(true)}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'bills' && (
          <div className="space-y-6 pb-20 sm:pb-12 animate-in fade-in duration-150">
            <BillRemindersPanel
              bills={bills}
              onUpdateBills={async (updated) => {
                await persistBills(updated);
              }}
              accounts={accounts}
              transactions={transactions}
              userId={user?.id}
              onPayBill={handlePayBill}
              onShowToast={showToast}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6 pb-20 sm:pb-12 animate-in fade-in duration-150">
            <AccountsWalletsPanel
              accounts={accounts}
              onUpdateAccounts={async (updated) => {
                await persistAccounts(updated);
              }}
              transactions={transactions}
              onFilterStatementByAccount={handleFilterStatementByAccount}
              onRecalculateBalances={handleRecalculateBalances}
              userId={user?.id}
              onShowToast={showToast}
            />
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-6 pb-20 sm:pb-12 animate-in fade-in duration-150">
            <CreditCardsPanel
              accounts={accounts}
              onUpdateAccounts={async (updated) => {
                await persistAccounts(updated);
              }}
              transactions={transactions}
              bills={bills}
              onPayBill={handlePayBill}
              onShowToast={showToast}
              userId={user?.id}
            />
          </div>
        )}

        {activeTab === 'services' && (
          <ServicesView
            onNavigateTab={setActiveTab}
            pendingBillsCount={bills.filter((b) => !b.isPaid).length}
            accountsCount={accounts.filter((a) => a.type !== 'credit').length}
            cardsCount={accounts.filter((a) => a.type === 'credit' || (a.creditLimit && a.creditLimit > 0)).length}
          />
        )}

        {activeTab === 'planning' && (
          <PlanningView
            summary={summary}
            transactions={transactions}
            categoryBudgets={categoryBudgets}
            userId={user?.id}
            onUpdateBudget={handleUpdateBudget}
            onDeleteBudget={handleDeleteBudget}
            onShowToast={showToast}
            onOpenInput={() => handleOpenInput('manual')}
          />
        )}

        {activeTab === 'chat' && (
          <ChatAdvisorView
            summary={summary}
          />
        )}

        {activeTab === 'input' && (
          <InputCenterView
            accounts={accounts}
            onSaveManualTransaction={handleConfirmTransaction}
            onUpdateAccounts={async (updated) => {
              await persistAccounts(updated);
            }}
            onProcessInput={handleProcessInput}
            isProcessing={isProcessingInput}
            defaultMode={inputDefaultMode}
            onOpenImportStatement={() => setIsBankStatementModalOpen(true)}
          />
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingTransaction(null);
          setPendingQueue([]);
          setCurrentTranscribedText('');
        }}
        onConfirm={handleConfirmTransaction}
        transaction={pendingTransaction}
        accounts={accounts}
        isSaving={isSavingToDb}
        transcribedText={currentTranscribedText}
      />

      {/* Bank Statement Import Modal (OFX / CSV) */}
      <BankStatementImportModal
        isOpen={isBankStatementModalOpen}
        onClose={() => setIsBankStatementModalOpen(false)}
        onImportTransactions={handleImportTransactions}
        onShowToast={showToast}
      />

      {/* Auth Modal (Google & Email via Supabase) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(profile) => {
          setUser(profile);
          showToast(`Bem-vindo, ${profile.name}!`);
        }}
        onShowToast={showToast}
      />

      {/* Bottom Mobile Tab Bar (Thumb navigation) */}
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
