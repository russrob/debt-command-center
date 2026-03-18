import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle, TrendingDown, CreditCard, Info } from 'lucide-react';
import { AppState, AccountType } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUtil = (balance: number, limit: number): number =>
  limit > 0 ? (balance / limit) * 100 : 0;

const fmtCurrency = (n: number, priv = false) =>
  priv ? '••••••' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type UtilTier = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

const getTier = (pct: number): UtilTier => {
  if (pct <= 10) return 'excellent';
  if (pct <= 30) return 'good';
  if (pct <= 50) return 'fair';
  if (pct <= 75) return 'poor';
  return 'critical';
};

const TIER_CONFIG: Record<UtilTier, { label: string; color: string; bar: string; bg: string; border: string; text: string }> = {
  excellent: { label: 'Excellent', color: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  good:      { label: 'Good',      color: 'text-blue-600',    bar: 'bg-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700'    },
  fair:      { label: 'Fair',      color: 'text-amber-600',   bar: 'bg-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
  poor:      { label: 'Poor',      color: 'text-orange-600',  bar: 'bg-orange-500',  bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700'  },
  critical:  { label: 'Critical',  color: 'text-red-600',     bar: 'bg-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700'     },
};

const payToTarget = (balance: number, limit: number, targetPct: number): number =>
  Math.max(0, balance - limit * (targetPct / 100));

// ─── Overall Score Ring ───────────────────────────────────────────────────────

const ScoreRing: React.FC<{ pct: number; tier: UtilTier }> = ({ pct, tier }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(pct, 100) / 100) * circumference;

  const ringColor =
    tier === 'excellent' ? '#10b981'
    : tier === 'good'    ? '#3b82f6'
    : tier === 'fair'    ? '#f59e0b'
    : tier === 'poor'    ? '#f97316'
    : '#ef4444';

  const cfg = TIER_CONFIG[tier];

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="68" cy="68" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="12"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 68 68)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="68" y="62" textAnchor="middle" fontSize="26" fontWeight="700" fill={ringColor}>
          {pct.toFixed(0)}%
        </text>
        <text x="68" y="82" textAnchor="middle" fontSize="11" fill="#6b7280">utilization</text>
      </svg>
      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        {cfg.label}
      </span>
    </div>
  );
};

// ─── Individual Card Row ──────────────────────────────────────────────────────

