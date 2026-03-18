import { Card, PayoffStrategy, PayoffStep, AccountType } from '../types';

export const calculateMonthlyInterest = (card: Card): number => {
  if (card.apr === 0) return 0;

  // Check for an active promo that covers this balance
  const now = new Date();
  const activePromo = card.promos.find(p =>
    new Date(p.expirationDate) > now && p.rate === 0
  );
  if (activePromo) return 0;

  // Simple monthly interest calculation: (APR / 100 / 12) * balance
  return (card.apr / 100 / 12) * card.balance;
};

export const getUtilization = (card: Card): number => {
  if (card.accountType === AccountType.BNPL) return 0;
  if (card.limit === 0) return 0;
  return (card.balance / card.limit) * 100;
};

export const getDaysUntilDue = (dueDate: number): number => {
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let targetDate = new Date(currentYear, currentMonth, dueDate);
  if (today > dueDate) {
    targetDate = new Date(currentYear, currentMonth + 1, dueDate);
  }

  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDaysUntilPromoExpiry = (expiryDate: string): number => {
  const now = new Date();
  const targetDate = new Date(expiryDate);
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getPriorityRank = (card: Card, strategy: PayoffStrategy, currentBalance?: number): number => {
  const balanceToUse = currentBalance !== undefined ? currentBalance : card.balance;
  // Lower number = higher priority
  switch (strategy) {
    case PayoffStrategy.AVALANCHE:
      // Sort by APR descending
      return 100 - card.apr;
    case PayoffStrategy.SNOWBALL:
      // Sort by Balance ascending
      return balanceToUse;
    case PayoffStrategy.CASH_FLOW:
      // Sort by Balance/MinPayment ratio (lower ratio = faster payoff = more cash flow)
      return balanceToUse / (card.minPayment || 1);
    case PayoffStrategy.PROMO_OPTIMIZATION:
      // Prioritize promos expiring soon, then high APR
      const promoExpiry = card.promos.reduce((min, p) => {
        const days = getDaysUntilPromoExpiry(p.expirationDate);
        return days < min ? days : min;
      }, 9999);
      if (promoExpiry < 60) return promoExpiry / 10; // High priority if expiring within 2 months
      return 100 - card.apr;
    default:
      return 0;
  }
};

export const generatePayoffPlan = (
  cards: Card[],
  monthlyBudget: number,
  strategy: PayoffStrategy,
  months: number = 24
): PayoffStep[] => {
  let currentBalances = cards.reduce((acc, card) => {
    acc[card.id] = card.balance;
    return acc;
  }, {} as Record<string, number>);

  const steps: PayoffStep[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    let totalInterest = 0;
    let remainingBudget = monthlyBudget;
    const payments: { cardId: string; amount: number }[] = [];

    // 1. Pay minimums first
    cards.forEach(card => {
      const balance = currentBalances[card.id];
      if (balance <= 0) return;

      const minPay = Math.min(balance, card.minPayment);
      payments.push({ cardId: card.id, amount: minPay });
      currentBalances[card.id] -= minPay;
      remainingBudget -= minPay;
    });

    // 2. Apply extra budget based on strategy
    if (remainingBudget > 0) {
      const sortedCards = [...cards]
        .filter(c => currentBalances[c.id] > 0)
        .sort((a, b) => getPriorityRank(a, strategy, currentBalances[a.id]) - getPriorityRank(b, strategy, currentBalances[b.id]));

      for (const card of sortedCards) {
        if (remainingBudget <= 0) break;
        const balance = currentBalances[card.id];
        const extraPay = Math.min(balance, remainingBudget);
        
        const existingPayment = payments.find(p => p.cardId === card.id);
        if (existingPayment) {
          existingPayment.amount += extraPay;
        } else {
          payments.push({ cardId: card.id, amount: extraPay });
        }
        
        currentBalances[card.id] -= extraPay;
        remainingBudget -= extraPay;
      }
    }

    // 3. Apply interest for next month (use promo rate if active)
    const futureMonthDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    cards.forEach(card => {
      const balance = currentBalances[card.id];
      if (balance > 0) {
        const activePromo = card.promos.find(p =>
          new Date(p.expirationDate) > futureMonthDate && p.rate === 0
        );
        const effectiveAPR = activePromo ? 0 : card.apr;
        const interest = (effectiveAPR / 100 / 12) * balance;
        totalInterest += interest;
        currentBalances[card.id] += interest;
      }
    });

    steps.push({
      month: monthStr,
      payments: [...payments],
      remainingBalances: { ...currentBalances },
      totalInterest
    });

    if (Object.values(currentBalances).every(b => b <= 0)) break;
  }

  return steps;
};

export interface StrategyComparison {
  strategy: PayoffStrategy;
  totalInterest: number;
  monthsToPayoff: number;
  monthsToFirstWin: number;
  totalPaid: number;
}

export const compareStrategies = (cards: Card[], monthlyBudget: number): StrategyComparison[] => {
  const strategies = [PayoffStrategy.AVALANCHE, PayoffStrategy.SNOWBALL];
  
  return strategies.map(strategy => {
    const plan = generatePayoffPlan(cards, monthlyBudget, strategy, 120); // Simulate up to 10 years
    
    let totalInterest = 0;
    let totalPaid = 0;
    let firstWinMonth = -1;
    
    plan.forEach((step, index) => {
      totalInterest += step.totalInterest;
      step.payments.forEach(p => totalPaid += p.amount);
      
      if (firstWinMonth === -1) {
        // Check if any card was paid off this month
        const cardsPaidOff = cards.some(card => {
          const prevBalance = index === 0 ? card.balance : plan[index-1].remainingBalances[card.id];
          return prevBalance > 0 && step.remainingBalances[card.id] <= 0;
        });
        if (cardsPaidOff) firstWinMonth = index + 1;
      }
    });

    return {
      strategy,
      totalInterest,
      monthsToPayoff: plan.length,
      monthsToFirstWin: firstWinMonth === -1 ? plan.length : firstWinMonth,
      totalPaid
    };
  });
};

export const calculateNoSpendImpact = (
  cards: Card[],
  monthlyBudget: number,
  strategy: PayoffStrategy,
  savedAmount: number
): { monthsSaved: number; interestSaved: number } => {
  const originalPlan = generatePayoffPlan(cards, monthlyBudget, strategy, 120);
  
  // Create a copy of cards with the saved amount applied to the highest priority card
  const sortedCards = [...cards].sort((a, b) => getPriorityRank(a, strategy) - getPriorityRank(b, strategy));
  const updatedCards = cards.map(c => {
    if (c.id === sortedCards[0].id) {
      return { ...c, balance: Math.max(0, c.balance - savedAmount) };
    }
    return c;
  });

  const newPlan = generatePayoffPlan(updatedCards, monthlyBudget, strategy, 120);

  const originalInterest = originalPlan.reduce((sum, s) => sum + s.totalInterest, 0);
  const newInterest = newPlan.reduce((sum, s) => sum + s.totalInterest, 0);

  return {
    monthsSaved: Math.max(0, originalPlan.length - newPlan.length),
    interestSaved: Math.max(0, originalInterest - newInterest)
  };
};
