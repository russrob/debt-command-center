import React, { useMemo, useState } from 'react';
import {
  ShoppingBag, AlertCircle, CheckCircle, Clock,
  ChevronDown, ChevronUp, TrendingDown, DollarSign, Calendar, Zap
} from 'lucide-react';
import { AppState, Card, AccountType, BnplPlatform } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const fmtFull = (n: number, priv = false) =>
  priv ? '••••' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const daysUntil = (dateStr?: string): number => {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5);
};

const nextPaymentDate = (card: Card): string | null => {
  if (card.bnplNextPaymentDate) return card.bnplNextPaymentDate;
  // Estimate from due date
  const now = new Date();
  if (card.dueDate) {
    const d = new Date(now.getFullYear(), now.getMonth(), card.dueDate);
    if (d < now) d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }
  return null;
};

const progressPct = (card: Card): number => {
  const total = card.bnplTotalPurchase || card.limit || 0;
  if (!total) return 0;
  const paid = Math.max(0, total - card.balance);
  return Math.min(100, Math.round((paid / total) * 100));
};

const paymentsRemaining = (card: Card): number => {
  const installAmt = card.bnplInstallmentAmount || card.minPayment || 1;
  return installAmt > 0 ? Math.ceil(card.balance / installAmt) : 0;
};

const frequencyLabel: Record<string, string> = {
  weekly: 'weekly', biweekly: 'every 2 weeks', monthly: 'monthly',
};

