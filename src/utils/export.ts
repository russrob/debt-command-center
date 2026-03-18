import { Card, PayoffStep } from '../types';

export const exportCardsToCSV = (cards: Card[]) => {
  const headers = ['Bank', 'Name', 'Balance', 'Limit', 'APR', 'Min Payment', 'Due Date'];
  const rows = cards.map(c => [
    c.bank,
    c.name,
    c.balance,
    c.limit,
    c.apr,
    c.minPayment,
    c.dueDate
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'debt_command_cards.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportDueDatesToICS = (cards: Card[]) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Debt Command Center//EN'
  ].join('\r\n');

  cards.forEach(card => {
    const dueDate = new Date(year, month, card.dueDate);
    const dateStr = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `SUMMARY:Credit Card Payment Due: ${card.name}`,
      `DTSTART:${dateStr}`,
      `DTEND:${dateStr}`,
      `DESCRIPTION:Payment of $${card.minPayment} due for ${card.bank} card ending in ${card.lastFour}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'debt_reminders.ics');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
