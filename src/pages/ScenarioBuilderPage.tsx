import React, { useState, useMemo } from 'react';
import {
  FlaskConical, Plus, Trash2, TrendingDown, DollarSign,
  Zap, ChevronDown, ChevronUp, Save, RefreshCw, Copy
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { AppState, Card, Scenario } from '../types';
import { generatePayoffPlan } from '../utils/debtLogic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const SCENARIO_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const PRESET_SCENARIOS: Omit<Scenario, 'id' | 'createdAt'>[] = [
  {
    name: 'US Foods First Paycheck',
    description: 'Put entire first US Foods paycheck at debt',
    monthlyBudgetDelta: 0,
    oneTimePrincipal: 4000,
    targetCardId: '',
    incomeChange: 0,
    expenseChange: 0,
  },
  {
    name: 'US Foods Salary Boost',
    description: '$120K base = +$3,000/mo net after taxes vs current',
    monthlyBudgetDelta: 500,
    oneTimePrincipal: 0,
    targetCardId: '',
    incomeChange: 3000,
    expenseChange: 0,
  },
  {
    name: 'Cut $300/mo Subscriptions',
    description: 'Audit and cancel recurring charges, redirect to debt',
    monthlyBudgetDelta: 300,
    oneTimePrincipal: 0,
    targetCardId: '',
    incomeChange: 0,
    expenseChange: -300,
  },
  {
    name: 'Tax Refund Lump Sum',
    description: 'Average US tax refund applied to target card',
    monthlyBudgetDelta: 0,
    oneTimePrincipal: 2800,
    targetCardId: '',
    incomeChange: 0,
    expenseChange: 0,
  },
  {
    name: 'Sell Car / Asset',
    description: 'Large lump sum from selling an asset',
    monthlyBudgetDelta: 0,
    oneTimePrincipal: 8000,
    targetCardId: '',
    incomeChange: 0,
    expenseChange: 0,
  },
  {
    name: 'Side Hustle $500/mo',
    description: 'Part-time income fully applied to debt',
    monthlyBudgetDelta: 500,
    oneTimePrincipal: 0,
    targetCardId: '',
    incomeChange: 500,
    expenseChange: 0,
  },
];

// ─── Run a scenario against the baseline plan ─────────────────────────────────

