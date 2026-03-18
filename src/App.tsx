/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Tag, 
  FileText, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Check,
  Settings as SettingsIcon,
  AlertCircle,
  ChevronRight,
  Plus,
  Download,
  Upload,
  Info,
  Zap,
  Clock,
  CheckCircle,
  Trash2,
  Save,
  X,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Activity,
  History,
  Camera,
  Scan,
  Brain,
  Wallet,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { AppState, Card, PayoffStrategy, PromoConfidence, PromoType, Promo, CalendarEvent, AccountType, MonthlyReview, Statement, CardNetwork } from './types';
import { loadState, saveState } from './utils/storage';
import { getStrategyRaceInsight, getBrightPlan, scanStatementImage, getCalendarDaySummary } from './utils/claudeAI';
import { NetWorthPage } from './pages/NetWorthPage';
import { UtilizationPage } from './pages/UtilizationPage';
import { AttackPlanPage } from './pages/AttackPlanPage';
import { BalanceTransferPage } from './pages/BalanceTransferPage';
import { SnowflakingPage } from './pages/SnowflakingPage';
import { ScenarioBuilderPage } from './pages/ScenarioBuilderPage';
import { InterestTrackerPage } from './pages/InterestTrackerPage';
import { CardWizardPage } from './pages/CardWizardPage';
import { BnplOverviewPage } from './pages/BnplOverviewPage';
import { FinancialHubPage } from './pages/FinancialHubPage';
import { QuickAddPage } from './pages/QuickAddPage';
import { ToastContainer, NotificationBell, useInAppNotifications } from './components/NotificationSystem';
import { useNotifications, requestNotificationPermission, getNotificationPermission } from './utils/notifications';
import { 
  calculateMonthlyInterest, 
  getUtilization, 
  getDaysUntilDue, 
  getDaysUntilPromoExpiry,
  generatePayoffPlan,
  compareStrategies,
  calculateNoSpendImpact
} from './utils/debtLogic';
import { exportCardsToCSV, exportDueDatesToICS } from './utils/export';
import { exportPayoffPlanToPDF, exportStatementsToPDF } from './utils/pdfExport';
import { supabase, isSupabaseConfigured, testSupabaseConnection } from './lib/supabase';
import { syncToSupabase, loadFromSupabase } from './utils/storage';
import { User } from '@supabase/supabase-js';
import { SAMPLE_CARDS } from './data/sampleData';
import { BarChart2, FlaskConical, DollarSign, ShoppingBag } from 'lucide-react';

// --- Components ---

