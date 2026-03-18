import React, { useState, useMemo } from 'react';
import {
  Target, Zap, TrendingDown, AlertCircle, CheckCircle, Brain,
  ChevronDown, ChevronUp, Clock, DollarSign, Flame, Shield,
  ArrowRight, BarChart2, Calendar, Award, RefreshCw, Lock
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { AppState, Card, PayoffStrategy } from '../types';
import {
  generatePayoffPlan, compareStrategies, calculateMonthlyInterest,
  getDaysUntilPromoExpiry, getPriorityRank
} from '../utils/debtLogic';
import { getBrightPlan } from '../utils/claudeAI';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.round(n).toLocaleString();

const fmtFull = (n: number, priv = false) =>
  priv ? '••••' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STRATEGY_META: Record<PayoffStrategy, {
  icon: React.ReactNode; tagline: string; best: string;
  color: string; bg: string; border: string;
}> = {
  [PayoffStrategy.AVALANCHE]: {
    icon: <TrendingDown size={16} />,
    tagline: 'Mathematically optimal — kills the most interest',
    best: 'Best for: saving maximum money',
    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
  },
  [PayoffStrategy.SNOWBALL]: {
    icon: <Zap size={16} />,
    tagline: 'Momentum-based — fastest psychological wins',
    best: 'Best for: staying motivated',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
  },
  [PayoffStrategy.CASH_FLOW]: {
    icon: <DollarSign size={16} />,
    tagline: 'Frees up monthly cash flow fastest',
    best: 'Best for: tight monthly budgets',
    color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200',
  },
  [PayoffStrategy.PROMO_OPTIMIZATION]: {
    icon: <Shield size={16} />,
    tagline: 'Protects 0% promos before they expire',
    best: 'Best for: active balance transfers',
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
  },
};

// ─── Collapsible Section ──────────────────────────────────────────────────────

const Section: React.FC<{
  title: string; subtitle?: string; icon: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean;
}> = ({ title, subtitle, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-8 py-6 hover:bg-zinc-50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">{icon}</div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
      </button>
      {open && <div className="px-8 pb-8">{children}</div>}
    </div>
  );
};

// ─── Threat Card ──────────────────────────────────────────────────────────────

const ThreatRow: React.FC<{ card: Card; rank: number; monthlyInterest: number; priv: boolean }> = ({ card, rank, monthlyInterest, priv }) => {
  const urgentPromo = card.promos.find(p => getDaysUntilPromoExpiry(p.expirationDate) < 60);
  const deferredPromo = card.promos.find(p => p.type === 'Deferred Interest' && getDaysUntilPromoExpiry(p.expirationDate) < 90);
  const threatLevel = deferredPromo ? 'Critical' : card.apr >= 25 ? 'Critical' : card.apr >= 20 ? 'High' : card.apr >= 15 ? 'Medium' : 'Low';
  const tc = threatLevel === 'Critical' ? 'text-red-600 bg-red-50 border-red-200'
    : threatLevel === 'High' ? 'text-orange-600 bg-orange-50 border-orange-200'
    : threatLevel === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  return (
    <div className="flex items-start gap-4 p-5 border border-zinc-100 rounded-2xl hover:border-zinc-300 transition-all">
      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-zinc-900">{card.name}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tc}`}>{threatLevel}</span>
          {deferredPromo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">⚠ Deferred Interest</span>}
          {urgentPromo && !deferredPromo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Promo Expiring</span>}
        </div>
        <div className="flex gap-4 text-xs text-zinc-500 flex-wrap">
          <span><span className="font-bold text-zinc-700">{card.apr}%</span> APR</span>
          <span><span className="font-bold text-zinc-700">{fmt(card.balance, priv)}</span> balance</span>
          <span><span className="font-bold text-red-600">{fmt(monthlyInterest, priv)}</span>/mo interest</span>
          {urgentPromo && <span className="text-red-600 font-bold">{getDaysUntilPromoExpiry(urgentPromo.expirationDate)}d left on promo</span>}
        </div>
        {deferredPromo && (
          <p className="text-[10px] text-red-600 mt-1 font-medium">
            ⚠ If not paid by {deferredPromo.expirationDate}, ALL backdated interest charges retroactively
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-zinc-900">{fmt(monthlyInterest * 12, priv)}</p>
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">per year</p>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AttackPlanPage: React.FC<{ state: AppState; onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const [activeStrategy, setActiveStrategy] = useState<PayoffStrategy>(state.preferredStrategy);
  const [extraBudget, setExtraBudget] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(0);
  const priv = !!state.isPrivacyMode;

  const totalDebt = state.cards.reduce((s, c) => s + c.balance, 0);
  const totalMin  = state.cards.reduce((s, c) => s + c.minPayment, 0);
  const totalMonthlyInterest = state.cards.reduce((s, c) => s + calculateMonthlyInterest(c), 0);
  const effectiveBudget = state.monthlyBudget + extraBudget;
  const extraPower = effectiveBudget - totalMin;

  const plan = useMemo(() =>
    generatePayoffPlan(state.cards, effectiveBudget, activeStrategy, 120),
    [state.cards, effectiveBudget, activeStrategy]);

  const basePlan = useMemo(() =>
    generatePayoffPlan(state.cards, state.monthlyBudget, activeStrategy, 120),
    [state.cards, state.monthlyBudget, activeStrategy]);

  const comparisons = useMemo(() =>
    compareStrategies(state.cards, effectiveBudget),
    [state.cards, effectiveBudget]);

  const totalInterest = plan.reduce((s, p) => s + p.totalInterest, 0);
  const totalPaid     = totalDebt + totalInterest;

  const debtFreeDate = plan.length > 0
    ? new Date(new Date().getFullYear(), new Date().getMonth() + plan.length, 1)
        .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'N/A';

  const extraImpact = useMemo(() => {
    const baseInterest = basePlan.reduce((s, p) => s + p.totalInterest, 0);
    return {
      monthsSaved: Math.max(0, basePlan.length - plan.length),
      interestSaved: Math.max(0, baseInterest - totalInterest),
    };
  }, [basePlan, plan, totalInterest]);

  const priorityOrder = useMemo(() =>
    [...state.cards].filter(c => c.balance > 0)
      .sort((a, b) => getPriorityRank(a, activeStrategy) - getPriorityRank(b, activeStrategy)),
    [state.cards, activeStrategy]);

  const chartData = useMemo(() =>
    plan.slice(0, 36).map(step => {
      const pt: Record<string, number | string> = { month: step.month };
      state.cards.forEach(c => { pt[c.name] = Math.max(0, Math.round(step.remainingBalances[c.id] || 0)); });
      pt['Total'] = Math.round(Object.values(step.remainingBalances as Record<string,number>).reduce((s, v) => s + Math.max(0, v), 0));
      return pt;
    }),
    [plan, state.cards]);

  const compChart = useMemo(() => {
    const av = generatePayoffPlan(state.cards, effectiveBudget, PayoffStrategy.AVALANCHE, 120);
    const sn = generatePayoffPlan(state.cards, effectiveBudget, PayoffStrategy.SNOWBALL,  120);
    return Array.from({ length: Math.min(Math.max(av.length, sn.length), 36) }, (_, i) => ({
      month: i + 1,
      Avalanche: Math.round(Object.values((av[i]?.remainingBalances || {}) as Record<string,number>).reduce((s, v) => s + Math.max(0, v), 0)),
      Snowball:  Math.round(Object.values((sn[i]?.remainingBalances || {}) as Record<string,number>).reduce((s, v) => s + Math.max(0, v), 0)),
    }));
  }, [state.cards, effectiveBudget]);

  const threatList = useMemo(() =>
    [...state.cards].filter(c => c.balance > 0).sort((a, b) => {
      const score = (c: Card) => c.apr * 2 +
        (c.promos.some(p => p.type === 'Deferred Interest' && getDaysUntilPromoExpiry(p.expirationDate) < 90) ? 50 : 0);
      return score(b) - score(a);
    }),
    [state.cards]);

  const quickWins = useMemo(() =>
    state.cards.filter(c => c.balance > 0).map(c => {
      const mo = plan.findIndex(s => (s.remainingBalances[c.id] ?? c.balance) <= 0.01);
      return { card: c, monthsLeft: mo === -1 ? 999 : mo + 1 };
    }).filter(x => x.monthsLeft <= 6).sort((a, b) => a.monthsLeft - b.monthsLeft),
    [plan, state.cards]);

  const promoRisks = useMemo(() =>
    state.cards.flatMap(c =>
      c.promos.filter(p => getDaysUntilPromoExpiry(p.expirationDate) < 90)
        .map(p => ({ card: c, promo: p, days: getDaysUntilPromoExpiry(p.expirationDate) }))
    ).sort((a, b) => a.days - b.days),
    [state.cards]);

  const fetchAI = async () => {
    setLoadingAI(true);
    try {
      const text = await getBrightPlan({
        income: state.income, expenses: state.monthlyExpenses,
        budget: effectiveBudget, totalDebt, preferredStrategy: activeStrategy,
        cards: state.cards.map(c => ({ name: c.name, balance: c.balance, apr: c.apr, min: c.minPayment, promos: c.promos.length })),
      });
      setAiInsight(text);
    } catch { setAiInsight('Unable to load AI insight. Try again.'); }
    finally { setLoadingAI(false); }
  };

  if (state.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400 gap-3">
        <Target size={48} className="opacity-20" />
        <p className="text-lg font-medium">No cards to plan against</p>
        <p className="text-sm">Add cards first to build your attack plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Attack Plan</h1>
          <p className="text-zinc-500 mt-1">Your complete debt elimination war room.</p>
        </div>
        <button onClick={() => onUpdateState({ ...state, preferredStrategy: activeStrategy, monthlyBudget: effectiveBudget })}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
          <Lock size={14} /> Commit Strategy
        </button>
      </div>

      {/* Mission Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Debt',        val: fmt(totalDebt, priv),               sub: `${state.cards.length} accounts`,           dark: true  },
          { label: 'Monthly Interest',  val: fmt(totalMonthlyInterest, priv),     sub: fmt(totalMonthlyInterest * 12, priv) + '/yr', dark: false },
          { label: 'Debt-Free Date',    val: debtFreeDate,                        sub: `${plan.length} months`,                     dark: false },
          { label: 'Total Interest',    val: fmt(totalInterest, priv),            sub: 'at current pace',                           dark: false },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${s.dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-zinc-400">{s.label}</p>
            <p className={`text-xl font-bold leading-tight ${s.dark ? 'text-white' : 'text-zinc-900'}`}>{s.val}</p>
            <p className={`text-[10px] mt-1 ${s.dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Threat Assessment */}
      <Section title="Threat Assessment" subtitle="Cards ranked by financial danger — highest priority first" icon={<Flame size={20} />}>
        <div className="space-y-3">
          {threatList.map((card, i) => (
            <ThreatRow key={card.id} card={card} rank={i + 1} monthlyInterest={calculateMonthlyInterest(card)} priv={priv} />
          ))}
        </div>
        {promoRisks.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm font-bold text-red-900">Promo Alerts — Act Now</span>
            </div>
            {promoRisks.map(({ card, promo, days }) => (
              <div key={promo.id} className="flex justify-between text-xs text-red-700 py-1.5 border-t border-red-100 first:border-0">
                <span><span className="font-bold">{card.name}</span> — {promo.description}</span>
                <span className="font-bold">{days}d left</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Strategy Selector */}
      <Section title="Choose Your Strategy" subtitle="Pick your weapon — each has a different payoff philosophy" icon={<Target size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {Object.values(PayoffStrategy).map(s => {
            const meta = STRATEGY_META[s];
            const comp = comparisons.find(c => c.strategy === s);
            const isActive = activeStrategy === s;
            return (
              <button key={s} onClick={() => setActiveStrategy(s)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${isActive ? `${meta.bg} ${meta.border} shadow-md` : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? meta.color : 'text-zinc-400'}>{meta.icon}</span>
                    <span className={`font-bold text-sm ${isActive ? 'text-zinc-900' : 'text-zinc-600'}`}>{s}</span>
                  </div>
                  {isActive && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>Active</span>}
                </div>
                <p className="text-xs text-zinc-500 mb-2">{meta.tagline}</p>
                {comp && (
                  <div className="flex gap-4 text-[10px]">
                    <span><span className="font-bold text-zinc-900">{comp.monthsToPayoff}mo</span> to zero</span>
                    <span><span className="font-bold text-red-600">{fmt(comp.totalInterest, priv)}</span> interest</span>
                    <span><span className="font-bold text-emerald-600">{comp.monthsToFirstWin}mo</span> first win</span>
                  </div>
                )}
                <p className={`text-[10px] font-bold mt-2 ${isActive ? meta.color : 'text-zinc-400'}`}>{meta.best}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Avalanche vs Snowball — Balance Over Time</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={compChart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `M${v}`} interval={5} />
            <YAxis hide domain={[0, 'auto']} />
            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, '']} />
            <Line type="monotone" dataKey="Avalanche" stroke="#10b981" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Snowball"  stroke="#3b82f6" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Extra Payment Simulator */}
      <Section title="Extra Payment Simulator" subtitle="See how extra payments accelerate your freedom date" icon={<Zap size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Extra Monthly Payment</label>
                <span className="text-2xl font-bold text-zinc-900">{fmt(extraBudget, priv)}</span>
              </div>
              <input type="range" min={0} max={5000} step={50} value={extraBudget}
                onChange={e => setExtraBudget(parseInt(e.target.value))} className="w-full accent-zinc-900" />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1"><span>$0</span><span>$2,500</span><span>$5,000</span></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[100, 250, 500, 1000].map(v => (
                <button key={v} onClick={() => setExtraBudget(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${extraBudget === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                  +{fmt(v)}
                </button>
              ))}
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Total monthly budget</span><span className="font-bold">{fmt(effectiveBudget, priv)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Minimums required</span><span className="font-bold">{fmt(totalMin, priv)}</span></div>
              <div className="flex justify-between border-t border-zinc-200 pt-2">
                <span className="text-zinc-500">Attack power</span>
                <span className={`font-bold ${extraPower > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(extraPower, priv)}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Months Saved',   val: extraImpact.monthsSaved > 0 ? `${extraImpact.monthsSaved}mo` : 'None yet', good: extraImpact.monthsSaved > 0 },
              { label: 'Interest Saved', val: fmt(extraImpact.interestSaved, priv),  good: extraImpact.interestSaved > 0 },
              { label: 'Debt-Free Date', val: debtFreeDate,                          good: true },
              { label: 'Total Paid',     val: fmt(totalPaid, priv),                  good: false },
            ].map(s => (
              <div key={s.label} className="bg-white border border-zinc-200 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`text-base font-bold leading-tight ${s.good ? 'text-emerald-600' : 'text-zinc-900'}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Attack Order */}
      <Section title="Attack Order" subtitle="Exact sequence to eliminate debt — who gets hit first" icon={<ArrowRight size={20} />}>
        <div className="space-y-3 mb-4">
          {priorityOrder.map((card, i) => {
            const monthsToPayoff = plan.findIndex(s => (s.remainingBalances[card.id] ?? card.balance) <= 0.01);
            const thisMonthPay   = plan[0]?.payments.find(p => p.cardId === card.id)?.amount || 0;
            const isTarget = i === 0;
            return (
              <div key={card.id}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${isTarget ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isTarget ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-700'}`}>
                  {i === 0 ? <Flame size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${isTarget ? 'text-white' : 'text-zinc-900'}`}>{card.name}</span>
                    {isTarget && <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full">🎯 Primary Target</span>}
                  </div>
                  <div className={`flex gap-3 text-xs mt-0.5 flex-wrap ${isTarget ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span>{card.apr}% APR</span>
                    <span>{fmt(card.balance, priv)} remaining</span>
                    {monthsToPayoff >= 0 && <span className={isTarget ? 'text-emerald-400' : 'text-zinc-400'}>Paid off in ~{monthsToPayoff + 1}mo</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${isTarget ? 'text-emerald-400' : 'text-zinc-900'}`}>{fmtFull(thisMonthPay, priv)}</p>
                  <p className={`text-[10px] uppercase tracking-wider ${isTarget ? 'text-zinc-500' : 'text-zinc-400'}`}>this month</p>
                </div>
              </div>
            );
          })}
        </div>
        {quickWins.length > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">Quick Wins Within Reach</span>
            </div>
            {quickWins.map(({ card, monthsLeft }) => (
              <div key={card.id} className="flex justify-between items-center text-xs py-1.5 border-t border-emerald-100 first:border-0">
                <span className="text-emerald-800 font-medium">{card.name} — {fmt(card.balance, priv)} remaining</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{monthsLeft}mo away</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Debt Elimination Timeline */}
      <Section title="Debt Elimination Timeline" subtitle="Watch every card's balance go to zero" icon={<BarChart2 size={20} />}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} interval={Math.floor(chartData.length / 6)} />
            <YAxis hide domain={[0, 'auto']} />
            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 11 }}
              formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name]} />
            {state.cards.map(c => <Line key={c.id} type="monotone" dataKey={c.name} stroke={c.color} strokeWidth={2} dot={false} />)}
            <Line type="monotone" dataKey="Total" stroke="#18181b" strokeWidth={3} dot={false} strokeDasharray="6 3" />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Month-by-Month Battle Plan */}
      <Section title="Month-by-Month Battle Plan" subtitle="Exactly where every dollar goes each month" icon={<Calendar size={20} />} defaultOpen={false}>
        <div className="space-y-2">
          {plan.slice(0, 24).map((step, i) => {
            const totalRemaining = (Object.values(step.remainingBalances) as number[]).reduce((s, v) => s + Math.max(0, v), 0);
            const totalPayment   = step.payments.reduce((s, p) => s + p.amount, 0);
            const isOpen = expandedMonth === i;
            return (
              <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-zinc-900' : 'border-zinc-100 hover:border-zinc-300'}`}>
                <button onClick={() => setExpandedMonth(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isOpen ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>{i + 1}</div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{step.month}</p>
                      <p className="text-[10px] text-zinc-400">{fmt(totalRemaining, priv)} remaining</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div><p className="text-sm font-bold text-zinc-900">{fmt(totalPayment, priv)}</p><p className="text-[10px] text-zinc-400">payment</p></div>
                    <div><p className="text-sm font-bold text-red-500">{fmt(step.totalInterest, priv)}</p><p className="text-[10px] text-zinc-400">interest</p></div>
                    {isOpen ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-zinc-100">
                    <div className="mt-3 space-y-2">
                      {step.payments.map(p => {
                        const card = state.cards.find(c => c.id === p.cardId);
                        if (!card) return null;
                        const isExtra = p.amount > card.minPayment;
                        return (
                          <div key={p.cardId} className={`flex items-center justify-between p-3 rounded-xl ${isExtra ? 'bg-emerald-50 border border-emerald-100' : 'bg-zinc-50'}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                              <span className="text-sm font-medium text-zinc-900">{card.name}</span>
                              {isExtra && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">+EXTRA</span>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-zinc-900">{fmtFull(p.amount, priv)}</p>
                              {isExtra && <p className="text-[10px] text-emerald-600">min: {fmtFull(card.minPayment, priv)}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 p-3 bg-zinc-50 rounded-xl flex justify-between text-xs text-zinc-500">
                      <span>Balance after this month</span>
                      <span className="font-bold text-zinc-900">{fmt(totalRemaining, priv)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {plan.length > 24 && (
            <p className="text-center text-xs text-zinc-400 py-2">+ {plan.length - 24} more months to freedom</p>
          )}
        </div>
      </Section>

      {/* Interest Cost Breakdown */}
      <Section title="Interest Cost Breakdown" subtitle="How much each card costs you monthly and annually" icon={<DollarSign size={20} />} defaultOpen={false}>
        <div className="space-y-3 mb-4">
          {[...state.cards].filter(c => c.balance > 0 && c.apr > 0)
            .sort((a, b) => calculateMonthlyInterest(b) - calculateMonthlyInterest(a))
            .map(card => {
              const monthly = calculateMonthlyInterest(card);
              const pct     = totalMonthlyInterest > 0 ? (monthly / totalMonthlyInterest) * 100 : 0;
              return (
                <div key={card.id} className="p-4 bg-white border border-zinc-100 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                      <span className="font-bold text-zinc-900 text-sm">{card.name}</span>
                      <span className="text-xs text-zinc-400">{card.apr}% APR</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{fmt(monthly, priv)}/mo</p>
                      <p className="text-[10px] text-zinc-400">{fmt(monthly * 12, priv)}/yr</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">{pct.toFixed(0)}% of your total interest burden</p>
                </div>
              );
            })}
        </div>
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-red-900">Total interest at current pace</p>
            <p className="text-[10px] text-red-600 mt-0.5">{activeStrategy} strategy · {plan.length} months</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmt(totalInterest, priv)}</p>
        </div>
      </Section>

      {/* Claude AI Advisor */}
      <Section title="Claude AI Advisor" subtitle="Personalized action plan based on your exact numbers" icon={<Brain size={20} />} defaultOpen={false}>
        <div className="space-y-4">
          {aiInsight ? (
            <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-zinc-700 leading-relaxed italic text-sm">"{aiInsight}"</p>
            </div>
          ) : (
            <div className="p-6 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl text-center">
              <Brain size={32} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Click below for Claude's personalized debt attack recommendations</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Income',    val: fmt(state.income, priv) + '/mo' },
              { label: 'Expenses',  val: fmt(state.monthlyExpenses, priv) + '/mo' },
              { label: 'Free Cash', val: fmt(Math.max(0, state.income - state.monthlyExpenses - effectiveBudget), priv) + '/mo' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-white border border-zinc-100 rounded-xl">
                <p className="text-zinc-400 mb-1">{s.label}</p>
                <p className="font-bold text-zinc-900">{s.val}</p>
              </div>
            ))}
          </div>
          <button onClick={fetchAI} disabled={loadingAI}
            className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-50">
            {loadingAI
              ? <><RefreshCw size={16} className="animate-spin" /> Analyzing...</>
              : <><Brain size={16} /> Get Claude's Attack Recommendations</>}
          </button>
        </div>
      </Section>

    </div>
  );
};

export default AttackPlanPage;
