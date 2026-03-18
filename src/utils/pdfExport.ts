import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AppState, Card, Statement } from '../types';

export const exportPayoffPlanToPDF = (state: AppState, plan: any[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.text('Debt Payoff Plan', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

  // Summary
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Strategy Summary', 14, 45);
  
  const totalDebt = state.cards.reduce((sum, c) => sum + c.balance, 0);
  const monthlyBudget = state.monthlyBudget;
  
  doc.setFontSize(10);
  doc.text(`Total Debt: $${totalDebt.toLocaleString()}`, 14, 55);
  doc.text(`Monthly Budget: $${monthlyBudget.toLocaleString()}`, 14, 62);
  doc.text(`Strategy: ${state.preferredStrategy}`, 14, 69);

  // Table
  const tableColumn = ["Month", "Total Payment", "Interest Paid", "Remaining Debt"];
  const tableRows: any[] = [];

  plan.forEach((month, index) => {
    const totalRemaining = Object.values(month.remainingBalances).reduce((a: any, b: any) => a + b, 0);
    const rowData = [
      `Month ${index + 1}`,
      `$${month.totalPayment.toLocaleString()}`,
      `$${month.interestPaid.toLocaleString()}`,
      `$${(totalRemaining as number).toLocaleString()}`
    ];
    tableRows.push(rowData);
  });

  (doc as any).autoTable({
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [24, 24, 27] },
  });

  doc.save(`debt-payoff-plan-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportStatementsToPDF = (card: Card, statements: Statement[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text(`${card.bank} - ${card.name} History`, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Statement History as of ${new Date().toLocaleDateString()}`, 14, 30);

  const tableColumn = ["Date", "Balance", "Min Payment", "Interest"];
  const tableRows: any[] = [];

  statements.forEach(s => {
    const rowData = [
      new Date(s.date).toLocaleDateString(),
      `$${s.balance.toLocaleString()}`,
      `$${s.minPayment.toLocaleString()}`,
      `$${s.interestCharged.toLocaleString()}`
    ];
    tableRows.push(rowData);
  });

  (doc as any).autoTable({
    startY: 40,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [24, 24, 27] },
  });

  doc.save(`${card.bank}-${card.name}-statements.pdf`);
};