const formatCurrency = (amount: number, isPrivacyMode: boolean = false) => {
  if (isPrivacyMode) return '••••••';
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const SidebarItem = ({ icon: Icon, label, active, onClick, mobile }: { icon: any, label: string, active: boolean, onClick: () => void, mobile?: boolean }) => (
  <button
    onClick={onClick}
    className={mobile
      ? `flex flex-col items-center gap-1 px-2 py-1 transition-colors ${active ? 'text-blue-600' : 'text-zinc-400'}`
      : `sidebar-item ${active ? 'active' : ''}`
    }
  >
    <Icon size={mobile ? 18 : 16} />
    <span className={mobile ? 'text-[10px] font-bold' : 'text-[13px]'}>{label}</span>
  </button>
);

const StatCard = ({ label, value, subValue, trend, isPrivacyMode }: { label: string, value: string, subValue?: string, trend?: string, isPrivacyMode?: boolean }) => (
  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
    <p className="text-sm font-medium text-zinc-500 mb-1">{label}</p>
    <h3 className="text-2xl font-bold text-zinc-900">{isPrivacyMode ? '••••••' : value}</h3>
    {subValue && <p className="text-xs text-zinc-400 mt-1">{subValue}</p>}
    {trend && <p className={`text-xs mt-2 ${trend.startsWith('+') ? 'text-red-500' : 'text-emerald-500'}`}>{trend}</p>}
  </div>
);

interface RealisticCardProps {
  card: Card;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  isPrivacyMode?: boolean;
  key?: string | number;
}

function RealisticCard({ card, isSelected, onClick, onDelete, isPrivacyMode }: RealisticCardProps) {
  const utilization  = getUtilization(card);
  const daysUntilDue = getDaysUntilDue(card.dueDate);
  const isDueSoon    = daysUntilDue <= 7;
  const isBNPL       = card.accountType === AccountType.BNPL;
  const activePromos = card.promos.filter(p => new Date(p.expirationDate) > new Date());
  const hasPromo0    = activePromos.some(p => p.rate === 0);
  const effectiveAPR = hasPromo0 ? 0 : card.apr;
  const monthlyInt   = effectiveAPR > 0 ? Math.round(card.balance * card.apr / 100 / 12) : 0;
  const cardColor    = card.color || '#18181b';

  return (
    <motion.div layout onClick={onClick}
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer shadow-md transition-all group ${
        isSelected ? 'ring-4 ring-zinc-900 ring-offset-2' : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}>

      {/* Card face */}
      <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${cardColor}ee, ${cardColor}88)` }}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top row */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {card.accountType === AccountType.PAYPAL_CREDIT ? 'PayPal' : card.bank}
            </p>
            <p className="text-base font-bold leading-tight mt-0.5">{card.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 bg-white/10 hover:bg-red-500/80 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            )}
            <span className="italic font-black text-sm opacity-80">
              {card.network === CardNetwork.VISA && 'VISA'}
              {card.network === CardNetwork.MASTERCARD && 'MC'}
              {card.network === CardNetwork.AMEX && 'AMEX'}
              {card.network === CardNetwork.DISCOVER && 'DISC'}
              {card.network === CardNetwork.PAYPAL && 'PP'}
              {isBNPL && (card.bnplPlatform || 'BNPL').slice(0,4).toUpperCase()}
              {(!card.network || card.network === CardNetwork.OTHER) && !isBNPL && 'CARD'}
            </span>
          </div>
        </div>

        {/* Card number */}
        <p className="text-xs font-mono tracking-widest opacity-50 mb-3">
          {isBNPL ? (card.bnplPlatform || 'BNPL') : `•••• •••• •••• ${card.lastFour}`}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/25 rounded-xl px-2.5 py-2">
            <p className="text-[9px] uppercase opacity-60 tracking-wider">Balance</p>
            <p className="text-sm font-bold">{isPrivacyMode ? '••••' : `$${card.balance.toLocaleString()}`}</p>
          </div>
          <div className="bg-black/25 rounded-xl px-2.5 py-2">
            <p className="text-[9px] uppercase opacity-60 tracking-wider">Limit</p>
            <p className="text-sm font-bold">
              {card.limit > 0 ? (isPrivacyMode ? '••••' : `$${card.limit.toLocaleString()}`) : '—'}
            </p>
          </div>
          <div className={`rounded-xl px-2.5 py-2 ${effectiveAPR === 0 && card.apr > 0 ? 'bg-emerald-500/40' : 'bg-black/25'}`}>
            <p className="text-[9px] uppercase opacity-60 tracking-wider">APR</p>
            <p className="text-sm font-bold">
              {effectiveAPR === 0 && card.apr > 0
                ? <span className="text-emerald-200">0% <span className="text-[9px] normal-case font-normal opacity-80">promo</span></span>
                : `${card.apr}%`}
            </p>
          </div>
        </div>

        {/* Utilization bar */}
        {utilization > 0 && (
          <div className="mt-3">
            <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${utilization >= 80 ? 'bg-red-400' : utilization >= 30 ? 'bg-amber-300' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(utilization, 100)}%` }} />
            </div>
            <p className="text-[9px] opacity-40 mt-0.5 text-right">{utilization}% utilization</p>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="bg-white border-t border-zinc-100 px-5 py-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Min Pay</p>
          <p className="text-sm font-bold text-zinc-900">
            {isPrivacyMode ? '••••' : `$${card.minPayment.toLocaleString()}`}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Due</p>
          <p className={`text-sm font-bold ${isDueSoon ? 'text-red-600' : 'text-zinc-900'}`}>
            {isBNPL && card.bnplNextPaymentDate
              ? new Date(card.bnplNextPaymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : `${card.dueDate}th`}
            {isDueSoon && !isBNPL && <span className="ml-1 text-[9px] text-red-500 font-normal">{daysUntilDue}d</span>}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Interest</p>
          <p className={`text-sm font-bold ${effectiveAPR === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {effectiveAPR === 0 ? '$0/mo' : isPrivacyMode ? '••••' : `$${monthlyInt}/mo`}
          </p>
        </div>
      </div>

      {/* Promo strips */}
      {activePromos.map(promo => {
        const days = Math.ceil((new Date(promo.expirationDate).getTime() - Date.now()) / 864e5);
        const isDeferred = promo.type === 'Deferred Interest';
        const isUrgent   = days <= 60;
        return (
          <div key={promo.id}
            className={`px-5 py-2 flex items-center justify-between text-xs font-bold border-t ${
              isDeferred ? 'bg-red-50 border-red-200 text-red-700'
              : isUrgent  ? 'bg-amber-50 border-amber-200 text-amber-700'
              :              'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
            <span>
              {isDeferred ? '⚠ Deferred Interest' : '✓ ' + promo.type}
              {promo.amount > 0 && !isPrivacyMode && ` · $${promo.amount.toLocaleString()}`}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              isDeferred ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              {days}d · {promo.expirationDate}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}
const getAprColorClass = (apr: number) => {
  if (apr === 0) return 'bg-emerald-50 border-emerald-200';
  if (apr < 15) return 'bg-emerald-50 border-emerald-200';
  if (apr < 25) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
};

const getAprIconColor = (apr: number) => {
  if (apr === 0) return '#10b981';
  if (apr < 15) return '#059669';
  if (apr < 25) return '#d97706';
  return '#dc2626';
};

const getUtilizationColorClass = (utilization: number) => {
  if (utilization < 30) return 'bg-emerald-500';
  if (utilization < 80) return 'bg-amber-500';
  return 'bg-red-500';
};

interface CardListItemProps {
  card: Card;
  onClick: () => void;
  onDelete?: () => void;
  onLogPayment?: (card: Card) => void;
  isPrivacyMode?: boolean;
  key?: string;
}

const DebtProgressChart = ({ state }: { state: AppState }) => {
  const data = useMemo(() => {
    // Group statements by month
    const monthlyData: Record<string, number> = {};
    
    state.statements.forEach(s => {
      const month = s.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + s.balance;
    });

    // Add current state as the latest point
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentTotal = state.cards.reduce((sum, c) => sum + c.balance, 0);
    monthlyData[currentMonth] = currentTotal;

    return Object.entries(monthlyData)
      .map(([month, balance]) => ({ month, balance }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [state.statements, state.cards]);

  if (data.length < 2) return null;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <History className="text-indigo-600" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Debt Payoff Progress</h2>
          <p className="text-xs text-zinc-500">Visualizing your journey to zero.</p>
        </div>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickFormatter={(val) => new Date(val + '-01').toLocaleDateString(undefined, { month: 'short' })}
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, 'Total Debt']}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="#18181b" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#18181b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CardListItem = ({ card, onClick, onDelete }: CardListItemProps) => {
  const daysUntilDue = getDaysUntilDue(card.dueDate);
  const isDueSoon = daysUntilDue <= 7;
  const aprColorClass = getAprColorClass(card.apr);
  const iconColor = getAprIconColor(card.apr);
  const utilization = getUtilization(card);
  const utilColorClass = getUtilizationColorClass(utilization);

  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer group ${aprColorClass}`}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
          style={{ backgroundColor: iconColor }}
        >
          {card.bank.substring(0, 3).toUpperCase()}
        </div>
        <div>
          <h4 className="font-semibold text-zinc-900">{card.name}</h4>
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-600 font-medium">•••• {card.lastFour} | {card.apr}% APR</p>
            {card.apr >= 25 && <AlertCircle size={12} className="text-red-500" />}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div className="w-24 text-left hidden md:block">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-500 uppercase font-bold">Score</span>
            <span className="font-bold text-zinc-700">{card.creditScore || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-500 uppercase font-bold">Util</span>
            <span className={`font-bold ${utilization >= 80 ? 'text-red-600' : 'text-zinc-700'}`}>{utilization.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${utilColorClass}`} 
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900">${card.balance.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Balance</p>
        </div>
        <div className="w-24">
          <p className={`text-sm font-bold ${isDueSoon ? 'text-red-600' : 'text-zinc-700'}`}>
            {isDueSoon ? 'Due in ' : ''}{daysUntilDue} days
          </p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Next Due</p>
        </div>
        {onDelete && (
          <div 
            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-zinc-300 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={16} />
          </div>
        )}
        <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
      </div>
    </div>
  );
};

const PromoBadge = ({ confidence }: { confidence: PromoConfidence }) => {
  const colors = {
    [PromoConfidence.CONFIRMED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [PromoConfidence.INFERRED]: 'bg-amber-100 text-amber-700 border-amber-200',
    [PromoConfidence.UNKNOWN]: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[confidence]}`}>
      {confidence}
    </span>
  );
};

// --- Shared Components ---

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-xl font-bold text-zinc-900 mb-2">{title}</h3>
        <p className="text-zinc-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Pages ---

const StrategyRaceCard = ({ state, onUpdateState }: { state: AppState, onUpdateState: (s: AppState) => void }) => {
  const comparisons = useMemo(() => compareStrategies(state.cards, state.monthlyBudget), [state.cards, state.monthlyBudget]);
  const avalanche = comparisons.find(c => c.strategy === PayoffStrategy.AVALANCHE)!;
  const snowball = comparisons.find(c => c.strategy === PayoffStrategy.SNOWBALL)!;
  
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const fetchAiInsight = async () => {
    if (state.cards.length === 0) return;
    setIsLoadingInsight(true);
    try {
      const text = await getStrategyRaceInsight({
        avalancheInterest: avalanche.totalInterest,
        snowballInterest: snowball.totalInterest,
        avalancheMonths: avalanche.monthsToPayoff,
        snowballMonths: snowball.monthsToPayoff,
        snowballFirstWin: snowball.monthsToFirstWin,
        avalancheFirstWin: avalanche.monthsToFirstWin,
      });
      setAiInsight(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchAiInsight();
  }, [state.cards, state.monthlyBudget]);

  const activeStrategy = state.preferredStrategy;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm overflow-hidden relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">The Strategy Race</h2>
          <p className="text-sm text-zinc-500">Math vs. Momentum</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          {[PayoffStrategy.AVALANCHE, PayoffStrategy.SNOWBALL].map(s => (
            <button
              key={s}
              onClick={() => onUpdateState({ ...state, preferredStrategy: s })}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeStrategy === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        {/* Avalanche Side */}
        <div className={`space-y-4 p-6 rounded-2xl transition-all ${activeStrategy === PayoffStrategy.AVALANCHE ? 'bg-zinc-900 text-white' : 'bg-zinc-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className={activeStrategy === PayoffStrategy.AVALANCHE ? 'text-emerald-400' : 'text-zinc-400'} />
            <h3 className="text-xs font-bold uppercase tracking-widest">Avalanche (Math)</h3>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">${Math.round(avalanche.totalInterest).toLocaleString()}</p>
            <p className="text-[10px] opacity-60 uppercase font-bold">Total Interest Paid</p>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm font-medium">{avalanche.monthsToPayoff} months to zero</p>
          </div>
        </div>

        {/* Snowball Side */}
        <div className={`space-y-4 p-6 rounded-2xl transition-all ${activeStrategy === PayoffStrategy.SNOWBALL ? 'bg-zinc-900 text-white' : 'bg-zinc-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className={activeStrategy === PayoffStrategy.SNOWBALL ? 'text-blue-400' : 'text-zinc-400'} />
            <h3 className="text-xs font-bold uppercase tracking-widest">Snowball (Win)</h3>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{snowball.monthsToFirstWin} Months</p>
            <p className="text-[10px] opacity-60 uppercase font-bold">To First Card Paid Off</p>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm font-medium">${Math.round(snowball.totalInterest).toLocaleString()} total interest</p>
          </div>
        </div>

        {/* VS Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-[10px] font-black text-zinc-400 z-10 hidden md:flex">
          VS
        </div>
      </div>

      <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <Activity size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-900 mb-1">AI Race Insight</p>
          {isLoadingInsight ? (
            <div className="h-4 w-48 bg-emerald-200/50 animate-pulse rounded" />
          ) : (
            <p className="text-xs text-emerald-700 leading-relaxed">{aiInsight || "Add cards to see the AI race update."}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MonthlyPaymentBreakdown = ({ state, plan }: { state: AppState, plan: any[] }) => {
  const currentMonth = plan[0];
  if (!currentMonth) return null;

  const totalMin = state.cards.reduce((sum, c) => sum + c.minPayment, 0);
  const totalPayment = currentMonth.payments.reduce((sum, p) => sum + p.amount, 0);
  const extraAmount = totalPayment - totalMin;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-xl">
            <Wallet className="text-zinc-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Monthly Payment Breakdown</h2>
            <p className="text-xs text-zinc-500">How your budget is distributed this month.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full">
          <CalendarIcon size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-600">
            {new Date(currentMonth.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Minimums</p>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalMin, state.isPrivacyMode)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Required to stay current</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Extra Payment</p>
          <p className="text-2xl font-bold text-emerald-700">+{formatCurrency(extraAmount, state.isPrivacyMode)}</p>
          <p className="text-[10px] text-emerald-600 mt-1">Tackling your debt faster</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-2xl">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Monthly Bill</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalPayment, state.isPrivacyMode)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Your total debt commitment</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Payment Distribution</p>
        <div className="overflow-hidden border border-zinc-100 rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Card</th>
                <th className="px-4 py-3">Min Payment</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currentMonth.payments.map(p => {
                const card = state.cards.find(c => c.id === p.cardId);
                if (!card) return null;
                const extra = p.amount - card.minPayment;
                return (
                  <tr key={p.cardId} className={extra > 0 ? 'bg-emerald-50/30' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                        <span className="font-medium text-zinc-900">{card.name}</span>
                        {extra > 0 && (
                          <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">Target</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatCurrency(card.minPayment, state.isPrivacyMode)}</td>
                    <td className="px-4 py-3">
                      {extra > 0 ? (
                        <div className="flex items-center gap-1">
                          <Zap size={10} className="text-emerald-500 fill-emerald-500" />
                          <span className="font-bold text-emerald-600">+{formatCurrency(extra, state.isPrivacyMode)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-900">{formatCurrency(p.amount, state.isPrivacyMode)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ state, onUpdateState, onNavigateToCards }: { state: AppState; onUpdateState: (newState: AppState) => void; onNavigateToCards: (id?: string) => void }) => {
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [extraBudget, setExtraBudget] = useState(0);
  const [paymentCard, setPaymentCard] = useState<Card | null>(null);
  
  const totalDebt = state.cards.reduce((sum, c) => sum + c.balance, 0);
  const bnplCards = state.cards.filter(c => c.accountType === AccountType.BNPL || c.bnplNextPaymentDate);
  const bnplDebt = bnplCards.reduce((sum, c) => sum + c.balance, 0);
  const revolvingCards = state.cards.filter(c => c.accountType !== AccountType.BNPL);
  const revolvingDebt = revolvingCards.reduce((sum, c) => sum + c.balance, 0);
  const revolvingLimit = revolvingCards.reduce((sum, c) => sum + c.limit, 0);
  const avgApr = state.cards.reduce((sum, c) => sum + (c.apr * c.balance), 0) / (totalDebt || 1);
  const monthlyInterest = state.cards.reduce((sum, c) => sum + calculateMonthlyInterest(c), 0);
  const totalMinPayment = state.cards.reduce((sum, c) => sum + c.minPayment, 0);
  
  const plan = generatePayoffPlan(state.cards, state.monthlyBudget, state.preferredStrategy);
  const currentMonthPlan = plan[0];
  const targetCardId = currentMonthPlan?.payments.find(p => {
    const card = state.cards.find(c => c.id === p.cardId);
    return card && p.amount > card.minPayment;
  })?.cardId;
  const targetCard = state.cards.find(c => c.id === targetCardId);

  const payoffDate = (() => {
    if (plan.length === 0) return new Date();
    const d = new Date();
    d.setMonth(d.getMonth() + plan.length);
    return d;
  })();
  const totalInterestPaid = plan.reduce((sum, step) => sum + step.totalInterest, 0);

  const simulatedPlan = useMemo(() => {
    return generatePayoffPlan(state.cards, state.monthlyBudget + extraBudget, state.preferredStrategy);
  }, [state.cards, state.monthlyBudget, extraBudget, state.preferredStrategy]);

  const simulatedPayoffDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + simulatedPlan.length);
    return d;
  })();
  const simulatedInterestPaid = simulatedPlan.reduce((sum, step) => sum + step.totalInterest, 0);

  const monthsSaved = plan.length - simulatedPlan.length;
  const interestSaved = totalInterestPaid - simulatedInterestPaid;

  const upcomingDue = state.cards
    .map(c => {
      // BNPL: use actual next payment date if available
      if (c.bnplNextPaymentDate) {
        const days = Math.ceil((new Date(c.bnplNextPaymentDate).getTime() - Date.now()) / 864e5);
        return { ...c, days: Math.max(0, days) };
      }
      return { ...c, days: getDaysUntilDue(c.dueDate) };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const reminders = useMemo(() => {
    const list: { id: string; title: string; date: string; days: number; type: string; color?: string }[] = [];
    
    // Card reminders
    state.cards.forEach(card => {
      if (card.reminderEnabled) {
        const daysUntil = getDaysUntilDue(card.dueDate);
        if (daysUntil <= (card.reminderDaysBefore || 0)) {
          list.push({
            id: `rem-card-${card.id}`,
            title: `Payment: ${card.name}`,
            date: `Due in ${daysUntil} days`,
            days: daysUntil,
            type: 'card',
            color: card.color
          });
        }
      }
    });

    // Manual event reminders
    state.manualEvents?.forEach(event => {
      if (event.reminderEnabled) {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let diffDays = -1;
        
        if (event.recurrence === 'monthly') {
          const dayOfMonth = eventDate.getDate();
          const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
          const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
          
          const diffCurrent = Math.ceil((currentMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const diffNext = Math.ceil((nextMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffCurrent >= 0) {
            diffDays = diffCurrent;
          } else {
            diffDays = diffNext;
          }
          
          // Don't show if the event hasn't reached its start date yet
          if (today < eventDate) {
            const startDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            diffDays = startDiff;
          }
        } else {
          eventDate.setHours(0, 0, 0, 0);
          const diffTime = eventDate.getTime() - today.getTime();
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        if (diffDays >= 0 && diffDays <= (event.reminderDaysBefore || 0)) {
          list.push({
            id: `rem-event-${event.id}`,
            title: event.title + (event.recurrence === 'monthly' ? ' (Monthly)' : ''),
            date: diffDays === 0 ? 'Today' : `In ${diffDays} days`,
            days: diffDays,
            type: 'event',
            color: event.color
          });
        }
      }
    });

    return list.sort((a, b) => a.days - b.days);
  }, [state.cards, state.manualEvents]);

  const expiringPromos = state.cards
    .flatMap(c => c.promos.map(p => ({ ...p, cardName: c.name, days: getDaysUntilPromoExpiry(p.expirationDate) })))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const chartData = state.cards.map(c => ({
    name: c.name,
    value: c.balance,
    color: c.color
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Command Center</h1>
          <p className="text-zinc-500">Executive overview of your debt landscape.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const newId = crypto.randomUUID();
              const newCard: Card = {
                id: newId,
                accountType: AccountType.CREDIT_CARD,
                name: 'New Account',
                bank: 'Bank Name',
                lastFour: '0000',
                balance: 0,
                limit: 5000,
                apr: 19.99,
                minPayment: 35,
                dueDate: 1,
                promos: [],
                color: '#18181b'
              };
              onUpdateState({ ...state, cards: [...state.cards, newCard] });
              onNavigateToCards(newId);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-all"
          >
            <Plus size={16} /> Add Account
          </button>
          <button 
            onClick={() => exportCardsToCSV(state.cards)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Executive Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Debt" 
          value={formatCurrency(totalDebt, state.isPrivacyMode)} 
          subValue={bnplDebt > 0 ? `${formatCurrency(bnplDebt, state.isPrivacyMode)} BNPL · ${((revolvingDebt/revolvingLimit)*100 || 0).toFixed(1)}% Revolving Util.` : revolvingLimit > 0 ? `${((revolvingDebt/revolvingLimit)*100).toFixed(1)}% Revolving Util.` : 'N/A Util.'}
          trend={totalDebt > 0 ? "-1.2%" : undefined}
          isPrivacyMode={state.isPrivacyMode}
        />
        <StatCard 
          label="Monthly Interest" 
          value={formatCurrency(monthlyInterest, state.isPrivacyMode)} 
          subValue={`Avg APR: ${avgApr.toFixed(2)}%`} 
          trend="-4.1%"
          isPrivacyMode={state.isPrivacyMode}
        />
        <StatCard 
          label="Active Promos" 
          value={state.cards.reduce((sum, c) => sum + c.promos.length, 0).toString()} 
          subValue="Protected Balances"
          trend="+1"
        />
        <StatCard 
          label="Debt Free" 
          value={payoffDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} 
          subValue={`In ${plan.length} months`}
          trend="-2 months"
        />
      </div>

      {/* Monthly Execution Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-100 rounded-xl">
              <Wallet className="text-zinc-600" size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Monthly Baseline</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Total Minimums</p>
              <p className="text-3xl font-bold text-zinc-900">{formatCurrency(totalMinPayment, state.isPrivacyMode)}</p>
              <p className="text-xs text-zinc-500 mt-1">Amount needed to stay current on all accounts.</p>
            </div>
            <div className="pt-4 border-t border-zinc-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Total Budget</span>
                <span className="font-bold text-zinc-900">{formatCurrency(state.monthlyBudget, state.isPrivacyMode)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-zinc-500">Extra Payoff Power</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(state.monthlyBudget - totalMinPayment, state.isPrivacyMode)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-6 bg-zinc-900 text-white rounded-3xl shadow-xl shadow-zinc-200">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Target className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold">Current Strategy: {state.preferredStrategy}</h3>
                <p className="text-xs text-zinc-400">Targeting high-impact debt for maximum efficiency.</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
              Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Target Card */}
            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Primary Target</p>
              {targetCard ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: targetCard.color }}>
                      {targetCard.bank[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{targetCard.name}</p>
                      <p className="text-[10px] text-zinc-400">•••• {targetCard.lastFour}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">This Month's Payment</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatCurrency(currentMonthPlan?.payments.find(p => p.cardId === targetCard.id)?.amount || 0, state.isPrivacyMode)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Min Due</p>
                      <p className="text-sm font-medium text-zinc-300">{formatCurrency(targetCard.minPayment, state.isPrivacyMode)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-dashed border-white/20 rounded-2xl text-center">
                  <p className="text-xs text-zinc-400 italic">No target card identified. Check your budget.</p>
                </div>
              )}
            </div>

            {/* Other Minimums */}
            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Other Minimums</p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {state.cards.filter(c => c.id !== targetCardId).map(card => (
                  <div key={card.id} className="flex justify-between items-center p-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                      <span className="text-xs font-medium">{card.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{formatCurrency(card.minPayment, state.isPrivacyMode)}</p>
                      <p className="text-[8px] text-zinc-500 uppercase">Due: {card.dueDate}th</p>
                    </div>
                  </div>
                ))}
                {state.cards.filter(c => c.id !== targetCardId).length === 0 && (
                  <p className="text-[10px] text-zinc-500 italic">No other cards.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Payment Simulator */}
      <section className="p-8 bg-emerald-900 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-xl">
              <TrendingDown className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold italic serif">Extra Payment Simulator</h2>
              <p className="text-emerald-300/70 text-sm">See how much faster you could be debt-free.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/50">Extra Monthly Contribution</label>
                  <span className="text-3xl font-bold text-white font-mono">{formatCurrency(extraBudget, state.isPrivacyMode)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5000" 
                  step="50" 
                  value={extraBudget}
                  onChange={(e) => setExtraBudget(parseInt(e.target.value))}
                  className="w-full h-2 bg-emerald-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-bold text-emerald-300/30 font-mono">
                  <span>$0</span>
                  <span>$2,500</span>
                  <span>$5,000</span>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <p className="text-xs text-emerald-300/70 leading-relaxed">
                  "By adding <span className="text-white font-bold">${extraBudget}</span> to your monthly budget, you're not just paying debt—you're buying back your future time."
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-emerald-800/50 border border-emerald-700/50 rounded-3xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Time Saved</p>
                <p className="text-4xl font-bold text-white">{monthsSaved} <span className="text-sm font-normal text-emerald-300">months</span></p>
                <p className="text-[10px] text-emerald-300/50 mt-2">Earlier freedom date</p>
              </div>
              <div className="p-6 bg-emerald-800/50 border border-emerald-700/50 rounded-3xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Interest Saved</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(Math.round(interestSaved), state.isPrivacyMode)}</p>
                <p className="text-[10px] text-emerald-300/50 mt-2">Money kept in your pocket</p>
              </div>
              <div className="col-span-2 p-6 bg-white text-emerald-900 rounded-3xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">New Debt-Free Date</p>
                  <p className="text-2xl font-bold">
                    {simulatedPayoffDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Efficiency Boost</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {plan.length > 0 ? Math.round((monthsSaved / plan.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Financial Overview ── */}
      {(state.incomeSources?.length || 0) > 0 || (state.householdExpenses?.length || 0) > 0 ? (() => {
        const toMonthlyAmt = (amount: number, freq: string) => {
          if (freq === 'weekly') return amount * 52 / 12;
          if (freq === 'biweekly') return amount * 26 / 12;
          if (freq === 'semimonthly') return amount * 2;
          return amount;
        };
        const monthlyNet   = (state.incomeSources || []).filter(i => i.isActive).reduce((s, i) => s + toMonthlyAmt(i.netAmount, i.frequency), 0);
        const monthlyExp   = (state.householdExpenses || []).reduce((s, e) => s + e.amount, 0);
        const totalDebtMin = state.cards.reduce((s, c) => s + c.minPayment, 0);
        const totalOut     = monthlyExp + totalDebtMin + state.monthlyBudget;
        const surplus      = monthlyNet - totalOut;
        const subs         = (state.householdExpenses || []).filter(e => e.isRecurring || e.category === 'subscriptions');
        const subsTotal    = subs.reduce((s, e) => s + e.amount, 0);
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Monthly Income',    val: formatCurrency(monthlyNet, state.isPrivacyMode),   sub: 'take-home',           dark: true   },
              { label: 'Bills & Expenses',  val: formatCurrency(monthlyExp, state.isPrivacyMode),   sub: 'household',           bad: true    },
              { label: 'Debt Payments',     val: formatCurrency(totalDebtMin, state.isPrivacyMode), sub: 'min payments',        warn: true   },
              { label: 'Subscriptions',     val: formatCurrency(subsTotal, state.isPrivacyMode),    sub: `${subs.length} services`, warn: subsTotal > 100 },
              { label: 'Monthly Surplus',   val: formatCurrency(surplus, state.isPrivacyMode),      sub: surplus >= 0 ? 'available' : 'shortfall',
                good: surplus >= 0, bad2: surplus < 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-4 border ${
                (s as any).dark  ? 'bg-zinc-900 border-zinc-800' :
                (s as any).bad   ? 'bg-red-50 border-red-100' :
                (s as any).warn  ? 'bg-amber-50 border-amber-100' :
                (s as any).good  ? 'bg-emerald-50 border-emerald-100' :
                (s as any).bad2  ? 'bg-red-50 border-red-200' :
                'bg-white border-zinc-200'
              }`}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${
                  (s as any).dark ? 'text-white' :
                  (s as any).bad  ? 'text-red-600' :
                  (s as any).warn ? 'text-amber-700' :
                  (s as any).good ? 'text-emerald-600' :
                  (s as any).bad2 ? 'text-red-600' :
                  'text-zinc-900'
                }`}>{s.val}</p>
                <p className={`text-[10px] mt-0.5 ${(s as any).dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
              </div>
            ))}
          </div>
        );
      })() : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Strategy & Distribution */}
        <div className="lg:col-span-2 space-y-8">
          
          <MonthlyPaymentBreakdown state={state} plan={plan} />
          
          <StrategyRaceCard state={state} onUpdateState={onUpdateState} />

          {/* Priority Cards */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">Priority Execution</h2>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">Live Sync Active</span>
              </div>
            </div>
            <div className="space-y-3">
              {state.cards.sort((a, b) => b.balance - a.balance).map(card => (
                <CardListItem 
                  key={card.id} 
                  card={card} 
                  onClick={() => onNavigateToCards(card.id)} 
                  onDelete={() => setCardToDelete(card.id)}
                  onLogPayment={(c) => setPaymentCard(c)}
                  isPrivacyMode={state.isPrivacyMode}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Milestones */}
        <div className="space-y-8">
          <DebtProgressChart state={state} />

          {/* Next Milestone Card — real computed values */}
          {(() => {
            const sortedByBalance = [...state.cards].sort((a, b) => a.balance - b.balance);
            const nextCard = sortedByBalance[0];
            if (!nextCard) return null;

            // Find which month this card hits zero in the plan
            const payoffMonthIndex = plan.findIndex(step =>
              (step.remainingBalances[nextCard.id] ?? nextCard.balance) <= 0.01
            );
            const monthsLeft = payoffMonthIndex === -1 ? null : payoffMonthIndex + 1;

            // Progress: how much has been paid off vs original balance
            // We use statement history if available, else assume starting from current balance
            const cardStatements = state.statements
              .filter(s => s.cardId === nextCard.id)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const originalBalance = cardStatements.length > 0
              ? Math.max(cardStatements[0].balance, nextCard.balance)
              : nextCard.balance;
            const paid = Math.max(0, originalBalance - nextCard.balance);
            const progress = originalBalance > 0 ? Math.min(100, Math.round((paid / originalBalance) * 100)) : 0;

            return (
              <div className="p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Target className="text-indigo-600" size={20} />
                  </div>
                  <h3 className="font-bold text-zinc-900">Next Milestone</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-xs text-zinc-500 mb-1">First Card Paid Off</p>
                    <p className="text-lg font-bold text-zinc-900">{nextCard.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatCurrency(nextCard.balance, state.isPrivacyMode)} remaining</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center">
                    {monthsLeft != null
                      ? `Estimated payoff: ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''}`
                      : 'Log payments to track progress'}
                  </p>
                </div>
              </div>
            );
          })()}

          <section>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Upcoming Due Dates</h3>
            <div className="space-y-4">
              {upcomingDue.map(item => {
                const isBnpl = item.accountType === AccountType.BNPL || item.bnplNextPaymentDate;
                const paymentAmt = isBnpl ? (item.bnplInstallmentAmount || item.minPayment) : item.minPayment;
                const dueLabel = item.days === 0 ? 'Due today!'
                  : item.days === 1 ? 'Due tomorrow'
                  : `Due in ${item.days} days`;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:border-zinc-300 transition-all cursor-pointer">
                    <div className={`w-1.5 h-10 rounded-full ${item.days <= 3 ? 'bg-red-500' : item.days <= 7 ? 'bg-amber-400' : 'bg-zinc-200'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                        {isBnpl && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full">BNPL</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{dueLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">{formatCurrency(paymentAmt, state.isPrivacyMode)}</p>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                        {isBnpl ? 'Installment' : 'Min Pay'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {upcomingDue.length === 0 && (
                <p className="text-sm text-zinc-400 italic text-center py-8">No cards added yet.</p>
              )}
            </div>
          </section>

          {reminders.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Active Reminders</h3>
              <div className="space-y-3">
                {reminders.map(rem => (
                  <div key={rem.id} className="flex items-center gap-3 p-4 bg-zinc-900 text-white rounded-2xl shadow-lg shadow-zinc-200 animate-in fade-in slide-in-from-right-4">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Bell size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{rem.title}</p>
                      <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{rem.date}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rem.color }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Promo Warnings</h3>
            <div className="space-y-4">
              {expiringPromos.map(promo => (
                <div key={promo.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-amber-900">{promo.cardName}</p>
                    <PromoBadge confidence={promo.confidence} />
                  </div>
                  <p className="text-xs text-amber-700 mb-3 leading-relaxed">{promo.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-600" />
                      <span className="text-xs font-bold text-amber-600">{promo.days} days left</span>
                    </div>
                    <ArrowUpRight size={14} className="text-amber-400" />
                  </div>
                </div>
              ))}
              {expiringPromos.length === 0 && (
                <div className="p-8 border-2 border-dashed border-zinc-100 rounded-2xl flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <ShieldCheck size={32} className="opacity-10" />
                  <p className="text-xs font-medium">No urgent promo alerts</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!cardToDelete}
        title="Delete Card"
        message="Are you sure you want to delete this card? This will also remove all associated statements."
        onConfirm={() => {
          if (cardToDelete) {
            const newCards = state.cards.filter(c => c.id !== cardToDelete);
            const newStatements = state.statements.filter(s => s.cardId !== cardToDelete);
            onUpdateState({ ...state, cards: newCards, statements: newStatements });
            setCardToDelete(null);
          }
        }}
        onCancel={() => setCardToDelete(null)}
      />

      {paymentCard && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 border-b border-zinc-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: paymentCard.color }}>
                    {paymentCard.bank[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900">Log Payment</h3>
                    <p className="text-xs text-zinc-500">{paymentCard.name} •••• {paymentCard.lastFour}</p>
                  </div>
                </div>
                <button onClick={() => setPaymentCard(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                    <input 
                      type="number"
                      autoFocus
                      className="w-full pl-8 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-2xl font-bold focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                      placeholder="0.00"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const amount = parseFloat((e.target as HTMLInputElement).value);
                          if (amount > 0) {
                            const newBalance = Math.max(0, paymentCard.balance - amount);
                            const newCards = state.cards.map(c => c.id === paymentCard.id ? { ...c, balance: newBalance } : c);
                            const newStatement: Statement = {
                              id: crypto.randomUUID(),
                              cardId: paymentCard.id,
                              date: new Date().toISOString(),
                              balance: newBalance,
                              minPayment: paymentCard.minPayment,
                              interestCharged: 0
                            };
                            onUpdateState({ ...state, cards: newCards, statements: [...state.statements, newStatement] });
                            setPaymentCard(null);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-emerald-700">Current Balance</span>
                    <span className="text-sm font-bold text-emerald-900">{formatCurrency(paymentCard.balance, state.isPrivacyMode)}</span>
                  </div>
                  <p className="text-[10px] text-emerald-600">Logging a payment will update your balance and payoff plan.</p>
                </div>

                <button 
                  onClick={() => {
                    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                    const amount = parseFloat(input.value);
                    if (amount > 0) {
                      const newBalance = Math.max(0, paymentCard.balance - amount);
                      const newCards = state.cards.map(c => c.id === paymentCard.id ? { ...c, balance: newBalance } : c);
                      const newStatement: Statement = {
                        id: crypto.randomUUID(),
                        cardId: paymentCard.id,
                        date: new Date().toISOString(),
                        balance: newBalance,
                        minPayment: paymentCard.minPayment,
                        interestCharged: 0
                      };
                      onUpdateState({ ...state, cards: newCards, statements: [...state.statements, newStatement] });
                      setPaymentCard(null);
                    }
                  }}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const ScanCardButton = ({ onScanComplete, addToast }: { onScanComplete: (card: Partial<Card> & { interestCharged?: number; statementDate?: string; promoAPR?: number; promoExpiry?: string; promoType?: string; promoAmount?: number; network?: string; accountType?: string }) => void; addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          const mimeType = file.type;
          const result = await scanStatementImage(base64Data, mimeType);
          onScanComplete(result as any);
        } catch (err: any) {
          console.error('AI Processing failed:', err);
          const msg = err?.message?.includes('401') ? 'API auth error — check Anthropic key'
            : err?.message?.includes('400') ? 'File format not supported — try a PNG or JPG screenshot'
            : err?.message?.includes('413') ? 'File too large — try a smaller image'
            : 'Scan failed — try a clear PNG/JPG screenshot of your statement';
          addToast(msg, 'error');
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Scan failed:', error);
      addToast('Scan failed. Please try again.', 'error');
      setIsScanning(false);
    }
  };

  return (
    <label className={`px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer hover:bg-zinc-50 transition-all ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
      {isScanning ? (
        <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Scan size={16} />
      )}
      {isScanning ? 'Scanning...' : 'Scan Statement'}
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
    </label>
  );
};

const CardsPage = ({ state, onUpdateState, initialSelectedCardId, addToast }: { state: AppState; onUpdateState: (newState: AppState) => void; initialSelectedCardId?: string | null; addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialSelectedCardId || null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const selectedCard = state.cards.find(c => c.id === selectedCardId);

  const handleUpdateCard = (updatedCard: Card) => {
    const newCards = state.cards.map(c => c.id === updatedCard.id ? updatedCard : c);
    onUpdateState({ ...state, cards: newCards });
  };

  const handleDeleteCard = (id: string) => {
    setCardToDelete(id);
  };

  const handleScanComplete = (extractedData: Partial<Card> & {
    interestCharged?: number;
    statementDate?: string;
    promoAPR?: number;
    promoExpiry?: string;
    promoType?: string;
    promoAmount?: number;
    network?: string;
    accountType?: string;
  }) => {
    const last4 = extractedData.lastFour;

    // ── 1. Try to match to an existing card by last 4 digits ──────────────
    const existingCard = last4
      ? state.cards.find(c => c.lastFour === last4)
      : null;

    let newState = { ...state };

    if (existingCard) {
      // ── UPDATE existing card balance, min payment, due date ───────────────
      const updatedCard: Card = {
        ...existingCard,
        balance:    extractedData.balance    ?? existingCard.balance,
        minPayment: extractedData.minPayment ?? existingCard.minPayment,
        dueDate:    extractedData.dueDate    ?? existingCard.dueDate,
        limit:      extractedData.limit      ?? existingCard.limit,
        apr:        extractedData.apr        ?? existingCard.apr,
      };

      // Auto-add promo if found and not already tracked
      if (extractedData.promoExpiry && extractedData.promoType) {
        const alreadyHasPromo = existingCard.promos.some(
          p => p.expirationDate === extractedData.promoExpiry
        );
        if (!alreadyHasPromo) {
          const newPromo: Promo = {
            id: crypto.randomUUID(),
            type: extractedData.promoType as PromoType,
            expirationDate: extractedData.promoExpiry,
            confidence: PromoConfidence.CONFIRMED,
            amount: extractedData.promoAmount ?? extractedData.balance ?? 0,
            rate: extractedData.promoAPR ?? 0,
            description: `${extractedData.promoType} — ${extractedData.promoAPR ?? 0}% until ${extractedData.promoExpiry}`,
          };
          updatedCard.promos = [...existingCard.promos, newPromo];
        }
      }

      newState = {
        ...newState,
        cards: newState.cards.map(c => c.id === existingCard.id ? updatedCard : c),
      };

      // Auto-log statement with interest charged
      if (extractedData.statementDate || extractedData.interestCharged !== undefined) {
        const newStatement: Statement = {
          id: crypto.randomUUID(),
          cardId: existingCard.id,
          date: extractedData.statementDate ?? new Date().toISOString().split('T')[0],
          balance: extractedData.balance ?? existingCard.balance,
          minPayment: extractedData.minPayment ?? existingCard.minPayment,
          interestCharged: extractedData.interestCharged ?? 0,
        };
        newState = {
          ...newState,
          statements: [...newState.statements, newStatement],
        };
      }

      onUpdateState(newState);
      setSelectedCardId(existingCard.id);
      addToast(`✓ ${existingCard.name} updated from statement scan`, 'success');
      return;
    }

    // ── 2. No match — create a new card ───────────────────────────────────
    const newId = crypto.randomUUID();
    const colors = ['#004a99','#003b70','#006fcf','#e31837','#003087','#059669','#7c3aed','#d97706'];
    const usedColors = new Set(state.cards.map(c => c.color));
    const color = colors.find(c => !usedColors.has(c)) || colors[state.cards.length % colors.length];

    // Resolve network
    const networkMap: Record<string, CardNetwork> = {
      'Visa': CardNetwork.VISA,
      'MasterCard': CardNetwork.MASTERCARD,
      'American Express': CardNetwork.AMEX,
      'Discover': CardNetwork.DISCOVER,
      'PayPal': CardNetwork.PAYPAL,
    };
    const network = extractedData.network
      ? (networkMap[extractedData.network] ?? CardNetwork.VISA)
      : CardNetwork.VISA;

    // Resolve account type
    const acctMap: Record<string, AccountType> = {
      'Credit Card': AccountType.CREDIT_CARD,
      'Buy Now Pay Later': AccountType.BNPL,
      'Personal Loan': AccountType.PERSONAL_LOAN,
      'PayPal Credit': AccountType.PAYPAL_CREDIT,
    };
    const accountType = extractedData.accountType
      ? (acctMap[extractedData.accountType] ?? AccountType.CREDIT_CARD)
      : AccountType.CREDIT_CARD;

    const newCard: Card = {
      id: newId,
      accountType,
      network,
      name: extractedData.name || 'New Card',
      bank: extractedData.bank || 'Bank',
      lastFour: extractedData.lastFour || '0000',
      balance: extractedData.balance ?? 0,
      limit: extractedData.limit ?? 5000,
      apr: extractedData.apr ?? 19.99,
      minPayment: extractedData.minPayment ?? 35,
      dueDate: extractedData.dueDate ?? 1,
      color,
      promos: [],
      reminderEnabled: true,
      reminderDaysBefore: 3,
      creditScore: undefined,
    };

    // Auto-add promo if found
    if (extractedData.promoExpiry && extractedData.promoType) {
      const newPromo: Promo = {
        id: crypto.randomUUID(),
        type: extractedData.promoType as PromoType,
        expirationDate: extractedData.promoExpiry,
        confidence: PromoConfidence.CONFIRMED,
        amount: extractedData.promoAmount ?? extractedData.balance ?? 0,
        rate: extractedData.promoAPR ?? 0,
        description: `${extractedData.promoType} — ${extractedData.promoAPR ?? 0}% until ${extractedData.promoExpiry}`,
      };
      newCard.promos = [newPromo];
    }

    newState = { ...newState, cards: [...newState.cards, newCard] };

    // Auto-log first statement
    if (extractedData.statementDate || extractedData.interestCharged !== undefined) {
      const newStatement: Statement = {
        id: crypto.randomUUID(),
        cardId: newId,
        date: extractedData.statementDate ?? new Date().toISOString().split('T')[0],
        balance: extractedData.balance ?? 0,
        minPayment: extractedData.minPayment ?? 35,
        interestCharged: extractedData.interestCharged ?? 0,
      };
      newState = { ...newState, statements: [...newState.statements, newStatement] };
    }

    onUpdateState(newState);
    setSelectedCardId(newId);
    addToast(`✓ ${newCard.name} added from statement scan`, 'success');
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-120px)]">
      <div className={`flex-1 space-y-6 overflow-y-auto pr-2 transition-all ${selectedCardId ? 'lg:mr-0' : ''}`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Your Cards</h1>
          <div className="flex gap-2">
            <ScanCardButton onScanComplete={handleScanComplete} addToast={addToast} />
            <button 
              onClick={() => {
                const newId = crypto.randomUUID();
                const newCard: Card = {
                  id: newId,
                  accountType: AccountType.CREDIT_CARD,
                  network: CardNetwork.VISA,
                  name: 'New Card',
                  bank: 'Bank Name',
                  lastFour: '0000',
                  balance: 0,
                  limit: 5000,
                  apr: 19.99,
                  minPayment: 35,
                  dueDate: 1,
                  promos: [],
                  color: '#18181b',
                  reminderEnabled: true,
                  reminderDaysBefore: 3,
                  creditScore: undefined
                };
                onUpdateState({ ...state, cards: [...state.cards, newCard] });
                setSelectedCardId(newId);
              }}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} /> Add New Card
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.cards.map(card => (
            <RealisticCard 
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onClick={() => setSelectedCardId(card.id)}
              onDelete={() => handleDeleteCard(card.id)}
              isPrivacyMode={state.isPrivacyMode}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedCard && (
          <motion.aside
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="w-96 bg-white border-l border-zinc-200 p-8 overflow-y-auto flex flex-col gap-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Edit Card</h2>
              <button onClick={() => setSelectedCardId(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Basic Info</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Account Type</label>
                    <select 
                      value={selectedCard.accountType || AccountType.CREDIT_CARD}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, accountType: e.target.value as AccountType })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    >
                      <option value={AccountType.CREDIT_CARD}>Credit Card</option>
                      <option value={AccountType.BNPL}>Buy Now Pay Later (e.g., Affirm, Klarna)</option>
                      <option value={AccountType.PAYPAL_CREDIT}>PayPal Credit</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Card Network</label>
                    <select 
                      value={selectedCard.network || CardNetwork.VISA}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, network: e.target.value as CardNetwork })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    >
                      {Object.values(CardNetwork).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Card Name</label>
                    <input 
                      type="text" 
                      value={selectedCard.name}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, name: e.target.value })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Bank</label>
                    <input 
                      type="text" 
                      value={selectedCard.bank}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, bank: e.target.value })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Last 4 Digits</label>
                      <input 
                        type="text" 
                        maxLength={4}
                        value={selectedCard.lastFour}
                        onChange={(e) => handleUpdateCard({ ...selectedCard, lastFour: e.target.value })}
                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Color</label>
                      <input 
                        type="color" 
                        value={selectedCard.color}
                        onChange={(e) => handleUpdateCard({ ...selectedCard, color: e.target.value })}
                        className="w-full h-9 p-1 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Financials</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Balance ($)</label>
                    <input 
                      type="number" 
                      value={selectedCard.balance}
                      onChange={(e) => {
                        const newBalance = parseFloat(e.target.value) || 0;
                        handleUpdateCard({ 
                          ...selectedCard, 
                          balance: newBalance,
                          ...(selectedCard.accountType === AccountType.BNPL ? { limit: newBalance } : {})
                        });
                      }}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  {selectedCard.accountType !== AccountType.BNPL && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Limit ($)</label>
                      <input 
                        type="number" 
                        value={selectedCard.limit}
                        onChange={(e) => handleUpdateCard({ ...selectedCard, limit: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">APR (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={selectedCard.apr}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, apr: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Credit Score</label>
                    <input 
                      type="number" 
                      value={selectedCard.creditScore || ''}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, creditScore: parseInt(e.target.value) || undefined })}
                      placeholder="e.g. 750"
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Min Payment ($)</label>
                    <input 
                      type="number" 
                      value={selectedCard.minPayment}
                      onChange={(e) => handleUpdateCard({ ...selectedCard, minPayment: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reminders</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-700">Payment Reminder</span>
                    </div>
                    <button 
                      onClick={() => handleUpdateCard({ ...selectedCard, reminderEnabled: !selectedCard.reminderEnabled })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${selectedCard.reminderEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selectedCard.reminderEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {selectedCard.reminderEnabled && (
                    <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-xs font-bold text-zinc-700">Notify me</span>
                      <select 
                        value={selectedCard.reminderDaysBefore}
                        onChange={(e) => handleUpdateCard({ ...selectedCard, reminderDaysBefore: parseInt(e.target.value) })}
                        className="bg-transparent text-xs font-bold text-zinc-900 outline-none"
                      >
                        <option value={0}>On the day</option>
                        <option value={1}>1 day before</option>
                        <option value={3}>3 days before</option>
                        <option value={7}>1 week before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Balance Transfer Promos</h3>
                  <button 
                    onClick={() => {
                      const newPromo: Promo = {
                        id: crypto.randomUUID(),
                        type: PromoType.BALANCE_TRANSFER,
                        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        confidence: PromoConfidence.CONFIRMED,
                        amount: selectedCard.balance,
                        rate: 0,
                        description: '0% Balance Transfer'
                      };
                      handleUpdateCard({ ...selectedCard, promos: [...selectedCard.promos, newPromo] });
                    }}
                    className="text-[10px] font-bold text-zinc-900 hover:underline"
                  >
                    + Add Promo
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedCard.promos.map((promo, idx) => (
                    <div key={promo.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <select 
                          value={promo.type}
                          onChange={(e) => {
                            const newPromos = [...selectedCard.promos];
                            newPromos[idx] = { ...promo, type: e.target.value as PromoType };
                            handleUpdateCard({ ...selectedCard, promos: newPromos });
                          }}
                          className="bg-transparent text-xs font-bold text-zinc-900 outline-none"
                        >
                          {Object.values(PromoType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button 
                          onClick={() => {
                            const newPromos = selectedCard.promos.filter(p => p.id !== promo.id);
                            handleUpdateCard({ ...selectedCard, promos: newPromos });
                          }}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Expires</label>
                          <input 
                            type="date" 
                            value={promo.expirationDate}
                            onChange={(e) => {
                              const newPromos = [...selectedCard.promos];
                              newPromos[idx] = { ...promo, expirationDate: e.target.value };
                              handleUpdateCard({ ...selectedCard, promos: newPromos });
                            }}
                            className="w-full p-1 bg-white border border-zinc-200 rounded text-[10px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Rate (%)</label>
                          <input 
                            type="number" 
                            value={promo.rate}
                            onChange={(e) => {
                              const newPromos = [...selectedCard.promos];
                              newPromos[idx] = { ...promo, rate: parseFloat(e.target.value) || 0 };
                              handleUpdateCard({ ...selectedCard, promos: newPromos });
                            }}
                            className="w-full p-1 bg-white border border-zinc-200 rounded text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedCard.promos.length === 0 && (
                    <p className="text-xs text-zinc-400 italic text-center py-4 border border-dashed border-zinc-200 rounded-xl">
                      No active promotions for this card.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex gap-3">
                <button 
                  onClick={() => handleDeleteCard(selectedCard.id)}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete Card
                </button>
                <button 
                  onClick={() => setSelectedCardId(null)}
                  className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Done
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      <ConfirmModal 
        isOpen={!!cardToDelete}
        title="Delete Card"
        message="Are you sure you want to delete this card? This will also remove all associated statements."
        onConfirm={() => {
          if (cardToDelete) {
            const newCards = state.cards.filter(c => c.id !== cardToDelete);
            const newStatements = state.statements.filter(s => s.cardId !== cardToDelete);
            onUpdateState({ ...state, cards: newCards, statements: newStatements });
            if (selectedCardId === cardToDelete) {
              setSelectedCardId(null);
            }
            setCardToDelete(null);
          }
        }}
        onCancel={() => setCardToDelete(null)}
      />
    </div>
  );
};

const PromosPage = ({ state, onUpdateState }: { state: AppState; onUpdateState: (newState: AppState) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<{ promo: Promo; cardId: string } | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<{ cardId: string; promoId: string } | null>(null);
  
  const allPromos = state.cards.flatMap(c => c.promos.map(p => ({ ...p, cardId: c.id, cardName: c.name, cardColor: c.color })));

  const handleSavePromo = (cardId: string, promo: Promo) => {
    const newCards = state.cards.map(card => {
      if (card.id === cardId) {
        const promoExists = card.promos.find(p => p.id === promo.id);
        const newPromos = promoExists 
          ? card.promos.map(p => p.id === promo.id ? promo : p)
          : [...card.promos, promo];
        return { ...card, promos: newPromos };
      }
      // If we moved a promo from one card to another (editing cardId)
      if (editingPromo && editingPromo.cardId !== cardId && card.id === editingPromo.cardId) {
        return { ...card, promos: card.promos.filter(p => p.id !== promo.id) };
      }
      return card;
    });
    
    onUpdateState({ ...state, cards: newCards });
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const handleDeletePromo = (cardId: string, promoId: string) => {
    setPromoToDelete({ cardId, promoId });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Promotional Offers</h1>
          <p className="text-sm text-zinc-500">{allPromos.length} Active Offers across your portfolio</p>
        </div>
        <button 
          onClick={() => {
            setEditingPromo(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-zinc-200"
        >
          <Plus size={16} /> Add Promo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allPromos.map(promo => {
          const daysLeft = getDaysUntilPromoExpiry(promo.expirationDate);
          const isUrgent = daysLeft <= 30;
          const card = state.cards.find(c => c.id === promo.cardId);

          return (
            <div key={promo.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col group hover:border-zinc-400 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-5 rounded bg-zinc-900 flex items-center justify-center text-[6px] font-bold text-white uppercase tracking-tighter">
                    {card?.bank.substring(0, 3)}
                  </div>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{promo.cardName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingPromo({ promo, cardId: promo.cardId });
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <SettingsIcon size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeletePromo(promo.cardId, promo.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <PromoBadge confidence={promo.confidence} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-emerald-500" />
                <h3 className="text-lg font-bold text-zinc-900">{promo.type}</h3>
              </div>
              <p className="text-sm text-zinc-600 mb-6 flex-1 leading-relaxed italic">"{promo.description}"</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Amount</p>
                    <p className="text-xl font-bold text-zinc-900">${promo.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Rate</p>
                    <p className="text-xl font-bold text-emerald-600">{promo.rate}%</p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isUrgent ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className={isUrgent ? 'text-red-600' : 'text-emerald-600'} />
                      <span className={`text-xs font-bold ${isUrgent ? 'text-red-700' : 'text-emerald-700'}`}>
                        {new Date(promo.expirationDate).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-emerald-600'}`}>
                      {daysLeft} days left
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {allPromos.length === 0 && (
          <div className="col-span-full py-20 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Tag size={48} className="opacity-10" />
            <p className="font-medium">No active promotional offers</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-sm font-bold text-zinc-900 hover:underline"
            >
              Add your first promo
            </button>
          </div>
        )}
      </div>

      {allPromos.some(p => p.type === PromoType.DEFERRED_INTEREST) && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold text-red-900">Deferred Interest Warning</p>
            <p className="text-xs text-red-700">
              Deferred interest promos are high risk. If not paid in full by the expiration date, interest will be back-charged from the original purchase date at the standard APR.
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Promo Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-zinc-900">{editingPromo ? 'Edit Promotion' : 'Add New Promotion'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <PromoForm 
                cards={state.cards}
                initialData={editingPromo}
                onSave={handleSavePromo}
                onCancel={() => setIsModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <ConfirmModal 
        isOpen={!!promoToDelete}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotional offer?"
        onConfirm={() => {
          if (promoToDelete) {
            const newCards = state.cards.map(card => {
              if (card.id === promoToDelete.cardId) {
                return { ...card, promos: card.promos.filter(p => p.id !== promoToDelete.promoId) };
              }
              return card;
            });
            onUpdateState({ ...state, cards: newCards });
            setPromoToDelete(null);
          }
        }}
        onCancel={() => setPromoToDelete(null)}
      />
    </div>
  );
};

const PromoForm = ({ 
  cards, 
  initialData, 
  onSave, 
  onCancel 
}: { 
  cards: Card[]; 
  initialData: { promo: Promo; cardId: string } | null;
  onSave: (cardId: string, promo: Promo) => void;
  onCancel: () => void;
}) => {
  const [cardId, setCardId] = useState(initialData?.cardId || cards[0]?.id || '');
  const [type, setType] = useState<PromoType>(initialData?.promo.type || PromoType.BALANCE_TRANSFER);
  const [amount, setAmount] = useState(initialData?.promo.amount || 0);
  const [rate, setRate] = useState(initialData?.promo.rate || 0);
  const [expirationDate, setExpirationDate] = useState(initialData?.promo.expirationDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialData?.promo.description || '');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Target Card</label>
          <select 
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
          >
            {cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.bank})</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Promo Type</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value as PromoType)}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
          >
            {Object.values(PromoType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount ($)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Promo Rate (%)</label>
            <input 
              type="number" 
              step="0.01"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expiration Date</label>
          <input 
            type="date" 
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 0% for 18 months on transfers"
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none h-20 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(cardId, {
            id: initialData?.promo.id || crypto.randomUUID(),
            type,
            amount,
            rate,
            expirationDate,
            description,
            confidence: PromoConfidence.CONFIRMED
          })}
          className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} /> Save Promo
        </button>
      </div>
    </div>
  );
};

const CalendarPage = ({ state, onUpdateState, onNavigateToCards }: { state: AppState, onUpdateState: (s: AppState) => void, onNavigateToCards: (cardId?: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isNoSpendOpen, setIsNoSpendOpen] = useState(false);
  const [savedAmount, setSavedAmount] = useState<number>(0);
  const [impactInsight, setImpactInsight] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'manual',
    title: '',
    description: '',
    color: '#18181b',
    reminderEnabled: false,
    reminderDaysBefore: 1,
    recurrence: 'none'
  });
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  // Calculate strategy-recommended payments for the current month
  const monthlyPlan = useMemo(() => {
    const plan = generatePayoffPlan(state.cards, state.monthlyBudget, state.preferredStrategy, 12);
    // Find the step for the current month/year
    const targetMonthStr = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    return plan.find(p => p.month === targetMonthStr);
  }, [state.cards, state.monthlyBudget, state.preferredStrategy, currentDate]);
  
  const getEventsForDay = (day: number) => {
    const events: (CalendarEvent & { cardColor?: string; recommendedAmount?: number; isPaid?: boolean; cardId?: string })[] = [];
    
    // Card due dates
    state.cards.forEach(card => {
      if (card.dueDate === day) {
        const recommended = monthlyPlan?.payments.find(p => p.cardId === card.id)?.amount || card.minPayment;
        const isPaid = state.payments?.some(p => {
          const pDate = new Date(p.date);
          return p.cardId === card.id && pDate.getMonth() === month && pDate.getFullYear() === year;
        });

        events.push({ 
          id: `due-${card.id}-${day}`,
          type: 'payment', 
          title: `Payment: ${card.name}`, 
          color: card.color, 
          amount: card.minPayment,
          recommendedAmount: recommended,
          isPaid: isPaid,
          cardId: card.id,
          date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          cardColor: card.color
        });
      }
    });
    
    // Promo expirations
    state.cards.forEach(card => {
      card.promos.forEach(promo => {
        const promoDate = new Date(promo.expirationDate);
        if (promoDate.getFullYear() === year && promoDate.getMonth() === month && promoDate.getDate() === day) {
          events.push({ 
            id: promo.id,
            type: 'promo', 
            title: `Promo Expiry: ${card.name}`, 
            color: card.color,
            description: promo.description,
            date: promo.expirationDate,
            cardColor: card.color
          });
        }
      });
    });

    // Manual events
    state.manualEvents?.forEach(event => {
      const eventDate = new Date(event.date);
      
      if (event.recurrence === 'monthly') {
        // For monthly recurring events, check if the day matches
        // and if the event started on or before the current month/year
        const startYear = eventDate.getFullYear();
        const startMonth = eventDate.getMonth();
        const startDay = eventDate.getDate();
        
        if (day === startDay && (year > startYear || (year === startYear && month >= startMonth))) {
          events.push({
            ...event,
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          });
        }
      } else {
        // Standard one-time event
        if (eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day) {
          events.push(event);
        }
      }
    });
    
    return events;
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDay) return;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      date: dateStr,
      title: newEvent.title!,
      type: newEvent.type as any || 'manual',
      amount: newEvent.amount,
      description: newEvent.description,
      color: newEvent.color || '#18181b',
      reminderEnabled: newEvent.reminderEnabled,
      reminderDaysBefore: newEvent.reminderDaysBefore,
      recurrence: newEvent.recurrence as any || 'none'
    };

    onUpdateState({
      ...state,
      manualEvents: [...(state.manualEvents || []), event]
    });
    
    setIsAddEventOpen(false);
    setNewEvent({ type: 'manual', title: '', description: '', color: '#18181b', reminderEnabled: false, reminderDaysBefore: 1, recurrence: 'none' });
  };

  const handleLogNoSpend = async () => {
    if (!selectedDay || savedAmount <= 0) return;
    setIsCalculating(true);
    
    try {
      const impact = calculateNoSpendImpact(state.cards, state.monthlyBudget, state.preferredStrategy, savedAmount);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      const text = await getCalendarDaySummary({
        date: dateStr,
        events: [{ title: 'No-Spend Day', amount: savedAmount, type: 'no-spend' }],
        totalDebt: state.cards.reduce((s, c) => s + c.balance, 0),
        monthlyBudget: state.monthlyBudget,
      });
      setImpactInsight(text || `By saving $${savedAmount}, you've cut $${Math.round(impact.interestSaved)} in future interest!`);
    } catch (err) {
      console.error(err);
      setImpactInsight(`Great job! Saving $${savedAmount} puts you that much closer to freedom.`);
    } finally {
      setIsCalculating(false);
    }
  };

  const confirmNoSpend = () => {
    if (!selectedDay) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      date: dateStr,
      title: 'No-Spend Day',
      type: 'no-spend',
      amount: savedAmount,
      description: `Saved $${savedAmount} by skipping non-essentials.`,
      color: '#10b981'
    };

    onUpdateState({
      ...state,
      manualEvents: [...(state.manualEvents || []), event]
    });

    setIsNoSpendOpen(false);
    setImpactInsight(null);
    setSavedAmount(0);
  };

  const deleteEvent = (id: string) => {
    onUpdateState({
      ...state,
      manualEvents: (state.manualEvents || []).filter(e => e.id !== id)
    });
  };

  const onDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
    // Add a ghost image or just styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const onDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');
    if (!eventId) return;

    // Only allow moving manual events (not payments or promos which are derived)
    const isManual = state.manualEvents?.some(ev => ev.id === eventId);
    if (!isManual) return;

    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    
    onUpdateState({
      ...state,
      manualEvents: (state.manualEvents || []).map(event => 
        event.id === eventId ? { ...event, date: targetDateStr } : event
      )
    });
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle || !selectedDay) return;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      date: dateStr,
      title: quickAddTitle,
      type: 'manual',
      color: '#18181b',
      reminderEnabled: false,
      reminderDaysBefore: 1,
      recurrence: 'none'
    };

    onUpdateState({
      ...state,
      manualEvents: [...(state.manualEvents || []), event]
    });
    
    setIsQuickAddOpen(false);
    setQuickAddTitle('');
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{monthName} {year}</h1>
          <p className="text-sm text-zinc-500">Track your payment deadlines and promotional expirations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg border border-zinc-200">
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {days.map((day, i) => {
            const events = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <div 
                key={i} 
                onClick={() => { 
                  if(day) { 
                    setSelectedDay(day); 
                    const dayEvents = getEventsForDay(day);
                    if (dayEvents.length === 0) {
                      setIsQuickAddOpen(true);
                    } else {
                      setIsDayModalOpen(true); 
                    }
                  } 
                }}
                onDragOver={onDragOver}
                onDrop={(e) => day && onDrop(e, day)}
                className={`p-2 border-r border-b border-zinc-50 relative group transition-colors cursor-pointer ${day ? 'hover:bg-zinc-50/50' : 'bg-zinc-50/10'}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-bold ${isToday ? 'bg-zinc-900 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-zinc-400'}`}>
                      {day}
                    </span>
                    <div className="mt-2 space-y-1">
                      {events.slice(0, 3).map((event, ei) => (
                        <div 
                          key={ei} 
                          draggable={event.type === 'manual' || event.type === 'no-spend'}
                          onDragStart={(e) => onDragStart(e, event.id)}
                          onDragEnd={onDragEnd}
                          className={`flex items-center gap-1.5 p-1 rounded border shadow-sm overflow-hidden cursor-grab active:cursor-grabbing ${event.isPaid ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-white border-zinc-100'}`}
                        >
                          <div className={`w-1 h-3 rounded-full shrink-0 ${event.type === 'no-spend' ? 'bg-emerald-500' : ''}`} style={{ backgroundColor: event.type === 'no-spend' ? undefined : event.color }} />
                          <p className={`text-[9px] font-bold truncate leading-none ${event.isPaid ? 'text-emerald-700 line-through' : 'text-zinc-900'}`}>{event.title}</p>
                          {event.isPaid && <Check size={8} className="text-emerald-500 shrink-0" />}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <p className="text-[8px] text-zinc-400 font-bold pl-1">+{events.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isQuickAddOpen && selectedDay && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-[280px] p-5 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-zinc-900">Quick Add • {selectedDay}</h3>
                <button onClick={() => setIsQuickAddOpen(false)} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>
              <div className="space-y-3">
                <input 
                  autoFocus
                  type="text" 
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleQuickAdd(); }}
                  placeholder="Event title..." 
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleQuickAdd}
                    disabled={!quickAddTitle}
                    className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold text-xs hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => { setIsQuickAddOpen(false); setIsAddEventOpen(true); }}
                    className="px-3 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-bold text-xs hover:bg-zinc-200 transition-colors"
                  >
                    Full
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {isDayModalOpen && selectedDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">{monthName} {selectedDay}, {year}</h3>
                  <p className="text-xs text-zinc-500">Schedule for this day</p>
                </div>
                <button onClick={() => setIsDayModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className={`flex items-start gap-4 p-4 rounded-2xl border group transition-all ${event.isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-zinc-50 border-zinc-100'}`}>
                      <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className={`text-sm font-bold ${event.isPaid ? 'text-emerald-900' : 'text-zinc-900'}`}>{event.title}</p>
                          <div className="flex gap-1">
                            {event.type === 'payment' && !event.isPaid && (
                              <button 
                                onClick={() => {
                                  const amount = event.recommendedAmount || event.amount || 0;
                                  const newPayment = {
                                    id: crypto.randomUUID(),
                                    cardId: event.cardId!,
                                    amount,
                                    date: event.date,
                                    notes: `Paid via Strategy: ${state.preferredStrategy}`
                                  };
                                  const newCards = state.cards.map(c => {
                                    if (c.id === event.cardId) return { ...c, balance: Math.max(0, c.balance - amount) };
                                    return c;
                                  });
                                  onUpdateState({ ...state, payments: [...(state.payments || []), newPayment], cards: newCards });
                                }}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                                title="Mark as Paid"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {event.cardId && (
                              <button 
                                onClick={() => onNavigateToCards(event.cardId)}
                                className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
                                title="Manage Card"
                              >
                                <SettingsIcon size={14} />
                              </button>
                            )}
                            {event.type === 'manual' && (
                              <button 
                                onClick={() => deleteEvent(event.id)}
                                className="p-1 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {event.type === 'payment' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-500">Minimum Payment:</span>
                              <span className="font-bold text-zinc-900">${event.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] p-2 bg-white rounded-lg border border-zinc-100">
                              <span className="text-zinc-500">Strategy Recommended:</span>
                              <span className="font-bold text-emerald-600">${event.recommendedAmount?.toLocaleString()}</span>
                            </div>
                            {event.isPaid && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <CheckCircle size={12} /> Paid for this month
                              </div>
                            )}
                          </div>
                        )}

                        {event.amount && event.type !== 'payment' && <p className="text-xs font-bold text-zinc-600 mt-1">${event.amount.toLocaleString()}</p>}
                        {event.description && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{event.description}</p>}
                        
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            event.type === 'payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            event.type === 'promo' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            event.type === 'no-spend' ? 'bg-emerald-500 text-white border-emerald-600' :
                            'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}>
                            {event.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <CalendarIcon size={40} className="mx-auto text-zinc-200" />
                    <p className="text-sm text-zinc-400 italic">No events scheduled for this day.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                <button 
                  onClick={() => setIsAddEventOpen(true)}
                  className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Event
                </button>
                <button 
                  onClick={() => setIsNoSpendOpen(true)}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  <Zap size={16} /> No-Spend
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* No-Spend Modal */}
      <AnimatePresence>
        {isNoSpendOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-sm p-8 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Log No-Spend</h3>
                <button onClick={() => { setIsNoSpendOpen(false); setImpactInsight(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount Saved ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={savedAmount || ''}
                      onChange={(e) => setSavedAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="40.00"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">e.g., lunch, coffee, impulse buy skipped.</p>
                </div>

                {impactInsight ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-emerald-600" />
                      <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">Debt Impact</p>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed italic">"{impactInsight}"</p>
                    <button 
                      onClick={confirmNoSpend}
                      className="w-full mt-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
                    >
                      Commit to Sapphire Card
                    </button>
                  </motion.div>
                ) : (
                  <button 
                    onClick={handleLogNoSpend}
                    disabled={savedAmount <= 0 || isCalculating}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCalculating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Calculate Impact <ChevronRight size={16} /></>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddEventOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-sm p-8"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-6">New Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Event Title</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g. Extra Payment, Bonus, etc." 
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Amount (Optional)</label>
                  <input 
                    type="number" 
                    value={newEvent.amount || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, amount: parseFloat(e.target.value) })}
                    placeholder="0.00" 
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Add notes..." 
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none h-24 resize-none" 
                  />
                </div>
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-700">Set Reminder</span>
                    </div>
                    <button 
                      onClick={() => setNewEvent({ ...newEvent, reminderEnabled: !newEvent.reminderEnabled })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${newEvent.reminderEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${newEvent.reminderEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {newEvent.reminderEnabled && (
                    <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <span className="text-xs font-bold text-zinc-700">Notify me</span>
                      <select 
                        value={newEvent.reminderDaysBefore}
                        onChange={(e) => setNewEvent({ ...newEvent, reminderDaysBefore: parseInt(e.target.value) })}
                        className="bg-transparent text-xs font-bold text-zinc-900 outline-none"
                      >
                        <option value={0}>On the day</option>
                        <option value={1}>1 day before</option>
                        <option value={3}>3 days before</option>
                        <option value={7}>1 week before</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-700">Recurrence</span>
                    </div>
                    <select 
                      value={newEvent.recurrence}
                      onChange={(e) => setNewEvent({ ...newEvent, recurrence: e.target.value as any })}
                      className="bg-transparent text-xs font-bold text-zinc-900 outline-none"
                    >
                      <option value="none">One-time</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsAddEventOpen(false)}
                    className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddEvent}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors"
                  >
                    Create Event
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatementsPage = ({ state, onUpdateState, addToast }: { state: AppState, onUpdateState: (state: AppState) => void, addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(state.cards[0]?.id || null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<{ date: string; balance: number; minPayment: number; interestCharged: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedCard = state.cards.find(c => c.id === selectedCardId);
  const cardStatements = state.statements
    .filter(s => s.cardId === selectedCardId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeleteStatement = (id: string) => {
    if (confirm('Are you sure you want to delete this statement?')) {
      onUpdateState({
        ...state,
        statements: state.statements.filter(s => s.id !== id)
      });
    }
  };

  const handleExportPDF = () => {
    if (selectedCard) {
      exportStatementsToPDF(selectedCard, cardStatements);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParsedData(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          const result = await scanStatementImage(base64Data, mimeType);

          // ── Auto-match card by last 4 digits ──────────────────────────────
          const matchedCard = result.lastFour
            ? state.cards.find(c => c.lastFour === result.lastFour)
            : null;

          if (matchedCard) {
            // ── AUTO-UPDATE card balance, min payment, due date ───────────────
            const updatedCard: Card = {
              ...matchedCard,
              balance:    result.balance    ?? matchedCard.balance,
              minPayment: result.minPayment ?? matchedCard.minPayment,
              dueDate:    result.dueDate    ?? matchedCard.dueDate,
              limit:      result.limit      ?? matchedCard.limit,
              apr:        result.apr        ?? matchedCard.apr,
            };

            // Auto-add promo if new one detected
            if (result.promoExpiry && result.promoType) {
              const alreadyHasPromo = matchedCard.promos.some(
                p => p.expirationDate === result.promoExpiry
              );
              if (!alreadyHasPromo) {
                const newPromo: Promo = {
                  id: crypto.randomUUID(),
                  type: result.promoType as PromoType,
                  expirationDate: result.promoExpiry,
                  confidence: PromoConfidence.CONFIRMED,
                  amount: result.promoAmount ?? result.balance ?? 0,
                  rate: result.promoAPR ?? 0,
                  description: `${result.promoType} — ${result.promoAPR ?? 0}% until ${result.promoExpiry}`,
                };
                updatedCard.promos = [...matchedCard.promos, newPromo];
              }
            }

            // Auto-log statement
            const newStatement: Statement = {
              id: crypto.randomUUID(),
              cardId: matchedCard.id,
              date: result.statementDate ?? new Date().toISOString().split('T')[0],
              balance: result.balance ?? matchedCard.balance,
              minPayment: result.minPayment ?? matchedCard.minPayment,
              interestCharged: result.interestCharged ?? 0,
            };

            onUpdateState({
              ...state,
              cards: state.cards.map(c => c.id === matchedCard.id ? updatedCard : c),
              statements: [...state.statements, newStatement],
            });

            setSelectedCardId(matchedCard.id);
            addToast(`✓ ${matchedCard.name} updated — balance, statement & interest logged automatically`, 'success');
            setIsImportOpen(false);
            return;
          }

          // ── No card match — fall back to manual confirmation ───────────────
          setParsedData({
            date: result.statementDate ?? new Date().toISOString().split('T')[0],
            balance: result.balance ?? 0,
            minPayment: result.minPayment ?? 0,
            interestCharged: result.interestCharged ?? 0,
          });

          if (result.lastFour && !matchedCard) {
            addToast(`Card •••• ${result.lastFour} not found — select the card below and save`, 'info');
          }

        } catch (err) {
          console.error('Statement parse failed:', err);
          addToast('Could not parse statement — enter values manually.', 'info');
          setParsedData({
            date: new Date().toISOString().split('T')[0],
            balance: 0,
            minPayment: 0,
            interestCharged: 0,
          });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File read error:', err);
      setIsProcessing(false);
    }
  };

  const [manualData, setManualData] = useState({
    date: new Date().toISOString().split('T')[0],
    balance: 0,
    minPayment: 0,
    interestCharged: 0
  });

  useEffect(() => {
    if (parsedData) {
      setManualData(parsedData);
    }
  }, [parsedData]);

  const handleSaveRecord = () => {
    if (!selectedCardId) return;
    
    const newStatement: Statement = {
      id: crypto.randomUUID(),
      cardId: selectedCardId,
      date: manualData.date,
      balance: manualData.balance,
      minPayment: manualData.minPayment,
      interestCharged: manualData.interestCharged
    };

    onUpdateState({
      ...state,
      statements: [...state.statements, newStatement]
    });
    resetImport();
  };

  const resetImport = () => {
    setIsImportOpen(false);
    setIsProcessing(false);
    setParsedData(null);
    setManualData({
      date: new Date().toISOString().split('T')[0],
      balance: 0,
      minPayment: 0,
      interestCharged: 0
    });
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-120px)]">
      {/* Sidebar for Card Selection */}
      <aside className="w-72 flex flex-col gap-4 overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Select Card</h2>
        </div>
        <div className="space-y-2">
          {state.cards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedCardId === card.id
                  ? 'bg-white border-zinc-900 shadow-sm ring-1 ring-zinc-900'
                  : 'bg-transparent border-zinc-200 hover:border-zinc-400 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                <span className={`text-xs font-bold uppercase tracking-wider ${selectedCardId === card.id ? 'text-zinc-900' : ''}`}>
                  {card.bank}
                </span>
              </div>
              <p className={`font-bold ${selectedCardId === card.id ? 'text-zinc-900' : ''}`}>{card.name}</p>
              <p className="text-xs mt-1">•••• {card.lastFour}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Statement Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {selectedCard ? (
          <>
            <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">{selectedCard.name} History</h1>
                <p className="text-sm text-zinc-500">Statement records and interest tracking.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-50"
                >
                  <Download size={16} /> Export PDF
                </button>
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                >
                  <Upload size={16} /> Import Statement
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Total Interest Paid</p>
                <p className="text-xl font-bold text-red-600">
                  ${cardStatements.reduce((sum, s) => sum + s.interestCharged, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Avg. Monthly Balance</p>
                <p className="text-xl font-bold text-zinc-900">
                  ${(cardStatements.reduce((sum, s) => sum + s.balance, 0) / (cardStatements.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Records Found</p>
                <p className="text-xl font-bold text-zinc-900">{cardStatements.length}</p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Statement Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Min Payment</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Interest Charged</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cardStatements.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900">
                        {new Date(s.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-zinc-600">${s.balance.toLocaleString()}</td>
                      <td className="px-6 py-4 text-zinc-600">${s.minPayment.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={s.interestCharged > 0 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                          ${s.interestCharged.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button className="text-zinc-400 hover:text-zinc-900 transition-colors">
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStatement(s.id)}
                          className="text-zinc-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cardStatements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">
                        No statement history found for this card.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <CreditCard size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a card to view statements</p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Import Statement</h3>
                  <p className="text-sm text-zinc-500">
                    {isProcessing ? 'Analyzing document...' : parsedData ? 'Review extracted data' : 'Upload or enter manually'}
                  </p>
                </div>
                <button onClick={resetImport} className="text-zinc-400 hover:text-zinc-900">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                {!parsedData && !isProcessing && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".pdf,.csv,.png,.jpg"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-8 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm font-bold">Drop Statement PDF or CSV</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-60">Max file size: 10MB</p>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-100"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-400">Or Manual Entry</span>
                      </div>
                    </div>
                  </>
                )}

                {isProcessing && (
                  <div className="py-12 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-zinc-600 italic">Running OCR & Data Extraction...</p>
                  </div>
                )}

                {(parsedData || (!isProcessing && !parsedData)) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Statement Date</label>
                        <input 
                          type="date" 
                          value={manualData.date}
                          onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Balance</label>
                        <input 
                          type="number" 
                          value={manualData.balance || ''}
                          onChange={(e) => setManualData({ ...manualData, balance: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00" 
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Min Payment</label>
                        <input 
                          type="number" 
                          value={manualData.minPayment || ''}
                          onChange={(e) => setManualData({ ...manualData, minPayment: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00" 
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Interest Charged</label>
                        <input 
                          type="number" 
                          value={manualData.interestCharged || ''}
                          onChange={(e) => setManualData({ ...manualData, interestCharged: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00" 
                          className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" 
                        />
                      </div>
                    </div>

                    {parsedData && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex gap-2 items-start">
                        <CheckSquare size={14} className="text-emerald-600 mt-0.5" />
                        <p className="text-[10px] text-emerald-700 leading-tight">
                          Data successfully extracted. Please verify the amounts before saving.
                        </p>
                      </div>
                    )}

                    <button 
                      onClick={handleSaveRecord}
                      className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                    >
                      {parsedData ? 'Confirm & Save Record' : 'Save Record'}
                    </button>
                    
                    {parsedData && (
                      <button 
                        onClick={() => setParsedData(null)}
                        className="w-full py-2 text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors"
                      >
                        Discard and try again
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PaydownPlanPage = ({ state, onUpdateState, addToast }: { state: AppState, onUpdateState: (state: AppState) => void, addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [strategy, setStrategy] = useState<PayoffStrategy>(state.preferredStrategy);
  const [tempBudget, setTempBudget] = useState(state.monthlyBudget);
  const plan = generatePayoffPlan(state.cards, tempBudget, strategy);

  const handleExportPDF = () => {
    exportPayoffPlanToPDF(state, plan);
  };

  const allPlans = useMemo(() => {
    return Object.values(PayoffStrategy).map(s => ({
      strategy: s,
      plan: generatePayoffPlan(state.cards, tempBudget, s)
    }));
  }, [state.cards, tempBudget]);

  const chartData = useMemo(() => {
    const maxMonths = Math.max(...allPlans.map(p => p.plan.length));
    const data = [];
    for (let i = 0; i < maxMonths; i++) {
      const dataPoint: any = { month: i };
      allPlans.forEach(p => {
        if (i < p.plan.length) {
          const remaining = Object.values(p.plan[i].remainingBalances).reduce((a: number, b: number) => a + b, 0);
          dataPoint[p.strategy] = remaining;
        } else {
          dataPoint[p.strategy] = 0;
        }
      });
      data.push(dataPoint);
    }
    return data;
  }, [allPlans]);

  const strategyDetails = {
    [PayoffStrategy.AVALANCHE]: {
      icon: <TrendingDown size={20} />,
      title: 'Debt Avalanche',
      description: 'Prioritize debts with the highest interest rates first.',
      pros: ['Saves the most money', 'Shortens payoff time'],
      cons: ['Slower initial "wins"', 'Requires discipline'],
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      chartColor: '#10b981'
    },
    [PayoffStrategy.SNOWBALL]: {
      icon: <CheckCircle size={20} />,
      title: 'Debt Snowball',
      description: 'Prioritize debts with the lowest balances first.',
      pros: ['Quick psychological wins', 'Frees up minimum payments fast'],
      cons: ['Usually costs more in interest', 'Takes longer overall'],
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      chartColor: '#8b5cf6'
    },
    [PayoffStrategy.CASH_FLOW]: {
      icon: <Zap size={20} />,
      title: 'Cash Flow Relief',
      description: 'Target debts with the highest payment-to-balance ratio.',
      pros: ['Frees up monthly cash fast', 'Reduces monthly stress'],
      cons: ['May pay more interest', 'Not mathematically optimal'],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      chartColor: '#3b82f6'
    },
    [PayoffStrategy.PROMO_OPTIMIZATION]: {
      icon: <Clock size={20} />,
      title: 'Promo Guard',
      description: 'Prioritize debts with expiring promotional rates.',
      pros: ['Avoids interest cliffs', 'Protects promo gains'],
      cons: ['Ignores standard APRs', 'Complex to manage'],
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      chartColor: '#f59e0b'
    }
  };

  const totalInterest = plan.reduce((sum, step) => sum + step.totalInterest, 0);
  const totalMonths = plan.length;
  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + totalMonths);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Paydown Strategy</h1>
          <p className="text-zinc-500">Optimize your cash flow and minimize interest leakage.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-50"
          >
            <Download size={16} /> Export PDF
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {Object.values(PayoffStrategy).map(s => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  strategy === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Strategy Details & Budget Control */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 rounded-2xl border ${strategyDetails[strategy].bgColor} ${strategyDetails[strategy].borderColor}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${strategyDetails[strategy].bgColor} border ${strategyDetails[strategy].borderColor} ${strategyDetails[strategy].color}`}>
              {strategyDetails[strategy].icon}
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{strategyDetails[strategy].title}</h3>
            <p className="text-sm text-zinc-600 mb-6 leading-relaxed">{strategyDetails[strategy].description}</p>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Pros</p>
                <div className="space-y-1">
                  {strategyDetails[strategy].pros.map((pro, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle size={12} /> {pro}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Cons</p>
                <div className="space-y-1">
                  {strategyDetails[strategy].cons.map((con, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                      <div className="w-1 h-1 rounded-full bg-zinc-300" /> {con}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl shadow-zinc-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-medium text-zinc-400">Monthly Budget</h3>
              <span className="text-2xl font-bold">${tempBudget.toLocaleString()}</span>
            </div>
            
            <input 
              type="range" 
              min={state.cards.reduce((sum, c) => sum + c.minPayment, 0)} 
              max={10000} 
              step={50}
              value={tempBudget}
              onChange={(e) => setTempBudget(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white mb-8"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Interest Paid</p>
                <p className="text-lg font-bold">${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Debt Free</p>
                <p className="text-lg font-bold">{debtFreeDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Info size={14} />
                <span>{totalMonths} months remaining</span>
              </div>
              <button 
                onClick={() => {
                  onUpdateState({ ...state, monthlyBudget: tempBudget, preferredStrategy: strategy });
                  addToast('Strategy saved!', 'success');
                }}
                className="text-xs font-bold text-white hover:underline"
              >
                Commit Plan
              </button>
            </div>
          </div>
        </div>

        {/* Payoff Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6">Strategy Comparison</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickFormatter={(val) => `Mo ${val}`}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Balance']}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  {Object.values(PayoffStrategy).map(s => (
                    <Line 
                      key={s}
                      type="monotone" 
                      dataKey={s} 
                      stroke={strategyDetails[s].chartColor} 
                      strokeWidth={strategy === s ? 3 : 1.5}
                      strokeOpacity={strategy === s ? 1 : 0.3}
                      dot={false}
                      activeDot={{ r: strategy === s ? 6 : 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              {Object.values(PayoffStrategy).map(s => {
                const sPlan = allPlans.find(p => p.strategy === s)?.plan || [];
                const sInterest = sPlan.reduce((sum, step) => sum + step.totalInterest, 0);
                return (
                  <div key={s} className={`flex items-center gap-2 text-xs ${strategy === s ? 'font-bold text-zinc-900' : 'text-zinc-500'}`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: strategyDetails[s].chartColor, opacity: strategy === s ? 1 : 0.3 }} />
                    {s} (${sInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })} int.)
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900">Monthly Execution Plan</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Principal
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                  <div className="w-2 h-2 rounded-full bg-red-400" /> Interest
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/30 border-b border-zinc-100">
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payment Breakdown</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {plan.slice(0, 12).map((step, i) => {
                    const totalRemaining = Object.values(step.remainingBalances).reduce((a: number, b: number) => a + b, 0);
                    const totalPaid = step.payments.reduce((a, b) => a + b.amount, 0);
                    const interestRatio = (step.totalInterest / totalPaid) * 100;

                    return (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-900">{step.month}</p>
                          <p className="text-[10px] text-zinc-400">Step {i + 1}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-48 h-1.5 bg-zinc-100 rounded-full overflow-hidden flex mb-1">
                            <div className="h-full bg-red-400" style={{ width: `${interestRatio}%` }} />
                            <div className="h-full bg-emerald-500 flex-1" />
                          </div>
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-red-500">${step.totalInterest.toFixed(0)} interest</span>
                            <span className="text-emerald-600">${(totalPaid - step.totalInterest).toFixed(0)} principal</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-zinc-900">${totalRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-[10px] text-zinc-400">Total Debt</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {plan.length > 12 && (
              <div className="p-4 bg-zinc-50 text-center border-t border-zinc-100">
                <button className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                  Show {plan.length - 12} more months...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentsPage = ({ state, onUpdateState }: { state: AppState; onUpdateState: (newState: AppState) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardId, setCardId] = useState(state.cards[0]?.id || '');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSavePayment = () => {
    if (!cardId || amount <= 0) return;
    
    const newPayment = {
      id: crypto.randomUUID(),
      cardId,
      amount,
      date,
      notes
    };
    
    // Update card balance — and advance BNPL next payment date
    const newCards = state.cards.map(c => {
      if (c.id === cardId) {
        const newBalance = Math.max(0, c.balance - amount);
        const updated: Card = { ...c, balance: newBalance };
        // Advance BNPL next payment date by frequency
        if (c.bnplNextPaymentDate && c.bnplInstallmentFrequency) {
          const freqDays = c.bnplInstallmentFrequency === 'weekly' ? 7
            : c.bnplInstallmentFrequency === 'biweekly' ? 14 : 30;
          const next = new Date(c.bnplNextPaymentDate);
          next.setDate(next.getDate() + freqDays);
          updated.bnplNextPaymentDate = next.toISOString().split('T')[0];
        }
        return updated;
      }
      return c;
    });

    onUpdateState({ 
      ...state, 
      payments: [...(state.payments || []), newPayment],
      cards: newCards
    });
    
    setIsModalOpen(false);
    setAmount(0);
    setNotes('');
  };

  const sortedPayments = [...(state.payments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Chart data: group payments by month
  const chartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    (state.payments || []).forEach(p => {
      const month = p.date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + p.amount;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        total,
      }));
  }, [state.payments]);

  const totalPaid = (state.payments || []).reduce((s, p) => s + p.amount, 0);
  const thisMonthPaid = (state.payments || [])
    .filter(p => p.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((s, p) => s + p.amount, 0);
  const avgMonthly = chartData.length > 0 ? totalPaid / chartData.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment History</h1>
          <p className="text-sm text-zinc-500">Log and track your historical debt payments</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-zinc-200"
        >
          <Plus size={16} /> Log Payment
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Paid', value: formatCurrency(totalPaid, state.isPrivacyMode), sub: `${sortedPayments.length} payments` },
          { label: 'This Month', value: formatCurrency(thisMonthPaid, state.isPrivacyMode), sub: 'Current month' },
          { label: 'Avg / Month', value: formatCurrency(avgMonthly, state.isPrivacyMode), sub: 'Last 12 months' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-zinc-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Payment history chart */}
      {chartData.length > 1 && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Monthly Payments</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
              <YAxis hide domain={[0, 'auto']} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                formatter={(val: number) => [`$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Paid']}
              />
              <Bar dataKey="total" fill="#18181b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Date</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Card</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    <History size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No payments logged yet.</p>
                  </td>
                </tr>
              ) : (
                sortedPayments.map(payment => {
                  const card = state.cards.find(c => c.id === payment.cardId);
                  return (
                    <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-900 font-medium">
                        {new Date(payment.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card?.color || '#ccc' }} />
                          <span className="font-medium text-zinc-900">{card?.name || 'Unknown Card'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-600">
                        ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 max-w-xs truncate">
                        {payment.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-zinc-900">Log Payment</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Card</label>
                    <select 
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    >
                      {state.cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.bank})</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount ($)</label>
                    <input 
                      type="number" 
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Notes (Optional)</label>
                    <input 
                      type="text" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                      placeholder="e.g., Extra principal payment"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSavePayment}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors"
                  >
                    Save Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MonthlyReviewPage = ({ state, onUpdateState }: { state: AppState, onUpdateState: (s: AppState) => void }) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  const reviews = state.monthlyReviews || [];
  const currentReview = reviews.find(r => r.month === selectedMonth) || {
    id: crypto.randomUUID(),
    month: selectedMonth,
    completedTasks: [],
  };

  const tasks = [
    { id: 'balances', label: 'Update all card balances', description: 'Ensure current balances match your latest statements or bank apps.' },
    { id: 'payments', label: 'Confirm all monthly payments', description: 'Verify that all minimum payments and extra payments were successfully processed.' },
    { id: 'promos', label: 'Check for new promo offers', description: 'Look for new balance transfer or purchase APR offers in your mail or email.' },
    { id: 'budget', label: 'Review monthly payoff budget', description: 'Adjust your monthly payoff budget if your income or expenses changed.' },
    { id: 'strategy', label: 'Re-evaluate payoff strategy', description: 'Check if Avalanche or Snowball still makes the most sense for your current debt.' },
  ];

  const handleToggleTask = (taskId: string) => {
    const isCompleted = currentReview.completedTasks.includes(taskId);
    const newCompletedTasks = isCompleted
      ? currentReview.completedTasks.filter(id => id !== taskId)
      : [...currentReview.completedTasks, taskId];
    
    const newReview = { ...currentReview, completedTasks: newCompletedTasks };
    const otherReviews = reviews.filter(r => r.month !== selectedMonth);
    
    onUpdateState({
      ...state,
      monthlyReviews: [...otherReviews, newReview]
    });
  };

  const progress = (currentReview.completedTasks.length / tasks.length) * 100;

  // Simple insights logic
  const expiringPromosCount = state.cards.flatMap(c => c.promos).filter(p => {
    const days = (new Date(p.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 60;
  }).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Monthly Review</h1>
          <p className="text-zinc-500 mt-1">Stay on top of your debt management routine.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Month</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Checklist</h2>
              <span className="text-sm font-bold text-zinc-500">{currentReview.completedTasks.length} of {tasks.length} complete</span>
            </div>
            
            <div className="space-y-6">
              {tasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className="flex gap-4 cursor-pointer group"
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    currentReview.completedTasks.includes(task.id) 
                      ? 'bg-zinc-900 border-zinc-900 text-white' 
                      : 'border-zinc-200 group-hover:border-zinc-400'
                  }`}>
                    {currentReview.completedTasks.includes(task.id) && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h3 className={`font-bold transition-all ${
                      currentReview.completedTasks.includes(task.id) ? 'text-zinc-400 line-through' : 'text-zinc-900'
                    }`}>
                      {task.label}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-4">Monthly Progress</h3>
              <div className="text-5xl font-bold mb-2">{Math.round(progress)}%</div>
              <p className="text-sm opacity-80">You're almost there! Complete your review to stay disciplined.</p>
              
              <div className="mt-8 w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                />
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <CheckSquare size={160} />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Insights</h3>
            <div className="space-y-4">
              {expiringPromosCount > 0 && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <AlertCircle size={16} />
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    You have <span className="font-bold text-zinc-900">{expiringPromosCount} promo{expiringPromosCount > 1 ? 's' : ''}</span> expiring in the next 60 days. Review them now.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingDown size={16} />
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Your total debt is <span className="font-bold text-zinc-900">${state.cards.reduce((sum, c) => sum + c.balance, 0).toLocaleString()}</span>. Keep pushing towards zero!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BrightPlanPage = ({ state, onUpdateState }: { state: AppState; onUpdateState: (newState: AppState) => void }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generatePlan = async () => {
    setIsLoading(true);
    try {
      const text = await getBrightPlan({
        income: state.income,
        expenses: state.monthlyExpenses,
        budget: state.monthlyBudget,
        totalDebt: state.cards.reduce((sum, c) => sum + c.balance, 0),
        preferredStrategy: state.preferredStrategy,
        cards: state.cards.map(c => ({
          name: c.name,
          balance: c.balance,
          apr: c.apr,
          min: c.minPayment,
          promos: c.promos.length,
        })),
      });
      setInsight(text);
    } catch (err) {
      console.error(err);
      setInsight("Failed to generate plan. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Bright Plan</h1>
          <p className="text-zinc-500">AI-driven strategy for your next dollar.</p>
        </div>
        <button 
          onClick={generatePlan}
          disabled={isLoading}
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Brain size={16} /> {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Brain size={20} />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">The Brain's Recommendation</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-zinc-100 rounded w-3/4" />
                <div className="h-4 bg-zinc-100 rounded w-5/6" />
                <div className="h-4 bg-zinc-100 rounded w-2/3" />
              </div>
            ) : (
              <div className="prose prose-zinc max-w-none">
                <p className="text-zinc-700 leading-relaxed text-lg italic">
                  "{insight || "No insight generated yet. Click refresh to analyze your situation."}"
                </p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Disposable Income</p>
                <p className="text-xl font-bold text-zinc-900">${(state.income - state.monthlyExpenses).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Debt Ratio</p>
                <p className="text-xl font-bold text-zinc-900">{((state.cards.reduce((sum, c) => sum + c.balance, 0) / state.income) * 100).toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Next Target</p>
                <p className="text-xl font-bold text-emerald-600">
                  {state.cards.sort((a, b) => b.apr - a.apr)[0]?.name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-emerald-900 mb-4">Why this works</h3>
              <ul className="space-y-3">
                {[
                  "Optimizes interest savings based on current APRs",
                  "Protects your cash flow for essential expenses",
                  "Adjusts dynamically to your income changes"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-emerald-700">
                    <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-indigo-900 mb-4">Pro Tip</h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                "Your disposable income is currently ${(state.income - state.monthlyExpenses).toLocaleString()}. If you can redirect just 10% more to your target card, you'll save an additional $450 in interest this year."
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-6 text-white">
            <h3 className="text-sm font-bold mb-4">Financial Snapshot</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Monthly Income</span>
                <span className="font-bold">${state.income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Monthly Expenses</span>
                <span className="font-bold">${state.monthlyExpenses.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Net Cash Flow</span>
                <span className="font-bold text-emerald-400">${(state.income - state.monthlyExpenses).toLocaleString()}</span>
              </div>
            </div>
            <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10">
              Update Financials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SmartAutopayPage = ({ state, onUpdateState, addToast }: { state: AppState; onUpdateState: (newState: AppState) => void; addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [isStashing, setIsStashing] = useState(false);
  const [stashAmount, setStashAmount] = useState(50);

  const handleStash = () => {
    setIsStashing(true);
    setTimeout(() => {
      onUpdateState({
        ...state,
        brightStashBalance: state.brightStashBalance + stashAmount
      });
      setIsStashing(false);
      setStashAmount(0);
    }, 1500);
  };

  const handlePayFromStash = (cardId: string, amount: number) => {
    if (state.brightStashBalance < amount) {
      addToast('Insufficient stash balance!', 'error');
      return;
    }

    const newPayment = {
      id: crypto.randomUUID(),
      cardId,
      amount,
      date: new Date().toISOString().split('T')[0],
      notes: 'Paid from Bright Stash'
    };

    const newCards = state.cards.map(c => {
      if (c.id === cardId) return { ...c, balance: Math.max(0, c.balance - amount) };
      return c;
    });

    onUpdateState({
      ...state,
      brightStashBalance: state.brightStashBalance - amount,
      payments: [...(state.payments || []), newPayment],
      cards: newCards
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Smart Autopay</h1>
        <p className="text-zinc-500">Automated "Bright Stash" for stress-free bill payments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Stash Overview */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2 text-center md:text-left">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Bright Stash Balance</p>
              <h2 className="text-5xl font-bold text-zinc-900 tracking-tight">${state.brightStashBalance.toLocaleString()}</h2>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-center md:justify-start">
                <ShieldCheck size={14} /> Ready for next due date
              </p>
            </div>
            <div className="w-full md:w-auto space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={stashAmount || ''}
                  onChange={(e) => setStashAmount(parseFloat(e.target.value) || 0)}
                  className="w-full md:w-48 pl-8 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  placeholder="50.00"
                />
              </div>
              <button 
                onClick={handleStash}
                disabled={isStashing || stashAmount <= 0}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isStashing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><ArrowUpRight size={16} /> Add to Stash</>
                )}
              </button>
            </div>
          </div>

          {/* Upcoming Autopays */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-900">Upcoming Autopays</h3>
            <div className="space-y-3">
              {state.cards.sort((a, b) => a.dueDate - b.dueDate).map(card => {
                const isPaid = state.payments?.some(p => {
                  const pDate = new Date(p.date);
                  return p.cardId === card.id && pDate.getMonth() === new Date().getMonth();
                });

                return (
                  <div key={card.id} className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center justify-between group hover:border-zinc-900 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: card.color }}>
                        {card.bank.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{card.name}</p>
                        <p className="text-[10px] text-zinc-500">Due on the {card.dueDate}th • ${card.minPayment} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isPaid ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                          Paid
                        </span>
                      ) : (
                        <button 
                          onClick={() => handlePayFromStash(card.id, card.minPayment)}
                          disabled={state.brightStashBalance < card.minPayment}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-all disabled:opacity-30"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4 text-indigo-900">
              <Zap size={18} />
              <h3 className="font-bold">How it works</h3>
            </div>
            <p className="text-xs text-indigo-700 leading-relaxed space-y-4">
              Smart Autopay pulls small, manageable amounts from your income throughout the month into your <strong>Bright Stash</strong>.
              <br /><br />
              When a bill is due, we use the stash to pay it automatically, ensuring you never miss a due date or pay a late fee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoSpendPage = ({ state, onUpdateState, addToast }: { state: AppState; onUpdateState: (s: AppState) => void; addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [savedAmount, setSavedAmount] = useState(50);
  const [isLogging, setIsLogging] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const noSpendEvents = (state.manualEvents || []).filter(e => e.type === 'no-spend')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSaved = noSpendEvents.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonthEvents = noSpendEvents.filter(e =>
    e.date.startsWith(new Date().toISOString().substring(0, 7))
  );
  const streak = (() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (noSpendEvents.find(e => e.date === ds)) count++;
      else if (i > 0) break;
    }
    return count;
  })();

  // impact calc using existing utility
  const impact = useMemo(() =>
    calculateNoSpendImpact(state.cards, state.monthlyBudget, state.preferredStrategy, savedAmount),
    [state.cards, state.monthlyBudget, state.preferredStrategy, savedAmount]
  );

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const text = await getCalendarDaySummary({
        date: new Date().toISOString().split('T')[0],
        events: [{ title: 'No-Spend Challenge', amount: savedAmount, type: 'no-spend' }],
        totalDebt: state.cards.reduce((s, c) => s + c.balance, 0),
        monthlyBudget: state.monthlyBudget,
      });
      setAiInsight(text);
    } catch { setAiInsight(''); }
    finally { setLoadingInsight(false); }
  };

  const logNoSpend = async () => {
    if (savedAmount <= 0) return;
    setIsLogging(true);
    const today = new Date().toISOString().split('T')[0];
    const existing = noSpendEvents.find(e => e.date === today);
    if (existing) { addToast('Already logged a no-spend day today!', 'info'); setIsLogging(false); return; }

    const event = {
      id: crypto.randomUUID(),
      date: today,
      title: 'No-Spend Day',
      type: 'no-spend' as const,
      amount: savedAmount,
      description: `Saved $${savedAmount} by skipping non-essentials.`,
      color: '#10b981',
      reminderEnabled: false,
      recurrence: 'none' as const,
    };
    onUpdateState({ ...state, manualEvents: [...(state.manualEvents || []), event] });
    await fetchInsight();
    setIsLogging(false);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">No-Spend Challenge</h1>
        <p className="text-zinc-500 mt-1">Every dollar you don't spend is a dollar attacking your debt.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Saved', value: `$${totalSaved.toLocaleString()}`, sub: 'All time', color: 'bg-emerald-50 border-emerald-100' },
          { label: 'This Month', value: thisMonthEvents.length.toString(), sub: `no-spend days`, color: 'bg-white border-zinc-200' },
          { label: 'Current Streak', value: `${streak}d`, sub: 'consecutive days', color: 'bg-white border-zinc-200' },
          { label: 'Total Days', value: noSpendEvents.length.toString(), sub: 'logged days', color: 'bg-white border-zinc-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-2xl p-5 ${s.color}`}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Log today */}
        <div className="bg-emerald-900 text-white rounded-3xl p-8 space-y-6 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-10"><Zap size={120} /></div>
          <div className="relative">
            <h2 className="text-xl font-bold mb-1">Log Today</h2>
            <p className="text-emerald-300/70 text-sm">How much did you save by not spending today?</p>
          </div>
          <div className="relative space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/50 block mb-2">Amount Saved</label>
              <div className="flex gap-2 mb-2">
                {[25, 50, 100, 200].map(v => (
                  <button key={v} onClick={() => setSavedAmount(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${savedAmount === v ? 'bg-white text-emerald-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    ${v}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 font-bold">$</span>
                <input type="number" value={savedAmount} onChange={e => setSavedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-bold text-lg outline-none focus:border-white/50 transition-all" />
              </div>
            </div>

            {/* Impact preview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/10 border border-white/10 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/50 mb-1">Interest Saved</p>
                <p className="text-xl font-bold">${Math.round(impact.interestSaved).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/10 border border-white/10 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/50 mb-1">Months Saved</p>
                <p className="text-xl font-bold">{impact.monthsSaved}</p>
              </div>
            </div>

            <button onClick={logNoSpend} disabled={isLogging || savedAmount <= 0}
              className="w-full py-4 bg-white text-emerald-900 rounded-2xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {isLogging ? <div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
              {isLogging ? 'Logging...' : 'Log No-Spend Day'}
            </button>
          </div>
        </div>

        {/* AI insight + history */}
        <div className="space-y-4">
          {aiInsight && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-violet-500" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Claude's Take</span>
              </div>
              {loadingInsight ? (
                <div className="space-y-2 animate-pulse"><div className="h-3 bg-zinc-100 rounded w-4/5"/><div className="h-3 bg-zinc-100 rounded w-3/5"/></div>
              ) : (
                <p className="text-sm text-zinc-700 leading-relaxed italic">"{aiInsight}"</p>
              )}
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Recent No-Spend Days</h3>
            {noSpendEvents.length === 0 ? (
              <div className="text-center py-8 text-zinc-300">
                <Zap size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm text-zinc-400">No days logged yet. Start today!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {noSpendEvents.slice(0, 20).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <p className="text-[10px] text-zinc-400">{event.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600">+${event.amount?.toLocaleString()}</span>
                      <button onClick={() => onUpdateState({ ...state, manualEvents: state.manualEvents.filter(e => e.id !== event.id) })}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition-all text-zinc-300">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = ({ state, onUpdateState, lastSynced, addToast }: { state: AppState, onUpdateState: (s: AppState) => void, lastSynced: Date | null, addToast: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [budget, setBudget] = useState(state.monthlyBudget);
  const [income, setIncome] = useState(state.income);
  const [expenses, setExpenses] = useState(state.monthlyExpenses);
  const [strategy, setStrategy] = useState(state.preferredStrategy);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Keep local fields in sync when Financial Hub updates the root state
  React.useEffect(() => { setIncome(state.income); },          [state.income]);
  React.useEffect(() => { setExpenses(state.monthlyExpenses); }, [state.monthlyExpenses]);
  React.useEffect(() => { setBudget(state.monthlyBudget); },    [state.monthlyBudget]);

  const hubHasIncome   = (state.incomeSources   || []).length > 0;
  const hubHasExpenses = (state.householdExpenses || []).length > 0;
  const [authError, setAuthError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkConnection = async () => {
    setTestingConnection(true);
    const result = await testSupabaseConnection();
    setConnectionStatus(result);
    setTestingConnection(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured correctly. Please check your environment variables.');
      return;
    }
    setAuthError('');
    if (authMode === 'signup' && password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && data.session) {
          addToast('Signed up successfully!', 'success');
        } else {
          addToast('Check your email for the confirmation link!', 'info');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth Error Detail:', err);
      setAuthError(err.message || 'An unexpected error occurred during authentication.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncToSupabase(state);
      addToast('Synced to cloud!', 'success');
    } catch (err) {
      addToast('Sync failed. Check console for details.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadFromCloud = async () => {
    setSyncing(true);
    try {
      const cloudState = await loadFromSupabase();
      if (cloudState) {
        onUpdateState(cloudState);
        addToast('Data loaded from cloud!', 'success');
      } else {
        addToast('No cloud data found.', 'info');
      }
    } catch (err) {
      addToast('Load from cloud failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = () => {
    onUpdateState({
      ...state,
      monthlyBudget: budget,
      income,
      monthlyExpenses: expenses,
      preferredStrategy: strategy
    });
    addToast('Preferences saved!', 'success');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `debt-command-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target?.result as string);
        // Basic validation could be added here
        onUpdateState(importedState);
        addToast('Data imported successfully!', 'success');
      } catch (err) {
        addToast('Import failed. Ensure file is a valid JSON export.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    localStorage.removeItem('debt_command_center_state');
    // Also wipe cloud data so it doesn't re-sync on next login
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('user_data').delete().eq('user_id', session.user.id);
        }
      } catch (e) {
        console.warn('Could not clear cloud data during reset:', e);
      }
    }
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Configure your debt payoff preferences and manage your data.</p>
      </div>

      <div className="space-y-8">
        {/* Payoff Preferences */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Target size={18} className="text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Payoff Preferences</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                Monthly Income ($)
                {hubHasIncome && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full normal-case">Auto from Financial Hub</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={income}
                  onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all ${hubHasIncome ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200'}`}
                  placeholder="5000"
                />
              </div>
              {hubHasIncome && <p className="text-[10px] text-emerald-600">Computed from your income sources in Financial Hub. Edit there to update.</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                Monthly Expenses ($)
                {hubHasExpenses && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full normal-case">Auto from Financial Hub</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={expenses}
                  onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all ${hubHasExpenses ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200'}`}
                  placeholder="3000"
                />
              </div>
              {hubHasExpenses && <p className="text-[10px] text-emerald-600">Computed from your household expenses in Financial Hub. Edit there to update.</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Monthly Payoff Budget ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  placeholder="1000"
                />
              </div>
              <p className="text-[10px] text-zinc-400">This is the total amount you can afford to pay across all cards each month.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Preferred Strategy</label>
              <select 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as PayoffStrategy)}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
              >
                {Object.values(PayoffStrategy).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400">Avalanche saves the most interest. Snowball builds momentum faster.</p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 flex items-center gap-2"
          >
            <Save size={16} /> Save Preferences
          </button>
        </section>

        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-zinc-400" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Supabase Cloud Sync</h2>
            </div>
            <button 
              onClick={checkConnection}
              disabled={testingConnection}
              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {connectionStatus && (
            <div className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-3 ${connectionStatus.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {connectionStatus.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {connectionStatus.message}
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-3">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertCircle size={20} />
                <h3 className="font-bold">Configuration Required</h3>
              </div>
              <p className="text-sm text-amber-700/80">
                To enable cloud sync, you must set your environment variables in the <b>Settings</b> menu with the <b>VITE_</b> prefix:
              </p>
              <ul className="text-xs text-amber-700/70 list-disc list-inside space-y-1 font-mono">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
              <p className="text-xs text-amber-700/60 italic">
                Note: Standard variables like SUPABASE_URL are not accessible to the frontend.
              </p>
              
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <p className="text-[10px] font-bold text-amber-800 uppercase mb-2">Required Database SQL:</p>
                <pre className="p-3 bg-white/50 rounded-lg text-[10px] font-mono text-amber-900 overflow-x-auto">
{`-- Run in Supabase SQL Editor (see supabase-setup.sql for full version)
create table if not exists user_data (
  user_id    uuid references auth.users not null primary key,
  state_json jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_data enable row level security;

create policy "Users can manage their own data"
  on user_data for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);`}
                </pre>
              </div>
            </div>
          )}

          {isSupabaseConfigured && !user ? (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Sync Across Devices</h3>
                  <p className="text-xs text-zinc-500">Create an account to access your debt plan anywhere.</p>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold text-sm hover:bg-zinc-800 transition-all"
                  >
                    {authMode === 'login' ? 'Login' : 'Sign Up'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-all"
                  >
                    {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Check size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Connected as</h3>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                    {lastSynced && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle size={10} /> Last backed up at {lastSynced.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Sign Out
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-50"
                >
                  <Upload size={20} className="text-zinc-600" />
                  <span className="text-xs font-bold text-zinc-900">Push to Cloud</span>
                </button>
                <button 
                  onClick={handleLoadFromCloud}
                  disabled={syncing}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-50"
                >
                  <Download size={20} className="text-zinc-600" />
                  <span className="text-xs font-bold text-zinc-900">Pull from Cloud</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Preferences */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Eye size={18} className="text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Preferences</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${state.isPrivacyMode ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-600'}`}>
                  {state.isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Privacy Mode</p>
                  <p className="text-xs text-zinc-500">Mask sensitive financial amounts across the app.</p>
                </div>
              </div>
              <button 
                onClick={() => onUpdateState({ ...state, isPrivacyMode: !state.isPrivacyMode })}
                className={`w-12 h-6 rounded-full relative transition-colors ${state.isPrivacyMode ? 'bg-zinc-900' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.isPrivacyMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Activity size={18} className="text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Data Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleExport}
              className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                  <Download size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Export Data</p>
                  <p className="text-[10px] text-zinc-500">Download your data as a JSON file.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-300" />
            </button>

            <label className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-900 transition-all group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                  <Upload size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Import Data</p>
                  <p className="text-[10px] text-zinc-500">Restore from a previous backup.</p>
                </div>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              <ChevronRight size={16} className="text-zinc-300" />
            </label>
          </div>

          <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <h3 className="font-bold">Danger Zone</h3>
            </div>
            <p className="text-sm text-red-600/80">Resetting your data will permanently delete all cards, statements, and payments. This action cannot be undone.</p>
            
            {showResetConfirm ? (
              <div className="flex gap-3">
                <button 
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all"
                >
                  Yes, Delete Everything
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-lg font-bold text-xs hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} /> Reset All Data
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [activePage, setActivePage] = useState('Dashboard');
  const [selectedCardIdForEdit, setSelectedCardIdForEdit] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  // In-app notification queue
  const { notifs, addNotif, dismissNotif, clearAll } = useInAppNotifications();

  // Simple toast helper — maps type strings to notification types
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    addNotif({
      id: `toast-${Date.now()}-${Math.random()}`,
      title: type === 'success' ? '✓ Success' : type === 'error' ? '✗ Error' : 'ℹ Info',
      body: message,
      type: type === 'success' ? 'info' : type === 'error' ? 'payment' : 'info',
      timestamp: Date.now(),
    });
  };

  // Browser + in-app notification engine
  useNotifications(state, addNotif);

  const handleRequestNotifPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  useEffect(() => {
    saveState(state);
    if (user && isSupabaseConfigured) {
      // Debounce sync to avoid excessive API calls
      const timeout = setTimeout(() => {
        syncToSupabase(state)
          .then(() => setLastSynced(new Date()))
          .catch(console.error);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Initial user check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        handleInitialCloudLoad();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        handleInitialCloudLoad();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleInitialCloudLoad = async () => {
    const cloudState = await loadFromSupabase();
    if (!cloudState) return;

    // Always prefer cloud — it is the source of truth across devices.
    // Only skip if cloud has no real cards (i.e. only sample data or empty).
    const cloudHasRealCards = (cloudState.cards || []).some((c: any) =>
      !SAMPLE_CARDS.some(s => s.lastFour === c.lastFour)
    );
    const localHasRealCards = state.cards.some(c =>
      !SAMPLE_CARDS.some(s => s.lastFour === c.lastFour)
    );

    if (cloudHasRealCards) {
      // Cloud has real data — always use it (newest device wins)
      setState(cloudState);
      setLastSynced(new Date());
      addToast('✓ Data synced from cloud', 'success');
    } else if (!localHasRealCards) {
      // Neither has real data — use cloud anyway (may have settings etc)
      setState(cloudState);
    }
    // If only local has real data, keep local and let the debounced sync push it up
  };

  const navigateToCards = (cardId?: string) => {
    setSelectedCardIdForEdit(cardId || null);
    setActivePage('Cards');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard': return <Dashboard state={state} onUpdateState={setState} onNavigateToCards={() => navigateToCards()} />;
      case 'Bright Plan': return <BrightPlanPage state={state} onUpdateState={setState} />;
      case 'Attack Plan': return <AttackPlanPage state={state} onUpdateState={setState} />;
      case 'Balance Transfer': return <BalanceTransferPage state={state} />;
      case 'Snowflaking': return <SnowflakingPage state={state} onUpdateState={setState} />;
      case 'What-If': return <ScenarioBuilderPage state={state} onUpdateState={setState} />;
      case 'Interest': return <InterestTrackerPage state={state} />;
      case 'Add Card': return <CardWizardPage state={state} onUpdateState={setState} addToast={addToast} />;
      case 'BNPL': return <BnplOverviewPage state={state} onNavigateToAddCard={() => setActivePage('Add Card')} />;
      case 'Financial Hub': return <FinancialHubPage state={state} onUpdateState={setState} />;
      case 'Quick Add': return <QuickAddPage state={state} onUpdateState={setState} />;
      case 'Smart Autopay': return <SmartAutopayPage state={state} onUpdateState={setState} addToast={addToast} />;
      case 'Cards': return <CardsPage state={state} onUpdateState={setState} initialSelectedCardId={selectedCardIdForEdit} addToast={addToast} />;
      case 'Promos': return <PromosPage state={state} onUpdateState={setState} />;
      case 'Statements': return <StatementsPage state={state} onUpdateState={setState} addToast={addToast} />;
      case 'Payments': return <PaymentsPage state={state} onUpdateState={setState} />;
      case 'Paydown Plan': return <PaydownPlanPage state={state} onUpdateState={setState} addToast={addToast} />;
      case 'Calendar': return <CalendarPage state={state} onUpdateState={setState} onNavigateToCards={navigateToCards} />;
      case 'Monthly Review': return <MonthlyReviewPage state={state} onUpdateState={setState} />;
      case 'Net Worth': return <NetWorthPage state={state} onUpdateState={setState} />;
      case 'Utilization': return <UtilizationPage state={state} />;
      case 'No-Spend': return <NoSpendPage state={state} onUpdateState={setState} addToast={addToast} />;
      case 'Settings': return <SettingsPage state={state} onUpdateState={setState} lastSynced={lastSynced} addToast={addToast} />;
      default: return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
          <Info size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Page under construction</p>
          <p className="text-sm">This feature is coming in the next update.</p>
        </div>
      );
    }
  };

  return (
    <>
    <ToastContainer notifs={notifs} onDismiss={dismissNotif} />
    <div className="flex min-h-screen font-sans" style={{background:'var(--color-bg)',color:'var(--color-text)'}}>
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-64 border-r flex-col gap-0 fixed h-full overflow-y-auto sidebar-shell" style={{zIndex:40}}>
        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{borderBottom:'1px solid var(--color-border)'}}>
          <div className="flex items-center gap-2.5">
            <div className="sidebar-logo-mark">
              <TrendingDown size={15} className="text-white" />
            </div>
            <div>
              <p className="sidebar-brand">Debt Command</p>
              <p className="sidebar-brand-sub">CFO Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-3">

          {/* Overview */}
          <p className="section-label">Overview</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => setActivePage('Dashboard')} />
          <SidebarItem icon={Wallet} label="Financial Hub" active={activePage === 'Financial Hub'} onClick={() => setActivePage('Financial Hub')} />
          <SidebarItem icon={BarChart2} label="Net Worth" active={activePage === 'Net Worth'} onClick={() => setActivePage('Net Worth')} />

          {/* Strategy */}
          <p className="section-label">Strategy</p>
          <SidebarItem icon={Brain} label="Bright Plan" active={activePage === 'Bright Plan'} onClick={() => setActivePage('Bright Plan')} />
          <SidebarItem icon={Target} label="Attack Plan" active={activePage === 'Attack Plan'} onClick={() => setActivePage('Attack Plan')} />
          <SidebarItem icon={FlaskConical} label="What-If" active={activePage === 'What-If'} onClick={() => setActivePage('What-If')} />
          <SidebarItem icon={ArrowUpRight} label="Balance Transfer" active={activePage === 'Balance Transfer'} onClick={() => setActivePage('Balance Transfer')} />

          {/* Accounts */}
          <p className="section-label">Accounts</p>
          <SidebarItem icon={CreditCard} label="Cards" active={activePage === 'Cards'} onClick={() => setActivePage('Cards')} />
          <SidebarItem icon={Plus} label="Add Card" active={activePage === 'Add Card'} onClick={() => setActivePage('Add Card')} />
          <SidebarItem icon={ShoppingBag} label="BNPL" active={activePage === 'BNPL'} onClick={() => setActivePage('BNPL')} />
          <SidebarItem icon={Tag} label="Promos" active={activePage === 'Promos'} onClick={() => setActivePage('Promos')} />
          <SidebarItem icon={CreditCard} label="Utilization" active={activePage === 'Utilization'} onClick={() => setActivePage('Utilization')} />

          {/* Tracking */}
          <p className="section-label">Tracking</p>
          <SidebarItem icon={History} label="Payments" active={activePage === 'Payments'} onClick={() => setActivePage('Payments')} />
          <SidebarItem icon={FileText} label="Statements" active={activePage === 'Statements'} onClick={() => setActivePage('Statements')} />
          <SidebarItem icon={DollarSign} label="Interest" active={activePage === 'Interest'} onClick={() => setActivePage('Interest')} />
          <SidebarItem icon={TrendingDown} label="Paydown Plan" active={activePage === 'Paydown Plan'} onClick={() => setActivePage('Paydown Plan')} />
          <SidebarItem icon={CalendarIcon} label="Calendar" active={activePage === 'Calendar'} onClick={() => setActivePage('Calendar')} />

          {/* Habits */}
          <p className="section-label">Habits</p>
          <SidebarItem icon={Zap} label="Snowflaking" active={activePage === 'Snowflaking'} onClick={() => setActivePage('Snowflaking')} />
          <SidebarItem icon={Zap} label="No-Spend" active={activePage === 'No-Spend'} onClick={() => setActivePage('No-Spend')} />
          <SidebarItem icon={Wallet} label="Smart Autopay" active={activePage === 'Smart Autopay'} onClick={() => setActivePage('Smart Autopay')} />
          <SidebarItem icon={CheckSquare} label="Monthly Review" active={activePage === 'Monthly Review'} onClick={() => setActivePage('Monthly Review')} />
        </nav>

        <div className="px-3 pb-4 pt-3 space-y-1.5" style={{borderTop:'1px solid var(--color-border)'}}>
          {/* Privacy toggle */}
          <button
            onClick={() => setState(s => ({ ...s, isPrivacyMode: !s.isPrivacyMode }))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all"
            style={{background:'var(--color-bg)', border:'1px solid var(--color-border)', color:'var(--color-text2)'}}
          >
            <div className="flex items-center gap-2">
              {state.isPrivacyMode ? <EyeOff size={13} style={{color:'var(--color-muted)'}} /> : <Eye size={13} style={{color:'var(--color-muted)'}} />}
              <span className="text-[11px] font-semibold" style={{color:'var(--color-text2)'}}>Privacy Mode</span>
            </div>
            <div className={`w-7 h-3.5 rounded-full relative transition-colors ${state.isPrivacyMode ? '' : ''}`}
              style={{background: state.isPrivacyMode ? 'var(--color-brand)' : 'var(--color-border2)'}}>
              <div className="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all shadow-sm"
                style={{left: state.isPrivacyMode ? '14px' : '2px'}} />
            </div>
          </button>

          <div className="flex items-center gap-1">
            <div className="flex-1">
              <SidebarItem icon={SettingsIcon} label="Settings" active={activePage === 'Settings'} onClick={() => setActivePage('Settings')} />
            </div>
            <NotificationBell notifs={notifs} onClear={clearAll} />
          </div>

          {notifPermission === 'default' && (
            <button onClick={handleRequestNotifPermission}
              className="w-full text-[10px] font-semibold uppercase tracking-wider py-1 transition-colors text-center rounded-lg"
              style={{color:'var(--color-muted)', background:'var(--color-bg)'}}>
              🔔 Enable Notifications
            </button>
          )}

          {isSupabaseConfigured && (
            <div className="sidebar-footer-tile">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background: user ? 'var(--color-green)' : 'var(--color-subtle)'}} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--color-muted)'}}>Cloud Sync</span>
                </div>
                {lastSynced && (
                  <span className="text-[9px]" style={{color:'var(--color-subtle)'}}>
                    {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-[10px] truncate" style={{color:'var(--color-muted)'}}>
                {user ? user.email : 'Not connected'}
              </p>
              {!user && (
                <button onClick={() => setActivePage('Settings')}
                  className="mt-1.5 w-full py-1.5 text-[10px] font-bold rounded-lg transition-all"
                  style={{background:'var(--color-brand)', color:'white'}}>
                  Sign In to Sync →
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 mobile-nav px-4 py-2 flex justify-between items-center z-50">
        <SidebarItem icon={LayoutDashboard} label="Dash" active={activePage === 'Dashboard'} onClick={() => setActivePage('Dashboard')} mobile />
        <SidebarItem icon={CreditCard} label="Cards" active={activePage === 'Cards'} onClick={() => setActivePage('Cards')} mobile />
        <SidebarItem icon={CalendarIcon} label="Cal" active={activePage === 'Calendar'} onClick={() => setActivePage('Calendar')} mobile />
        <SidebarItem icon={Brain} label="Plan" active={activePage === 'Bright Plan'} onClick={() => setActivePage('Bright Plan')} mobile />
        <SidebarItem icon={SettingsIcon} label="Set" active={activePage === 'Settings'} onClick={() => setActivePage('Settings')} mobile />
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pb-24 lg:pb-10" style={{minHeight:'100vh'}}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
    </>
  );
}
