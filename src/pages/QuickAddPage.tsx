import React, { useState } from 'react';
import {
  CheckCircle, ChevronRight, ChevronLeft,
  AlertCircle, Edit3, Zap, Lock
} from 'lucide-react';
import { AppState, Card, CardNetwork, AccountType, PromoType, PromoConfidence } from '../types';

// ─── Russell's known cards pre-filled ────────────────────────────────────────

interface CardTemplate {
  id: string;
  name: string;
  bank: string;
  network: CardNetwork;
  accountType: AccountType;
  lastFour: string;
  balance: number;
  limit: number;
  apr: number;
  minPayment: number;
  dueDate: number;
  color: string;
  promoType?: PromoType;
  promoExpiry?: string;
  promoAmount?: number;
  promoRate?: number;
  promoDesc?: string;
  urgency?: 'critical' | 'high' | 'normal';
  urgencyNote?: string;
}

const PRESET_CARDS: CardTemplate[] = [
  {
    id: 'synchrony',
    name: 'Furniture Store',
    bank: 'Synchrony',
    network: CardNetwork.DISCOVER,
    accountType: AccountType.CREDIT_CARD,
    lastFour: '3456',
    balance: 1500,
    limit: 3000,
    apr: 29.99,
    minPayment: 50,
    dueDate: 10,
    color: '#e31837',
    promoType: PromoType.DEFERRED_INTEREST,
    promoExpiry: '2026-04-10',
    promoAmount: 1500,
    promoRate: 0,
    promoDesc: 'No Interest if Paid in Full — deferred interest applies if not cleared',
    urgency: 'critical',
    urgencyNote: '🚨 Deferred interest bomb — if not paid by Apr 10, ALL backdated interest at 29.99% hits',
  },
  {
    id: 'chase',
    name: 'Sapphire Preferred',
    bank: 'Chase',
    network: CardNetwork.VISA,
    accountType: AccountType.CREDIT_CARD,
    lastFour: '1234',
    balance: 4500,
    limit: 10000,
    apr: 24.99,
    minPayment: 135,
    dueDate: 15,
    color: '#004a99',
    urgency: 'high',
    urgencyNote: 'Highest regular APR — attack target after Synchrony is cleared',
  },
  {
    id: 'paypal',
    name: 'PayPal Credit',
    bank: 'PayPal',
    network: CardNetwork.PAYPAL,
    accountType: AccountType.PAYPAL_CREDIT,
    lastFour: '9999',
    balance: 850,
    limit: 2500,
    apr: 26.99,
    minPayment: 30,
    dueDate: 28,
    color: '#003087',
    promoType: PromoType.DEFERRED_INTEREST,
    promoExpiry: '2026-09-28',
    promoAmount: 850,
    promoRate: 0,
    promoDesc: '6 Months No Interest on purchases over $99',
    urgency: 'high',
    urgencyNote: 'Deferred interest — expires Sep 2026. Pay in full before then.',
  },
  {
    id: 'amex',
    name: 'Everyday Card',
    bank: 'Amex',
    network: CardNetwork.AMEX,
    accountType: AccountType.CREDIT_CARD,
    lastFour: '9012',
    balance: 1200,
    limit: 8000,
    apr: 21.24,
    minPayment: 40,
    dueDate: 5,
    color: '#006fcf',
    urgency: 'normal',
  },
  {
    id: 'citi',
    name: 'Custom Cash',
    bank: 'Citi',
    network: CardNetwork.MASTERCARD,
    accountType: AccountType.CREDIT_CARD,
    lastFour: '5678',
    balance: 2800,
    limit: 5000,
    apr: 0,
    minPayment: 35,
    dueDate: 22,
    color: '#003b70',
    promoType: PromoType.BALANCE_TRANSFER,
    promoExpiry: '2026-08-15',
    promoAmount: 2800,
    promoRate: 0,
    promoDesc: '0% Intro APR on Balance Transfers',
    urgency: 'normal',
    urgencyNote: '0% promo — expires Aug 2026. Pay off before then or APR resets.',
  },
];

