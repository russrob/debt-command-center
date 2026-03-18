import React, { useState, useMemo } from 'react';
import {
  ArrowRight, CheckCircle, AlertCircle, Info,
  Shield, Flame, ChevronDown, ChevronUp
} from 'lucide-react';
import { AppState, Card, PromoType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransferOffer {
  id: string; name: string; introAPR: number;
  introPeriodMonths: number; transferFeePct: number;
  creditLimit: number; regularAPR: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, priv = false) =>
  priv ? '••••' : '$' + Math.abs(Math.round(n)).toLocaleString();

const daysLeft = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5);

const urgencyColor = (days: number) =>
  days <= 30  ? { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200',       bar: 'bg-red-500'    }
  : days <= 60  ? { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'bg-orange-500' }
  : days <= 90  ? { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700 border-amber-200',   bar: 'bg-amber-500'  }
  :               { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };

function calcTransferSavings(card: Card, offer: TransferOffer, transferAmount: number) {
  const fee = transferAmount * (offer.transferFeePct / 100);
  const monthlyRateOrig = card.apr / 100 / 12;
  let balWithout = card.balance;
  let interestWithout = 0;
  for (let i = 0; i < offer.introPeriodMonths; i++) {
    const int = balWithout * monthlyRateOrig;
    interestWithout += int;
    balWithout += int - card.minPayment;
    if (balWithout < 0) { balWithout = 0; break; }
  }
  const monthlyPaymentNeeded = Math.ceil((transferAmount + fee) / offer.introPeriodMonths);
  let balWith = transferAmount + fee;
  for (let i = 0; i < offer.introPeriodMonths; i++) {
    balWith -= monthlyPaymentNeeded;
    if (balWith <= 0) { balWith = 0; break; }
  }
  const interestWith = balWith > 0 ? (offer.regularAPR / 100 / 12) * balWith * 6 : 0;
  const netSavings = interestWithout - interestWith - fee;
  const monthlyInterestSaved = (card.apr - offer.introAPR) / 100 / 12 * transferAmount;
  const breakEvenMonth = monthlyInterestSaved > 0 ? Math.ceil(fee / monthlyInterestSaved) : 999;
  return {
    card, offer, transferAmount, transferFee: fee,
    interestWithout, interestWith, netSavings, monthlyPaymentNeeded,
    canPayOffInTime: monthlyPaymentNeeded <= card.minPayment * 2.5,
    breakEvenMonth,
  };
}

const DEFAULT_OFFERS: TransferOffer[] = [
  { id: 'citi-bt',    name: 'Citi Custom Cash (existing)',  introAPR: 0, introPeriodMonths: 18, transferFeePct: 3, creditLimit: 5000, regularAPR: 28.99 },
  { id: 'chase-bt',   name: 'Chase Freedom Flex',           introAPR: 0, introPeriodMonths: 15, transferFeePct: 3, creditLimit: 8000, regularAPR: 24.99 },
  { id: 'wellsfargo', name: 'Wells Fargo Reflect',          introAPR: 0, introPeriodMonths: 21, transferFeePct: 3, creditLimit: 7500, regularAPR: 19.99 },
  { id: 'discover',   name: 'Discover it Balance Transfer', introAPR: 0, introPeriodMonths: 18, transferFeePct: 3, creditLimit: 6000, regularAPR: 26.99 },
  { id: 'bofa',       name: 'BofA BankAmericard',           introAPR: 0, introPeriodMonths: 18, transferFeePct: 3, creditLimit: 7000, regularAPR: 25.99 },
  { id: 'custom',     name: 'Custom Offer',                  introAPR: 0, introPeriodMonths: 12, transferFeePct: 3, creditLimit: 5000, regularAPR: 22.99 },
];

// ─── Active Promo Detail Card ─────────────────────────────────────────────────

const ActivePromoCard: React.FC<{ card: Card; priv: boolean }> = ({ card, priv }) => {
  const [expanded, setExpanded] = useState(false);
  const activePromos = card.promos.filter(p => new Date(p.expirationDate) > new Date());

  return (
    <>
      {activePromos.map(promo => {
        const days       = daysLeft(promo.expirationDate);
        const uc         = urgencyColor(days);
        const isDeferred = promo.type === PromoType.DEFERRED_INTEREST;
        const isBT       = promo.type === PromoType.BALANCE_TRANSFER;

        // Original transfer amount (stored in promo.amount)
        const originalTransfer = promo.amount > 0 ? promo.amount : card.balance;

        // Estimate months elapsed since promo start (assume 18mo standard, or infer from days left)
        const totalPeriodDays  = isDeferred ? 548 : 548; // 18mo default — user entered exact expiry
        const expiry           = new Date(promo.expirationDate);
        const startEstimate    = new Date(expiry.getTime() - totalPeriodDays * 864e5);
        const monthsElapsed    = Math.max(0, Math.floor((Date.now() - startEstimate.getTime()) / (864e5 * 30)));
        const monthsRemaining  = Math.ceil(days / 30);

        // Interest that has been saved so far (BT only — avoiding the original card's APR)
        const estMonthlySaved  = originalTransfer * (card.apr / 100 / 12);
        const interestSavedSoFar = isBT ? estMonthlySaved * monthsElapsed : 0;

        // Interest that WOULD accrue if promo expires with balance remaining
        const interestBomb     = isDeferred
          ? card.balance * (card.apr / 100) * (days / 365)  // deferred = full backdated amount
          : card.balance * (card.apr / 100 / 12) * monthsRemaining; // BT = future interest at regular APR

        // Monthly payment needed to clear balance in time
        const monthlyNeeded    = monthsRemaining > 0 ? Math.ceil(card.balance / monthsRemaining) : card.balance;

        // Progress bar — % of promo period elapsed
        const progressPct      = Math.min(100, Math.round((monthsElapsed / (monthsElapsed + monthsRemaining)) * 100));

        return (
          <div key={promo.id} className={`border-2 rounded-3xl overflow-hidden shadow-sm ${uc.border}`}>

            {/* ── Top header ── */}
            <div className={`px-7 py-5 ${uc.bg}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shadow"
                    style={{ backgroundColor: card.color }}>
                    {card.bank.slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-base">{card.name}</p>
                    <p className="text-xs text-zinc-500">•••• {card.lastFour} · {card.bank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${uc.badge}`}>
                    {isDeferred ? '⚠ Deferred Interest' : isBT ? '↔ Balance Transfer' : '◎ Purchase Promo'}
                  </span>
                  <div className="mt-2">
                    <p className={`text-3xl font-bold ${uc.text}`}>{days}d</p>
                    <p className="text-[10px] text-zinc-400">until {promo.expirationDate}</p>
                  </div>
                </div>
              </div>

              {/* Countdown progress */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                  <span>Promo start (est.)</span>
                  <span className={`font-bold ${uc.text}`}>{progressPct}% elapsed — {monthsRemaining}mo left</span>
                  <span>{promo.expirationDate}</span>
                </div>
                <div className="w-full bg-white/70 h-3 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${uc.bar}`}
                    style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── Key numbers ── */}
            <div className="px-7 py-5 bg-white grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-zinc-100">

              {/* Current balance */}
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Current Balance</p>
                <p className="text-xl font-bold text-zinc-900">{fmt(card.balance, priv)}</p>
                <p className="text-[10px] text-zinc-400">owed today</p>
              </div>

              {/* Original transfer */}
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Originally Transferred</p>
                <p className="text-xl font-bold text-zinc-900">{fmt(originalTransfer, priv)}</p>
                <p className="text-[10px] text-zinc-400">
                  {originalTransfer > card.balance
                    ? <span className="text-emerald-600 font-bold">{fmt(originalTransfer - card.balance, priv)} paid down</span>
                    : 'at transfer date'}
                </p>
              </div>

              {/* Promo rate */}
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Promo APR</p>
                <p className="text-xl font-bold text-emerald-600">{promo.rate}%</p>
                <p className="text-[10px] text-zinc-400">vs {card.apr}% regular APR</p>
              </div>

              {/* Interest saved or bomb */}
              {isBT && interestSavedSoFar > 1 ? (
                <div className="space-y-0.5 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Interest Saved So Far</p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(interestSavedSoFar, priv)}</p>
                  <p className="text-[10px] text-emerald-600">~{monthsElapsed}mo × {fmt(estMonthlySaved, priv)}/mo avoided</p>
                </div>
              ) : (
                <div className={`space-y-0.5 p-3 rounded-2xl border ${isDeferred ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-100'}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isDeferred ? 'text-red-600' : 'text-zinc-400'}`}>
                    {isDeferred ? 'Bomb if Missed' : 'Future Interest Risk'}
                  </p>
                  <p className={`text-xl font-bold ${isDeferred ? 'text-red-700' : 'text-zinc-700'}`}>{fmt(interestBomb, priv)}</p>
                  <p className={`text-[10px] ${isDeferred ? 'text-red-500' : 'text-zinc-400'}`}>
                    {isDeferred ? `retroactive at ${card.apr}% APR` : `future accrual if unpaid`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Payoff target ── */}
            <div className={`px-7 py-5 ${isDeferred ? 'bg-red-50/50' : 'bg-zinc-50'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <p className={`font-bold text-sm ${isDeferred ? 'text-red-900' : 'text-zinc-900'}`}>
                    {isDeferred
                      ? `⚠ Must pay ${fmt(card.balance, priv)} IN FULL by ${promo.expirationDate}`
                      : `Pay off before ${promo.expirationDate} to avoid ${card.apr}% APR`}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Required: <span className="font-bold text-zinc-900">{fmt(monthlyNeeded, priv)}/mo</span> for {monthsRemaining} months
                    {isDeferred && <span className="text-red-600 font-bold ml-2">— every dollar matters, partial payoff does NOT help</span>}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${
                  days <= 30 ? 'bg-red-600' : days <= 60 ? 'bg-orange-500' : days <= 90 ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                  {days <= 30 ? '🚨 Critical' : days <= 60 ? '⚠ Urgent' : days <= 90 ? '📅 Act Soon' : '✓ On Track'}
                </div>
              </div>

              {/* Monthly payment progress bar toward payoff */}
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Balance paid down</span>
                <span className="font-bold">
                  {originalTransfer > 0 ? Math.round(((originalTransfer - card.balance) / originalTransfer) * 100) : 0}% complete
                </span>
              </div>
              <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-zinc-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${originalTransfer > 0 ? Math.min(100, ((originalTransfer - card.balance) / originalTransfer) * 100) : 0}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>{fmt(originalTransfer - card.balance, priv)} paid</span>
                <span>{fmt(card.balance, priv)} remaining</span>
              </div>

              {/* Expandable monthly schedule */}
              <button onClick={() => setExpanded(v => !v)}
                className="mt-4 flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expanded ? 'Hide' : 'Show'} monthly payoff schedule to clear by expiry
              </button>

              {expanded && monthsRemaining > 0 && (
                <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Array.from({ length: Math.min(monthsRemaining, 24) }, (_, i) => {
                    const remaining = Math.max(0, card.balance - monthlyNeeded * (i + 1));
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i + 1);
                    return (
                      <div key={i} className={`rounded-xl p-2.5 text-center border ${remaining === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-100'}`}>
                        <p className="text-[9px] font-bold text-zinc-400">{dueDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                        <p className="text-xs font-bold text-zinc-900">{fmt(monthlyNeeded, priv)}</p>
                        <p className={`text-[9px] ${remaining === 0 ? 'text-emerald-600 font-bold' : 'text-zinc-400'}`}>
                          {remaining === 0 ? '✓ Paid off' : fmt(remaining, priv)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Deferred interest warning ── */}
            {isDeferred && (
              <div className="px-7 py-4 bg-red-600 text-white">
                <p className="text-xs font-bold">
                  🚨 DEFERRED INTEREST — If {fmt(card.balance, priv)} is not paid in full by {promo.expirationDate},
                  approximately <span className="underline">{fmt(interestBomb, priv)}</span> in backdated interest
                  will be charged immediately at {card.apr}% APR on the original {fmt(originalTransfer, priv)} transfer amount.
                  Partial payments do NOT avoid this charge.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const BalanceTransferPage: React.FC<{ state: AppState }> = ({ state }) => {
  const [offers, setOffers] = useState<TransferOffer[]>(DEFAULT_OFFERS);
  const [selectedOfferId, setSelectedOfferId] = useState(DEFAULT_OFFERS[0].id);
  const [editingOffer, setEditingOffer] = useState(false);
  const [customOffer, setCustomOffer] = useState<TransferOffer>({ ...DEFAULT_OFFERS[5] });
  const [activeTab, setActiveTab] = useState<'active' | 'analyzer'>('active');
  const priv = !!state.isPrivacyMode;

  const selectedOffer = offers.find(o => o.id === selectedOfferId) || offers[0];

  // All cards with at least one active promo, sorted by soonest expiry
  const cardsWithActivePromos = useMemo(() =>
    state.cards
      .filter(c => c.promos.some(p => new Date(p.expirationDate) > new Date()))
      .sort((a, b) => {
        const aMin = Math.min(...a.promos.filter(p => new Date(p.expirationDate) > new Date()).map(p => daysLeft(p.expirationDate)));
        const bMin = Math.min(...b.promos.filter(p => new Date(p.expirationDate) > new Date()).map(p => daysLeft(p.expirationDate)));
        return aMin - bMin;
      }),
    [state.cards]);

  // Summary stats
  const totalPromoBalance     = cardsWithActivePromos.reduce((s, c) => s + c.balance, 0);
  const totalOrigTransferred  = cardsWithActivePromos.reduce((s, c) =>
    s + c.promos.filter(p => new Date(p.expirationDate) > new Date()).reduce((ps, p) => ps + (p.amount || c.balance), 0), 0);
  const totalPaidDown         = Math.max(0, totalOrigTransferred - totalPromoBalance);
  const nextExpiry            = cardsWithActivePromos.length > 0
    ? Math.min(...cardsWithActivePromos.flatMap(c =>
        c.promos.filter(p => new Date(p.expirationDate) > new Date()).map(p => daysLeft(p.expirationDate))))
    : null;

  // Cards eligible for new transfers
  const eligibleCards = useMemo(() =>
    state.cards
      .filter(c => c.balance > 0 && c.apr > 0)
      .filter(c => !c.promos.some(p => p.type === PromoType.BALANCE_TRANSFER && new Date(p.expirationDate) > new Date()))
      .sort((a, b) => b.apr - a.apr),
    [state.cards]);

  const results = useMemo(() =>
    eligibleCards.map(card => {
      const transferable = Math.min(card.balance, selectedOffer.creditLimit);
      return calcTransferSavings(card, selectedOffer, transferable);
    }).filter(r => r.netSavings > 0)
      .sort((a, b) => b.netSavings - a.netSavings),
    [eligibleCards, selectedOffer]);

  const totalNewSavings = results.reduce((s, r) => s + r.netSavings, 0);

  const deferredRisk = cardsWithActivePromos.filter(c =>
    c.promos.some(p => p.type === PromoType.DEFERRED_INTEREST && daysLeft(p.expirationDate) <= 90)
  );

  const inp = "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900";

  return (
    <div className="space-y-8 pb-16">

      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Balance Transfers</h1>
          <p className="text-zinc-500 mt-1">Track active promos and find new transfer opportunities.</p>
        </div>
        {nextExpiry !== null && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${nextExpiry <= 30 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            Next expiry in {nextExpiry} days
          </div>
        )}
      </div>

      {/* Deferred interest bomb alert */}
      {deferredRisk.length > 0 && (
        <div className="p-6 bg-red-50 border-2 border-red-400 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-red-600" />
            <span className="font-bold text-red-900 text-sm">🚨 Deferred Interest Bomb — Time Critical</span>
          </div>
          {deferredRisk.map(card => {
            const p    = card.promos.find(p => p.type === PromoType.DEFERRED_INTEREST)!;
            const days = daysLeft(p.expirationDate);
            const bomb = card.balance * (card.apr / 100) * (days / 365);
            return (
              <div key={card.id} className="bg-white/60 rounded-2xl p-4 mt-2 flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-red-900">{card.name}</p>
                  <p className="text-sm text-red-700 mt-1">
                    Expires in <span className="font-bold">{days} days</span> ({p.expirationDate}).
                    Must pay <span className="font-bold">{fmt(card.balance, priv)}</span> in full.
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Failure to pay in full = <span className="font-bold">~{fmt(bomb, priv)}</span> retroactive interest at {card.apr}% APR charged immediately.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-red-600">{fmt(card.balance / Math.max(Math.ceil(days / 30), 1), priv)}</p>
                  <p className="text-[10px] text-red-500">per month needed</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Promos',       val: cardsWithActivePromos.reduce((s, c) => s + c.promos.filter(p => new Date(p.expirationDate) > new Date()).length, 0).toString(), sub: 'across your cards',         dark: true  },
          { label: 'Current Promo Balance',val: fmt(totalPromoBalance, priv),    sub: 'at 0% or promo rate',    good: true  },
          { label: 'Paid Down So Far',     val: fmt(totalPaidDown, priv),        sub: 'from original transfers', good: true  },
          { label: 'New Transfer Savings', val: fmt(totalNewSavings, priv),      sub: 'potential from new BTs',  good: totalNewSavings > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${(s as any).dark ? 'bg-zinc-900 border-zinc-800' : (s as any).good ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-200'}`}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${(s as any).dark ? 'text-white' : (s as any).good ? 'text-emerald-600' : 'text-zinc-900'}`}>{s.val}</p>
            <p className={`text-[10px] mt-1 ${(s as any).dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-zinc-100 p-1 rounded-2xl">
        {([['active', 'Active Promos'], ['analyzer', 'New Transfer Analyzer']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {label}
            {id === 'active' && cardsWithActivePromos.length > 0 &&
              <span className="ml-2 px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] rounded-full">{cardsWithActivePromos.length}</span>}
          </button>
        ))}
      </div>

      {/* ── ACTIVE PROMOS TAB ── */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {cardsWithActivePromos.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center">
              <Shield size={40} className="mx-auto text-zinc-300 mb-3" />
              <p className="font-bold text-zinc-900">No active promos tracked</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
                Add promo details when creating a card using the Card Wizard. Make sure to enter the exact expiry date and original transfer amount.
              </p>
            </div>
          ) : (
            cardsWithActivePromos.map(card => (
              <ActivePromoCard key={card.id} card={card} priv={priv} />
            ))
          )}
        </div>
      )}

      {/* ── ANALYZER TAB ── */}
      {activeTab === 'analyzer' && (
        <div className="space-y-6">
          {/* Offer selector */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Select Transfer Offer</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {offers.filter(o => o.id !== 'custom').map(offer => (
                <button key={offer.id} onClick={() => setSelectedOfferId(offer.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${selectedOfferId === offer.id ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 hover:border-zinc-300'}`}>
                  <p className="font-bold text-zinc-900 text-xs leading-snug mb-2">{offer.name}</p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-zinc-500"><span className="font-bold text-emerald-600">0%</span> for {offer.introPeriodMonths}mo</p>
                    <p className="text-[10px] text-zinc-500"><span className="font-bold">{offer.transferFeePct}%</span> fee · up to <span className="font-bold">{fmt(offer.creditLimit)}</span></p>
                    <p className="text-[10px] text-zinc-400">then {offer.regularAPR}% APR</p>
                  </div>
                </button>
              ))}
              <button onClick={() => { setSelectedOfferId('custom'); setEditingOffer(true); }}
                className={`text-left p-4 rounded-2xl border-2 border-dashed transition-all ${selectedOfferId === 'custom' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 hover:border-zinc-500'}`}>
                <p className="font-bold text-zinc-500 text-xs mb-1">+ Custom Offer</p>
                <p className="text-[10px] text-zinc-400">Enter any offer you received in the mail</p>
              </button>
            </div>

            {(selectedOfferId === 'custom' || editingOffer) && (
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Offer Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Offer Name',           key: 'name',              type: 'text',   placeholder: 'e.g. Amex Blue Cash' },
                    { label: 'Intro Period (months)', key: 'introPeriodMonths', type: 'number', placeholder: '18' },
                    { label: 'Transfer Fee %',        key: 'transferFeePct',   type: 'number', placeholder: '3' },
                    { label: 'Credit Limit ($)',      key: 'creditLimit',      type: 'number', placeholder: '10000' },
                    { label: 'Regular APR %',         key: 'regularAPR',       type: 'number', placeholder: '24.99' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(customOffer as any)[f.key]}
                        onChange={e => setCustomOffer(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                        className={inp} />
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  setOffers(prev => prev.map(o => o.id === 'custom' ? { ...customOffer, id: 'custom' } : o));
                  setSelectedOfferId('custom'); setEditingOffer(false);
                }} className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-all">
                  Apply Custom Offer
                </button>
              </div>
            )}
          </div>

          {/* Analysis results */}
          {results.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-3xl p-10 text-center">
              <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-bold text-zinc-900">No beneficial transfers for this offer</p>
              <p className="text-sm text-zinc-500 mt-1">All cards may already have promos, or transfer fees outweigh savings. Try a different offer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-zinc-900">Transfer Recommendations</h2>
              {results.map((r, i) => (
                <div key={r.card.id} className={`bg-white border rounded-3xl p-7 shadow-sm ${i === 0 ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-zinc-200'}`}>
                  {i === 0 && <div className="mb-3"><span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full">⭐ Best Move Right Now</span></div>}

                  <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: r.card.color }}>
                        {r.card.bank.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{r.card.name}</p>
                        <p className="text-xs text-zinc-500">{r.card.apr}% APR → <span className="font-bold text-emerald-600">0% for {r.offer.introPeriodMonths}mo</span> on {r.offer.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{fmt(r.netSavings, priv)}</p>
                      <p className="text-[10px] text-zinc-400">net savings</p>
                    </div>
                  </div>

                  {/* Interest flow */}
                  <div className="flex items-stretch gap-2 mb-5 flex-wrap">
                    {[
                      { label: 'Interest if you stay', val: fmt(r.interestWithout, priv), sub: `at ${r.card.apr}% over ${r.offer.introPeriodMonths}mo`, dark: false, bad: true  },
                      { label: 'Transfer fee',          val: fmt(r.transferFee, priv),     sub: `${r.offer.transferFeePct}% one-time`,                  dark: false, bad: false },
                      { label: 'You save',               val: fmt(r.netSavings, priv),      sub: 'net after fee',                                        dark: true,  bad: false },
                    ].map((s, si) => (
                      <React.Fragment key={s.label}>
                        <div className={`flex-1 min-w-0 p-4 rounded-2xl text-center ${s.dark ? 'bg-zinc-900 text-white' : s.bad ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${s.dark ? 'text-zinc-400' : s.bad ? 'text-red-500' : 'text-emerald-600'}`}>{s.label}</p>
                          <p className={`text-xl font-bold ${s.dark ? 'text-white' : s.bad ? 'text-red-600' : 'text-emerald-600'}`}>{s.val}</p>
                          <p className={`text-[10px] mt-0.5 ${s.dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</p>
                        </div>
                        {si < 2 && <div className="flex items-center flex-shrink-0"><ArrowRight size={16} className="text-zinc-300" /></div>}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Transfer Amount',  val: fmt(r.transferAmount, priv) },
                      { label: 'Transfer Fee',     val: fmt(r.transferFee, priv) },
                      { label: 'Pay/mo to clear',  val: fmt(r.monthlyPaymentNeeded, priv) },
                      { label: 'Break-even',       val: r.breakEvenMonth < 99 ? `Month ${r.breakEvenMonth}` : 'N/A' },
                    ].map(s => (
                      <div key={s.label} className="p-3 bg-zinc-50 rounded-xl">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-sm font-bold text-zinc-900">{s.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`p-3 rounded-xl flex items-center gap-2 ${r.canPayOffInTime ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                    {r.canPayOffInTime
                      ? <><CheckCircle size={14} className="text-emerald-600" /><p className="text-xs text-emerald-800 font-medium">Achievable — {fmt(r.monthlyPaymentNeeded, priv)}/mo clears it before the promo ends.</p></>
                      : <><AlertCircle size={14} className="text-amber-600" /><p className="text-xs text-amber-800 font-medium">High payment required — {fmt(r.monthlyPaymentNeeded, priv)}/mo. Make sure you have a plan for when the promo ends.</p></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explainer */}
      <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex gap-3">
        <Info size={15} className="text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-700">Deferred Interest vs. True 0% Balance Transfer: </span>
          A true 0% BT charges no interest during the promo — if you still have a balance at expiry, you simply revert to the regular APR going forward.
          Deferred Interest (Synchrony, store cards) is different — ALL the backdated interest from day one is charged at once if you haven't paid every penny by the expiry date.
          Partial payments on deferred interest cards do not help — you must pay in full.
        </p>
      </div>
    </div>
  );
};

export default BalanceTransferPage;
