import React, { useState, useMemo } from 'react';
import {
  DollarSign, Plus, Trash2, TrendingUp, TrendingDown,
  PieChart, Calendar, Briefcase, Home, ChevronDown,
  ChevronUp, Info, Pencil, Check, X, Building2, Landmark
} from 'lucide-react';
import {
  AppState, IncomeSource, HouseholdExpense, Asset,
  IncomeFrequency, ExpenseCategory, AssetCategory
} from '../types';
// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const toMonthly = (amount: number, freq: IncomeFrequency): number => {
  switch (freq) {
    case 'weekly':      return amount * 52 / 12;
    case 'biweekly':    return amount * 26 / 12;
    case 'semimonthly': return amount * 2;
    case 'monthly':     return amount;
    case 'irregular':   return amount;
    default:            return amount;
  }
};

const toAnnual = (amount: number, freq: IncomeFrequency): number => {
  switch (freq) {
    case 'weekly':      return amount * 52;
    case 'biweekly':    return amount * 26;
    case 'semimonthly': return amount * 24;
    case 'monthly':     return amount * 12;
    default:            return amount * 12;
  }
};

const FREQ_LABELS: Record<IncomeFrequency, string> = {
  weekly: 'Weekly', biweekly: 'Every 2 weeks',
  semimonthly: 'Twice/month', monthly: 'Monthly', irregular: 'Irregular',
};

const EXPENSE_COLORS: Record<ExpenseCategory, string> = {
  housing: '#3b82f6', utilities: '#06b6d4', food: '#f59e0b',
  transport: '#8b5cf6', insurance: '#10b981', subscriptions: '#ec4899',
  childcare: '#f97316', debt: '#ef4444', other: '#6b7280',
};

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing', utilities: 'Utilities', food: 'Food & Dining',
  transport: 'Transportation', insurance: 'Insurance',
  subscriptions: 'Subscriptions', childcare: 'Childcare',
  debt: 'Debt Payments', other: 'Other',
};

const ASSET_COLORS: Record<string, string> = {
  checking: '#0ea5e9', savings: '#059669', business: '#7c3aed',
  cash: '#10b981', retirement: '#2563eb', brokerage: '#6366f1',
  crypto: '#f59e0b', property: '#8b5cf6', vehicle: '#d97706', other: '#6b7280',
};

const ASSET_LABELS: Record<string, string> = {
  checking: 'Checking Account', savings: 'Savings / HYSA',
  business: 'Business Account', cash: 'Cash on Hand',
  retirement: '401(k) / IRA', brokerage: 'Brokerage',
  crypto: 'Crypto', property: 'Real Estate',
  vehicle: 'Vehicle(s)', other: 'Other',
};

const inp = "w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900";

const blankIncome  = (): Omit<IncomeSource, 'id'>      => ({ label: '', grossAmount: 0, netAmount: 0, frequency: 'biweekly', nextPayDate: '', employer: '', isActive: true });
const blankExpense = (): Omit<HouseholdExpense, 'id'>   => ({ label: '', amount: 0, category: 'housing', isFixed: true, isRecurring: false, billingFrequency: 'monthly' });
const blankAsset   = (): Omit<Asset, 'id'>              => ({ label: '', amount: 0, category: 'checking', institution: '' });

// ─── Subscription templates ───────────────────────────────────────────────────

