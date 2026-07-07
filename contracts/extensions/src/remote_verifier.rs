//! Cross-chain attestation verification interface.
//!
//! Enables verification of RWA tokens and attestations from other blockchains.
//! Planned: Phase 3 — cross-chain attestation bridging.

use alloc::string::String;
use alloc::vec::Vec;

/// Origin chain of an asset.
#[derive(Clone, Debug, PartialEq)]
pub struct ChainOrigin {
    pub chain_name: String,
    pub chain_id: u64,
    pub contract_address: Vec<u8>,
    pub token_id: Option<u64>,
}

/// Result of remote attestation verification.
#[derive(Clone, Debug)]
pub struct RemoteVerification {
    pub origin: ChainOrigin,
    pub verified: bool,
    pub remote_score: Option<u8>,
    pub proof: Vec<u8>,
}

/// Interface for verifying attestations from other chains.
pub trait RemoteVerifier {
    /// Verify that an asset attestation exists on the remote chain.
    fn verify_remote_attestation(
        &self,
        origin: &ChainOrigin,
        attestation_hash: &[u8; 32],
    ) -> Result<RemoteVerification, String>;

    /// List chains supported by this verifier.
    fn supported_chains(&self) -> Vec<ChainOrigin>;
}
