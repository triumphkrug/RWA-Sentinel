/**
 * RWA-Sentinel Extension Modules
 *
 * TypeScript mirrors of contracts/extensions/ Rust crate, plus
 * pipeline integrations (KYC gate, cross-chain bridge).
 */

export {
  AssetCategory,
  ComplianceFramework,
  CATEGORY_WEIGHTS,
  COMPLIANCE_MAP,
  getWeightsForCategory,
  getComplianceRequirements,
  type AssetMetadata,
  type CategoryWeights,
} from './assetCategories.js';

export {
  checkKycStatus,
  applyKycAdjustment,
  type KycCheckResult,
} from './kycGate.js';

export {
  ChainId,
  SUPPORTED_CHAINS,
  verifyRemoteAttestation,
  listSupportedChains,
  type ChainOrigin,
  type RemoteVerification,
  type BridgeConfig,
} from './crossChainBridge.js';
