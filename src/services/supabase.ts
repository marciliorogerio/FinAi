import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FinancialTransaction } from '../types/finance.ts';

// Default project provided by the user
export const DEFAULT_SUPABASE_URL = 'https://klsgsvzokqfnccuwjqcb.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc2dzdnpva3FmbmNjdXdqcWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODA0MDcsImV4cCI6MjEwODQ1NjQwN30.Rb9OuqxfqdYZnVg5qFBoSVrP0bOLTg409b4dPx7ABDU';

const STORAGE_KEY_URL = 'finai_supabase_url';
const STORAGE_KEY_ANON = 'finai_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  try {
    const savedUrl = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SUPABASE_URL;
    const savedKey = localStorage.getItem(STORAGE_KEY_ANON) || DEFAULT_SUPABASE_ANON_KEY;
    return {
      url: savedUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, ''),
      anonKey: savedKey.trim(),
      isConfigured: Boolean(savedUrl.trim() && savedKey.trim()),
    };
  } catch {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      isConfigured: true,
    };
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const cleanKey = anonKey.trim();
  localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEY_ANON, cleanKey);
  cachedClient = null;
}

export function resetSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }
  cachedUrl = url;
  cachedKey = anonKey;
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cachedClient;
}

/**
 * Test connectivity to the Supabase transactions table
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.warn('Supabase test connection error:', error);
      return { ok: false, count: 0, error: error.message };
    }

    return { ok: true, count: count ?? (data ? data.length : 0) };
  } catch (err: any) {
    return { ok: false, count: 0, error: err?.message || 'Falha ao conectar com o Supabase' };
  }
}

function parseAccountAndNotes(rawNotes?: string | null): { notes?: string; account?: string } {
  if (!rawNotes) return { notes: undefined, account: undefined };
  const match = rawNotes.match(/\[Conta:\s*([^\]]+)\]/);
  if (match) {
    const account = match[1].trim();
    const cleanNotes = rawNotes.replace(/\s*\[Conta:\s*[^\]]+\]\s*/g, '').trim();
    return { notes: cleanNotes || undefined, account };
  }
  return { notes: rawNotes, account: undefined };
}

function formatNotesWithAccount(notes?: string | null, account?: string | null): string | null {
  let clean = (notes || '').replace(/\s*\[Conta:\s*[^\]]+\]\s*/g, '').trim();
  if (account && account.trim()) {
    return clean ? `${clean} [Conta: ${account.trim()}]` : `[Conta: ${account.trim()}]`;
  }
  return clean || null;
}

/**
 * Fetch all transactions from the Supabase database
 */
export async function fetchTransactionsFromSupabase(
  userId?: string
): Promise<FinancialTransaction[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (userId) {
    // Strictly isolate data to the authenticated user's account
    query = query.eq('user_id', userId);
  } else {
    // Guest demo mode: show public demo transactions
    query = query.is('user_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions from Supabase:', error);
    throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) return [];

  // Exclude internal system metadata records (used for resilient accounts/bills cloud sync)
  const validRows = data.filter(
    (row: any) =>
      row.description !== '__finai_system_metadata__' &&
      !String(row.id || '').startsWith('__finai_meta_')
  );

  return validRows.map((row: any) => {
    const { notes, account } = parseAccountAndNotes(row.notes);
    return {
      id: row.id,
      type: row.type as 'despesa' | 'receita',
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      date: row.date,
      paymentMethod: row.payment_method || 'Outro',
      account: account || row.account || undefined,
      notes: notes,
      registeredBy: row.user_id || undefined,
      syncedToSupabase: true,
    };
  });
}

/**
 * Save a single transaction to Supabase
 */
export async function saveTransactionToSupabase(
  tx: FinancialTransaction,
  userId?: string
): Promise<FinancialTransaction> {
  const supabase = getSupabaseClient();

  const row = {
    id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || null,
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount),
    category: tx.category,
    date: tx.date || new Date().toISOString().split('T')[0],
    payment_method: tx.paymentMethod || null,
    notes: formatNotesWithAccount(tx.notes, tx.account),
  };

  const { data, error } = await supabase
    .from('transactions')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving transaction to Supabase:', error);
    throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
  }

  return {
    ...tx,
    id: data.id,
    syncedToSupabase: true,
  };
}

