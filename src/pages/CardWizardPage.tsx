import React, { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronLeft, Check, CreditCard,
  DollarSign, Calendar, Tag, Bell, CheckCircle, Info, ShoppingBag
} from 'lucide-react';
import {
  AppState, Card, CardNetwork, AccountType, BnplPlatform,
  PromoType, PromoConfidence, Promo, Statement
} from '../types';

// ─── BNPL Platform metadata ───────────────────────────────────────────────────

const BNPL_META: Record<BnplPlatform, {
  color: string; defaultFrequency: 'weekly' | 'biweekly' | 'monthly';
  defaultCount: number; zeroInterest: boolean; hint: string;
}> = {
  [BnplPlatform.AFFIRM]:           { color: '#0fa0c8', defaultFrequency: 'monthly',  defaultCount: 12, zeroInterest: false, hint: '3–36 monthly payments. APR 0–36% depending on plan. Check your approval letter.' },
  [BnplPlatform.AFTERPAY]:         { color: '#b2fce4', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '4 biweekly payments, always 0% — no interest ever. Late fees up to $8.' },
  [BnplPlatform.KLARNA]:           { color: '#ffb3c7', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '"Pay in 4" = 4 biweekly payments, 0%. Monthly financing plans have APR.' },
  [BnplPlatform.PAYPAL_PAY_LATER]: { color: '#003087', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '"Pay in 4" = 4 biweekly payments, 0%. "Pay Monthly" has APR 9.99–35.99%.' },
  [BnplPlatform.SEZZLE]:           { color: '#392d91', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '4 biweekly payments, 0% interest. Reschedule fee if you change payment dates.' },
  [BnplPlatform.ZIP]:              { color: '#1a0050', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '"Quad" = 4 biweekly payments. 0% interest, $1/payment service fee.' },
  [BnplPlatform.APPLE_PAY_LATER]:  { color: '#000000', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '4 payments over 6 weeks. Always 0% — no fees, no interest.' },
  [BnplPlatform.SHOP_PAY]:         { color: '#5a31f4', defaultFrequency: 'biweekly', defaultCount: 4,  zeroInterest: true,  hint: '4 biweekly 0% payments for small purchases. Monthly plans available with APR.' },
  [BnplPlatform.SPLITIT]:          { color: '#e74694', defaultFrequency: 'monthly',  defaultCount: 12, zeroInterest: true,  hint: 'Uses your existing credit card. No interest, no fees — splits into monthly charges.' },
  [BnplPlatform.OTHER]:            { color: '#71717a', defaultFrequency: 'monthly',  defaultCount: 4,  zeroInterest: false, hint: 'Enter the details from your BNPL account or approval email.' },
};

// ─── Promo list item ──────────────────────────────────────────────────────────

interface WizardPromo {
  id: string;
  type: PromoType;
  apr: string;
  expiry: string;
  transferAmount: string;  // amount at promo rate (may be partial)
}

