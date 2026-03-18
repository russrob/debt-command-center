import React, { useMemo, useState } from 'react';
import {
  TrendingDown, AlertCircle, DollarSign,
  Calendar, BarChart2, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { AppState } from '../types';
import { calculateMonthlyInterest, generatePayoffPlan } from '../utils/debtLogic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const fmtFull = (n: number, priv = false) =>
  priv ? '••••' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Main Component ───────────────────────────────────────────────────────────

export const InterestTrackerPage: React.FC<{ state: AppState }> = ({ state }) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const priv = !!state.isPrivacyMode;

  // ── Actual interest from logged statements ────────────────────────────────
  const totalActualInterest = state.statements.reduce((s, st) => s + st.interestCharged, 0);

  const actualByCard = useMemo(() =>
    state.cards.map(card => {
      const stmts = state.statements.filter(s => s.cardId === card.id);
      const interest = stmts.reduce((s, st) => s + st.interestCharged, 0);
      return { card, interest, stmtCount: stmts.length };
    }).filter(x => x.stmtCount > 0)
      .sort((a, b) => b.interest - a.interest),
    [state.cards, state.statements]);

  // ── Actual interest by month (from statements) ────────────────────────────
  const actualByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    state.statements.forEach(s => {
      const month = s.date.substring(0, 7);
      map[month] = (map[month] || 0) + s.interestCharged;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, interest]) => ({
        month: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        'Actual Interest': Math.round(interest),
      }));
  }, [state.statements]);

  // ── Projected interest from payoff plan ───────────────────────────────────
  const plan = useMemo(() =>
    generatePayoffPlan(state.cards, state.monthlyBudget, state.preferredStrategy, 120),
    [state.cards, state.monthlyBudget, state.preferredStrategy]);

  const projectedTotalInterest = plan.reduce((s, p) => s + p.totalInterest, 0);

  const projectedByMonth = useMemo(() =>
    plan.slice(0, 24).map(step => ({
      month: step.month,
      'Projected Interest': Math.round(step.totalInterest),
    })),
    [plan]);

  // ── Current monthly interest per card ────────────────────────────────────
  const currentMonthlyInterest = state.cards.reduce((s, c) => s + calculateMonthlyInterest(c), 0);
  const currentAnnualInterest  = currentMonthlyInterest * 12;

  const cardInterestRows = useMemo(() =>
    [...state.cards]
      .filter(c => c.balance > 0 && c.apr > 0)
      .map(card => {
        const monthly   = calculateMonthlyInterest(card);
        const annual    = monthly * 12;
        const pctOfTot  = currentMonthlyInterest > 0 ? (monthly / currentMonthlyInterest) * 100 : 0;
        const stmts     = state.statements.filter(s => s.cardId === card.id);
        const actualPaid = stmts.reduce((s, st) => s + st.interestCharged, 0);
        // Projected interest remaining for this card
        const cardPlan  = generatePayoffPlan(
          state.cards.filter(c => c.id === card.id),
          Math.max(card.minPayment, monthly + 1),
          state.preferredStrategy,
          120
        );
        const projRemaining = cardPlan.reduce((s, p) => s + p.totalInterest, 0);
        return { card, monthly, annual, pctOfTot, actualPaid, projRemaining, stmts };
      })
      .sort((a, b) => b.monthly - a.monthly),
    [state.cards, state.statements, currentMonthlyInterest, state.monthlyBudget]);

  // ── Combined actual + projected chart ────────────────────────────────────
  const combinedChart = useMemo(() => {
    const actual = actualByMonth.map(m => ({ ...m, type: 'actual' }));
    const proj   = projectedByMonth.slice(0, 12).map(m => ({ ...m, type: 'projected' }));
    return [
      ...actual.map(m => ({ month: m.month, 'Actual (logged)': m['Actual Interest'], 'Projected': undefined })),
      ...proj.map(m => ({ month: m.month, 'Actual (logged)': undefined, 'Projected': m['Projected Interest'] })),
    ];
  }, [actualByMonth, projectedByMonth]);

  // ── Pie: breakdown by card (current monthly) ─────────────────────────────
  const pieData = cardInterestRows.map(r => ({
    name: r.card.name,
    value: Math.round(r.monthly),
    color: r.card.color,
  }));

  // ── What you've paid so far in interest vs principal ─────────────────────
  const totalPaymentsLogged = state.payments.reduce((s, p) => s + p.amount, 0);
  const estimatedPrincipalPaid = Math.max(0, totalPaymentsLogged - totalActualInterest);
  const interestRatio = totalPaymentsLogged > 0 ? (totalActualInterest / totalPaymentsLogged) * 100 : 0;

  // ── Interest-free milestone: when does monthly interest drop below $100? ─
  const milestone = plan.findIndex(step => step.totalInterest < 100);

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Interest Tracker</h1>
        <p className="text-zinc-500 mt-1">
          Every dollar the banks have taken — and a clear path to making it stop.
        </p>
      </div>

      {/* ── The Real Cost Scoreboard ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Interest Paid to Date',
            val: fmt(totalActualInterest, priv),
            sub: `from ${state.statements.length} logged statements`,
            dark: true,
          },
          {
            label: 'Projected Interest Left',
            val: fmt(projectedTotalInterest, priv),
            sub: `${plan.length} months remaining`,
            bad: true,
          },
          {
            label: 'This Month (current rate)',
            val: fmt(currentMonthlyInterest, priv),
            sub: fmt(currentAnnualInterest, priv) + '/yr at current balances',
            bad: true,
          },
          {
            label: 'Total Interest Cost',
            val: fmt(totalActualInterest + projectedTotalInterest, priv),
            sub: 'paid + projected combined',
            bad: false,
          },
        ].map(s => (
          <div key={s.label}
            className={`rounded-2xl p-5 border ${(s as any).dark ? 'bg-zinc-900 border-zinc-800' : (s as any).bad ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-zinc-400">{s.label}</p>
            <p className={`text-xl font-bold leading-tight ${(s as any).dark ? 'text-white' : (s as any).bad ? 'text-red-600' : 'text-zinc-900'}`}>{s.val}</p>
            <p className={`text-[10px] mt-1 ${(s as any).dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Payments: interest vs principal ── */}
      {totalPaymentsLogged > 0 && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-5">Your Payments: Where the Money Actually Went</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-4">
              {[
                { label: 'Total Paid', val: totalPaymentsLogged, color: 'bg-zinc-200', pct: 100 },
                { label: 'Went to Principal', val: estimatedPrincipalPaid, color: 'bg-emerald-500', pct: 100 - interestRatio },
                { label: 'Went to Interest', val: totalActualInterest, color: 'bg-red-400', pct: interestRatio },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-zinc-700">{r.label}</span>
                    <span className="font-bold text-zinc-900">{fmt(r.val, priv)}</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.color} transition-all duration-700`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-zinc-400 mt-2">
                Based on logged payments and statement interest charges.{' '}
                <span className="font-bold text-red-500">{interestRatio.toFixed(1)}%</span> of everything you've paid went straight to the bank, not your balance.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center border-8 ${interestRatio > 30 ? 'border-red-400' : 'border-emerald-400'}`}>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${interestRatio > 30 ? 'text-red-600' : 'text-emerald-600'}`}>{interestRatio.toFixed(0)}%</p>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider">to interest</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-2 text-center">Target: below 20%</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly interest trend (actual logged) ── */}
      {actualByMonth.length > 1 && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Monthly Interest — Actual Logged</h2>
          <p className="text-xs text-zinc-400 mb-5">From your statement imports. Add more statements to see the trend.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={actualByMonth} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
              <YAxis hide domain={[0, 'auto']} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                formatter={(val: number) => [`$${val.toLocaleString()}`, 'Interest charged']} />
              <Bar dataKey="Actual Interest" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Projected interest declining ── */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Projected Interest — Month by Month</h2>
        <p className="text-xs text-zinc-400 mb-5">
          Watch it shrink as you pay down balances.
          {milestone > 0 && (
            <span className="text-emerald-600 font-bold ml-1">
              Drops below $100/mo in month {milestone + 1} ({plan[milestone]?.month}).
            </span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={projectedByMonth}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} interval={3} />
            <YAxis hide domain={[0, 'auto']} />
            <RechartsTooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, 'Projected interest']} />
            <Line type="monotone" dataKey="Projected Interest" stroke="#f97316" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Per-card breakdown ── */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-5">Per-Card Interest Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Table */}
          <div className="space-y-3">
            {cardInterestRows.map(r => {
              const isExpanded = expandedCard === r.card.id;
              return (
                <div key={r.card.id} className="border border-zinc-100 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandedCard(isExpanded ? null : r.card.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors text-left">
                    <div className="w-8 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: r.card.color }}>
                      {r.card.bank.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-sm">{r.card.name}</p>
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-red-400 transition-all"
                          style={{ width: `${Math.min(r.pctOfTot, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-sm font-bold text-red-600">{fmt(r.monthly, priv)}/mo</p>
                      <p className="text-[10px] text-zinc-400">{r.pctOfTot.toFixed(0)}% of burden</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-100 bg-zinc-50">
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {[
                          { label: 'Monthly Interest',   val: fmtFull(r.monthly, priv) },
                          { label: 'Annual Interest',    val: fmt(r.annual, priv) },
                          { label: 'Actual Paid (logged)', val: fmt(r.actualPaid, priv) },
                          { label: 'Projected Remaining', val: fmt(r.projRemaining, priv) },
                          { label: 'APR',                val: `${r.card.apr}%` },
                          { label: 'Current Balance',    val: fmt(r.card.balance, priv) },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-xl p-3 border border-zinc-100">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                            <p className="text-sm font-bold text-zinc-900">{s.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Per-card statement history */}
                      {r.stmts.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Statement History</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {[...r.stmts]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map(s => (
                                <div key={s.id} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-zinc-100">
                                  <span className="text-zinc-500">{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  <span className="text-zinc-600">Bal: {fmt(s.balance, priv)}</span>
                                  <span className={`font-bold ${s.interestCharged > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {s.interestCharged > 0 ? '-' : ''}{fmtFull(s.interestCharged, priv)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pie chart */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Current Monthly Interest by Card</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                  formatter={(val: number, name: string) => [`$${val.toLocaleString()}/mo`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-zinc-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-red-600">{fmt(d.value, priv)}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Log a statement prompt ── */}
      {state.statements.length === 0 && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 items-start">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">No statements logged yet</p>
            <p className="text-xs text-amber-700 mt-1">
              Go to <span className="font-bold">Statements</span> and log your actual monthly interest charges from each card's statement.
              The more you log, the more accurate your "actual paid" tracking becomes.
            </p>
          </div>
        </div>
      )}

      {/* ── How to use tip ── */}
      <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex gap-3">
        <Info size={15} className="text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-700">How to get the most out of this: </span>
          Every month after your statement closes, go to <span className="font-bold">Statements</span> and log the interest charged field from your card statement.
          This gives you real tracked interest vs. the estimated projections. Over time you'll see the actual red bars shrinking — which is the most motivating thing in this entire app.
        </p>
      </div>
    </div>
  );
};

export default InterestTrackerPage;