const SUBSCRIPTION_TEMPLATES: { label: string; amount: number; category: ExpenseCategory }[] = [
  { label: 'Netflix',          amount: 22.99,  category: 'subscriptions' },
  { label: 'Hulu',             amount: 17.99,  category: 'subscriptions' },
  { label: 'Disney+',          amount: 13.99,  category: 'subscriptions' },
  { label: 'Paramount+',       amount: 11.99,  category: 'subscriptions' },
  { label: 'HBO Max',          amount: 15.99,  category: 'subscriptions' },
  { label: 'Apple TV+',        amount: 9.99,   category: 'subscriptions' },
  { label: 'Peacock',          amount: 7.99,   category: 'subscriptions' },
  { label: 'Spotify',          amount: 11.99,  category: 'subscriptions' },
  { label: 'Apple Music',      amount: 10.99,  category: 'subscriptions' },
  { label: 'Walmart+',         amount: 12.95,  category: 'subscriptions' },
  { label: 'Amazon Prime',     amount: 14.99,  category: 'subscriptions' },
  { label: 'YouTube Premium',  amount: 13.99,  category: 'subscriptions' },
  { label: 'Gym Membership',   amount: 30.00,  category: 'subscriptions' },
  { label: 'iCloud Storage',   amount: 2.99,   category: 'subscriptions' },
  { label: 'Google One',       amount: 2.99,   category: 'subscriptions' },
  { label: 'Adobe Creative',   amount: 54.99,  category: 'subscriptions' },
  { label: 'Phone Bill',       amount: 80.00,  category: 'utilities'     },
  { label: 'Internet',         amount: 70.00,  category: 'utilities'     },
  { label: 'Electric',         amount: 120.00, category: 'utilities'     },
  { label: 'Gas/Water',        amount: 60.00,  category: 'utilities'     },
  { label: 'Rent/Mortgage',    amount: 1500.00,category: 'housing'       },
  { label: 'Car Insurance',    amount: 120.00, category: 'transport'     },
  { label: 'Gas (Car)',        amount: 150.00, category: 'transport'     },
  { label: 'Health Insurance', amount: 200.00, category: 'insurance'     },
  { label: 'Life Insurance',   amount: 50.00,  category: 'insurance'     },
  { label: 'Groceries',        amount: 400.00, category: 'food'          },
  { label: 'Dining Out',       amount: 200.00, category: 'food'          },
];



const Section: React.FC<{
  title: string; subtitle?: string; icon: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean; action?: React.ReactNode;
}> = ({ title, subtitle, icon, children, defaultOpen = true, action }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-7 py-5">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-3 flex-1 text-left">
          <div className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">{icon}</div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <span className="ml-2">{open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}</span>
        </button>
        {action}
      </div>
      {open && <div className="px-7 pb-7">{children}</div>}
    </div>
  );
};

// ─── Inline Edit Row ──────────────────────────────────────────────────────────