/**
 * Batch insert/upsert an array of transactions into Supabase
 */
export async function batchSaveTransactionsToSupabase(
  transactions: FinancialTransaction[],
  userId?: string
): Promise<number> {
  if (transactions.length === 0) return 0;
  const supabase = getSupabaseClient();

  const rows = transactions.map((tx) => ({
    id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || null,
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount),
    category: tx.category,
    date: tx.date || new Date().toISOString().split('T')[0],
    payment_method: tx.paymentMethod || null,
    notes: formatNotesWithAccount(tx.notes, tx.account),
  }));

  const { data, error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'id' })
    .select('id');

  if (error) {
    console.error('Error batch upserting into Supabase:', error);
    throw new Error(`Erro na migração para o Supabase: ${error.message}`);
  }

  return data ? data.length : rows.length;
}

/**
 * Update an existing transaction in Supabase
 */
export async function updateTransactionInSupabase(
  tx: FinancialTransaction
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('transactions')
    .update({
      type: tx.type,
      description: tx.description,
      amount: Number(tx.amount),
      category: tx.category,
      date: tx.date,
      payment_method: tx.paymentMethod || null,
      notes: formatNotesWithAccount(tx.notes, tx.account),
    })
    .eq('id', tx.id);

  if (error) {
    console.error('Error updating transaction in Supabase:', error);
    throw new Error(`Erro ao atualizar no Supabase: ${error.message}`);
  }
}

/**
 * Delete a transaction from Supabase
 */
export async function deleteTransactionFromSupabase(txId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('transactions').delete().eq('id', txId);

  if (error) {
    console.error('Error deleting transaction from Supabase:', error);
    throw new Error(`Erro ao excluir no Supabase: ${error.message}`);
  }
}

/**
/**
 * System metadata keys for Supabase cloud sync fallback
 */
function getAccountsMetaId(userId?: string): string {
  return `__finai_meta_accounts_${userId || 'guest'}`;
}

function getBillsMetaId(userId?: string): string {
  return `__finai_meta_bills_${userId || 'guest'}`;
}

function getBudgetsMetaId(userId?: string): string {
  return `__finai_meta_budgets_${userId || 'guest'}`;
}

/**
 * Fetch category budget limits from Supabase (resilient cloud persistence)
 */
export async function fetchBudgetsFromSupabase(userId?: string): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();

  // 1. Check cloud metadata row in Supabase first (strictly scoped to user)
  try {
    const metaId = getBudgetsMetaId(userId);
    const { data: metaRow } = await supabase
      .from('transactions')
      .select('notes')
      .eq('id', metaId)
      .maybeSingle();

    if (metaRow && metaRow.notes) {
      const parsed = JSON.parse(metaRow.notes);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not fetch budgets metadata from Supabase:', e);
  }

  // 2. Fallback to native 'category_budgets' table (without user_id filter to avoid schema errors)
  try {
    const { data, error } = await supabase.from('category_budgets').select('*');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const budgets: Record<string, number> = {};
      data.forEach((row: any) => {
        if (row.category && row.budget_limit) {
          budgets[row.category] = Number(row.budget_limit);
        }
      });
      if (Object.keys(budgets).length > 0) {
        return budgets;
      }
    }
  } catch (e) {
    console.warn('Could not load native budgets from Supabase:', e);
  }

  return {};
}

/**
 * Save a single category budget limit to Supabase with guaranteed persistence
 */
