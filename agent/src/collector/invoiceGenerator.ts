/**
 * Generates demo invoices for testing and demonstration.
 */

import { randomUUID } from 'node:crypto';
import type { RawInvoice } from './types.js';

const DEMO_ISSUERS = ['Acme Corp', 'TechFlow Inc', 'MetaParts GmbH', 'NovaLogistics'];
const DEMO_DEBTORS = ['BuildCo Ltd', 'AlphaRetail SA', 'OmegaServices'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];

/**
 * Generate a batch of demo invoices for sandbox testing.
 */
export function generateDemoInvoices(count: number): RawInvoice[] {
  // Step 1: Build array of requested size
  const invoices: RawInvoice[] = [];

  for (let i = 0; i < count; i++) {
    // Step 2: Pick random entities
    const issuer = DEMO_ISSUERS[i % DEMO_ISSUERS.length];
    const debtor = DEMO_DEBTORS[i % DEMO_DEBTORS.length];
    const currency = CURRENCIES[i % CURRENCIES.length];

    // Step 3: Generate realistic dates
    const issuedAt = new Date();
    issuedAt.setDate(issuedAt.getDate() - Math.floor(Math.random() * 30));
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + 30 + Math.floor(Math.random() * 60));

    // Step 4: Create line items
    const lineCount = 1 + Math.floor(Math.random() * 4);
    const lineItems = Array.from({ length: lineCount }, (_, j) => ({
      description: `Service item ${j + 1}`,
      quantity: 1 + Math.floor(Math.random() * 10),
      unitPriceCents: 1000 + Math.floor(Math.random() * 50000),
    }));

    // Step 5: Calculate total
    const amountCents = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );

    // Step 6: Assemble invoice
    invoices.push({
      invoiceId: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      issuer,
      debtor,
      amountCents,
      currencyCode: currency,
      issuedAt,
      dueAt,
      lineItems,
      metadata: {
        source: 'demo-generator',
        version: '1.0',
      },
    });
  }

  return invoices;
}