function runScenario(state: AppState, scenario: Scenario) {
  const budget = state.monthlyBudget + scenario.monthlyBudgetDelta;

  // Apply lump sum to a card (target or highest APR)
  let cards = state.cards.map(c => ({ ...c }));
  if (scenario.oneTimePrincipal > 0) {
    const target = scenario.targetCardId
      ? cards.find(c => c.id === scenario.targetCardId)
      : [...cards].filter(c => c.balance > 0).sort((a, b) => b.apr - a.apr)[0];
    if (target) {
      cards = cards.map(c =>
        c.id === target.id
          ? { ...c, balance: Math.max(0, c.balance - scenario.oneTimePrincipal) }
          : c
      );
    }
  }

  const plan     = generatePayoffPlan(cards, budget, state.preferredStrategy, 120);
  const interest = plan.reduce((s, p) => s + p.totalInterest, 0);
  return { plan, interest, budget, cards };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ScenarioBuilderPage: React.FC<{ state: AppState; onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>(state.scenarios || []);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Scenario, 'id' | 'createdAt'>>({
    name: '',
    description: '',
    monthlyBudgetDelta: 0,
    oneTimePrincipal: 0,
    targetCardId: '',
    incomeChange: 0,
    expenseChange: 0,
  });
  const priv = !!state.isPrivacyMode;

  // Baseline
  const baseline = useMemo(() => {
    const plan     = generatePayoffPlan(state.cards, state.monthlyBudget, state.preferredStrategy, 120);
    const interest = plan.reduce((s, p) => s + p.totalInterest, 0);
    return { plan, interest };
  }, [state.cards, state.monthlyBudget, state.preferredStrategy]);

  // Run all scenarios
  const results = useMemo(() =>
    scenarios.map(s => ({ scenario: s, ...runScenario(state, s) })),
    [scenarios, state]);

  // Chart data — baseline + all scenarios
  const chartData = useMemo(() => {
    const maxLen = Math.max(
      baseline.plan.length,
      ...results.map(r => r.plan.length),
      1
    );
    return Array.from({ length: Math.min(maxLen, 48) }, (_, i) => {
      const baseTotal = Object.values((baseline.plan[i]?.remainingBalances || {}) as Record<string,number>).reduce((s, v) => s + Math.max(0, v), 0);
      const pt: Record<string, number | string> = {
        month: i + 1,
        Baseline: Math.round(baseTotal),
      };
      results.forEach((r, ri) => {
        const total = Object.values((r.plan[i]?.remainingBalances || {}) as Record<string,number>).reduce((s, v) => s + Math.max(0, v), 0);
        pt[r.scenario.name] = Math.round(total);
      });
      return pt;
    });
  }, [baseline, results]);

  const saveScenario = () => {
    if (!draft.name.trim()) return;
    const s: Scenario = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...scenarios, s];
    setScenarios(updated);
    onUpdateState({ ...state, scenarios: updated });
    setShowForm(false);
    setDraft({ name: '', description: '', monthlyBudgetDelta: 0, oneTimePrincipal: 0, targetCardId: '', incomeChange: 0, expenseChange: 0 });
  };

  const deleteScenario = (id: string) => {
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    onUpdateState({ ...state, scenarios: updated });
  };

  const addPreset = (preset: Omit<Scenario, 'id' | 'createdAt'>) => {
    const s: Scenario = { ...preset, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [...scenarios, s];
    setScenarios(updated);
    onUpdateState({ ...state, scenarios: updated });
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">What-If Scenarios</h1>
          <p className="text-zinc-500 mt-1">Model any financial decision and see the exact impact on your payoff date.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
          <Plus size={16} /> New Scenario
        </button>
      </div>

      {/* Baseline */}
      <div className="bg-zinc-900 text-white rounded-3xl p-7">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Your Baseline (Current Plan)</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Debt-Free',     val: baseline.plan.length > 0 ? new Date(new Date().getFullYear(), new Date().getMonth() + baseline.plan.length, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A' },
            { label: 'Months Left',   val: `${baseline.plan.length}mo` },
            { label: 'Total Interest', val: fmt(baseline.interest, priv) },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-xl font-bold">{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preset scenarios */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Quick Scenarios</h2>
        <p className="text-xs text-zinc-400 mb-4">Tap to add any of these to your comparison — built for your situation.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_SCENARIOS.map((preset, i) => {
            const alreadyAdded = scenarios.some(s => s.name === preset.name);
            return (
              <button key={i} onClick={() => !alreadyAdded && addPreset(preset)} disabled={alreadyAdded}
                className={`text-left p-4 rounded-2xl border transition-all ${alreadyAdded ? 'border-emerald-200 bg-emerald-50 opacity-70' : 'border-zinc-100 hover:border-zinc-900 hover:bg-zinc-50'}`}>
                <div className="flex justify-between items-start">
                  <p className="font-bold text-zinc-900 text-sm">{preset.name}</p>
                  {alreadyAdded
                    ? <span className="text-[10px] text-emerald-600 font-bold">Added ✓</span>
                    : <Plus size={14} className="text-zinc-400" />}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{preset.description}</p>
                <div className="flex gap-3 mt-2 text-[10px] font-bold">
                  {preset.oneTimePrincipal > 0 && <span className="text-emerald-600">+{fmt(preset.oneTimePrincipal)} lump sum</span>}
                  {preset.monthlyBudgetDelta > 0 && <span className="text-blue-600">+{fmt(preset.monthlyBudgetDelta)}/mo</span>}
                  {preset.incomeChange > 0 && <span className="text-violet-600">+{fmt(preset.incomeChange)}/mo income</span>}
                  {preset.expenseChange < 0 && <span className="text-amber-600">{fmt(preset.expenseChange)}/mo expenses</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom scenario form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-900">Build Custom Scenario</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Scenario Name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sell my car"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Description (optional)</label>
              <input type="text" value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief explanation of this scenario"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            {[
              { label: 'Extra Monthly Payment ($)', key: 'monthlyBudgetDelta', help: 'Additional monthly debt budget on top of current' },
              { label: 'One-Time Lump Sum ($)',     key: 'oneTimePrincipal',   help: 'Applied to target card immediately (e.g. bonus, tax refund)' },
              { label: 'Monthly Income Change ($)', key: 'incomeChange',       help: 'Positive = raise/side income. Negative = income loss' },
              { label: 'Monthly Expense Change ($)', key: 'expenseChange',     help: 'Negative = cuts (e.g. -300 means $300 less spending)' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{f.label}</label>
                <input type="number" value={(draft as any)[f.key] || ''} onChange={e => setDraft(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <p className="text-[10px] text-zinc-400 mt-1">{f.help}</p>
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Lump Sum Target Card</label>
              <select value={draft.targetCardId || ''} onChange={e => setDraft(p => ({ ...p, targetCardId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                <option value="">Highest APR (auto)</option>
                {state.cards.filter(c => c.balance > 0).map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.apr}% APR</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveScenario} disabled={!draft.name.trim()}
              className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <Save size={16} /> Add Scenario
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results comparison */}
      {results.length > 0 && (
        <>
          {/* Comparison chart */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Side-by-Side Comparison</h2>
            <p className="text-xs text-zinc-400 mb-5">Baseline (dashed) vs. each scenario. Every line that drops faster = months back in your life.</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `M${v}`} interval={5} />
                <YAxis hide domain={[0, 'auto']} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 11 }}
                  formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name]} />
                <Line type="monotone" dataKey="Baseline" stroke="#d1d5db" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                {results.map((r, i) => (
                  <Line key={r.scenario.id} type="monotone" dataKey={r.scenario.name}
                    stroke={SCENARIO_COLORS[i % SCENARIO_COLORS.length]} strokeWidth={2.5} dot={false} />
                ))}
                <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900">Scenario Results</h2>
            {results.map((r, i) => {
              const monthsSaved    = Math.max(0, baseline.plan.length - r.plan.length);
              const interestSaved  = Math.max(0, baseline.interest - r.interest);
              const isExpanded     = expandedId === r.scenario.id;
              const color          = SCENARIO_COLORS[i % SCENARIO_COLORS.length];
              const debtFreeDate   = r.plan.length > 0
                ? new Date(new Date().getFullYear(), new Date().getMonth() + r.plan.length, 1)
                    .toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                : 'Already free!';

              return (
                <div key={r.scenario.id} className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-0">
                    <div className="w-1.5 self-stretch rounded-l-3xl" style={{ backgroundColor: color }} />
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-zinc-900">{r.scenario.name}</h3>
                          {r.scenario.description && <p className="text-xs text-zinc-400 mt-0.5">{r.scenario.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedId(isExpanded ? null : r.scenario.id)}
                            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-all">
                            {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                          </button>
                          <button onClick={() => deleteScenario(r.scenario.id)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-300">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Debt-Free Date',   val: debtFreeDate, highlight: monthsSaved > 0 },
                          { label: 'Months Saved',     val: monthsSaved > 0 ? `${monthsSaved}mo earlier` : 'Same pace', highlight: monthsSaved > 0 },
                          { label: 'Interest Saved',   val: fmt(interestSaved, priv), highlight: interestSaved > 100 },
                          { label: 'Monthly Budget',   val: fmt(r.budget, priv) + '/mo', highlight: false },
                        ].map(s => (
                          <div key={s.label} className={`p-3 rounded-xl border ${s.highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100'}`}>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{s.label}</p>
                            <p className={`text-sm font-bold ${s.highlight ? 'text-emerald-600' : 'text-zinc-900'}`}>{s.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Scenario inputs summary */}
                      <div className="flex gap-3 mt-3 flex-wrap">
                        {r.scenario.oneTimePrincipal > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                            +{fmt(r.scenario.oneTimePrincipal)} lump sum
                          </span>
                        )}
                        {r.scenario.monthlyBudgetDelta > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                            +{fmt(r.scenario.monthlyBudgetDelta)}/mo extra
                          </span>
                        )}
                        {r.scenario.incomeChange !== 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full">
                            {r.scenario.incomeChange > 0 ? '+' : ''}{fmt(r.scenario.incomeChange)}/mo income
                          </span>
                        )}
                        {r.scenario.expenseChange !== 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                            {fmt(r.scenario.expenseChange)}/mo expenses
                          </span>
                        )}
                      </div>

                      {/* Expanded: month breakdown */}
                      {isExpanded && (
                        <div className="mt-5 border-t border-zinc-100 pt-4">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">First 6 Months</p>
                          <div className="space-y-2">
                            {r.plan.slice(0, 6).map((step, mi) => {
                              const total = (Object.values(step.remainingBalances) as number[]).reduce((s, v) => s + Math.max(0, v), 0);
                              const paid  = step.payments.reduce((s, p) => s + p.amount, 0);
                              return (
                                <div key={mi} className="flex justify-between items-center text-xs p-2.5 bg-zinc-50 rounded-xl">
                                  <span className="font-bold text-zinc-700 w-20">{step.month}</span>
                                  <span className="text-zinc-500">Paid: <span className="font-bold text-zinc-900">{fmt(paid, priv)}</span></span>
                                  <span className="text-zinc-500">Remaining: <span className="font-bold text-zinc-900">{fmt(total, priv)}</span></span>
                                  <span className="text-red-500">Interest: {fmt(step.totalInterest, priv)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {results.length === 0 && !showForm && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center">
          <FlaskConical size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="font-bold text-zinc-900">No scenarios yet</p>
          <p className="text-sm text-zinc-400 mt-1">Add a quick scenario above or build a custom one to see the impact.</p>
        </div>
      )}
    </div>
  );
};

export default ScenarioBuilderPage;
