//! Oracle consensus configuration for multi-party attestation.
//!
//! Planned: Phase 2 — BLS threshold signatures (3-of-5).
//! Phase 3 — full MPC oracle consensus with Shamir Secret Sharing.

/// Configuration for multi-oracle consensus.
#[derive(Clone, Debug)]
pub struct ConsensusConfig {
    /// Minimum number of oracles required for valid attestation.
    pub threshold: u32,
    /// Total number of oracles in the committee.
    pub total_oracles: u32,
    /// Timeout for collecting oracle responses (seconds).
    pub timeout_secs: u64,
    /// Whether MPC key sharing is enabled.
    pub mpc_enabled: bool,
    /// Whether BLS signature aggregation is active.
    pub bls_aggregation: bool,
}

impl ConsensusConfig {
    /// Default 3-of-5 configuration.
    pub fn default_3of5() -> Self {
        Self {
            threshold: 3,
            total_oracles: 5,
            timeout_secs: 300,
            mpc_enabled: false,
            bls_aggregation: true,
        }
    }

    /// Check if enough oracles have responded.
    pub fn has_quorum(&self, responses: u32) -> bool {
        responses >= self.threshold
    }
}