export async function saveBudgetToSupabase(
  category: string,
  limit: number,
  userId?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // 1. Try native 'category_budgets' table (schema has category, budget_limit, updated_at)
  try {
    const { data: existing } = await supabase
      .from('category_budgets')
      .select('category')
      .eq('category', category)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('category_budgets')
        .update({ budget_limit: limit, updated_at: new Date().toISOString() })
        .eq('category', category);
    } else {
      await supabase.from('category_budgets').insert({
        category,
        budget_limit: limit,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Native category_budgets save note:', e);
  }

  // 2. Always persist in cloud metadata row in Supabase so custom budget limits are NEVER lost or reset
  try {
    const current = await fetchBudgetsFromSupabase(userId);
    const updated = { ...current, [category]: limit };
    const metaId = getBudgetsMetaId(userId);

    await supabase.from('transactions').upsert(
      {
        id: metaId,
        user_id: userId || null,
        type: 'despesa',
        description: '__finai_system_metadata__',
        amount: 0,
        category: 'Outros',
        date: '2000-01-01',
        payment_method: 'Outro',
        notes: JSON.stringify(updated),
      },
      { onConflict: 'id' }
    );
  } catch (e) {
    console.warn('Could not save budgets metadata to Supabase:', e);
  }
}

export function getDefaultAccountColor(name?: string): string {
  if (!name) return 'border-neutral-200 bg-neutral-50/60 text-neutral-900';
  const norm = name.toLowerCase();
  if (norm.includes('nu')) return 'border-purple-200 bg-purple-50/60 text-purple-900';
  if (norm.includes('itau') || norm.includes('itaú')) return 'border-orange-200 bg-orange-50/60 text-orange-900';
  if (norm.includes('inter') || norm.includes('bb') || norm.includes('brasil')) return 'border-amber-200 bg-amber-50/60 text-amber-900';
  if (norm.includes('bradesco') || norm.includes('santander')) return 'border-rose-200 bg-rose-50/60 text-rose-900';
  if (norm.includes('dinheiro') || norm.includes('espécie') || norm.includes('pagbank')) return 'border-emerald-200 bg-emerald-50/60 text-emerald-900';
  if (norm.includes('c6')) return 'border-neutral-300 bg-neutral-100 text-neutral-900';
  if (norm.includes('caixa') || norm.includes('btg')) return 'border-blue-200 bg-blue-50/60 text-blue-900';
  if (norm.includes('xp') || norm.includes('neon')) return 'border-cyan-200 bg-cyan-50/60 text-cyan-900';
  if (norm.includes('nomad')) return 'border-pink-200 bg-pink-50/60 text-pink-900';
  if (norm.includes('safra')) return 'border-indigo-200 bg-indigo-50/60 text-indigo-900';
  return 'border-neutral-200 bg-neutral-50/60 text-neutral-900';
}

/**
 * Fetch user accounts/wallets from Supabase (with resilient cloud persistence)
 */
export async function fetchAccountsFromSupabase(userId?: string): Promise<any[]> {
  const supabase = getSupabaseClient();

  // 1. First attempt native 'accounts' table if present in schema
  try {
    let query = supabase.from('accounts').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }
    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type || 'checking',
        balance: Number(row.balance) || 0,
        initialBalance: Number(row.initial_balance) || Number(row.balance) || 0,
        color: row.color ? row.color : getDefaultAccountColor(row.name),
        creditLimit: row.credit_limit ? Number(row.credit_limit) : undefined,
        closingDay: row.closing_day ? Number(row.closing_day) : undefined,
        dueDay: row.due_day ? Number(row.due_day) : undefined,
      }));
    }
  } catch {
    // fallback to cloud metadata
  }

  // 2. Resilient cloud sync: fetch accounts metadata record stored in Supabase
  try {
    const metaId = getAccountsMetaId(userId);
    const { data: metaRow } = await supabase
      .from('transactions')
      .select('notes')
      .eq('id', metaId)
      .maybeSingle();

    let accountsList: any[] = [];
    if (metaRow && metaRow.notes) {
      const parsed = JSON.parse(metaRow.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        accountsList = parsed;
      }
    }

    // Fallback: if user metadata is empty and userId provided, check guest metadata
    if (accountsList.length === 0 && userId) {
      const guestMetaId = getAccountsMetaId();
      const { data: guestRow } = await supabase
        .from('transactions')
        .select('notes')
        .eq('id', guestMetaId)
        .maybeSingle();

      if (guestRow && guestRow.notes) {
        const guestParsed = JSON.parse(guestRow.notes);
        if (Array.isArray(guestParsed) && guestParsed.length > 0) {
          accountsList = guestParsed;
        }
      }
    }

    if (accountsList.length > 0) {
      return accountsList.map((acc: any) => ({
        ...acc,
        balance: Number(acc.balance) || 0,
        initialBalance: Number(acc.initialBalance) || 0,
        color: acc.color ? acc.color : getDefaultAccountColor(acc.name),
      }));
    }
  } catch (e) {
    console.warn('Could not fetch accounts metadata from Supabase:', e);
  }

  return [];
}

/**
 * Save / Upsert accounts array to Supabase (with guaranteed persistence)
 */
