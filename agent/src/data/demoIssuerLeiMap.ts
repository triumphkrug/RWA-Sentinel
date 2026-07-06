/**
 * Maps the synthetic demo invoice issuer names (see
 * agent/src/collector/invoiceGenerator.ts) to real, GLEIF-verified Legal
 * Entity Identifiers, so the cross-reference check can perform a genuine
 * external lookup instead of only local sanity checks (non-empty strings,
 * amount range, date ordering) - see the SPECA-lite audit finding F4.
 *
 * The demo issuer names themselves remain fictional placeholder company
 * names (this is synthetic invoice data, not real invoices), but each one
 * is deliberately mapped to a real public company's real LEI so
 * `DataAdapterService.getLei()` returns a real, verifiable GLEIF record
 * for the cross-reference check to evaluate - this is an honest stand-in
 * (documented here, not hidden) for a production system where the issuer
 * field itself would carry a real LEI end to end.
 */
export const DEMO_ISSUER_LEI_MAP: Record<string, string> = {
  'Acme Corp': 'HWUPKR0MPOU8FGXBT394', // Apple Inc.
  'TechFlow Inc': 'INR2EJN1ERAN0W5ZP974', // Microsoft Corporation
  'MetaParts GmbH': '5493001KJTIIGC8Y1R12', // Bloomberg Finance L.P.
  'NovaLogistics': 'ZXTILKJKG63JELOEG630', // Amazon.com, Inc.
};