// ─── Editable card field ──────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  value: string | number;
  type?: string;
  prefix?: string;
  suffix?: string;
  onChange: (val: string) => void;
}> = ({ label, value, type = 'text', prefix, suffix, onChange }) => (
  <div>
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{label}</label>
    <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden focus-within:border-zinc-900 transition-colors bg-white">
      {prefix && <span className="px-3 text-zinc-400 font-bold text-sm bg-zinc-50 border-r border-zinc-200 py-2.5">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none bg-transparent"
        step={type === 'number' ? 'any' : undefined}
      />
      {suffix && <span className="px-3 text-zinc-400 font-bold text-sm bg-zinc-50 border-l border-zinc-200 py-2.5">{suffix}</span>}
    </div>
  </div>
);

// ─── Single card step ─────────────────────────────────────────────────────────

const CardStep: React.FC<{
  template: CardTemplate;
  data: CardTemplate;
  onChange: (field: keyof CardTemplate, val: any) => void;
}> = ({ template, data, onChange }) => {
  const monthlyInterest = data.apr > 0 ? (data.apr / 100 / 12) * data.balance : 0;

  return (
    <div className="space-y-5">
      {/* Urgency banner */}
      {data.urgencyNote && (
        <div className={`p-4 rounded-2xl flex gap-3 items-start ${
          data.urgency === 'critical' ? 'bg-red-50 border border-red-200' :
          data.urgency === 'high'     ? 'bg-amber-50 border border-amber-200' :
                                        'bg-blue-50 border border-blue-200'
        }`}>
          <AlertCircle size={16} className={
            data.urgency === 'critical' ? 'text-red-600 flex-shrink-0 mt-0.5' :
            data.urgency === 'high'     ? 'text-amber-600 flex-shrink-0 mt-0.5' :
                                          'text-blue-600 flex-shrink-0 mt-0.5'
          } />
          <p className={`text-xs font-medium ${
            data.urgency === 'critical' ? 'text-red-800' :
            data.urgency === 'high'     ? 'text-amber-800' : 'text-blue-800'
          }`}>{data.urgencyNote}</p>
        </div>
      )}

      {/* Live interest preview */}
      {monthlyInterest > 0 && (
        <div className="flex justify-between items-center p-3 bg-zinc-900 text-white rounded-xl">
          <span className="text-xs text-zinc-400">Monthly interest at these numbers</span>
          <span className="text-sm font-bold text-red-400">
            ${monthlyInterest.toFixed(2)}/mo · ${(monthlyInterest * 12).toFixed(0)}/yr
          </span>
        </div>
      )}

      {/* Card identity */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Card Name" value={data.name} onChange={v => onChange('name', v)} />
        <Field label="Bank" value={data.bank} onChange={v => onChange('bank', v)} />
        <Field label="Last 4 Digits" value={data.lastFour} onChange={v => onChange('lastFour', v)} />
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Card Color</label>
          <input type="color" value={data.color} onChange={e => onChange('color', e.target.value)}
            className="w-full h-10 rounded-xl border border-zinc-200 cursor-pointer px-1 py-1" />
        </div>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current Balance" type="number" prefix="$" value={data.balance} onChange={v => onChange('balance', parseFloat(v) || 0)} />
        <Field label="Credit Limit" type="number" prefix="$" value={data.limit} onChange={v => onChange('limit', parseFloat(v) || 0)} />
        <Field label="APR" type="number" suffix="%" value={data.apr} onChange={v => onChange('apr', parseFloat(v) || 0)} />
        <Field label="Minimum Payment" type="number" prefix="$" value={data.minPayment} onChange={v => onChange('minPayment', parseFloat(v) || 0)} />
        <Field label="Due Day (1–31)" type="number" value={data.dueDate} onChange={v => onChange('dueDate', parseInt(v) || 1)} />
      </div>

      {/* Promo section */}
      {template.promoType && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">Promotional Rate Detected</span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-bold">
              {data.promoType}
            </span>
          </div>
          <p className="text-xs text-emerald-700">{data.promoDesc}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Promo Expiry Date" type="date" value={data.promoExpiry || ''} onChange={v => onChange('promoExpiry', v)} />
            <Field label="Promo Balance" type="number" prefix="$" value={data.promoAmount || 0} onChange={v => onChange('promoAmount', parseFloat(v) || 0)} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const QuickAddPage: React.FC<{ state: AppState; onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const [step, setStep] = useState(0); // 0 = intro, 1-5 = cards, 6 = done
  const [cardData, setCardData] = useState<CardTemplate[]>(
    PRESET_CARDS.map(c => ({ ...c }))
  );
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalCards = PRESET_CARDS.length;
  const currentCard = step >= 1 && step <= totalCards ? cardData[step - 1] : null;
  const currentTemplate = step >= 1 && step <= totalCards ? PRESET_CARDS[step - 1] : null;

  const updateField = (field: keyof CardTemplate, val: any) => {
    setCardData(prev => prev.map((c, i) => i === step - 1 ? { ...c, [field]: val } : c));
  };

  const handleSaveAll = () => {
    setSaving(true);

    const newCards: Card[] = cardData
      .filter(d => !skipped.has(d.id))
      .map(d => {
        const card: Card = {
          id: crypto.randomUUID(),
          name: d.name,
          bank: d.bank,
          network: d.network,
          accountType: d.accountType,
          lastFour: d.lastFour,
          balance: d.balance,
          limit: d.limit,
          apr: d.apr,
          minPayment: d.minPayment,
          dueDate: d.dueDate,
          color: d.color,
          promos: [],
          reminderEnabled: true,
          reminderDaysBefore: 3,
        };

        if (d.promoType && d.promoExpiry) {
          card.promos = [{
            id: crypto.randomUUID(),
            type: d.promoType,
            expirationDate: d.promoExpiry,
            confidence: PromoConfidence.CONFIRMED,
            amount: d.promoAmount || d.balance,
            rate: d.promoRate || 0,
            description: d.promoDesc || `${d.promoType} — 0% until ${d.promoExpiry}`,
          }];
        }

        return card;
      });

    // Merge with existing cards (skip if lastFour already exists)
    const existingLast4 = new Set(state.cards.map(c => c.lastFour));
    const toAdd = newCards.filter(c => !existingLast4.has(c.lastFour));
    const toUpdate = newCards.filter(c => existingLast4.has(c.lastFour));

    const updatedExisting = state.cards.map(existing => {
      const match = toUpdate.find(c => c.lastFour === existing.lastFour);
      return match ? { ...existing, ...match, id: existing.id } : existing;
    });

    onUpdateState({
      ...state,
      cards: [...updatedExisting, ...toAdd],
    });

    setSaving(false);
    setSaved(true);
    setStep(totalCards + 1);
  };

  // ── Intro screen ────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-16">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Quick Add — Your Cards</h1>
          <p className="text-zinc-500 mt-1">Your 5 cards are pre-filled from your statements. Just verify and adjust any numbers, then save.</p>
        </div>

        <div className="space-y-3">
          {PRESET_CARDS.map((card, i) => (
            <div key={card.id} className={`flex items-center gap-4 p-5 border rounded-2xl ${
              card.urgency === 'critical' ? 'border-red-200 bg-red-50' :
              card.urgency === 'high'     ? 'border-amber-100 bg-amber-50' :
                                            'border-zinc-100 bg-white'
            }`}>
              <div className="w-10 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: card.color }}>
                {card.bank.slice(0, 3).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-900 text-sm">{card.name} <span className="text-zinc-400 font-normal">•••• {card.lastFour}</span></p>
                <div className="flex gap-3 text-xs text-zinc-500 mt-0.5">
                  <span>{card.apr === 0 ? '0% Promo' : `${card.apr}% APR`}</span>
                  <span>${card.balance.toLocaleString()} balance</span>
                  {card.promoType && <span className="text-emerald-600 font-bold">{card.promoType}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  card.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                  card.urgency === 'high'     ? 'bg-amber-100 text-amber-700' :
                                                'bg-zinc-100 text-zinc-500'
                }`}>
                  {card.urgency === 'critical' ? '🚨 Critical' : card.urgency === 'high' ? '⚠ High' : 'Normal'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <p className="text-xs text-zinc-500">
            <span className="font-bold text-zinc-700">These are pre-filled from your statements.</span> Step through each card to verify the numbers match your current statement — especially the Synchrony balance and promo expiry date.
          </p>
        </div>

        <button onClick={() => setStep(1)}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
          Start Verifying Cards <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (step === totalCards + 1) {
    const addedCount = cardData.filter(d => !skipped.has(d.id)).length;
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 pb-16 pt-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">All Done!</h1>
          <p className="text-zinc-500 mt-2">{addedCount} card{addedCount !== 1 ? 's' : ''} added to your Debt Command Center.</p>
        </div>
        <div className="space-y-3 text-left">
          {[
            { icon: '🎯', text: 'Go to Attack Plan to see your full payoff strategy' },
            { icon: '💸', text: 'Check Balance Transfer — Synchrony may qualify for 0%' },
            { icon: '📊', text: 'Visit Interest Tracker to see your monthly interest cost' },
            { icon: '⚡', text: 'Set up Supabase sync in Settings to back up your data' },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-zinc-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Card step ───────────────────────────────────────────────────────────────
  const isSkipped = currentCard ? skipped.has(currentCard.id) : false;
  const isLastStep = step === totalCards;

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold text-zinc-900">
            Card {step} of {totalCards}
            {currentCard && (
              <span className="ml-2 text-sm font-normal text-zinc-400">— {currentCard.bank} {currentCard.name}</span>
            )}
          </h1>
          <span className="text-xs text-zinc-400">{Math.round((step / totalCards) * 100)}% done</span>
        </div>
        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full transition-all duration-500"
            style={{ width: `${(step / totalCards) * 100}%` }} />
        </div>
        <div className="flex gap-1.5 mt-2">
          {PRESET_CARDS.map((c, i) => (
            <button key={c.id} onClick={() => setStep(i + 1)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i + 1 < step ? 'bg-emerald-400' :
                i + 1 === step ? 'bg-zinc-900' :
                'bg-zinc-200'
              }`} />
          ))}
        </div>
      </div>

      {/* Card form */}
      {currentCard && currentTemplate && (
        <div className={`bg-white border rounded-3xl p-7 shadow-sm mb-6 ${isSkipped ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentCard.color }}>
                {currentCard.bank.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-zinc-900">{currentCard.bank} {currentCard.name}</p>
                <p className="text-xs text-zinc-400">Verify these match your current statement</p>
              </div>
            </div>
            <button
              onClick={() => setSkipped(prev => {
                const next = new Set(prev);
                if (next.has(currentCard.id)) next.delete(currentCard.id);
                else next.add(currentCard.id);
                return next;
              })}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                isSkipped
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400'
              }`}>
              {isSkipped ? '↩ Unskip' : 'Skip this card'}
            </button>
          </div>

          {!isSkipped && (
            <CardStep
              template={currentTemplate}
              data={currentCard}
              onChange={updateField}
            />
          )}

          {isSkipped && (
            <div className="text-center py-6 text-zinc-400">
              <p className="text-sm">This card will be skipped. Click "Unskip" to include it.</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={() => setStep(s => Math.max(0, s - 1))}
          className="flex items-center gap-2 px-5 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
          <ChevronLeft size={16} /> Back
        </button>

        {isLastStep ? (
          <button onClick={handleSaveAll} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-50">
            <Lock size={16} />
            {saving ? 'Saving...' : `Save All ${cardData.filter(d => !skipped.has(d.id)).length} Cards`}
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all">
            Next Card <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickAddPage;
