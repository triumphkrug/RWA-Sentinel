/**
 * DID-binding for attestations (B5 - SoulboundAttestation, application
 * layer half).
 *
 * Derives a deterministic, W3C `did:key`-shaped identifier for the entity
 * an attestation is bound to. This is the off-chain/application-layer
 * half of "SoulboundAttestation with DID-binding": each attestation
 * record carries a holder DID and there is no endpoint anywhere in this
 * API that reassigns or transfers an attestation's holder - the same
 * non-transferability property a real on-chain soulbound token would
 * enforce, just not yet encoded as an explicit owner field inside the
 * attestation-store contract itself.
 *
 * Full on-chain enforcement (the contract storing a holder/DID field per
 * attestation and rejecting any transfer at the entry-point level, not
 * just "no such entry point exists") requires adding that field to
 * batch_attest's on-chain record and redeploying the contract - blocked
 * by the same unresolved WASM-install ApiError::InvalidArgument issue
 * noted in the A2/A3 session notes and the F6/F7 compliance-audit
 * findings. This module and the DB column below are the concrete,
 * shippable part of B5 given that constraint, not a substitute for it.
 */
import { createHash } from 'node:crypto';

/**
 * Derives a stable did:key-shaped identifier from an entity name.
 * NOT a real cryptographic did:key (which multibase-encodes an actual
 * public key) - this derives a deterministic identifier from a hash of the
 * entity name, sufficient to give each attestation a unique, stable,
 * non-forgeable-looking holder identifier for the demo, clearly documented
 * as such rather than presented as a real resolvable DID document.
 */
export function deriveHolderDid(entityName: string): string {
  const hash = createHash('sha256').update(`rwa-sentinel-holder:${entityName}`).digest();
  // Base58check-like encoding kept simple (hex) rather than pulling in a
  // full base58 dependency for a demo identifier - the did:key prefix and
  // hash are the meaningful, real, deterministic parts.
  return `did:key:z${hash.toString('hex').slice(0, 40)}`;
}
