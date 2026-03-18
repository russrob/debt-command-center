import { Card, PromoType, PromoConfidence, Statement, CardNetwork, AccountType } from '../types';

export const SAMPLE_CARDS: Card[] = [
  {
    id: '1',
    name: 'Sapphire Preferred',
    bank: 'Chase',
    network: CardNetwork.VISA,
    lastFour: '1234',
    balance: 4500,
    limit: 10000,
    apr: 24.99,
    minPayment: 135,
    dueDate: 15,
    color: '#004a99',
    promos: []
  },
  {
    id: '2',
    name: 'Custom Cash',
    bank: 'Citi',
    network: CardNetwork.MASTERCARD,
    lastFour: '5678',
    balance: 2800,
    limit: 5000,
    apr: 0,
    minPayment: 35,
    dueDate: 22,
    color: '#003b70',
    promos: [
      {
        id: 'p1',
        type: PromoType.BALANCE_TRANSFER,
        expirationDate: '2026-08-15',
        confidence: PromoConfidence.CONFIRMED,
        amount: 2800,
        rate: 0,
        description: '0% Intro APR on Balance Transfers'
      }
    ]
  },
  {
    id: '3',
    name: 'Everyday Card',
    bank: 'Amex',
    network: CardNetwork.AMEX,
    lastFour: '9012',
    balance: 1200,
    limit: 8000,
    apr: 21.24,
    minPayment: 40,
    dueDate: 5,
    color: '#006fcf',
    promos: []
  },
  {
    id: '4',
    name: 'Furniture Store',
    bank: 'Synchrony',
    network: CardNetwork.DISCOVER,
    lastFour: '3456',
    balance: 1500,
    limit: 3000,
    apr: 29.99,
    minPayment: 50,
    dueDate: 10,
    color: '#e31837',
    promos: [
      {
        id: 'p2',
        type: PromoType.DEFERRED_INTEREST,
        expirationDate: '2026-04-10',
        confidence: PromoConfidence.INFERRED,
        amount: 1500,
        rate: 0,
        description: 'No Interest if Paid in Full by April'
      }
    ]
  },
  {
    id: '5',
    name: 'PayPal Credit Line',
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
    promos: [
      {
        id: 'p3',
        type: PromoType.DEFERRED_INTEREST,
        expirationDate: '2026-09-28',
        confidence: PromoConfidence.CONFIRMED,
        amount: 850,
        rate: 0,
        description: '6 Months No Interest on purchases over $99'
      }
    ]
  }
];

export const SAMPLE_STATEMENTS: Statement[] = [
  { id: 's1', cardId: '1', date: '2026-02-15', balance: 4650, minPayment: 140, interestCharged: 95 },
  { id: 's2', cardId: '1', date: '2026-01-15', balance: 4800, minPayment: 145, interestCharged: 98 },
  { id: 's3', cardId: '2', date: '2026-02-22', balance: 2800, minPayment: 35, interestCharged: 0 },
];
