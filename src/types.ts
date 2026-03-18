/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PromoConfidence {
  CONFIRMED = 'Confirmed',
  INFERRED = 'Inferred',
  UNKNOWN = 'Unknown'
}

export enum PromoType {
  BALANCE_TRANSFER = 'Balance Transfer',
  DEFERRED_INTEREST = 'Deferred Interest',
  PURCHASE_PROMO = 'Purchase Promo'
}

export interface Promo {
  id: string;
  type: PromoType;
  expirationDate: string;
  confidence: PromoConfidence;
  amount: number;
  rate: number; // usually 0%
  description: string;
}

export enum AccountType {
  CREDIT_CARD = 'Credit Card',
  BNPL = 'Buy Now Pay Later',
  PERSONAL_LOAN = 'Personal Loan',
  AUTO_LOAN = 'Auto Loan',
  MORTGAGE = 'Mortgage',
  PAYPAL_CREDIT = 'PayPal Credit'
}

export enum CardNetwork {
  VISA = 'Visa',
  MASTERCARD = 'MasterCard',
  AMEX = 'American Express',
  DISCOVER = 'Discover',
  PAYPAL = 'PayPal',
  OTHER = 'Other'
}

export enum BnplPlatform {
  AFFIRM       = 'Affirm',
  AFTERPAY     = 'Afterpay',
  KLARNA       = 'Klarna',
  PAYPAL_PAY_LATER = 'PayPal Pay Later',
  SEZZLE       = 'Sezzle',
  ZIP          = 'Zip (Quadpay)',
  APPLE_PAY_LATER = 'Apple Pay Later',
  SHOP_PAY     = 'Shop Pay Installments',
  SPLITIT      = 'Splitit',
  OTHER        = 'Other',
}

export interface Card {
  id: string;
  accountType?: AccountType;
  network?: CardNetwork;
  name: string;
  bank: string;
  lastFour: string;
  balance: number;
  limit: number;
  apr: number;
  minPayment: number;
  dueDate: number; // day of month (1-31)
  promos: Promo[];
  color: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  creditScore?: number;
  // BNPL-specific fields
  bnplPlatform?: BnplPlatform;
  bnplTotalPurchase?: number;        // original purchase amount
  bnplInstallmentCount?: number;     // total number of payments (e.g. 4)
  bnplInstallmentAmount?: number;    // each payment amount
  bnplInstallmentFrequency?: 'weekly' | 'biweekly' | 'monthly';
  bnplNextPaymentDate?: string;      // YYYY-MM-DD
  bnplPurchaseDate?: string;         // YYYY-MM-DD
  bnplMerchant?: string;             // e.g. "Wayfair", "Amazon"
}

export interface Statement {
  id: string;
  cardId: string;
  date: string;
  balance: number;
  minPayment: number;
  interestCharged: number;
}

export enum PayoffStrategy {
  AVALANCHE = 'Avalanche',
  SNOWBALL = 'Snowball',
  CASH_FLOW = 'Cash Flow Relief',
  PROMO_OPTIMIZATION = 'Promo Optimization'
}

export interface PayoffStep {
  month: string;
  payments: {
    cardId: string;
    amount: number;
  }[];
  remainingBalances: Record<string, number>;
  totalInterest: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  title: string;
  amount?: number;
  type: 'manual' | 'payment' | 'promo' | 'no-spend';
  description?: string;
  color?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  recurrence?: 'none' | 'monthly';
}

export interface Payment {
  id: string;
  cardId: string;
  amount: number;
  date: string; // ISO string YYYY-MM-DD
  notes?: string;
}

export interface MonthlyReview {
  id: string;
  month: string; // YYYY-MM
  completedTasks: string[];
  notes?: string;
}

export type AssetCategory =
  | 'checking'      // checking account
  | 'savings'       // savings / HYSA
  | 'business'      // business account
  | 'cash'          // cash on hand
  | 'retirement'    // 401k, IRA, pension
  | 'brokerage'     // taxable investments
  | 'crypto'        // crypto holdings
  | 'property'      // real estate
  | 'vehicle'       // car, boat, etc.
  | 'other';

export interface Asset {
  id: string;
  label: string;
  amount: number;
  category: AssetCategory;
  institution?: string;    // e.g. "Chase", "Fidelity"
  lastUpdated?: string;    // YYYY-MM-DD
}

export type IncomeFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'irregular';

export interface IncomeSource {
  id: string;
  label: string;             // e.g. "OneSource Salary", "US Foods Salary"
  grossAmount: number;       // gross per paycheck
  netAmount: number;         // take-home per paycheck
  frequency: IncomeFrequency;
  nextPayDate?: string;      // YYYY-MM-DD
  employer?: string;
  isActive: boolean;
}

export type ExpenseCategory =
  | 'housing'       // rent, mortgage
  | 'utilities'     // electric, gas, water, internet
  | 'food'          // groceries, dining
  | 'transport'     // car payment, gas, insurance
  | 'insurance'     // health, life, home
  | 'subscriptions' // Netflix, gym, etc.
  | 'childcare'     // school, activities
  | 'debt'          // min payments (auto-computed)
  | 'other';

export interface HouseholdExpense {
  id: string;
  label: string;
  amount: number;             // monthly amount
  category: ExpenseCategory;
  isFixed: boolean;           // fixed vs variable
  isRecurring?: boolean;      // subscription / recurring charge
  billingFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'annual'; // for annual subscriptions
  dueDay?: number;            // day of month
}

export interface Snowflake {
  id: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  source: string;     // e.g. "eBay sale", "cashback", "overtime"
  cardId: string;     // card it was applied to
  notes?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  monthlyBudgetDelta: number;   // extra monthly payment
  oneTimePrincipal: number;     // lump sum applied upfront
  targetCardId?: string;        // if lump sum goes to specific card
  incomeChange: number;         // monthly income change
  expenseChange: number;        // monthly expense change (negative = reduction)
  createdAt: string;
}

export interface AppState {
  cards: Card[];
  statements: Statement[];
  payments: Payment[];
  monthlyBudget: number;
  income: number;
  monthlyExpenses: number;
  brightStashBalance: number;
  preferredStrategy: PayoffStrategy;
  manualEvents: CalendarEvent[];
  monthlyReviews?: MonthlyReview[];
  assets?: Asset[];
  snowflakes?: Snowflake[];
  scenarios?: Scenario[];
  incomeSources?: IncomeSource[];
  householdExpenses?: HouseholdExpense[];
  lastSynced?: string;
  isPrivacyMode?: boolean;
}
