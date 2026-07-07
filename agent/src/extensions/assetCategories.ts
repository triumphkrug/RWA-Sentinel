/**
 * Extensible asset classification system — TypeScript mirror of
 * contracts/extensions/src/asset_categories.rs.
 *
 * Provides category-aware scoring weights, compliance framework tagging,
 * and asset metadata enrichment for the validation pipeline.
 */

/** High-level RWA asset classifications. */
export enum AssetCategory {
  RealEstate = 'real_estate',
  Commodity = 'commodity',
  Invoice = 'invoice',
  Equity = 'equity',
  Bond = 'bond',
  Vehicle = 'vehicle',
  Art = 'art',
  Healthcare = 'healthcare',
  CarbonCredit = 'carbon_credit',
  IntellectualProperty = 'intellectual_property',
}

/** Compliance frameworks applicable to regulated assets. */
export enum ComplianceFramework {
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
  FDA510K = 'FDA_510K',
  CEMDR = 'CE_MDR',
  ISO13485 = 'ISO_13485',
  MiCA = 'MiCA',
}

/** Extended asset metadata including category and compliance. */
export interface AssetMetadata {
  category: AssetCategory;
  jurisdiction: string;
  complianceFrameworks: ComplianceFramework[];
  metadataHash: string;
  ownerDid?: string;
}

/** Per-category scoring weight adjustments. */
export interface CategoryWeights {
  issuerHistory: number;
  debtorRating: number;
  crossReference: number;
  amountPlausibility: number;
  temporalConsistency: number;
  invoiceDetail: number;
}

/**
 * Category-specific scoring weight profiles.
 *
 * Different asset types emphasize different risk factors:
 * - Invoices: heavy on issuer history and cross-referencing
 * - Real estate: valuation plausibility and temporal consistency
 * - Bonds: debtor rating (credit risk) dominant
 */
export const CATEGORY_WEIGHTS: Record<AssetCategory, CategoryWeights> = {
  [AssetCategory.Invoice]:             { issuerHistory: 25, debtorRating: 20, crossReference: 15, amountPlausibility: 15, temporalConsistency: 15, invoiceDetail: 10 },
  [AssetCategory.RealEstate]:          { issuerHistory: 15, debtorRating: 10, crossReference: 20, amountPlausibility: 25, temporalConsistency: 20, invoiceDetail: 10 },
  [AssetCategory.Bond]:                { issuerHistory: 20, debtorRating: 30, crossReference: 15, amountPlausibility: 15, temporalConsistency: 15, invoiceDetail:  5 },
  [AssetCategory.Equity]:              { issuerHistory: 20, debtorRating: 25, crossReference: 20, amountPlausibility: 15, temporalConsistency: 10, invoiceDetail: 10 },
  [AssetCategory.Commodity]:           { issuerHistory: 15, debtorRating: 15, crossReference: 20, amountPlausibility: 25, temporalConsistency: 15, invoiceDetail: 10 },
  [AssetCategory.Vehicle]:             { issuerHistory: 15, debtorRating: 15, crossReference: 15, amountPlausibility: 25, temporalConsistency: 20, invoiceDetail: 10 },
  [AssetCategory.Art]:                 { issuerHistory: 20, debtorRating: 10, crossReference: 25, amountPlausibility: 20, temporalConsistency: 10, invoiceDetail: 15 },
  [AssetCategory.Healthcare]:          { issuerHistory: 15, debtorRating: 15, crossReference: 20, amountPlausibility: 20, temporalConsistency: 15, invoiceDetail: 15 },
  [AssetCategory.CarbonCredit]:        { issuerHistory: 20, debtorRating: 15, crossReference: 25, amountPlausibility: 15, temporalConsistency: 15, invoiceDetail: 10 },
  [AssetCategory.IntellectualProperty]:{ issuerHistory: 20, debtorRating: 15, crossReference: 20, amountPlausibility: 20, temporalConsistency: 10, invoiceDetail: 15 },
};

/** Required compliance frameworks per category and jurisdiction. */
export const COMPLIANCE_MAP: Partial<Record<AssetCategory, ComplianceFramework[]>> = {
  [AssetCategory.Healthcare]: [ComplianceFramework.HIPAA, ComplianceFramework.FDA510K, ComplianceFramework.ISO13485],
  [AssetCategory.Equity]:     [ComplianceFramework.MiCA],
  [AssetCategory.Bond]:       [ComplianceFramework.MiCA],
};

/**
 * Get scoring weights for a given asset category.
 * Falls back to Invoice weights for unknown categories.
 */
export function getWeightsForCategory(category: AssetCategory): CategoryWeights {
  return CATEGORY_WEIGHTS[category] ?? CATEGORY_WEIGHTS[AssetCategory.Invoice];
}

/**
 * Get required compliance frameworks for an asset category.
 */
export function getComplianceRequirements(category: AssetCategory): ComplianceFramework[] {
  return COMPLIANCE_MAP[category] ?? [];
}