const EditableRow: React.FC<{
  label: string; sub?: string; value: string;
  onEdit: () => void; onDelete: () => void;
  leftDot?: string; badge?: string;
}> = ({ label, sub, value, onEdit, onDelete, leftDot, badge }) => (
  <div className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl group">
    {leftDot && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: leftDot }} />}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-bold text-zinc-900 text-sm">{label}</p>
        {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-200 text-zinc-600 rounded-full">{badge}</span>}
      </div>
      {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
    <span className="font-bold text-zinc-900 text-sm">{value}</span>
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={onEdit} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all text-zinc-300">
        <Pencil size={13} />
      </button>
      <button onClick={onDelete} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-300">
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const FinancialHubPage: React.FC<{
  state: AppState;
  onUpdateState: (s: AppState) => void;
}> = ({ state, onUpdateState }) => {
  const priv = !!state.isPrivacyMode;

  const incomeSources:     IncomeSource[]      = state.incomeSources     || [];
  const householdExpenses: HouseholdExpense[]  = state.householdExpenses || [];
  const assets:            Asset[]             = state.assets            || [];

  // ── Income state ─────────────────────────────────────────────────────────
  const [showIncomeForm,  setShowIncomeForm]  = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeForm,      setIncomeForm]      = useState<Omit<IncomeSource, 'id'>>(blankIncome());
  const setInc = (k: keyof Omit<IncomeSource,'id'>, v: any) => setIncomeForm(p => ({ ...p, [k]: v }));

  // ── Expense state ─────────────────────────────────────────────────────────
  const [showExpenseForm,  setShowExpenseForm]  = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm,      setExpenseForm]      = useState<Omit<HouseholdExpense, 'id'>>(blankExpense());
  const setExp = (k: keyof Omit<HouseholdExpense,'id'>, v: any) => setExpenseForm(p => ({ ...p, [k]: v }));

  // ── Asset state ───────────────────────────────────────────────────────────
  const [showAssetForm,  setShowAssetForm]  = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm,      setAssetForm]      = useState<Omit<Asset, 'id'>>(blankAsset());
  const setAst = (k: keyof Omit<Asset,'id'>, v: any) => setAssetForm(p => ({ ...p, [k]: v }));

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalMonthlyNet   = incomeSources.filter(i => i.isActive).reduce((s, i) => s + toMonthly(i.netAmount, i.frequency), 0);
  const totalMonthlyGross = incomeSources.filter(i => i.isActive).reduce((s, i) => s + toMonthly(i.grossAmount || 0, i.frequency), 0);
  const totalMonthlyExp   = householdExpenses.reduce((s, e) => s + e.amount, 0);
  const totalDebtMin      = state.cards.reduce((s, c) => s + c.minPayment, 0);
  const totalAllExp       = totalMonthlyExp + totalDebtMin;
  const cashAfterBudget   = totalMonthlyNet - totalAllExp - state.monthlyBudget;
  const totalAssets       = assets.reduce((s, a) => s + a.amount, 0);
  const liquidAssets      = assets.filter(a => ['checking','savings','cash','business'].includes(a.category)).reduce((s, a) => s + a.amount, 0);

  const autoGross = incomeForm.netAmount > 0 ? Math.round(incomeForm.netAmount / 0.75) : 0;

  // ── Sync helper ───────────────────────────────────────────────────────────
  const syncedUpdate = (newState: AppState, newSources?: IncomeSource[], newExpenses?: HouseholdExpense[]) => {
    const sources  = newSources  ?? newState.incomeSources  ?? [];
    const expenses = newExpenses ?? newState.householdExpenses ?? [];
    const computedIncome   = sources.filter(i => i.isActive).reduce((s, i) => s + toMonthly(i.netAmount, i.frequency), 0);
    const computedExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    onUpdateState({
      ...newState,
      income:          sources.length  > 0 ? Math.round(computedIncome)   : newState.income,
      monthlyExpenses: expenses.length > 0 ? Math.round(computedExpenses) : newState.monthlyExpenses,
    });
  };

  // ── Income handlers ───────────────────────────────────────────────────────
  const openAddIncome = () => { setEditingIncomeId(null); setIncomeForm(blankIncome()); setShowIncomeForm(true); };
  const openEditIncome = (src: IncomeSource) => {
    setEditingIncomeId(src.id);
    setIncomeForm({ label: src.label, grossAmount: src.grossAmount, netAmount: src.netAmount, frequency: src.frequency, nextPayDate: src.nextPayDate || '', employer: src.employer || '', isActive: src.isActive });
    setShowIncomeForm(true);
  };
  const saveIncome = () => {
    if (!incomeForm.label || incomeForm.netAmount <= 0) return;
    const updated = editingIncomeId
      ? incomeSources.map(i => i.id === editingIncomeId ? { ...incomeForm, id: editingIncomeId } : i)
      : [...incomeSources, { ...incomeForm, id: crypto.randomUUID() }];
    syncedUpdate({ ...state, incomeSources: updated }, updated);
    setShowIncomeForm(false); setEditingIncomeId(null); setIncomeForm(blankIncome());
  };
  const removeIncome = (id: string) => {
    const updated = incomeSources.filter(i => i.id !== id);
    syncedUpdate({ ...state, incomeSources: updated }, updated);
  };

  // ── Expense handlers ──────────────────────────────────────────────────────
  const openAddExpense = () => { setEditingExpenseId(null); setExpenseForm(blankExpense()); setShowExpenseForm(true); };
  const openEditExpense = (exp: HouseholdExpense) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({ label: exp.label, amount: exp.amount, category: exp.category, isFixed: exp.isFixed, dueDay: exp.dueDay });
    setShowExpenseForm(true);
  };
  const saveExpense = () => {
    if (!expenseForm.label || expenseForm.amount <= 0) return;
    // Convert non-monthly billing to monthly equivalent
    let monthlyAmount = expenseForm.amount;
    if (expenseForm.isRecurring) {
      if (expenseForm.billingFrequency === 'annual')    monthlyAmount = expenseForm.amount / 12;
      if (expenseForm.billingFrequency === 'quarterly') monthlyAmount = expenseForm.amount / 3;
      if (expenseForm.billingFrequency === 'weekly')    monthlyAmount = expenseForm.amount * 52 / 12;
    }
    const finalExpense = { ...expenseForm, amount: Math.round(monthlyAmount * 100) / 100 };
    const updated = editingExpenseId
      ? householdExpenses.map(e => e.id === editingExpenseId ? { ...finalExpense, id: editingExpenseId } : e)
      : [...householdExpenses, { ...finalExpense, id: crypto.randomUUID() }];
    syncedUpdate({ ...state, householdExpenses: updated }, undefined, updated);
    setShowExpenseForm(false); setEditingExpenseId(null); setExpenseForm(blankExpense());
  };
  const removeExpense = (id: string) => {
    const updated = householdExpenses.filter(e => e.id !== id);
    syncedUpdate({ ...state, householdExpenses: updated }, undefined, updated);
  };

  // ── Asset handlers ────────────────────────────────────────────────────────
  const openAddAsset = () => { setEditingAssetId(null); setAssetForm(blankAsset()); setShowAssetForm(true); };
  const openEditAsset = (a: Asset) => {
    setEditingAssetId(a.id);
    setAssetForm({ label: a.label, amount: a.amount, category: a.category, institution: a.institution || '', lastUpdated: a.lastUpdated });
    setShowAssetForm(true);
  };
  const saveAsset = () => {
    if (!assetForm.label || assetForm.amount < 0) return;
    const updated = editingAssetId
      ? assets.map(a => a.id === editingAssetId ? { ...assetForm, id: editingAssetId, lastUpdated: new Date().toISOString().split('T')[0] } : a)
      : [...assets, { ...assetForm, id: crypto.randomUUID(), lastUpdated: new Date().toISOString().split('T')[0] }];
    onUpdateState({ ...state, assets: updated });
    setShowAssetForm(false); setEditingAssetId(null); setAssetForm(blankAsset());
  };
  const removeAsset = (id: string) => onUpdateState({ ...state, assets: assets.filter(a => a.id !== id) });

  // ── Expense category breakdown ────────────────────────────────────────────
  const expByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    householdExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    map['debt'] = (map['debt'] || 0) + totalDebtMin;
    return Object.entries(map).sort(([,a],[,b]) => b - a);
  }, [householdExpenses, totalDebtMin]);

  const nextPaycheck = useMemo(() => {
    return incomeSources.filter(i => i.isActive && i.nextPayDate)
      .sort((a, b) => (a.nextPayDate || '').localeCompare(b.nextPayDate || ''))[0] || null;
  }, [incomeSources]);

  // ── Shared form ───────────────────────────────────────────────────────────
  const renderIncomeForm = () => (
    <div className="mb-5 p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {editingIncomeId ? 'Edit Income Source' : 'New Income Source'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Label</label>
          <input className={inp} value={incomeForm.label} onChange={e => setInc('label', e.target.value)}
            placeholder="e.g. OneSource Salary, US Foods, Side Hustle" autoFocus />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Employer (optional)</label>
          <input className={inp} value={incomeForm.employer || ''} onChange={e => setInc('employer', e.target.value)}
            placeholder="e.g. OneSource Distributors" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Net (Take-Home) per Paycheck</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
            <input type="number" step="0.01" value={incomeForm.netAmount || ''}
              onChange={e => setInc('netAmount', parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 font-bold" placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Gross per Paycheck</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
            <input type="number" step="0.01" value={incomeForm.grossAmount || ''}
              onChange={e => setInc('grossAmount', parseFloat(e.target.value) || 0)}
              placeholder={autoGross > 0 && !incomeForm.grossAmount ? `~${autoGross}` : '0.00'}
              className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
          {autoGross > 0 && !incomeForm.grossAmount && (
            <button onClick={() => setInc('grossAmount', autoGross)} className="text-[11px] text-blue-600 font-bold mt-1 hover:underline">
              Use ~${autoGross.toLocaleString()} →
            </button>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pay Frequency</label>
          <select className={inp + " cursor-pointer bg-white"} value={incomeForm.frequency} onChange={e => setInc('frequency', e.target.value)}>
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Next Pay Date</label>
          <input type="date" value={incomeForm.nextPayDate || ''} onChange={e => setInc('nextPayDate', e.target.value)} className={inp} />
        </div>
      </div>
      {incomeForm.netAmount > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between text-sm">
          <span className="text-emerald-700">Monthly take-home</span>
          <span className="font-bold text-emerald-700">{fmt(toMonthly(incomeForm.netAmount, incomeForm.frequency))}/mo</span>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={saveIncome} disabled={!incomeForm.label || incomeForm.netAmount <= 0}
          className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
          <Check size={14} /> {editingIncomeId ? 'Save Changes' : 'Add Income'}
        </button>
        <button onClick={() => { setShowIncomeForm(false); setEditingIncomeId(null); setIncomeForm(blankIncome()); }}
          className="px-5 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );

  const renderExpenseForm = () => (
    <div className="mb-5 p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {editingExpenseId ? 'Edit Expense' : 'New Expense'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Label</label>
          <input className={inp} value={expenseForm.label} onChange={e => setExp('label', e.target.value)}
            placeholder="e.g. Rent, Electricity, Netflix" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Monthly Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
            <input type="number" step="0.01" value={expenseForm.amount || ''}
              onChange={e => setExp('amount', parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900" placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Category</label>
          <select className={inp + " cursor-pointer bg-white"} value={expenseForm.category} onChange={e => setExp('category', e.target.value)}>
            {Object.entries(EXPENSE_LABELS).filter(([k]) => k !== 'debt').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Fixed or Variable</label>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setExp('isFixed', v)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${expenseForm.isFixed === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}>
                {v ? 'Fixed' : 'Variable'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Due Day (optional)</label>
          <input type="number" min="1" max="31" value={expenseForm.dueDay || ''}
            onChange={e => setExp('dueDay', parseInt(e.target.value) || undefined)}
            placeholder="e.g. 1, 15" className={inp} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Recurring / Subscription?</label>
          <div className="flex gap-2">
            {[false, true].map(v => (
              <button key={String(v)} onClick={() => setExp('isRecurring', v)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${expenseForm.isRecurring === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}>
                {v ? '🔄 Recurring / Subscription' : 'One-time / Variable'}
              </button>
            ))}
          </div>
          {expenseForm.isRecurring && (
            <div className="mt-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Billing Frequency</label>
              <select className={inp + " cursor-pointer bg-white"} value={expenseForm.billingFrequency || 'monthly'}
                onChange={e => setExp('billingFrequency', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly (÷3 for monthly)</option>
                <option value="annual">Annual (÷12 for monthly)</option>
              </select>
              {expenseForm.billingFrequency === 'annual' && expenseForm.amount > 0 && (
                <p className="text-[11px] text-blue-600 font-bold mt-1">
                  ${expenseForm.amount}/yr = ${(expenseForm.amount / 12).toFixed(2)}/mo — enter the annual amount and we'll convert it
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={saveExpense} disabled={!expenseForm.label || expenseForm.amount <= 0}
          className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
          <Check size={14} /> {editingExpenseId ? 'Save Changes' : 'Add Expense'}
        </button>
        <button onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); setExpenseForm(blankExpense()); }}
          className="px-5 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );

  const renderAssetForm = () => (
    <div className="mb-5 p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {editingAssetId ? 'Edit Account / Asset' : 'New Account / Asset'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Label</label>
          <input className={inp} value={assetForm.label} onChange={e => setAst('label', e.target.value)}
            placeholder="e.g. Chase Checking, Marcus Savings, Fidelity 401k" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Account Type</label>
          <select className={inp + " cursor-pointer bg-white"} value={assetForm.category} onChange={e => setAst('category', e.target.value as AssetCategory)}>
            {Object.entries(ASSET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Current Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
            <input type="number" step="0.01" value={assetForm.amount || ''}
              onChange={e => setAst('amount', parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 font-bold" placeholder="0.00" />
          </div>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Institution (optional)</label>
          <input className={inp} value={assetForm.institution || ''} onChange={e => setAst('institution', e.target.value)}
            placeholder="e.g. Chase, Fidelity, Marcus by Goldman Sachs" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={saveAsset} disabled={!assetForm.label}
          className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
          <Check size={14} /> {editingAssetId ? 'Save Changes' : 'Add Account'}
        </button>
        <button onClick={() => { setShowAssetForm(false); setEditingAssetId(null); setAssetForm(blankAsset()); }}
          className="px-5 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-7 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Financial Hub</h1>
        <p className="text-zinc-500 mt-1">Income, expenses, accounts, and exactly where every dollar goes.</p>
      </div>

      {/* ── Cash Flow Summary ── */}
      <div className="bg-zinc-900 text-white rounded-3xl p-7">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          Monthly Cash Flow
          {(incomeSources.length > 0 || householdExpenses.length > 0) && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full normal-case">✓ Driving payoff math</span>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Take-Home',    val: fmt(totalMonthlyNet, priv),   sub: fmt(totalMonthlyGross, priv) + ' gross',  color: 'text-emerald-400' },
            { label: 'All Expenses', val: fmt(totalAllExp, priv),        sub: fmt(totalMonthlyExp, priv) + ' bills + ' + fmt(totalDebtMin, priv) + ' debt', color: 'text-red-400' },
            { label: 'Debt Budget',  val: fmt(state.monthlyBudget, priv), sub: 'payoff allocation',                   color: 'text-blue-400' },
            { label: 'Remaining',    val: fmt(cashAfterBudget, priv),    sub: cashAfterBudget >= 0 ? 'surplus' : 'shortfall',
              color: cashAfterBudget >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Cash flow bar */}
        {totalMonthlyNet > 0 && (
          <div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
              <div className="bg-red-500" style={{ width: `${Math.min(100, (totalMonthlyExp / totalMonthlyNet) * 100)}%` }} />
              <div className="bg-red-700" style={{ width: `${Math.min(100, (totalDebtMin / totalMonthlyNet) * 100)}%` }} />
              <div className="bg-blue-500" style={{ width: `${Math.min(100, (state.monthlyBudget / totalMonthlyNet) * 100)}%` }} />
              <div className={`flex-1 ${cashAfterBudget >= 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            </div>
            <div className="flex gap-4 text-[10px] text-zinc-400 flex-wrap">
              {[['bg-red-500','Bills'],['bg-red-700','Debt Min'],['bg-blue-500','Payoff Budget'],['bg-emerald-500','Available']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${c} inline-block`}/>{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Budget inline editor */}
        <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Monthly Payoff Budget</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Drives Attack Plan, Paydown Plan, all projections</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">$</span>
            <input type="number" value={state.monthlyBudget}
              onChange={e => onUpdateState({ ...state, monthlyBudget: parseFloat(e.target.value) || 0 })}
              className="w-32 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-bold outline-none focus:bg-white/20 text-right transition-all" />
            <span className="text-zinc-400 text-xs">/mo</span>
          </div>
        </div>
      </div>

      {/* Next paycheck */}
      {nextPaycheck && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-900 text-sm">Next Paycheck — {nextPaycheck.label}</p>
              <p className="text-xs text-emerald-700">{nextPaycheck.nextPayDate}</p>
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmt(nextPaycheck.netAmount, priv)}</p>
        </div>
      )}

      {/* ── Income Sources ── */}
      <Section title="Income Sources" subtitle="Every paycheck and income stream" icon={<TrendingUp size={18} />}
        action={<button onClick={openAddIncome} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"><Plus size={14} /> Add</button>}>
        {showIncomeForm && renderIncomeForm()}
        {incomeSources.length === 0 && !showIncomeForm
          ? <p className="text-sm text-zinc-400 text-center py-6">No income sources yet. Click Add to start.</p>
          : <div className="space-y-2">
              {incomeSources.map(inc => (
                <EditableRow key={inc.id}
                  label={inc.label}
                  sub={`${FREQ_LABELS[inc.frequency]} · ${fmt(inc.netAmount, priv)} net`}
                  value={fmt(toMonthly(inc.netAmount, inc.frequency), priv) + '/mo'}
                  onEdit={() => openEditIncome(inc)}
                  onDelete={() => removeIncome(inc.id)}
                  badge={inc.employer || undefined}
                />
              ))}
              {incomeSources.length > 1 && (
                <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl mt-2">
                  <span className="text-sm font-bold text-emerald-900">Total Monthly Take-Home</span>
                  <span className="text-lg font-bold text-emerald-700">{fmt(totalMonthlyNet, priv)}/mo</span>
                </div>
              )}
            </div>}
      </Section>

      {/* ── Accounts & Assets ── */}
      <Section title="Accounts & Assets" subtitle="Checking, savings, 401k, and other accounts" icon={<Landmark size={18} />}
        action={<button onClick={openAddAsset} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"><Plus size={14} /> Add</button>}>
        {showAssetForm && renderAssetForm()}

        {/* Liquid snapshot */}
        {assets.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Liquid / Available</p>
              <p className="text-xl font-bold text-emerald-700">{fmt(liquidAssets, priv)}</p>
              <p className="text-[10px] text-zinc-400">checking + savings + cash</p>
            </div>
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Assets</p>
              <p className="text-xl font-bold text-zinc-900">{fmt(totalAssets, priv)}</p>
              <p className="text-[10px] text-zinc-400">{assets.length} accounts tracked</p>
            </div>
          </div>
        )}

        {assets.length === 0 && !showAssetForm
          ? <p className="text-sm text-zinc-400 text-center py-6">No accounts added. Add your checking, savings, and 401k accounts.</p>
          : <div className="space-y-2">
              {[...assets].sort((a, b) => b.amount - a.amount).map(asset => (
                <EditableRow key={asset.id}
                  label={asset.label}
                  sub={`${ASSET_LABELS[asset.category] || asset.category}${asset.institution ? ' · ' + asset.institution : ''}${asset.lastUpdated ? ' · Updated ' + asset.lastUpdated : ''}`}
                  value={fmt(asset.amount, priv)}
                  onEdit={() => openEditAsset(asset)}
                  onDelete={() => removeAsset(asset.id)}
                  leftDot={ASSET_COLORS[asset.category] || '#6b7280'}
                />
              ))}
            </div>}
      </Section>

      {/* ── Household Expenses ── */}
      <Section title="Household Expenses" subtitle="Fixed and variable monthly bills" icon={<Home size={18} />}
        action={<button onClick={openAddExpense} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"><Plus size={14} /> Add</button>}>
        {showExpenseForm && renderExpenseForm()}

        {householdExpenses.length === 0 && !showExpenseForm
          ? <p className="text-sm text-zinc-400 text-center py-6">No expenses added. Enter your monthly bills to see cash flow.</p>
          : <div className="space-y-2">
              {/* Category breakdown */}
              {expByCategory.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {expByCategory.map(([cat, amt]) => (
                    <div key={cat} className="p-3 rounded-xl border border-zinc-100 bg-zinc-50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[cat as ExpenseCategory] || '#6b7280' }} />
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{EXPENSE_LABELS[cat as ExpenseCategory] || cat}</p>
                      </div>
                      <p className="text-sm font-bold text-zinc-900">{fmt(amt, priv)}</p>
                    </div>
                  ))}
                </div>
              )}

              {householdExpenses.map(exp => (
                <EditableRow key={exp.id}
                  label={exp.label}
                  sub={`${EXPENSE_LABELS[exp.category]} · ${exp.isFixed ? 'Fixed' : 'Variable'}${exp.dueDay ? ' · Due ' + exp.dueDay + 'th' : ''}`}
                  value={fmt(exp.amount, priv) + '/mo'}
                  onEdit={() => openEditExpense(exp)}
                  onDelete={() => removeExpense(exp.id)}
                  leftDot={EXPENSE_COLORS[exp.category]}
                />
              ))}

              {/* Debt minimums */}
              {totalDebtMin > 0 && (
                <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900 text-sm">Debt Minimums</p>
                    <p className="text-[11px] text-red-400">{state.cards.length} cards · auto-calculated</p>
                  </div>
                  <span className="font-bold text-red-700">{fmt(totalDebtMin, priv)}/mo</span>
                </div>
              )}

              <div className="flex justify-between items-center px-4 py-3 bg-red-50 border border-red-100 rounded-2xl mt-2">
                <span className="text-sm font-bold text-red-900">Total Monthly Outflow</span>
                <span className="text-lg font-bold text-red-700">{fmt(totalAllExp, priv)}/mo</span>
              </div>
            </div>}
      </Section>

      {/* ── Recurring Subscriptions Quick-Add ── */}
      <Section title="Recurring Subscriptions" subtitle="Streaming, phone, gym, and other recurring charges" icon={<TrendingDown size={18} />}>
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-3">Tap any service to add it. Edit the amount to match your actual bill.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SUBSCRIPTION_TEMPLATES.map(t => {
              const alreadyAdded = householdExpenses.some(e => e.label === t.label);
              return (
                <button key={t.label}
                  onClick={() => {
                    if (alreadyAdded) return;
                    const newExp: HouseholdExpense = {
                      id: crypto.randomUUID(), label: t.label, amount: t.amount,
                      category: t.category, isFixed: true, isRecurring: true, billingFrequency: 'monthly',
                    };
                    const updated = [...householdExpenses, newExp];
                    syncedUpdate({ ...state, householdExpenses: updated }, undefined, updated);
                  }}
                  disabled={alreadyAdded}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    alreadyAdded
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-100 text-zinc-700 cursor-pointer'
                  }`}>
                  <div className="flex justify-between items-start">
                    <span className="font-bold leading-snug">{t.label}</span>
                    {alreadyAdded && <span className="text-emerald-500 text-[10px]">✓</span>}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${alreadyAdded ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    ${t.amount}/mo
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of added recurring expenses */}
        {householdExpenses.filter(e => e.isRecurring || e.category === 'subscriptions').length > 0 && (
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Your Recurring Charges — {fmt(householdExpenses.filter(e => e.isRecurring || e.category === 'subscriptions').reduce((s,e) => s + e.amount, 0), priv)}/mo total
            </p>
            {householdExpenses
              .filter(e => e.isRecurring || e.category === 'subscriptions')
              .sort((a, b) => b.amount - a.amount)
              .map(exp => (
                <EditableRow key={exp.id}
                  label={exp.label}
                  sub={EXPENSE_LABELS[exp.category]}
                  value={fmt(exp.amount, priv) + '/mo'}
                  onEdit={() => openEditExpense(exp)}
                  onDelete={() => removeExpense(exp.id)}
                  leftDot={EXPENSE_COLORS[exp.category]}
                />
              ))}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 mt-2">
              <Info size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-[11px] text-amber-800">
                Recurring charges you can cancel would directly increase your debt payoff power. Even cutting $50/mo of subscriptions = {fmt(50 * 12)}/yr available for debt.
              </p>
            </div>
          </div>
        )}
      </Section>


      {totalMonthlyNet > 0 && incomeSources.length > 0 && (
        <Section title="Paycheck Allocation" subtitle="Where each dollar goes from every paycheck" icon={<PieChart size={18} />}>
          <div className="space-y-4">
            {incomeSources.filter(i => i.isActive).map(inc => {
              const perCheck   = inc.netAmount;
              const factor     = toMonthly(1, inc.frequency);
              const billsShare = totalMonthlyExp / factor;
              const debtShare  = totalDebtMin    / factor;
              const budgetShare= state.monthlyBudget / factor;
              const leftover   = Math.max(0, perCheck - billsShare - debtShare - budgetShare);
              return (
                <div key={inc.id} className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-zinc-900">{inc.label}</p>
                    <p className="text-sm font-bold text-emerald-600">{fmt(perCheck, priv)} / check</p>
                  </div>
                  {[
                    { label: 'Household bills',   val: billsShare,   color: 'bg-blue-400'    },
                    { label: 'Debt minimums',      val: debtShare,    color: 'bg-red-400'     },
                    { label: 'Payoff budget',      val: budgetShare,  color: 'bg-violet-500'  },
                    { label: 'Available',          val: leftover,     color: 'bg-emerald-500' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${row.color}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-zinc-600">{row.label}</span>
                          <span className="font-bold text-zinc-900">{fmt(row.val, priv)}</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(100, (row.val / perCheck) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-400 w-8 text-right">{Math.round((row.val / perCheck) * 100)}%</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {cashAfterBudget > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-bold">{fmt(cashAfterBudget, priv)}/mo left over.</span> Putting even half of this toward debt would accelerate payoff significantly. Adjust the budget above or go to Attack Plan → Extra Payment Simulator to model it.
                </p>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
};

export default FinancialHubPage;
