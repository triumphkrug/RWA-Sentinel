/**
 * Types for the invoice collector module.
 */

export interface RawInvoice {
  invoiceId: string;
  issuer: string;
  debtor: string;
  amountCents: number;
  currencyCode: string;
  issuedAt: Date;
  dueAt: Date;
  lineItems: LineItem[];
  metadata: Record<string, string>;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CollectedInvoice {
  invoiceId: string;
  rawHash: string;
  invoice: RawInvoice;
  collectedAt: Date;
  source: 'api' | 'generator' | 'upload';
}

export interface CollectorOptions {
  batchSize: number;
  deduplicateByHash: boolean;
}
