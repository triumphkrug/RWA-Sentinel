/**
 * KYC Gate integration for the scoring pipeline.
 *
 * Queries the on-chain kyc-gate contract to verify that asset submitters
 * have passed KYC verification before allowing attestation.  If the
 * submitter is not KYC-verified, the pipeline still scores the asset but
 * flags it with a compliance penalty and `kycVerified: false`.
 */

const KYC_SCORE_BONUS = 15;   // trust score bonus for KYC-verified submitters
const KYC_SCORE_PENALTY = -10; // penalty for unverified submitters

const KYC_CONTRACT_HASH = process.env.KYC_GATE_HASH ?? '6e0dd2dc7673cf5c7c4e99ad5c956320a3f0f19db4cdb2293eab222611aa58d5';
const CSPR_CLOUD_API_KEY = process.env.CSPR_CLOUD_API_KEY ?? '';

export interface KycCheckResult {
  publicKey: string;
  kycVerified: boolean;
  verifiedAt: string | null;
  kycLevel: 'none' | 'basic' | 'enhanced';
  scoreAdjustment: number;
}

/**
 * Check KYC status for a submitter public key by querying the kyc-gate
 * contract's `kyc_registry` dictionary via CSPR.cloud.
 */
export async function checkKycStatus(submitterPublicKey: string): Promise<KycCheckResult> {
  if (!KYC_CONTRACT_HASH) {
    return {
      publicKey: submitterPublicKey,
      kycVerified: false,
      verifiedAt: null,
      kycLevel: 'none',
      scoreAdjustment: 0, // no penalty if KYC contract not configured
    };
  }

  try {
    const csprCloudUrl = `https://api.testnet.cspr.cloud/v2/contracts/${KYC_CONTRACT_HASH}/named-keys/kyc_registry/items/${submitterPublicKey}`;
    const resp = await fetch(csprCloudUrl, {
      headers: {
        'Authorization': CSPR_CLOUD_API_KEY,
      },
    });

    if (resp.ok) {
      const data = await resp.json() as { value?: { cl_type?: string; parsed?: unknown } };
      // kyc_registry stores U64 timestamps (0 = not verified, >0 = verified_at)
      const rawValue = Number(data?.value?.parsed ?? 0);
      const isVerified = rawValue > 0;

      return {
        publicKey: submitterPublicKey,
        kycVerified: isVerified,
        verifiedAt: isVerified ? new Date(rawValue).toISOString() : null,
        kycLevel: isVerified ? 'basic' : 'none',
        scoreAdjustment: isVerified ? KYC_SCORE_BONUS : KYC_SCORE_PENALTY,
      };
    }

    // Key not found in dictionary → not verified
    return {
      publicKey: submitterPublicKey,
      kycVerified: false,
      verifiedAt: null,
      kycLevel: 'none',
      scoreAdjustment: KYC_SCORE_PENALTY,
    };
  } catch {
    // Network error → don't penalize, just note unverified
    return {
      publicKey: submitterPublicKey,
      kycVerified: false,
      verifiedAt: null,
      kycLevel: 'none',
      scoreAdjustment: 0,
    };
  }
}

/**
 * Apply KYC adjustment to a trust score.
 * Clamps result to [0, 100].
 */
export function applyKycAdjustment(trustScore: number, kycResult: KycCheckResult): number {
  return Math.max(0, Math.min(100, trustScore + kycResult.scoreAdjustment));
}
