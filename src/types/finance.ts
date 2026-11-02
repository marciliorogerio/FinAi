export type TransactionType = 'despesa' | 'receita';

export interface InstallmentInfo {
  current: number;
  total: number;
  originalTotal: number;
}

export type RecurrenceFrequency = 'mensal' | 'semanal' | 'anual';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  account?: string; // e.g. Nubank, Itaú, Dinheiro, Inter
  installments?: InstallmentInfo;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  notes?: string;
  registeredBy?: string;
  rowIndex?: number; // In Google Sheets
  sheetName?: string;
  syncedToGoogleSheets?: boolean;
  syncedToSupabase?: boolean;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  modifiedTime?: string;
}

export interface CategoryBudget {
  category: string;
  monthlyLimit: number;
}

export interface FinancialSummary {
  totalBalance: number;
  totalExpenses: number;
  totalRevenues: number;
  savingsRate: number;
  categoryTotals: Record<string, number>;
  expenseCategoryTotals: Record<string, number>;
  revenueCategoryTotals: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    expenses: number;
    revenues: number;
  }>;
  recentTransactions: FinancialTransaction[];
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: string;
  account: string;
  selected: boolean;
}

export interface FinancialDiagnosis {
  score: number;
  rule503020: {
    needs: { amount: number; percentage: number }; // 50%
    wants: { amount: number; percentage: number }; // 30%
    savings: { amount: number; percentage: number }; // 20%
  };
  topDrainCategory: string;
  monthlyHealthStatus: 'Excelente' | 'Atenção' | 'Crítico';
  recommendations: string[];
  summary: string;
}

export interface AccountWallet {
  id: string;
  name: string;
  type: 'checking' | 'credit' | 'savings' | 'cash';
  balance: number;
  initialBalance?: number;
  color: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  isPaid: boolean;
  paymentMethod?: string;
  account?: string;
  recurringMonthly?: boolean;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  installments?: InstallmentInfo;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string; // 'emergencia' | 'sonho' | 'investimento' | custom category
  notes?: string;
  color?: string;
}

export interface MonthComparison {
  currentExpenses: number;
  previousExpenses: number;
  differencePercentage: number;
  isBetter: boolean;
  projectedEndMonthBalance: number;
  dailyBurnRate: number;
}

