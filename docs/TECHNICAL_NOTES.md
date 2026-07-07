# Technical Notes — Casper Testnet

## Entry Point Return Types

Casper nodes reject entry points declaring `CLType::Any`. All contracts use `CLType::String` (JSON-serialized) for return values instead.

## Multi-Account Deployment

Casper testnet enforces a per-account cap of ~2 install-lane transactions. Four accounts are used across the 6 contracts:

- **Main (secp256k1)**: asset-registry
- **2nd (ed25519)**: attestation-store v2, kyc-gate
- **3rd (ed25519)**: governance-dao v2
- **4th (ed25519)**: oracle-slashing v2

## WASM Optimization

All contracts compiled with `wasm-opt -Oz` to stay under 64 KB, ensuring reliable install transactions on testnet.

## casper-js-sdk 5.0.12

- CJS `require()` only — ESM import not supported
- Transaction construction requires explicit `PricingMode.Fixed` with `additionalComputationFactor: 0`
- `queryLatestBalance` has a serialization issue — raw RPC `query_balance` used instead
