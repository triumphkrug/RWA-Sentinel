# Technical Notes — Casper Testnet Deployment

## Install/Upgrade Behavior on Casper 2.x Testnet

During development, two technical issues were identified and resolved regarding contract deployment on Casper testnet via `casper-js-sdk@5.0.12`.

### Issue 1: `CLType::Any` Entry Point Return Types

Contracts declaring entry points with `CLType::Any` as return type are rejected immediately by the Casper node with `ApiError::InvalidArgument [3]`. This affects `asset-registry::get_asset` and `attestation-store` entry points.

**Resolution**: Replace `CLType::Any` with `CLType::String` (JSON-serialized return). Applied in source; deployed via fresh accounts.

### Issue 2: Per-Account Install Cap

Casper testnet appears to enforce a per-account cap of ~2 install/upgrade-lane transactions. After 2 successful installs from the same account, subsequent attempts fail with `ApiError::InvalidArgument [3]` regardless of gas, WASM size, or entry point configuration.

**Resolution**: Use fresh ed25519 accounts for additional deployments. Three accounts were used across the 6 contract deployments:
- Main secp256k1 account: asset-registry, governance-dao
- 2nd ed25519 account: attestation-store (v2), kyc-gate
- 3rd ed25519 account: oracle-slashing

### WASM Size Optimization

All contracts compiled with `wasm-opt -Oz` to stay under 64 KB, avoiding known issues with larger install transactions on testnet.

### casper-js-sdk 5.0.12 Notes

- CJS `require()` only — ESM import not supported
- `queryLatestBalance` has a serialization bug — use raw RPC `query_balance` endpoint instead
- Transaction construction requires explicit `PricingMode.Fixed` with `additionalComputationFactor: 0`