const blankPromo = (): WizardPromo => ({
  id: crypto.randomUUID(),
  type: PromoType.BALANCE_TRANSFER,
  apr: '0',
  expiry: '',
  transferAmount: '',
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardCard {
  // Identity
  bank: string; name: string; lastFour: string;
  network: CardNetwork; accountType: AccountType; color: string;
  // BNPL
  bnplPlatform: BnplPlatform;
  bnplTotalPurchase: string; bnplInstallmentCount: string;
  bnplInstallmentAmount: string;
  bnplInstallmentFrequency: 'weekly' | 'biweekly' | 'monthly';
  bnplNextPaymentDate: string; bnplPurchaseDate: string; bnplMerchant: string;
  // Credit card financials
  balance: string; limit: string;
  apr: string; minPayment: string; dueDate: string;
  // Promo — support multiple
  promoList: WizardPromo[];
  // Statement
  hasStatement: boolean; statementDate: string; interestCharged: string;
  // Reminders
  reminderEnabled: boolean; reminderDaysBefore: number;
}

const DEFAULT: WizardCard = {
  bank: '', name: '', lastFour: '', network: CardNetwork.VISA,
  accountType: AccountType.CREDIT_CARD, color: '#004a99',
  bnplPlatform: BnplPlatform.AFFIRM,
  bnplTotalPurchase: '', bnplInstallmentCount: '', bnplInstallmentAmount: '',
  bnplInstallmentFrequency: 'biweekly', bnplNextPaymentDate: '', bnplPurchaseDate: '',
  bnplMerchant: '',
  balance: '', limit: '',
  apr: '', minPayment: '', dueDate: '',
  promoList: [],
  hasStatement: false, statementDate: new Date().toISOString().split('T')[0],
  interestCharged: '0',
  reminderEnabled: true, reminderDaysBefore: 3,
};

const COLORS = ['#004a99','#003b70','#006fcf','#e31837','#003087','#059669','#7c3aed','#d97706','#0f766e','#dc2626'];

const ACCOUNT_TYPES = [
  { val: AccountType.CREDIT_CARD,   label: 'Credit Card' },
  { val: AccountType.PAYPAL_CREDIT, label: 'PayPal Credit' },
  { val: AccountType.BNPL,          label: 'Buy Now Pay Later (Affirm, Klarna, etc.)' },
  { val: AccountType.PERSONAL_LOAN, label: 'Personal Loan' },
  { val: AccountType.AUTO_LOAN,     label: 'Auto Loan' },
  { val: AccountType.MORTGAGE,      label: 'Mortgage' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
    <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-700 leading-relaxed">{children}</p>
  </div>
);

const Field: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }> =
  ({ label, hint, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
      {label}{required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-zinc-400 leading-relaxed">{hint}</p>}
  </div>
);

const MoneyInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> =
  ({ value, onChange, placeholder = '0.00', className = '' }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
    <input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 ${className}`} />
  </div>
);

const inp = "w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all";

// ─── Steps config — dynamic based on account type ────────────────────────────

const getSteps = (accountType: AccountType) => {
  const isBNPL = accountType === AccountType.BNPL;
  return [
    { id: 1, title: 'Identity',    icon: <CreditCard size={14} /> },
    isBNPL
      ? { id: 2, title: 'Purchase Details', icon: <ShoppingBag size={14} /> }
      : { id: 2, title: 'Balance & Limit',  icon: <DollarSign size={14} /> },
    isBNPL
      ? { id: 3, title: 'Installments',     icon: <Calendar size={14} /> }
      : { id: 3, title: 'Rate & Payment',   icon: <Tag size={14} /> },
    ...(!isBNPL ? [{ id: 4, title: 'Promo Offer', icon: <Tag size={14} /> }] : []),
    { id: isBNPL ? 4 : 5, title: 'Statement', icon: <Calendar size={14} /> },
    { id: isBNPL ? 5 : 6, title: 'Reminders', icon: <Bell size={14} /> },
  ];
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CardWizardPage: React.FC<{
  state: AppState;
  onUpdateState: (s: AppState) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ state, onUpdateState, addToast }) => {
  const [step, setStep] = useState(1);
  const [card, setCard] = useState<WizardCard>({ ...DEFAULT });
  const [done, setDone] = useState(false);
  const [savedCard, setSavedCard] = useState<Card | null>(null);

  const set = (key: keyof WizardCard, val: any) => setCard(p => ({ ...p, [key]: val }));

  const isBNPL       = card.accountType === AccountType.BNPL;
  const steps        = getSteps(card.accountType);
  const totalSteps   = steps.length;
  const balanceNum   = parseFloat(card.balance) || 0;
  const limitNum     = parseFloat(card.limit) || 0;
  const utilPct      = limitNum > 0 ? Math.round((balanceNum / limitNum) * 100) : 0;
  const estimatedMin = balanceNum > 0 ? Math.max(25, Math.round(balanceNum * 0.02)) : 0;

  // BNPL calculated remaining balance
  const bnplTotal   = parseFloat(card.bnplTotalPurchase) || 0;
  const bnplInstAmt = parseFloat(card.bnplInstallmentAmount) || 0;
  const bnplCount   = parseInt(card.bnplInstallmentCount) || 0;
  const bnplMeta    = BNPL_META[card.bnplPlatform];

  // Auto-calculate installment amount from total / count
  const autoInstallment = bnplTotal > 0 && bnplCount > 0
    ? Math.ceil((bnplTotal / bnplCount) * 100) / 100
    : 0;

  // Promo helpers
  const setPromo = (id: string, key: keyof WizardPromo, val: string) =>
    setCard(p => ({ ...p, promoList: p.promoList.map(pr => pr.id === id ? { ...pr, [key]: val } : pr) }));
  const addPromo  = () => setCard(p => ({ ...p, promoList: [...p.promoList, blankPromo()] }));
  const removePromo = (id: string) => setCard(p => ({ ...p, promoList: p.promoList.filter(pr => pr.id !== id) }));

  const canNext = () => {
    if (step === 1 && isBNPL) return card.name.trim().length > 0; // BNPL: only name required
    if (step === 1 && !isBNPL) return card.bank.trim().length > 0 && card.name.trim().length > 0 && card.lastFour.length === 4;
    if (step === 2 && isBNPL) return bnplTotal > 0 && balanceNum >= 0;
    if (step === 2 && !isBNPL) return balanceNum >= 0;
    if (step === 3 && !isBNPL) return parseFloat(card.apr) >= 0 && parseInt(card.dueDate) >= 1;
    return true;
  };

  const handleSave = () => {
    const newId   = crypto.randomUUID();
    const usedColors = new Set(state.cards.map(c => c.color));
    const color   = card.color || COLORS.find(c => !usedColors.has(c)) || COLORS[0];

    // For BNPL: balance = remaining amount owed (entered directly in step 2)
    // If user didn't enter remaining balance, fall back to total purchase amount
    const finalBalance = isBNPL
      ? (balanceNum > 0 ? balanceNum : bnplTotal)
      : balanceNum;

    // Auto-fill bank from platform if not entered
    const finalBank = isBNPL
      ? (card.bank.trim() || card.bnplPlatform)
      : card.bank.trim();

    // Auto-fill lastFour for BNPL if not entered
    const finalLastFour = isBNPL
      ? (card.lastFour || '0000')
      : card.lastFour;

    const newCard: Card = {
      id: newId,
      bank: finalBank,
      name: card.name.trim(),
      lastFour: finalLastFour,
      network: isBNPL ? CardNetwork.OTHER : card.network,
      accountType: card.accountType,
      color: isBNPL ? bnplMeta.color : color,
      balance: finalBalance,
      limit: isBNPL ? bnplTotal : limitNum,
      apr: isBNPL ? (bnplMeta.zeroInterest ? 0 : parseFloat(card.apr) || 0) : (parseFloat(card.apr) || 0),
      minPayment: isBNPL ? (bnplInstAmt || autoInstallment) : (parseFloat(card.minPayment) || estimatedMin),
      dueDate: isBNPL
        ? (card.bnplNextPaymentDate ? new Date(card.bnplNextPaymentDate + 'T00:00:00').getDate() : 1)
        : (parseInt(card.dueDate) || 15),
      promos: [],
      reminderEnabled: card.reminderEnabled,
      reminderDaysBefore: card.reminderDaysBefore,
      creditScore: undefined,
      // BNPL fields
      ...(isBNPL && {
        bnplPlatform: card.bnplPlatform,
        bnplTotalPurchase: bnplTotal,
        bnplInstallmentCount: bnplCount || BNPL_META[card.bnplPlatform].defaultCount,
        bnplInstallmentAmount: bnplInstAmt > 0 ? bnplInstAmt : autoInstallment,
        bnplInstallmentFrequency: card.bnplInstallmentFrequency,
        bnplNextPaymentDate: card.bnplNextPaymentDate || undefined,
        bnplPurchaseDate: card.bnplPurchaseDate || undefined,
        bnplMerchant: card.bnplMerchant || undefined,
      }),
    };

    // Add all promos from the list (credit cards only)
    if (!isBNPL && card.promoList.length > 0) {
      newCard.promos = card.promoList
        .filter(p => p.expiry)
        .map(p => {
          const transferAmt = parseFloat(p.transferAmount) || finalBalance;
          const isPartial   = transferAmt > 0 && transferAmt < finalBalance;
          return {
            id: crypto.randomUUID(),
            type: p.type,
            expirationDate: p.expiry,
            confidence: PromoConfidence.CONFIRMED,
            amount: transferAmt,
            rate: parseFloat(p.apr) || 0,
            description: `${p.type} — ${p.apr || 0}% until ${p.expiry}${isPartial ? ' (partial: $' + transferAmt.toLocaleString() + ' of $' + finalBalance.toLocaleString() + ')' : ''}`,
          };
        });
    }

    let newState = { ...state, cards: [...state.cards, newCard] };

    // Auto-log first statement
    if (card.hasStatement) {
      const stmt: Statement = {
        id: crypto.randomUUID(), cardId: newId,
        date: card.statementDate || new Date().toISOString().split('T')[0],
        balance: finalBalance,
        minPayment: isBNPL ? (bnplInstAmt || autoInstallment) : (parseFloat(card.minPayment) || estimatedMin),
        interestCharged: parseFloat(card.interestCharged) || 0,
      };
      newState = { ...newState, statements: [...newState.statements, stmt] };
    }

    onUpdateState(newState);
    setSavedCard(newCard);
    setDone(true);
    addToast(`✓ ${newCard.name} added`, 'success');
  };

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done && savedCard) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{savedCard.name} Added!</h1>
          <p className="text-zinc-500 mt-1">{isBNPL ? 'BNPL plan is now being tracked.' : 'All data saved. Tracking has started.'}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 text-left space-y-2.5">
          {isBNPL ? [
            { l: 'Platform',     v: savedCard.bnplPlatform || card.bnplPlatform },
            { l: 'Merchant',     v: savedCard.bnplMerchant || '—' },
            { l: 'Purchase',     v: `$${bnplTotal.toLocaleString()}` },
            { l: 'Balance Left', v: `$${savedCard.balance.toLocaleString()}` },
            { l: 'Payment',      v: `$${(savedCard.bnplInstallmentAmount || 0).toLocaleString()} ${card.bnplInstallmentFrequency}` },
            { l: 'Next Due',     v: card.bnplNextPaymentDate || '—' },
          ] : [
            { l: 'Card',        v: `${savedCard.bank} ${savedCard.name}` },
            { l: 'Balance',     v: `$${savedCard.balance.toLocaleString()}` },
            { l: 'APR',         v: `${savedCard.apr}%` },
            { l: 'Due Date',    v: `${savedCard.dueDate}th of month` },
            { l: 'Promos',      v: savedCard.promos.length > 0 ? savedCard.promos.map(p => `${p.type.split(' ')[0]} → ${p.expirationDate}`).join(', ') : 'None' },
          ].map(r => (
            <div key={r.l} className="flex justify-between text-sm">
              <span className="text-zinc-400">{r.l}</span>
              <span className="font-bold text-zinc-900">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setCard({ ...DEFAULT }); setStep(1); setDone(false); setSavedCard(null); }}
            className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all">
            + Add Another
          </button>
          <button onClick={() => window.location.reload()}
            className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Add a Card</h1>
        <p className="text-zinc-500 mt-1">Step-by-step guided entry. Have your statement or app handy.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              step === s.id ? 'bg-zinc-900 text-white' :
              step > s.id  ? 'bg-emerald-100 text-emerald-700' :
                             'bg-zinc-100 text-zinc-400'}`}>
              {step > s.id ? <Check size={11} /> : s.icon}
              <span className="hidden sm:inline">{s.title}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 min-w-[8px] ${step > s.id ? 'bg-emerald-300' : 'bg-zinc-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Live preview */}
      <div className="mb-6 p-5 rounded-2xl text-white relative overflow-hidden shadow-lg"
        style={{ background: `linear-gradient(135deg, ${isBNPL ? bnplMeta.color : card.color}ee, ${isBNPL ? bnplMeta.color : card.color}88)` }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {isBNPL ? card.bnplPlatform : (card.bank || 'Bank Name')}
            </p>
            <p className="font-bold text-lg mt-0.5">{card.name || (isBNPL ? 'BNPL Plan' : 'Card Name')}</p>
            {isBNPL && card.bnplMerchant && <p className="text-xs opacity-70 mt-0.5">{card.bnplMerchant}</p>}
          </div>
          <p className="text-sm font-mono opacity-80 bg-white/20 px-2 py-0.5 rounded">
            {isBNPL ? card.bnplPlatform.slice(0, 6).toUpperCase() : `•••• ${card.lastFour || '0000'}`}
          </p>
        </div>
        <div className="flex gap-5 flex-wrap">
          {isBNPL ? (
            <>
              <div><p className="text-[9px] uppercase opacity-50">Purchase</p><p className="font-bold">${bnplTotal.toLocaleString() || '—'}</p></div>
              <div><p className="text-[9px] uppercase opacity-50">Payment</p><p className="font-bold">${(bnplInstAmt || autoInstallment).toLocaleString() || '—'}</p></div>
              <div><p className="text-[9px] uppercase opacity-50">Frequency</p><p className="font-bold capitalize">{card.bnplInstallmentFrequency}</p></div>
              {bnplMeta.zeroInterest && <div><p className="text-[9px] uppercase opacity-50">Interest</p><p className="font-bold text-emerald-300">0%</p></div>}
            </>
          ) : (
            <>
              <div><p className="text-[9px] uppercase opacity-50">Balance</p><p className="font-bold">${balanceNum.toLocaleString()}</p></div>
              {limitNum > 0 && <div><p className="text-[9px] uppercase opacity-50">Util</p><p className="font-bold">{utilPct}%</p></div>}
              {card.apr && <div><p className="text-[9px] uppercase opacity-50">APR</p><p className="font-bold">{card.apr}%</p></div>}
              {card.dueDate && <div><p className="text-[9px] uppercase opacity-50">Due</p><p className="font-bold">{card.dueDate}th</p></div>}
            </>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-5">

        {/* ── STEP 1: Identity ── */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">What type of account is this?</h2>

            <Field label="Account Type" required>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map(t => (
                  <button key={t.val} onClick={() => set('accountType', t.val)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${card.accountType === t.val ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                    {t.val === AccountType.BNPL && '🛒 '}{t.label}
                  </button>
                ))}
              </div>
            </Field>

            {isBNPL ? (
              <>
                <Field label="BNPL Platform" required hint="Choose your exact platform — each has different payment structures">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(BnplPlatform).map(p => (
                      <button key={p} onClick={() => {
                        set('bnplPlatform', p);
                        set('bnplInstallmentFrequency', BNPL_META[p].defaultFrequency);
                        set('bnplInstallmentCount', BNPL_META[p].defaultCount.toString());
                        set('color', BNPL_META[p].color);
                      }}
                        className={`text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${card.bnplPlatform === p ? 'text-white border-transparent' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
                        style={card.bnplPlatform === p ? { backgroundColor: BNPL_META[p].color } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mt-2">
                    <p className="text-xs text-blue-700">{bnplMeta.hint}</p>
                  </div>
                </Field>
                <Field label="Merchant / Store" hint="Where did you make the purchase? e.g. Wayfair, Amazon, Best Buy">
                  <input className={inp} value={card.bnplMerchant} onChange={e => set('bnplMerchant', e.target.value)} placeholder="e.g. Wayfair" />
                </Field>
                <Field label="Account Nickname" required hint="Give this plan a name so you can identify it — e.g. 'Wayfair Couch'">
                  <input className={inp} value={card.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wayfair Couch" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Last 4 of Reference #" hint="Last 4 digits of your order or account number">
                    <input className={inp + " font-mono"} value={card.lastFour}
                      onChange={e => set('lastFour', e.target.value.replace(/\D/,'').slice(0,4))}
                      placeholder="0000" maxLength={4} />
                  </Field>
                  <Field label="Bank / Lender" hint="e.g. Affirm, Afterpay, PayPal">
                    <input className={inp} value={card.bank}
                      onChange={e => set('bank', e.target.value)}
                      placeholder={card.bnplPlatform} />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field label="Bank / Issuer" required hint="e.g. Chase, Citi, Synchrony, Amex, Capital One">
                  <input className={inp} value={card.bank} onChange={e => set('bank', e.target.value)} placeholder="e.g. Synchrony" autoFocus />
                </Field>
                <Field label="Card Name" required hint="Product name — e.g. Sapphire Preferred, Custom Cash, Furniture Store">
                  <input className={inp} value={card.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Furniture Store" />
                </Field>
                <Field label="Last 4 Digits" required hint="Used to auto-match future statement uploads">
                  <input className={inp + " font-mono tracking-widest"} value={card.lastFour}
                    onChange={e => set('lastFour', e.target.value.replace(/\D/,'').slice(0,4))}
                    placeholder="1234" maxLength={4} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Card Network">
                    <select className={inp + " cursor-pointer bg-white"} value={card.network} onChange={e => set('network', e.target.value)}>
                      {Object.values(CardNetwork).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="Card Color">
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => set('color', c)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${card.color === c ? 'border-zinc-900 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </Field>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP 2 BNPL: Purchase Details ── */}
        {step === 2 && isBNPL && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Purchase details</h2>
            <Hint>
              Find the <strong>original purchase total</strong> in your BNPL account or the confirmation email.
              The <strong>remaining balance</strong> is what you still owe — open your {card.bnplPlatform} app to find this.
            </Hint>

            <Field label="Original Purchase Total ($)" required hint="The full price of the item you financed">
              <MoneyInput value={card.bnplTotalPurchase} onChange={v => set('bnplTotalPurchase', v)}
                className="font-bold text-lg" />
            </Field>

            <Field label="Remaining Balance ($)" required hint="What you still owe today — open your BNPL app to get the exact figure">
              <MoneyInput value={card.balance} onChange={v => set('balance', v)} />
            </Field>

            <Field label="Purchase Date" hint="When you made the purchase — from your confirmation email">
              <input type="date" value={card.bnplPurchaseDate} onChange={e => set('bnplPurchaseDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]} className={inp} />
            </Field>

            {bnplTotal > 0 && balanceNum > 0 && (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-zinc-700">Already paid</p>
                  <p className="text-xl font-bold text-emerald-600">${Math.max(0, bnplTotal - balanceNum).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-700">Progress</p>
                  <p className="text-xl font-bold text-zinc-900">{Math.round(((bnplTotal - balanceNum) / bnplTotal) * 100)}%</p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, ((bnplTotal - balanceNum) / bnplTotal) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3 BNPL: Installment Schedule ── */}
        {step === 3 && isBNPL && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Installment schedule</h2>
            <Hint>
              Open your <strong>{card.bnplPlatform}</strong> app to find the exact payment schedule.
              Look for "Payment Schedule," "Upcoming Payments," or "Installments."
            </Hint>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Total # of Payments" hint="Usually 4 for Afterpay/Klarna/Sezzle, 6–36 for Affirm">
                <input type="number" min="1" max="60" value={card.bnplInstallmentCount}
                  onChange={e => set('bnplInstallmentCount', e.target.value)}
                  placeholder={BNPL_META[card.bnplPlatform].defaultCount.toString()} className={inp} />
              </Field>
              <Field label="Payment Frequency">
                <select className={inp + " cursor-pointer bg-zinc-50"} value={card.bnplInstallmentFrequency}
                  onChange={e => set('bnplInstallmentFrequency', e.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
            </div>

            <Field label="Amount per Payment ($)"
              hint={autoInstallment > 0 ? `Auto-calculated: $${autoInstallment.toFixed(2)} — confirm with your app` : 'Each individual payment amount'}>
              <MoneyInput value={card.bnplInstallmentAmount}
                onChange={v => set('bnplInstallmentAmount', v)}
                placeholder={autoInstallment > 0 ? autoInstallment.toFixed(2) : '0.00'} />
              {autoInstallment > 0 && !card.bnplInstallmentAmount && (
                <button onClick={() => set('bnplInstallmentAmount', autoInstallment.toFixed(2))}
                  className="text-xs text-blue-600 font-bold mt-1 hover:text-blue-800">
                  Use calculated amount (${autoInstallment.toFixed(2)}) →
                </button>
              )}
            </Field>

            <Field label="Next Payment Date" hint="When is your next payment due? Found in your BNPL app">
              <input type="date" value={card.bnplNextPaymentDate}
                onChange={e => set('bnplNextPaymentDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]} className={inp} />
            </Field>

            {!bnplMeta.zeroInterest && (
              <Field label="APR %" hint="From your Affirm approval — 0% if a 0% offer, otherwise check your loan terms">
                <div className="relative">
                  <input type="number" step="0.01" value={card.apr} onChange={e => set('apr', e.target.value)}
                    placeholder="e.g. 15.00"
                    className="w-full pr-7 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
                </div>
              </Field>
            )}

            {bnplMeta.zeroInterest && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-800 font-medium">
                  {card.bnplPlatform} is always 0% interest — no APR to enter.
                  {card.bnplPlatform === BnplPlatform.AFFIRM ? '' : ' Only late fees may apply.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2 Credit Card: Balance & Limit ── */}
        {step === 2 && !isBNPL && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">What do you owe?</h2>
            <Hint>
              Find these on your <strong>statement</strong> or bank app under "Account Summary."<br /><br />
              • <strong>Current Balance</strong> — what you owe today<br />
              • <strong>Credit Limit</strong> — your total available credit line
            </Hint>
            <Field label="Current Balance ($)" required hint="What you owe right now">
              <MoneyInput value={card.balance} onChange={v => set('balance', v)} className="font-bold text-lg" />
            </Field>
            <Field label="Credit Limit ($)" hint="Your total credit line — labeled 'Credit Limit' on your statement">
              <MoneyInput value={card.limit} onChange={v => set('limit', v)} />
            </Field>
            {limitNum > 0 && balanceNum > 0 && (
              <div className={`p-4 rounded-xl border ${utilPct >= 80 ? 'bg-red-50 border-red-200' : utilPct >= 30 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-zinc-700">Credit Utilization</p>
                  <p className={`text-xl font-bold ${utilPct >= 80 ? 'text-red-600' : utilPct >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{utilPct}%</p>
                </div>
                <div className="w-full bg-white/60 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${utilPct >= 80 ? 'bg-red-500' : utilPct >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">Available: ${Math.max(0, limitNum - balanceNum).toLocaleString()}</p>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3 Credit Card: Rate & Payment ── */}
        {step === 3 && !isBNPL && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Interest rate & payment</h2>
            <Hint>
              Find <strong>APR</strong> in the "Interest Charge Calculation" section — labeled "Purchase APR."<br /><br />
              <strong>Minimum Payment</strong> and <strong>Due Date</strong> are on the payment coupon at the top of your statement.
            </Hint>
            <Field label="Purchase APR (%)" required hint="Standard rate — NOT the promo rate. Usually 15–30%.">
              <div className="relative">
                <input type="number" step="0.01" value={card.apr} onChange={e => set('apr', e.target.value)}
                  placeholder="e.g. 24.99"
                  className="w-full pr-7 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
              </div>
              {parseFloat(card.apr) >= 25 && <p className="text-[11px] text-red-600 font-bold mt-1">⚠ High APR — priority payoff target</p>}
            </Field>
            <Field label="Minimum Payment ($)" hint={estimatedMin > 0 ? `Estimated ~$${estimatedMin.toLocaleString()} — confirm from your statement` : 'From your payment coupon'}>
              <MoneyInput value={card.minPayment} onChange={v => set('minPayment', v)}
                placeholder={estimatedMin > 0 ? `~${estimatedMin}` : '0.00'} />
            </Field>
            <Field label="Payment Due Date (day of month)" required hint="The day your payment is due every month">
              <div className="flex flex-wrap gap-2 mb-2">
                {[1,5,7,8,10,12,15,18,20,22,25,28].map(d => (
                  <button key={d} onClick={() => set('dueDate', d.toString())}
                    className={`w-10 h-10 rounded-xl text-sm font-bold border transition-all ${card.dueDate === d.toString() ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <input type="number" min="1" max="31" value={card.dueDate} onChange={e => set('dueDate', e.target.value)}
                placeholder="Or type any day 1–31" className={inp} />
            </Field>
          </>
        )}

        {/* ── STEP 4 Credit Card: Promos ── */}
        {step === 4 && !isBNPL && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Promotional offers</h2>
            <Hint>
              Add <strong>every active promo</strong> on this card — you can have multiple balance transfers, a deferred interest plan, and a purchase promo all at once, each with its own expiry and amount.
            </Hint>

            {/* Promo list */}
            {card.promoList.map((promo, idx) => {
              const transferNum  = parseFloat(promo.transferAmount) || 0;
              const isPartial    = transferNum > 0 && transferNum < balanceNum;
              return (
                <div key={promo.id} className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Promo {idx + 1}
                    </span>
                    <button onClick={() => removePromo(promo.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
                      Remove
                    </button>
                  </div>

                  <Field label="Promo Type" hint="Deferred Interest is the most dangerous — all backdated interest hits at expiry if not fully paid">
                    <select className={inp + " cursor-pointer bg-white"} value={promo.type}
                      onChange={e => setPromo(promo.id, 'type', e.target.value)}>
                      <option value={PromoType.BALANCE_TRANSFER}>Balance Transfer — true 0%, reverts after</option>
                      <option value={PromoType.DEFERRED_INTEREST}>Deferred Interest — ALL backdated interest if not paid in full</option>
                      <option value={PromoType.PURCHASE_PROMO}>Purchase Promo — 0% on new purchases</option>
                    </select>
                  </Field>

                  {promo.type === PromoType.DEFERRED_INTEREST && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs font-bold text-red-900">🚨 Deferred Interest Warning</p>
                      <p className="text-[11px] text-red-700 mt-1">Must be paid IN FULL before expiry — ALL backdated interest charged if not. Partial payments do not help.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Promo APR %" hint="Usually 0">
                      <input type="number" step="0.01" value={promo.apr}
                        onChange={e => setPromo(promo.id, 'apr', e.target.value)}
                        placeholder="0" className={inp} />
                    </Field>
                    <Field label="Exact Expiry Date" required hint="Precise date from your statement">
                      <input type="date" value={promo.expiry}
                        onChange={e => setPromo(promo.id, 'expiry', e.target.value)}
                        min={new Date().toISOString().split('T')[0]} className={inp} />
                    </Field>
                  </div>

                  <div className="border-t border-amber-200 pt-3 space-y-3">
                    <p className="text-xs font-bold text-amber-900">How much of your balance is on this promo?</p>
                    <div className="flex gap-3">
                      {(['full', 'partial'] as const).map(v => (
                        <button key={v} onClick={() => setPromo(promo.id, 'transferAmount', v === 'full' ? card.balance : '')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            v === 'full'
                              ? (promo.transferAmount === card.balance ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400')
                              : (promo.transferAmount && promo.transferAmount !== card.balance ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400')
                          }`}>
                          {v === 'full' ? 'Entire balance' : 'Partial amount'}
                        </button>
                      ))}
                    </div>

                    <Field label="Amount at Promo Rate ($)"
                      hint={isPartial
                        ? `$${transferNum.toLocaleString()} on promo — remaining $${(balanceNum - transferNum).toLocaleString()} accrues at ${card.apr || 'regular'}% APR`
                        : 'Dollar amount transferred or financed at this promo rate'}>
                      <MoneyInput value={promo.transferAmount}
                        onChange={v => setPromo(promo.id, 'transferAmount', v)}
                        placeholder={card.balance || '0.00'} />
                      {isPartial && (
                        <div className="mt-1.5 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-[11px] text-orange-800 font-bold">
                            ⚠ Partial — ${(balanceNum - transferNum).toLocaleString()} is accruing at {card.apr || 'regular'}% APR now
                          </p>
                        </div>
                      )}
                    </Field>
                  </div>
                </div>
              );
            })}

            {/* Add promo button */}
            <button onClick={addPromo}
              className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-600 hover:text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
              + Add {card.promoList.length === 0 ? 'a Promo' : 'Another Promo'}
            </button>

            {card.promoList.length === 0 && (
              <button onClick={() => setCard(p => ({ ...p, promoList: [] }))}
                className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                No promos on this card — skip to next step
              </button>
            )}

            {card.promoList.length > 0 && (
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                <p className="text-xs font-bold text-zinc-700 mb-1">{card.promoList.length} promo{card.promoList.length > 1 ? 's' : ''} on this card:</p>
                {card.promoList.map((p, i) => (
                  <p key={p.id} className="text-[11px] text-zinc-500">
                    {i + 1}. {p.type} — {p.expiry || 'no date'} · ${parseFloat(p.transferAmount || '0').toLocaleString() || 'full balance'} at {p.apr || '0'}%
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STEP 5/4: Statement ── */}
        {((step === 5 && !isBNPL) || (step === 4 && isBNPL)) && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Log your latest statement</h2>
            <Hint>
              {isBNPL
                ? 'Optional. Log the first payment to start tracking history.'
                : 'Optional but recommended. The Interest Charged field is in the "Finance Charge" section — powers the Interest Tracker.'}
            </Hint>
            <div className="flex gap-3">
              {[false, true].map(v => (
                <button key={String(v)} onClick={() => set('hasStatement', v)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${card.hasStatement === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                  {v ? 'Log Statement' : 'Skip for Now'}
                </button>
              ))}
            </div>
            {card.hasStatement && (
              <div className="grid grid-cols-2 gap-4 p-5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                <Field label="Statement / Payment Date">
                  <input type="date" value={card.statementDate} onChange={e => set('statementDate', e.target.value)} className={inp} />
                </Field>
                <Field label="Interest Charged ($)" hint={isBNPL ? '0 for 0% plans' : '"Finance Charge" on your statement'}>
                  <MoneyInput value={card.interestCharged} onChange={v => set('interestCharged', v)} placeholder="0.00" />
                </Field>
              </div>
            )}
          </>
        )}

        {/* ── STEP 6/5: Reminders ── */}
        {((step === 6 && !isBNPL) || (step === 5 && isBNPL)) && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Payment reminders</h2>
            <Hint>
              {isBNPL
                ? 'BNPL late fees ($7–$10 per missed payment) add up fast. A reminder costs nothing.'
                : 'Late fees are typically $25–$40. A reminder costs nothing.'}
            </Hint>
            <div className="flex gap-3">
              {[false, true].map(v => (
                <button key={String(v)} onClick={() => set('reminderEnabled', v)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${card.reminderEnabled === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                  {v ? 'Yes, Remind Me' : 'No Thanks'}
                </button>
              ))}
            </div>
            {card.reminderEnabled && (
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">How many days before due date?</p>
                <div className="flex gap-2">
                  {[1,3,5,7].map(d => (
                    <button key={d} onClick={() => set('reminderDaysBefore', d)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${card.reminderDaysBefore === d ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Final summary */}
            <div className="p-5 bg-zinc-900 text-white rounded-2xl space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Ready to Save</p>
              {(isBNPL ? [
                { l: 'Platform', v: card.bnplPlatform },
                { l: 'Merchant', v: card.bnplMerchant || '—' },
                { l: 'Purchase', v: '$' + bnplTotal.toLocaleString() },
                { l: 'Balance',  v: '$' + balanceNum.toLocaleString() },
                { l: 'Payment',  v: '$' + (bnplInstAmt || autoInstallment).toLocaleString() + ' ' + card.bnplInstallmentFrequency },
                { l: 'APR',      v: bnplMeta.zeroInterest ? '0% (no interest)' : (card.apr || '—') + '%' },
              ] : [
                { l: 'Card',    v: card.bank + ' ' + card.name },
                { l: 'Balance', v: '$' + balanceNum.toLocaleString() },
                { l: 'APR',     v: card.apr + '%' },
                { l: 'Due',     v: card.dueDate ? card.dueDate + 'th' : '—' },
                { l: 'Promo',   v: card.promoList.length > 0 ? card.promoList.length + ' promo(s) — ' + card.promoList.map(p => p.expiry).join(', ') : 'None' },
                { l: 'Alerts',  v: card.reminderEnabled ? card.reminderDaysBefore + 'd before due' : 'Off' },
              ]).map(r => (
                <div key={r.l} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{r.l}</span>
                  <span className="font-bold">{r.v || '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {step < totalSteps ? (
          <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg">
            <Check size={16} /> Save {isBNPL ? 'BNPL Plan' : 'Card'}
          </button>
        )}
      </div>
      {step === 1 && <p className="text-center text-xs text-zinc-400 mt-3">Have your statement or {isBNPL ? 'BNPL app' : 'bank app'} open</p>}
    </div>
  );
};

export default CardWizardPage;