const urgencyStyle = (days: number) =>
  days <= 3  ? { ring: 'ring-2 ring-red-400',    badge: 'bg-red-100 text-red-700',    bar: 'bg-red-500',    label: '🚨 Due Soon'  }
  : days <= 7  ? { ring: 'ring-2 ring-orange-300', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500', label: '⚠ This Week' }
  : days <= 14 ? { ring: 'ring-1 ring-amber-200',  badge: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-500',  label: '📅 Coming Up' }
  :              { ring: '',                        badge: 'bg-zinc-100 text-zinc-600',    bar: 'bg-emerald-500', label: '✓ On Track'  };

// Platform color map (fallback colors)
const PLATFORM_COLORS: Partial<Record<BnplPlatform, string>> = {
  [BnplPlatform.AFFIRM]:           '#0fa0c8',
  [BnplPlatform.AFTERPAY]:         '#1a6346',
  [BnplPlatform.KLARNA]:           '#ff8fa3',
  [BnplPlatform.PAYPAL_PAY_LATER]: '#003087',
  [BnplPlatform.SEZZLE]:           '#392d91',
  [BnplPlatform.ZIP]:              '#1a0050',
  [BnplPlatform.APPLE_PAY_LATER]:  '#000000',
  [BnplPlatform.SHOP_PAY]:         '#5a31f4',
  [BnplPlatform.SPLITIT]:          '#e74694',
  [BnplPlatform.OTHER]:            '#71717a',
};

// ─── Single BNPL Card ─────────────────────────────────────────────────────────

const BnplCard: React.FC<{ card: Card; priv: boolean; onNavigateToCards: () => void }> = ({ card, priv, onNavigateToCards }) => {
  const [expanded, setExpanded] = useState(false);

  const nextDate    = nextPaymentDate(card);
  const days        = daysUntil(nextDate ?? undefined);
  const urg         = urgencyStyle(days);
  const pct         = progressPct(card);
  const paidAmount  = Math.max(0, (card.bnplTotalPurchase || card.limit || card.balance) - card.balance);
  const remaining   = paymentsRemaining(card);
  const installAmt  = card.bnplInstallmentAmount || card.minPayment || 0;
  const total       = card.bnplTotalPurchase || card.limit || card.balance;
  const platform    = card.bnplPlatform;
  const color       = card.color || (platform ? PLATFORM_COLORS[platform] : '#71717a') || '#71717a';
  const isZeroAPR   = !card.apr || card.apr === 0;
  const freq        = card.bnplInstallmentFrequency ? frequencyLabel[card.bnplInstallmentFrequency] : 'per installment';

  // Payoff schedule
  const schedule = useMemo(() => {
    if (!installAmt || !nextDate) return [];
    const results: { date: string; payment: number; remaining: number }[] = [];
    let bal = card.balance;
    let d   = new Date(nextDate);
    const freqDays = card.bnplInstallmentFrequency === 'weekly' ? 7
      : card.bnplInstallmentFrequency === 'biweekly' ? 14 : 30;
    for (let i = 0; i < Math.min(remaining, 12); i++) {
      const payment = Math.min(bal, installAmt);
      bal = Math.max(0, bal - payment);
      results.push({
        date: d.toISOString().split('T')[0],
        payment, remaining: bal,
      });
      d = new Date(d.getTime() + freqDays * 864e5);
      if (bal <= 0) break;
    }
    return results;
  }, [card, installAmt, nextDate, remaining]);

  return (
    <div className={`bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm transition-all ${urg.ring}`}>

      {/* Header band */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="p-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
              style={{ backgroundColor: color }}>
              {(platform || card.bank || 'BNP').slice(0, 3).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-zinc-900">{card.name}</p>
              <p className="text-xs text-zinc-500">
                {platform || card.bank}
                {card.bnplMerchant && <span className="text-zinc-400"> · {card.bnplMerchant}</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${urg.badge}`}>{urg.label}</span>
            {isZeroAPR && (
              <p className="text-[10px] font-bold text-emerald-600 mt-1">0% interest</p>
            )}
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-50 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Balance Left</p>
            <p className="text-lg font-bold text-zinc-900">{fmt(card.balance, priv)}</p>
            <p className="text-[10px] text-zinc-400">of {fmt(total, priv)}</p>
          </div>
          <div className="bg-zinc-50 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Next Payment</p>
            <p className="text-lg font-bold text-zinc-900">{fmt(installAmt, priv)}</p>
            <p className="text-[10px] text-zinc-400">
              {nextDate
                ? days <= 0 ? 'Due today!' : `in ${days}d (${nextDate})`
                : 'date not set'}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payments Left</p>
            <p className="text-lg font-bold text-zinc-900">{remaining}</p>
            <p className="text-[10px] text-zinc-400">{freq}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
            <span>{fmt(paidAmount, priv)} paid</span>
            <span className="font-bold" style={{ color }}>{pct}% complete</span>
            <span>{fmt(card.balance, priv)} left</span>
          </div>
          <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700`}
              style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>

        {/* APR warning if not zero */}
        {!isZeroAPR && card.apr > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <span className="font-bold">{card.apr}% APR</span> — this plan charges interest. Pay on time to avoid compounding.
            </p>
          </div>
        )}

        {/* What if I pay extra? */}
        {installAmt > 0 && remaining > 1 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Pay double this payment</p>
            <div className="flex gap-4 text-xs text-blue-700">
              <span>Save <span className="font-bold">{Math.floor(remaining / 2)} payments</span></span>
              <span>Done in <span className="font-bold">~{Math.ceil(remaining / 2)} payments</span></span>
              {!isZeroAPR && card.apr > 0 && (
                <span>Save <span className="font-bold">{fmt((card.balance * card.apr / 100 / 12) * Math.floor(remaining / 2), priv)}</span> interest</span>
              )}
            </div>
          </div>
        )}

        {/* Expand: full schedule */}
        {schedule.length > 0 && (
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Show'} full payment schedule
          </button>
        )}

        {expanded && schedule.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Upcoming Payments</p>
            {schedule.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${i === 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-white text-zinc-900' : 'bg-zinc-200 text-zinc-600'}`}>{i + 1}</span>
                  <span className={i === 0 ? 'text-zinc-300' : 'text-zinc-500'}>{s.date}</span>
                </div>
                <span className={`font-bold ${i === 0 ? 'text-white' : 'text-zinc-900'}`}>{fmtFull(s.payment, priv)}</span>
                <span className={i === 0 ? 'text-zinc-400' : 'text-zinc-400'}>{fmt(s.remaining, priv)} left</span>
              </div>
            ))}
            {remaining > 12 && (
              <p className="text-center text-[10px] text-zinc-400 pt-1">+{remaining - 12} more payments</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const BnplOverviewPage: React.FC<{
  state: AppState;
  onNavigateToAddCard: () => void;
}> = ({ state, onNavigateToAddCard }) => {
  const [sortBy, setSortBy] = useState<'due' | 'balance' | 'progress'>('due');
  const priv = !!state.isPrivacyMode;

  const bnplCards = useMemo(() => {
    const cards = state.cards.filter(c =>
      c.accountType === AccountType.BNPL ||
      c.accountType === AccountType.PAYPAL_CREDIT ||
      (c.bnplPlatform !== undefined)
    );

    return [...cards].sort((a, b) => {
      if (sortBy === 'due') return daysUntil(nextPaymentDate(a) ?? undefined) - daysUntil(nextPaymentDate(b) ?? undefined);
      if (sortBy === 'balance') return b.balance - a.balance;
      if (sortBy === 'progress') return progressPct(b) - progressPct(a);
      return 0;
    });
  }, [state.cards, sortBy]);

  // Summary stats
  const totalBnplDebt      = bnplCards.reduce((s, c) => s + c.balance, 0);
  const totalOriginal      = bnplCards.reduce((s, c) => s + (c.bnplTotalPurchase || c.limit || c.balance), 0);
  const totalPaid          = Math.max(0, totalOriginal - totalBnplDebt);
  const totalNextPayments  = bnplCards.reduce((s, c) => {
    const nextDate = nextPaymentDate(c);
    const days     = daysUntil(nextDate ?? undefined);
    return days <= 14 ? s + (c.bnplInstallmentAmount || c.minPayment || 0) : s;
  }, 0);
  const overdueCards       = bnplCards.filter(c => daysUntil(nextPaymentDate(c) ?? undefined) <= 0);
  const dueSoonCards       = bnplCards.filter(c => {
    const d = daysUntil(nextPaymentDate(c) ?? undefined);
    return d > 0 && d <= 7;
  });

  if (bnplCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400 gap-4">
        <ShoppingBag size={48} className="opacity-20" />
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-900">No BNPL plans tracked</p>
          <p className="text-sm text-zinc-500 mt-1">Add your Affirm, Afterpay, Klarna, or other installment plans.</p>
        </div>
        <button onClick={onNavigateToAddCard}
          className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all">
          + Add BNPL Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">

      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Buy Now, Pay Later</h1>
          <p className="text-zinc-500 mt-1">All your installment plans in one place — never miss a payment.</p>
        </div>
        <button onClick={onNavigateToAddCard}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
          + Add Plan
        </button>
      </div>

      {/* Overdue alert */}
      {overdueCards.length > 0 && (
        <div className="p-5 bg-red-50 border-2 border-red-400 rounded-3xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-600" />
            <span className="font-bold text-red-900">🚨 Payment Overdue</span>
          </div>
          {overdueCards.map(c => (
            <div key={c.id} className="flex justify-between items-center text-sm text-red-800 mt-2 bg-white/50 rounded-xl p-3">
              <span><span className="font-bold">{c.name}</span> — payment was due</span>
              <span className="font-bold">{fmt(c.bnplInstallmentAmount || c.minPayment || 0, priv)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Due this week alert */}
      {dueSoonCards.length > 0 && overdueCards.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <p className="text-sm font-bold text-amber-900">
              {dueSoonCards.length} payment{dueSoonCards.length > 1 ? 's' : ''} due this week
            </p>
          </div>
          <p className="text-sm font-bold text-amber-900">
            {fmt(dueSoonCards.reduce((s, c) => s + (c.bnplInstallmentAmount || c.minPayment || 0), 0), priv)} total
          </p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total BNPL Debt',    val: fmt(totalBnplDebt, priv),       sub: `${bnplCards.length} active plans`,       dark: true  },
          { label: 'Total Paid Off',     val: fmt(totalPaid, priv),            sub: `of ${fmt(totalOriginal, priv)} original`, good: true  },
          { label: 'Due Next 2 Weeks',   val: fmt(totalNextPayments, priv),    sub: 'across all plans',                       warn: totalNextPayments > 0 },
          { label: 'Plans On Track',     val: bnplCards.filter(c => daysUntil(nextPaymentDate(c) ?? undefined) > 7).length + '/' + bnplCards.length,
                                         sub: 'no urgent payments',             good: true  },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${
            (s as any).dark ? 'bg-zinc-900 border-zinc-800' :
            (s as any).good ? 'bg-emerald-50 border-emerald-200' :
            (s as any).warn ? 'bg-amber-50 border-amber-200' :
            'bg-white border-zinc-200'
          }`}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${
              (s as any).dark ? 'text-white' :
              (s as any).good ? 'text-emerald-600' :
              (s as any).warn ? 'text-amber-700' :
              'text-zinc-900'
            }`}>{s.val}</p>
            <p className={`text-[10px] mt-1 ${(s as any).dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* All plans: upcoming payment timeline */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-5">Upcoming Payment Timeline</h2>
        <div className="space-y-3">
          {[...bnplCards]
            .sort((a, b) => daysUntil(nextPaymentDate(a) ?? undefined) - daysUntil(nextPaymentDate(b) ?? undefined))
            .map(card => {
              const nextDate  = nextPaymentDate(card);
              const days      = daysUntil(nextDate ?? undefined);
              const urg       = urgencyStyle(days);
              const installAmt = card.bnplInstallmentAmount || card.minPayment || 0;
              return (
                <div key={card.id} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-all">
                  <div className="w-10 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: card.color || PLATFORM_COLORS[card.bnplPlatform as BnplPlatform] || '#71717a' }}>
                    {(card.bnplPlatform || card.bank || 'BNP').slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 text-sm">{card.name}</p>
                    <p className="text-[10px] text-zinc-400">
                      {card.bnplMerchant && card.bnplMerchant + ' · '}
                      {fmt(card.balance, priv)} remaining · {paymentsRemaining(card)} payments left
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-zinc-900">{fmt(installAmt, priv)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urg.badge}`}>
                      {days <= 0 ? 'Overdue' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Sort controls + individual cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">All Plans</h2>
        <div className="flex gap-2">
          {(['due', 'balance', 'progress'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sortBy === s ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
              {s === 'due' ? 'By Due Date' : s === 'balance' ? 'By Balance' : 'By Progress'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {bnplCards.map(card => (
          <BnplCard key={card.id} card={card} priv={priv} onNavigateToCards={onNavigateToAddCard} />
        ))}
      </div>

      {/* Zero interest tip */}
      <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex gap-3">
        <Zap size={15} className="text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-700">BNPL strategy tip: </span>
          Most BNPL plans (Afterpay, Klarna Pay-in-4, Affirm 0%) charge zero interest — so they're not your highest financial priority. Focus your extra cash on high-APR credit cards first. However, missed BNPL payments can affect your credit score and trigger late fees, so always make at least the scheduled installment on time.
        </p>
      </div>
    </div>
  );
};

export default BnplOverviewPage;
