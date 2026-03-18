import React, { useState, useEffect } from 'react';
import { DollarSign, Brain, RefreshCw } from 'lucide-react';
import { AppState, Asset } from '../types';
import { getNetWorthInsight } from '../utils/claudeAI';

const ASSET_COLORS: Record<string, string> = {
  checking: '#0ea5e9', savings: '#059669', business: '#7c3aed',
  cash: '#10b981', retirement: '#2563eb', brokerage: '#6366f1',
  crypto: '#f59e0b', property: '#8b5cf6', vehicle: '#d97706', other: '#6b7280',
  // legacy
  investment: '#2563eb',
};
const ASSET_LABELS: Record<string, string> = {
  checking: 'Checking', savings: 'Savings / HYSA', business: 'Business Account',
  cash: 'Cash on Hand', retirement: '401(k) / IRA', brokerage: 'Brokerage',
  crypto: 'Crypto', property: 'Real Estate', vehicle: 'Vehicle(s)', other: 'Other',
  // legacy
  investment: 'Investments',
};

const fmt = (n: number, priv = false) =>
  priv ? '••••••' : '$' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

export const NetWorthPage: React.FC<{ state: AppState; onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const assets: Asset[] = state.assets ?? [];

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCat, setNewCat] = useState<Asset['category']>('checking');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const setAssets = (updater: (prev: Asset[]) => Asset[]) => {
    onUpdateState({ ...state, assets: updater(assets) });
  };

  const totalDebt   = state.cards.reduce((s, c) => s + c.balance, 0);
  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const netWorth    = totalAssets - totalDebt;
  const dti         = state.income > 0 ? (totalDebt / (state.income * 12)) * 100 : 0;
  const monthlyMin  = state.cards.reduce((s, c) => s + c.minPayment, 0);
  const monthlyDTI  = state.income > 0 ? (monthlyMin / state.income) * 100 : 0;
  const maxBar      = Math.max(totalAssets, totalDebt, 1);
  const cashRunway  = state.monthlyExpenses > 0
    ? (assets.filter(a => ['cash','checking','savings'].includes(a.category)).reduce((s, a) => s + a.amount, 0) / state.monthlyExpenses).toFixed(1)
    : '—';

  const byCat = Object.entries(
    assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + a.amount; return acc; }, {} as Record<string, number>)
  );

  const dtiColor = monthlyDTI < 28
    ? { text: 'text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Healthy' }
    : monthlyDTI < 36
    ? { text: 'text-amber-600',   bar: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',     label: 'Moderate' }
    : { text: 'text-red-600',     bar: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',           label: 'High' };

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      setInsight(await getNetWorthInsight({ totalDebt, totalAssets, netWorth, dti, monthlyIncome: state.income }));
    } catch {
      setInsight('Unable to load AI insight. Try refreshing.');
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => { fetchInsight(); }, []);

  const addAsset = () => {
    if (!newLabel.trim() || !newAmount) return;
    setAssets(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), amount: parseFloat(newAmount) || 0, category: newCat }]);
    setNewLabel(''); setNewAmount(''); setShowAdd(false);
  };

  const updateAssetAmount = (id: string, amount: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, amount } : a));
    setEditingId(null);
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Net Worth &amp; DTI</h1>
          <p className="text-zinc-500 mt-1">Your full financial picture — assets vs. debt.</p>
        </div>
        <button onClick={fetchInsight} disabled={loadingInsight}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all disabled:opacity-50">
          <RefreshCw size={14} className={loadingInsight ? 'animate-spin' : ''} /> Refresh AI
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-3xl p-8 shadow-sm flex flex-col justify-between ${netWorth >= 0 ? 'bg-zinc-900' : 'bg-red-900'} text-white`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Net Worth</p>
            <p className={`text-4xl font-bold tracking-tight ${state.isPrivacyMode ? 'blur-sm select-none' : ''}`}>
              {netWorth < 0 ? '-' : ''}{fmt(netWorth, state.isPrivacyMode)}
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs"><span className="opacity-50">Assets</span><span className="font-bold">{fmt(totalAssets, state.isPrivacyMode)}</span></div>
            <div className="flex justify-between text-xs"><span className="opacity-50">Debt</span><span className="font-bold text-red-300">−{fmt(totalDebt, state.isPrivacyMode)}</span></div>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Monthly DTI</p>
            <p className={`text-3xl font-bold ${dtiColor.text}`}>{monthlyDTI.toFixed(1)}%</p>
            <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${dtiColor.badge}`}>{dtiColor.label}</span>
            <div className="mt-4 w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${dtiColor.bar}`} style={{ width: `${Math.min(monthlyDTI, 100)}%` }} />
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">Monthly debt payments ÷ gross income</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Annual DTI</p>
            <p className="text-3xl font-bold text-zinc-900">{dti.toFixed(1)}%</p>
            <p className="text-xs text-zinc-500 mt-2">Total debt ÷ annual income</p>
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-500"><span>Cash runway</span><span className="font-bold">{cashRunway} mo</span></div>
              <div className="flex justify-between text-[10px] text-zinc-500"><span>Asset / Debt ratio</span><span className="font-bold">{totalDebt > 0 ? (totalAssets / totalDebt).toFixed(2) : '∞'}x</span></div>
            </div>
          </div>

          <div className="col-span-2 bg-white border border-zinc-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Balance Sheet</p>
            <div className="space-y-2">
              {[{ label: 'Assets', val: totalAssets, color: 'bg-emerald-500' }, { label: 'Debt', val: totalDebt, color: 'bg-red-500' }].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 w-12 text-right">{r.label}</span>
                  <div className="flex-1 bg-zinc-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${r.color} transition-all`} style={{ width: `${(r.val / maxBar) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-700 w-20 text-right">{fmt(r.val, state.isPrivacyMode)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Claude insight */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center">
            <Brain size={18} className="text-violet-600" />
          </div>
          <div><h3 className="font-bold text-zinc-900">Claude's Assessment</h3><p className="text-xs text-zinc-400">AI-powered financial health analysis</p></div>
        </div>
        {loadingInsight ? (
          <div className="space-y-2 animate-pulse"><div className="h-4 bg-zinc-100 rounded w-4/5" /><div className="h-4 bg-zinc-100 rounded w-3/5" /></div>
        ) : (
          <p className="text-zinc-700 leading-relaxed italic">"{insight || 'Click Refresh AI to get your financial health assessment.'}"</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900">Your Assets</h2>
            <button onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
              + Add Asset
            </button>
          </div>

          {showAdd && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Label</label>
                  <input className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="e.g. Checking Account" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Amount ($)</label>
                  <input type="number" className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Category</label>
                <select className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none"
                  value={newCat} onChange={e => setNewCat(e.target.value as Asset['category'])}>
                  {Object.entries(ASSET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addAsset} className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-all">Add Asset</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {assets.map(asset => (
              <div key={asset.id} className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center justify-between group hover:border-zinc-900 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ASSET_COLORS[asset.category] + '18' }}>
                    <DollarSign size={16} style={{ color: ASSET_COLORS[asset.category] }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{asset.label}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{ASSET_LABELS[asset.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === asset.id ? (
                    <input type="number" autoFocus defaultValue={asset.amount}
                      className="w-32 px-2 py-1 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-bold text-right outline-none focus:ring-2 focus:ring-zinc-900"
                      onBlur={e => updateAssetAmount(asset.id, parseFloat(e.target.value) || 0)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingId(null);
                      }} />
                  ) : (
                    <button onClick={() => setEditingId(asset.id)}
                      className="text-sm font-bold text-zinc-900 hover:text-zinc-600 transition-colors">
                      {fmt(asset.amount, state.isPrivacyMode)}
                    </button>
                  )}
                  <button onClick={() => deleteAsset(asset.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-zinc-300">✕</button>
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="text-center py-10 text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-2xl">
                No assets yet. Add your first one above.
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-zinc-900 mt-4">Your Debt</h2>
          <div className="space-y-3">
            {state.cards.map(card => (
              <div key={card.id} className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: card.color }}>
                    {card.bank.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{card.name}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{card.apr}% APR</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600">{fmt(card.balance, state.isPrivacyMode)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Asset Breakdown</h3>
            <div className="space-y-3">
              {byCat.map(([cat, amountRaw]) => {
                const amount = amountRaw as number;
                const pct = totalAssets > 0 ? (amount / totalAssets) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-700">{ASSET_LABELS[cat]}</span>
                      <span className="text-zinc-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ASSET_COLORS[cat] }} />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{fmt(amount, state.isPrivacyMode)}</p>
                  </div>
                );
              })}
              {byCat.length === 0 && <p className="text-xs text-zinc-400 italic">No assets added yet.</p>}
            </div>
          </div>

          <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest mb-4">DTI Guide</h3>
            {[
              { range: '< 28%', label: 'Healthy',   color: '#10b981' },
              { range: '28–36%', label: 'Moderate', color: '#f59e0b' },
              { range: '> 36%',  label: 'High risk', color: '#ef4444' },
            ].map(item => (
              <div key={item.range} className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex justify-between flex-1 text-xs">
                  <span className="font-bold">{item.range}</span>
                  <span className="opacity-50">{item.label}</span>
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[10px] opacity-40 uppercase tracking-wider mb-1">Your monthly DTI</p>
              <p className={`text-2xl font-bold ${monthlyDTI < 28 ? 'text-emerald-400' : monthlyDTI < 36 ? 'text-amber-400' : 'text-red-400'}`}>
                {monthlyDTI.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetWorthPage;