const CardUtilRow: React.FC<{
  card: AppState['cards'][0];
  isPrivacyMode: boolean;
}> = ({ card, isPrivacyMode }) => {
  const pct       = getUtil(card.balance, card.limit);
  const tier      = getTier(pct);
  const cfg       = TIER_CONFIG[tier];
  const toThirty  = payToTarget(card.balance, card.limit, 30);
  const toTen     = payToTarget(card.balance, card.limit, 10);
  const available = Math.max(0, card.limit - card.balance);

  return (
    <div className={`border rounded-2xl p-5 transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}>
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: card.color }}
          >
            {card.bank.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm">{card.name}</p>
            <p className="text-[10px] text-zinc-500">•••• {card.lastFour} · {card.apr}% APR</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <span className={`text-xl font-bold ${cfg.color}`}>{pct.toFixed(1)}%</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Utilization bar with markers */}
      <div className="relative w-full h-3 bg-white/60 rounded-full overflow-hidden mb-1 border border-white/40">
        <div className="absolute top-0 bottom-0 w-px bg-emerald-400/70 z-10" style={{ left: '10%' }} />
        <div className="absolute top-0 bottom-0 w-px bg-blue-400/70 z-10"    style={{ left: '30%' }} />
        <div
          className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-zinc-400 mb-3 font-medium">
        <span>0%</span>
        <span className="text-emerald-500 ml-[calc(10%-16px)]">10%</span>
        <span className="text-blue-400">30%</span>
        <span>100%</span>
      </div>

      {/* Balance / Limit / Available */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Balance',   val: fmtCurrency(card.balance, isPrivacyMode) },
          { label: 'Limit',     val: fmtCurrency(card.limit,   isPrivacyMode) },
          { label: 'Available', val: fmtCurrency(available,    isPrivacyMode) },
        ].map(s => (
          <div key={s.label} className="bg-white/60 rounded-xl p-2 text-center border border-white/40">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-xs font-bold text-zinc-900 mt-0.5">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Pay-to-target hints */}
      {pct > 10 ? (
        <div className="space-y-1.5">
          {pct > 30 && toThirty > 0 && (
            <div className="flex items-center justify-between text-[10px] bg-white/50 rounded-lg px-3 py-1.5 border border-white/40">
              <span className="text-zinc-600">
                Pay <span className="font-bold text-blue-600">{fmtCurrency(toThirty, isPrivacyMode)}</span> → reach 30%
              </span>
              <TrendingDown size={11} className="text-blue-500" />
            </div>
          )}
          {toTen > 0 && (
            <div className="flex items-center justify-between text-[10px] bg-white/50 rounded-lg px-3 py-1.5 border border-white/40">
              <span className="text-zinc-600">
                Pay <span className="font-bold text-emerald-600">{fmtCurrency(toTen, isPrivacyMode)}</span> → reach 10%
              </span>
              <TrendingDown size={11} className="text-emerald-500" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-white/50 rounded-lg px-3 py-1.5 border border-emerald-200/40">
          <CheckCircle size={11} />
          <span className="font-medium">Ideal range — maximizing your credit score!</span>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const UtilizationPage: React.FC<{ state: AppState }> = ({ state }) => {
  const revolvingCards = state.cards.filter(
    c => c.accountType !== AccountType.BNPL && c.limit > 0
  );

  const totalBalance = revolvingCards.reduce((s, c) => s + c.balance, 0);
  const totalLimit   = revolvingCards.reduce((s, c) => s + c.limit,   0);
  const overallPct   = getUtil(totalBalance, totalLimit);
  const overallTier  = getTier(overallPct);
  const overallCfg   = TIER_CONFIG[overallTier];

  const sortedCards = useMemo(() =>
    [...revolvingCards].sort((a, b) => getUtil(b.balance, b.limit) - getUtil(a.balance, a.limit)),
    [revolvingCards]
  );

  const toThirtyOverall = Math.max(0, totalBalance - totalLimit * 0.30);
  const toTenOverall    = Math.max(0, totalBalance - totalLimit * 0.10);
  const atRisk          = sortedCards.filter(c => getUtil(c.balance, c.limit) > 30);

  const tierCounts = useMemo(() => {
    const counts: Record<UtilTier, number> = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    revolvingCards.forEach(c => counts[getTier(getUtil(c.balance, c.limit))]++);
    return counts;
  }, [revolvingCards]);

  if (revolvingCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400 gap-3">
        <CreditCard size={48} className="opacity-20" />
        <p className="text-lg font-medium">No revolving credit cards found</p>
        <p className="text-sm">Add cards with credit limits to see utilization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Credit Utilization</h1>
        <p className="text-zinc-500 mt-1">
          Per-card and overall utilization — keep it under 30%, ideally under 10%.
        </p>
      </div>

      {/* Overall snapshot */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="flex flex-col items-center">
            <ScoreRing pct={overallPct} tier={overallTier} />
            <p className="text-xs text-zinc-400 mt-2 text-center">Overall revolving utilization</p>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Balance', val: fmtCurrency(totalBalance, state.isPrivacyMode), sub: 'across all cards' },
                { label: 'Total Limit',   val: fmtCurrency(totalLimit,   state.isPrivacyMode), sub: `${revolvingCards.length} cards` },
                { label: 'Available',     val: fmtCurrency(totalLimit - totalBalance, state.isPrivacyMode), sub: 'remaining credit', green: true },
              ].map(s => (
                <div key={s.label} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.green ? 'text-emerald-600' : 'text-zinc-900'}`}>{s.val}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Pay-to-target overall */}
            {overallPct > 10 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">To improve your overall score</p>
                {overallPct > 30 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-blue-900">
                        Pay {fmtCurrency(toThirtyOverall, state.isPrivacyMode)} across cards
                      </p>
                      <p className="text-[10px] text-blue-600">Drops overall utilization to 30%</p>
                    </div>
                    <TrendingDown size={16} className="text-blue-500" />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      Pay {fmtCurrency(toTenOverall, state.isPrivacyMode)} across cards
                    </p>
                    <p className="text-[10px] text-emerald-600">Reaches 10% — maximum credit score benefit</p>
                  </div>
                  <TrendingDown size={16} className="text-emerald-500" />
                </div>
              </div>
            )}

            {overallPct <= 10 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle size={16} className="text-emerald-500" />
                <p className="text-xs font-bold text-emerald-900">
                  You're at {overallPct.toFixed(1)}% — excellent! This is maximizing your credit score.
                </p>
              </div>
            )}

            {/* Tier badge breakdown */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Card rating breakdown</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(tierCounts) as [UtilTier, number][])
                  .filter(([, count]) => count > 0)
                  .map(([tier, count]) => {
                    const cfg = TIER_CONFIG[tier];
                    return (
                      <span key={tier} className={`px-3 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                        {count} {cfg.label}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* At-risk alert */}
      {atRisk.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              {atRisk.length} card{atRisk.length > 1 ? 's are' : ' is'} above 30% — actively hurting your score
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Prioritize extra payments on{' '}
              <span className="font-bold">{atRisk.map(c => c.name).join(', ')}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Info callout */}
      <div className="flex gap-3 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
        <Info size={15} className="text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-700">Utilization = ~30% of your FICO score. </span>
          Each card's individual ratio matters, not just the overall. Cards are sorted highest → lowest.
          The green marker = 10% (ideal), blue marker = 30% (still good).
        </p>
      </div>

      {/* Per-card grid */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 mb-4">
          Per-Card Breakdown <span className="text-sm font-normal text-zinc-400 ml-2">{revolvingCards.length} cards · sorted highest first</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedCards.map(card => (
            <CardUtilRow key={card.id} card={card} isPrivacyMode={!!state.isPrivacyMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UtilizationPage;