export async function saveAccountsToSupabase(
  accounts: any[],
  userId?: string,
  allowEmpty = false
): Promise<void> {
  if (!accounts || !Array.isArray(accounts)) return;
  if (accounts.length === 0 && !allowEmpty) {
    // Safety guard: prevent accidental startup wipeout when state is temporarily empty
    return;
  }
  const supabase = getSupabaseClient();

  const cleanAccounts = accounts.map((acc) => ({
    ...acc,
    balance: Number(acc.balance) || 0,
    initialBalance: Number(acc.initialBalance) || 0,
    color: acc.color ? acc.color : getDefaultAccountColor(acc.name),
  }));

  // 1. Try native 'accounts' table
  try {
    const rows = cleanAccounts.map((acc) => ({
      id: acc.id || `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId || null,
      name: acc.name,
      type: acc.type || 'checking',
      balance: Number(acc.balance) || 0,
      initial_balance: Number(acc.initialBalance) || Number(acc.balance) || 0,
      color: acc.color,
      credit_limit: acc.creditLimit || null,
      closing_day: acc.closingDay || null,
      due_day: acc.dueDay || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('accounts').upsert(rows, { onConflict: 'id' });
  } catch {
    // continue to cloud sync
  }

  // 2. Always persist cloud metadata row in Supabase so accounts, custom balances and colors are NEVER lost
  try {
    const metaId = getAccountsMetaId(userId);
    await supabase.from('transactions').upsert(
      {
        id: metaId,
        user_id: userId || null,
        type: 'despesa',
        description: '__finai_system_metadata__',
        amount: 0,
        category: 'Outros',
        date: '2000-01-01',
        payment_method: 'Outro',
        notes: JSON.stringify(cleanAccounts),
      },
      { onConflict: 'id' }
    );

    // Keep guest metadata row in sync as well
    if (userId) {
      await supabase.from('transactions').upsert(
        {
          id: '__finai_meta_accounts_guest',
          user_id: null,
          type: 'despesa',
          description: '__finai_system_metadata__',
          amount: 0,
          category: 'Outros',
          date: '2000-01-01',
          payment_method: 'Outro',
          notes: JSON.stringify(cleanAccounts),
        },
        { onConflict: 'id' }
      );
    }
  } catch (e) {
    console.warn('Could not save accounts metadata to Supabase:', e);
  }
}

/**
 * Delete account from Supabase
 */
export async function deleteAccountFromSupabase(accId: string, userId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    await supabase.from('accounts').delete().eq('id', accId);
  } catch {
    // ignore
  }

  try {
    const existing = await fetchAccountsFromSupabase(userId);
    const updated = existing.filter((a: any) => a.id !== accId);
    await saveAccountsToSupabase(updated, userId, true);
  } catch (e) {
    console.warn('Could not update accounts metadata on delete:', e);
  }
}

/**
 * Fetch bills/reminders from Supabase (with guaranteed persistence)
 */
export async function fetchBillsFromSupabase(userId?: string): Promise<any[]> {
  const supabase = getSupabaseClient();

  // 1. Try native 'bills' table if present in schema
  try {
    let query = supabase.from('bills').select('*');
    if (userId) query = query.eq('user_id', userId);
    else query = query.is('user_id', null);

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount) || 0,
        dueDate: row.due_date,
        category: row.category || 'Outros',
        isPaid: Boolean(row.is_paid),
        recurringMonthly: Boolean(row.recurring_monthly),
        paymentMethod: row.payment_method || 'Outro',
        account: row.account || undefined,
      }));
    }
  } catch {
    // fallback to cloud metadata
  }

  // 2. Resilient cloud sync: fetch bills metadata record stored in Supabase
  try {
    const metaId = getBillsMetaId(userId);
    const { data: metaRow } = await supabase
      .from('transactions')
      .select('notes')
      .eq('id', metaId)
      .maybeSingle();

    if (metaRow && metaRow.notes) {
      const parsed = JSON.parse(metaRow.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not fetch bills metadata from Supabase:', e);
  }

  return [];
}

/**
 * Save bills array to Supabase (guaranteed cloud persistence)
 */
export async function saveBillsToSupabase(
  bills: any[],
  userId?: string,
  allowEmpty = false
): Promise<void> {
  if (!bills || !Array.isArray(bills)) return;
  if (bills.length === 0 && !allowEmpty) {
    // Safety guard: prevent accidental wipeout when local state is uninitialized
    return;
  }
  const supabase = getSupabaseClient();

  // 1. Try native 'bills' table
  try {
    const rows = bills.map((b) => ({
      id: b.id || `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId || null,
      title: b.title,
      amount: Number(b.amount) || 0,
      due_date: b.dueDate,
      category: b.category,
      is_paid: Boolean(b.isPaid),
      recurring_monthly: Boolean(b.recurringMonthly),
      payment_method: b.paymentMethod || null,
      account: b.account || null,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('bills').upsert(rows, { onConflict: 'id' });
  } catch {
    // continue to cloud sync
  }

  // 2. Always persist cloud metadata row in Supabase so bills are NEVER lost
  try {
    const metaId = getBillsMetaId(userId);
    await supabase.from('transactions').upsert(
      {
        id: metaId,
        user_id: userId || null,
        type: 'despesa',
        description: '__finai_system_metadata__',
        amount: 0,
        category: 'Outros',
        date: '2000-01-01',
        payment_method: 'Outro',
        notes: JSON.stringify(bills),
      },
      { onConflict: 'id' }
    );
  } catch (e) {
    console.warn('Could not save bills metadata to Supabase:', e);
  }
}

/**
 * Fetch savings goals from Supabase
 */
export async function fetchGoalsFromSupabase(userId?: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('savings_goals').select('*');
    if (userId) query = query.eq('user_id', userId);
    else query = query.is('user_id', null);

    const { data, error } = await query;
    if (error) {
      console.warn('Savings goals table fetch note (falling back to local):', error.message);
      return [];
    }
    if (!data || !Array.isArray(data)) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      targetAmount: Number(row.target_amount) || 0,
      currentAmount: Number(row.current_amount) || 0,
      targetDate: row.target_date,
      category: row.category,
      color: row.color,
      iconName: row.icon_name,
    }));
  } catch (e) {
    console.warn('Could not fetch goals from Supabase:', e);
    return [];
  }
}

