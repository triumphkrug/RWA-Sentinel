/**
 * Tests for the invoice generator — structure, variety, consistency.
 */

import { generateDemoInvoices } from '../agent/src/collector/invoiceGenerator';

describe('generateDemoInvoices', () => {
  test('generates requested number of invoices', () => {
    const invoices = generateDemoInvoices(5);
    expect(invoices.length).toBe(5);
  });

  test('generates zero invoices', () => {
    const invoices = generateDemoInvoices(0);
    expect(invoices.length).toBe(0);
  });

  test('each invoice has required fields', () => {
    const invoices = generateDemoInvoices(3);
    for (const inv of invoices) {
      expect(inv.invoiceId).toMatch(/^INV-/);
      expect(inv.issuer.length).toBeGreaterThan(0);
      expect(inv.debtor.length).toBeGreaterThan(0);
      expect(inv.amountCents).toBeGreaterThan(0);
      expect(['USD', 'EUR', 'GBP']).toContain(inv.currencyCode);
      expect(inv.issuedAt).toBeInstanceOf(Date);
      expect(inv.dueAt).toBeInstanceOf(Date);
      expect(inv.lineItems.length).toBeGreaterThan(0);
      expect(inv.metadata).toBeDefined();
    }
  });

  test('due date is always after issue date', () => {
    const invoices = generateDemoInvoices(10);
    for (const inv of invoices) {
      expect(inv.dueAt.getTime()).toBeGreaterThan(inv.issuedAt.getTime());
    }
  });

  test('invoice IDs are unique', () => {
    const invoices = generateDemoInvoices(20);
    const ids = invoices.map((i) => i.invoiceId);
    expect(new Set(ids).size).toBe(20);
  });

  test('line items have valid structure', () => {
    const invoices = generateDemoInvoices(5);
    for (const inv of invoices) {
      for (const item of inv.lineItems) {
        expect(item.description).toBeTruthy();
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unitPriceCents).toBeGreaterThan(0);
      }
    }
  });

  test('amount equals sum of line items', () => {
    const invoices = generateDemoInvoices(5);
    for (const inv of invoices) {
      const computed = inv.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0,
      );
      expect(inv.amountCents).toBe(computed);
    }
  });

  test('metadata contains source field', () => {
    const invoices = generateDemoInvoices(1);
    expect(invoices[0].metadata['source']).toBe('demo-generator');
  });
});
