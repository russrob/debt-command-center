import React, { useState, useMemo } from 'react';
import {
  Zap, Plus, Trash2, TrendingDown, DollarSign,
  Award, Calendar, ChevronDown
} from 'lucide-react';
import { AppState, Snowflake } from '../types';
import { generatePayoffPlan, getPriorityRank } from '../utils/debtLogic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const SOURCES = [
  'Cashback reward', 'eBay / Marketplace sale', 'Overtime pay',
  'Tax refund', 'Birthday / gift money', 'Side hustle',
  'Coupon savings', 'Skipped subscription', 'Found money',
  'Bonus / commission', 'Freelance work', 'Sold clothing',
  'Referral bonus', 'Other',
];

const STREAK_EMOJI = (days: number) =>
  days >= 30 ? '🔥🔥🔥' : days >= 14 ? '🔥🔥' : days >= 7 ? '🔥' : '';

// ─── Component ────────────────────────────────────────────────────────────────

export const SnowflakingPage: React.FC<{ state: AppState; onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(SOURCES[0]);
  const [customSource, setCustomSource] = useState('');
  const [cardId, setCardId] = useState(state.cards[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [filterCard, setFilterCard] = useState('all');
  const priv = !!state.isPrivacyMode;

  const snowflakes: Snowflake[] = state.snowflakes || [];

  // Auto-suggest the priority target card
  const priorityCard = useMemo(() =>
    [...state.cards].filter(c => c.balance > 0)
      .sort((a, b) => getPriorityRank(a, state.preferredStrategy) - getPriorityRank(b, state.preferredStrategy))[0],
    [state.cards, state.preferredStrategy]);

  // Stats
  const totalSnowflaked = snowflakes.reduce((s, f) => s + f.amount, 0);
  const thisMonthTotal  = snowflakes
    .filter(f => f.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((s, f) => s + f.amount, 0);
  const thisYearTotal   = snowflakes
    .filter(f => f.date.startsWith(new Date().getFullYear().toString()))
    .reduce((s, f) => s + f.amount, 0);

  // Streak — consecutive days with a snowflake
  const streak = useMemo(() => {
    const dates = new Set(snowflakes.map(f => f.date));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dates.has(d.toISOString().split('T')[0])) count++;
      else if (i > 0) break;
    }
    return count;
  }, [snowflakes]);

  // Impact: how much interest did these snowflakes save vs. baseline plan?
  const interestImpact = useMemo(() => {
    const basePlan  = generatePayoffPlan(state.cards, state.monthlyBudget, state.preferredStrategy, 120);
    // Simulate cards with snowflake amounts already knocked off
    const byCard: Record<string, number> = {};
    snowflakes.forEach(f => { byCard[f.cardId] = (byCard[f.cardId] || 0) + f.amount; });
    const boostedCards = state.cards.map(c => ({
      ...c,
      balance: Math.max(0, c.balance - (byCard[c.id] || 0)),
    }));
    const boostedPlan = generatePayoffPlan(boostedCards, state.monthlyBudget, state.preferredStrategy, 120);
    const baseInt     = basePlan.reduce((s, p) => s + p.totalInterest, 0);
    const boostedInt  = boostedPlan.reduce((s, p) => s + p.totalInterest, 0);
    return {
      interestSaved: Math.max(0, baseInt - boostedInt),
      monthsSaved:   Math.max(0, basePlan.length - boostedPlan.length),
    };
  }, [snowflakes, state.cards, state.monthlyBudget, state.preferredStrategy]);

  // Group by month for display
  const grouped = useMemo(() => {
    const filtered = filterCard === 'all' ? snowflakes : snowflakes.filter(f => f.cardId === filterCard);
    const map: Record<string, Snowflake[]> = {};
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)).forEach(f => {
      const m = f.date.substring(0, 7);
      if (!map[m]) map[m] = [];
      map[m].push(f);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [snowflakes, filterCard]);

  const addSnowflake = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !cardId) return;
    const sf: Snowflake = {
      id: crypto.randomUUID(),
      date,
      amount: amt,
      source: source === 'Other' ? customSource || 'Other' : source,
      cardId,
      notes: notes.trim() || undefined,
    };
    onUpdateState({ ...state, snowflakes: [...snowflakes, sf] });
    setAmount(''); setNotes(''); setShowForm(false);
  };

  const deleteSnowflake = (id: string) => {
    onUpdateState({ ...state, snowflakes: snowflakes.filter(f => f.id !== id) });
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Snowflaking</h1>
          <p className="text-zinc-500 mt-1">Every micro-windfall logged and thrown at your debt. Small amounts. Massive impact.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
          <Plus size={16} /> Log Snowflake
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Snowflaked',   val: fmt(totalSnowflaked, priv), sub: `${snowflakes.length} entries`, dark: true },
          { label: 'Interest Saved',     val: fmt(interestImpact.interestSaved, priv), sub: 'vs. no snowflaking', good: true },
          { label: 'Months Saved',       val: `${interestImpact.monthsSaved}mo`, sub: 'earlier freedom date', good: true },
          { label: 'This Month',         val: fmt(thisMonthTotal, priv), sub: 'keep it up!', good: false },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${(s as any).dark ? 'bg-zinc-900 border-zinc-800' : (s as any).good && parseFloat(s.val.replace(/\D/g,'')) > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-zinc-400">{s.label}</p>
            <p className={`text-2xl font-bold ${(s as any).dark ? 'text-white' : (s as any).good && parseFloat(s.val.replace(/\D/g,'')) > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>{s.val}</p>
            <p className={`text-[10px] mt-1 ${(s as any).dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Streak + motivation */}
      {streak > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4">
          <div className="text-3xl">{STREAK_EMOJI(streak)}</div>
          <div>
            <p className="font-bold text-amber-900">{streak}-day snowflaking streak!</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You've snowflaked {fmt(thisMonthTotal, priv)} this month and saved an estimated {fmt(interestImpact.interestSaved, priv)} in interest overall.
            </p>
          </div>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-900">Log a Snowflake</h2>

          {/* Priority suggestion */}
          {priorityCard && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <p className="text-xs text-blue-800">
                <span className="font-bold">Suggested target: {priorityCard.name}</span> — your {state.preferredStrategy} priority card
              </p>
              <button onClick={() => setCardId(priorityCard.id)}
                className="text-[10px] font-bold text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-all">
                Use this
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Amount ($)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 font-bold text-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Apply to Card</label>
              <select value={cardId} onChange={e => setCardId(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                {state.cards.filter(c => c.balance > 0).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {source === 'Other' && (
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Describe Source</label>
              <input type="text" value={customSource} onChange={e => setCustomSource(e.target.value)} placeholder="e.g. Sold my old bike"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Amazon returns cashback"
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>

          <div className="flex gap-3">
            <button onClick={addSnowflake} disabled={!amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <Zap size={16} /> Log Snowflake
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick add amounts */}
      {!showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Quick Log Common Amounts</p>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 20, 25, 50, 100].map(v => (
              <button key={v} onClick={() => { setAmount(v.toString()); setCardId(priorityCard?.id || state.cards[0]?.id || ''); setShowForm(true); }}
                className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:border-zinc-900 hover:bg-zinc-100 transition-all">
                ${v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900">Snowflake History</h2>
          <select value={filterCard} onChange={e => setFilterCard(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none">
            <option value="all">All Cards</option>
            {state.cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-12 text-zinc-300">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-zinc-400 font-medium">No snowflakes logged yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Every dollar counts. Log your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([month, flakes]) => {
              const monthTotal = flakes.reduce((s, f) => s + f.amount, 0);
              const monthLabel = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
              return (
                <div key={month}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{monthLabel}</p>
                    <p className="text-xs font-bold text-zinc-900">{fmt(monthTotal, priv)}</p>
                  </div>
                  <div className="space-y-2">
                    {flakes.map(f => {
                      const card = state.cards.find(c => c.id === f.cardId);
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl group">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Zap size={12} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900">{f.source}</p>
                            <div className="flex gap-2 text-[10px] text-zinc-400 flex-wrap">
                              <span>{f.date}</span>
                              {card && <span>→ {card.name}</span>}
                              {f.notes && <span>· {f.notes}</span>}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{fmt(f.amount, priv)}</span>
                          <button onClick={() => deleteSnowflake(f.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-300">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What is snowflaking */}
      <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-700">What is snowflaking? </span>
          The debt snowflake method means applying every small, unexpected amount of money directly to your debt the moment you receive it — cashback rewards, selling old items, skipping a coffee, a $20 birthday gift. 
          Research shows consistent snowflakers pay off debt 15–20% faster than those relying only on fixed monthly payments. Small amounts compound into big results.
        </p>
      </div>
    </div>
  );
};

export default SnowflakingPage;