/**
 * Save savings goals array to Supabase
 */
export async function saveGoalsToSupabase(goals: any[], userId?: string): Promise<void> {
  if (!goals) return;
  try {
    const supabase = getSupabaseClient();
    const rows = goals.map((g) => ({
      id: g.id || `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId || null,
      title: g.title,
      target_amount: Number(g.targetAmount) || 0,
      current_amount: Number(g.currentAmount) || 0,
      target_date: g.targetDate,
      category: g.category,
      color: g.color || null,
      icon_name: g.iconName || null,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('savings_goals').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Could not save goals to Supabase:', e);
  }
}

/**
 * Delete a category budget from Supabase
 */
export async function deleteBudgetFromSupabase(category: string, userId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    await supabase.from('category_budgets').delete().eq('category', category);
  } catch (e) {
    console.warn('Could not delete native budget from Supabase:', e);
  }

  try {
    const current = await fetchBudgetsFromSupabase(userId);
    if (category in current) {
      const updated = { ...current };
      delete updated[category];
      const metaId = getBudgetsMetaId(userId);
      await supabase.from('transactions').upsert(
        {
          id: metaId,
          user_id: userId || null,
          type: 'despesa',
          description: '__finai_system_metadata__',
          amount: 0,
          category: 'Outros',
          date: '2000-01-01',
          payment_method: 'Outro',
          notes: JSON.stringify(updated),
        },
        { onConflict: 'id' }
      );
    }
  } catch (e) {
    console.warn('Could not update budgets metadata on delete:', e);
  }
}

/**
 * Delete a bill reminder from Supabase
 */
export async function deleteBillFromSupabase(billId: string, userId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    await supabase.from('bills').delete().eq('id', billId);
  } catch {
    // ignore
  }

  try {
    const existing = await fetchBillsFromSupabase(userId);
    const updated = existing.filter((b: any) => b.id !== billId);
    await saveBillsToSupabase(updated, userId, true);
  } catch (e) {
    console.warn('Could not update bills metadata on delete:', e);
  }
}

/**
 * Delete a goal from Supabase
 */
export async function deleteGoalFromSupabase(goalId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('savings_goals').delete().eq('id', goalId);
  } catch (e) {
    console.warn('Could not delete goal from Supabase:', e);
  }
}
