import { describe, expect, it } from 'vitest';
import { changeServicePrice, openedReport, summariseMoney, transitionReport, type CatalogueService, type DeptReport } from './adminData';

const service: CatalogueService = {
  id: 'SVC001', code: 'SVC001', name: 'Malaria Test', department: 'Laboratory', category: 'Blood Tests',
  description: 'Test', price: 5000, status: 'Active', updatedAt: '2026-04-28', updatedBy: 'Seed',
};

const report: DeptReport = {
  id: 'RPT-1', title: 'Daily', department: 'Laboratory', officer: 'Mr. Sola Adebanjo', period: '2026-10-27',
  category: 'Daily departmental activity', summary: 'Pending validation.', metrics: '', challenges: '',
  actionsTaken: '', supportNeeded: '', owner: 'Admin Officer', status: 'Submitted', submittedAt: '2026-10-27', comments: [],
};

describe('admin money and report rules', () => {
  it('separates billed, collected, outstanding, refunds, and net', () => {
    const summary = summariseMoney([
      { amount: 10000, amountPaid: 5000, balance: 5000, createdAt: '2026-04-28 08:42' },
      { amount: 35000, amountPaid: 35000, balance: 0, createdAt: '2026-04-28 09:01' },
    ], 5000);
    expect(summary.billed).toBe(45000);
    expect(summary.net).toBe(40000);
    expect(summary.gross).toBe(45000);
    expect(summary.refunds).toBe(5000);
    expect(summary.outstanding).toBe(5000);
    expect(summary.discounts).toBe(0);
  });

  it('keeps an existing invoice amount when the catalogue price changes', () => {
    const invoice = { amount: 5000 };
    const changed = changeServicePrice(service, [], {
      price: 8000, reason: 'Annual review', effectiveDate: '2026-10-27', by: 'Admin Officer', at: '2026-10-27',
    });
    expect(changed.service.price).toBe(8000);
    expect(changed.history[0].previous).toBe(5000);
    expect(invoice.amount).toBe(5000);
  });

  it('does not approve a report when it is opened, and can send it back', () => {
    expect(openedReport(report).status).toBe('Submitted');
    const missing = transitionReport(report, 'Needs Clarification');
    expect(missing.ok).toBe(false);
    const sent = transitionReport(report, 'Needs Clarification', { at: '2026-10-27', by: 'Admin Officer', text: 'Confirm the pending count.' });
    expect(sent.ok).toBe(true);
    if (sent.ok) {
      expect(sent.report.status).toBe('Needs Clarification');
      expect(sent.report.comments).toHaveLength(1);
    }
  });
});
