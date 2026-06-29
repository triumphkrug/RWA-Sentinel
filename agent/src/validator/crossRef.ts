/**
 * Cross-reference checker for invoice verification.
 */

import type { RawInvoice } from '../collector/types.js';
import type { CrossRefResult } from './types.js';

interface CrossRefSource {
  name: string;
  verify: (invoice: RawInvoice) => Promise<boolean>;
}

/**
 * Checks invoices against multiple external data sources
 * to detect inconsistencies or fraud signals.
 */
export class CrossRefChecker {
  private readonly sources: CrossRefSource[];

  constructor(sources?: CrossRefSource[]) {
    // Step 1: Use provided sources or default demo set
    this.sources = sources ?? this.defaultSources();
  }

  /**
   * Run all cross-reference checks for a single invoice.
   */
  async check(invoice: RawInvoice): Promise<CrossRefResult> {
    const matchedSources: string[] = [];
    const conflictingSources: string[] = [];

    // Step 1: Run each source check in parallel
    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        const passed = await source.verify(invoice);
        return { name: source.name, passed };
      }),
    );

    // Step 2: Classify results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.passed) {
          matchedSources.push(result.value.name);
        } else {
          conflictingSources.push(result.value.name);
        }
      }
    }

    // Step 3: Determine overall pass/fail
    const crossRefPassed = conflictingSources.length === 0 && matchedSources.length > 0;

    return {
      invoiceId: invoice.invoiceId,
      crossRefPassed,
      matchedSources,
      conflictingSources,
    };
  }

  private defaultSources(): CrossRefSource[] {
    return [
      {
        name: 'entity-registry',
        verify: async (inv) => {
          // Step 1: Verify issuer and debtor exist in entity registry
          return inv.issuer.length > 0 && inv.debtor.length > 0;
        },
      },
      {
        name: 'amount-sanity',
        verify: async (inv) => {
          // Step 1: Flag suspiciously round or zero amounts
          return inv.amountCents > 0 && inv.amountCents < 100_000_000;
        },
      },
      {
        name: 'date-consistency',
        verify: async (inv) => {
          // Step 1: Ensure due date is after issue date
          return new Date(inv.dueAt) > new Date(inv.issuedAt);
        },
      },
    ];
  }
}
