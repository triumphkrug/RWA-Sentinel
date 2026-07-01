/**
 * Collects invoice data from external sources.
 */

import { createHash } from 'node:crypto';
import type { CollectedInvoice, CollectorOptions, RawInvoice } from './types.js';

const DEFAULT_OPTIONS: CollectorOptions = {
  batchSize: 10,
  deduplicateByHash: true,
};

export class InvoiceCollector {
  private readonly options: CollectorOptions;
  private readonly seenHashes = new Set<string>();

  constructor(options?: Partial<CollectorOptions>) {
    // Step 1: Merge options with defaults
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Collect a batch of invoices from the provided source array.
   * Returns de-duplicated and validated invoices ready for scoring.
   */
  collectBatch(invoices: RawInvoice[]): CollectedInvoice[] {
    // Step 1: Limit to batch size
    const batch = invoices.slice(0, this.options.batchSize);

    // Step 2: Hash and de-duplicate
    const collected: CollectedInvoice[] = [];
    for (const invoice of batch) {
      const rawHash = this.computeHash(invoice);

      // Step 3: Skip duplicates if dedup enabled
      if (this.options.deduplicateByHash && this.seenHashes.has(rawHash)) {
        continue;
      }
      this.seenHashes.add(rawHash);

      // Step 4: Validate basic fields
      if (!this.isValid(invoice)) {
        continue;
      }

      // Step 5: Build collected invoice record
      collected.push({
        invoiceId: invoice.invoiceId,
        rawHash,
        invoice,
        collectedAt: new Date(),
        source: 'api',
      });
    }

    return collected;
  }

  /**
   * Compute SHA-256 hash of invoice for dedup and on-chain anchoring.
   */
  computeHash(invoice: RawInvoice): string {
    // Use explicitly ordered keys for deterministic hashing across JS engines
    const payload = JSON.stringify({
      amount: invoice.amountCents,
      currency: invoice.currencyCode,
      debtor: invoice.debtor,
      id: invoice.invoiceId,
      issued: invoice.issuedAt instanceof Date ? invoice.issuedAt.toISOString() : String(invoice.issuedAt),
      issuer: invoice.issuer,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private isValid(invoice: RawInvoice): boolean {
    // Step 1: Check required string fields
    if (!invoice.invoiceId || !invoice.issuer || !invoice.debtor) {
      return false;
    }
    // Step 2: Validate amount
    if (invoice.amountCents <= 0) {
      return false;
    }
    // Step 3: Validate dates
    if (invoice.dueAt <= invoice.issuedAt) {
      return false;
    }
    return true;
  }
}
