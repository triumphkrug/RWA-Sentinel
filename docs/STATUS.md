# RWA-Sentinel — Project Status

> Current state of the system as of 2026-07-07. See [ROADMAP.md](../ROADMAP.md) for future plans.

## Deployment Summary

**6 smart contracts deployed** across 3 testnet accounts with **251+ on-chain transactions**.

| Contract | Hash | Status |
|---|---|---|
| Asset Registry | `eac01f54…bd48c3` | ✅ Live |
| Attestation Store (v2) | `cffc53be…46a5` | ✅ Live — security-patched |
| Governance DAO | `154d32b5…` | ✅ Live |
| Oracle Slashing | `d061c8eb…301d` | ✅ Live — redesigned register_oracle |
| KYC Gate | `6e0dd2dc…` | ✅ Live |
| Deposit Stake Session | session WASM | ✅ Ready |

## Security Fixes Applied

1. **Attestation Store — slash fund routing (A1)**: Slashed funds now remain in `stake_purse` instead of being transferred to the installer. Eliminates the unilateral-withdraw path.
2. **Attestation Store — dao_invalidate authentication**: Caller must be a registered oracle or installer. Prevents public address replay attacks.
3. **Oracle Slashing — register_oracle redesign**: Deposit-first pattern (session WASM → `register_oracle`) avoids cross-entity `URef` access-rights issues. Balance verification is fully on-chain.
4. **Oracle Slashing — named-key mismatch**: Fixed `report_count` → `report_counter` and added missing `fee_bps` named key.

## Known Phase 2 Items

These items are documented transparently and planned for Phase 2:

- **`withdraw_stake`** — Access control is correct (owner-only, capped to own stake), but doesn't transfer funds yet. Safe (no funds can be stolen), but withdrawal is non-functional. Requires contract upgrade.
- **`execute_proposal`** — Status updates work correctly. Extended action dispatch (cross-contract calls) planned for Phase 2 integration.
- **BLS on-chain verification** — Off-chain BLS12-381 threshold signatures are fully implemented with real cryptography. On-chain contract accepts single-oracle attestation; aggregated signature verification requires Casper runtime BLS precompile support.
- **KYC gate ↔ asset-registry integration** — Both contracts are deployed, but the `is_kyc_proved` call is not yet wired into asset registration. Requires upgrade deployment.
- **Install/upgrade cap** — Per-account install cap (~2 transactions) on Casper testnet limits contract upgrades. Workaround: fresh ed25519 accounts. Root cause not fully determined.

## Agent Pipeline

- **Real data adapters**: GLEIF LEI, CoinGecko, Companies House/OpenCorporates — live API calls, not mocks
- **Cross-reference integration**: Cross-ref checks now run before scoring; results feed into the `hasCrossRef` factor (weight 15%)
- **Merkle provenance**: SHA-256 Merkle root computed over each batch's factor/evidence hashes, stored on-chain
- **BLS consensus**: Real BLS12-381 sign/aggregate/pairing-verify via noble-curves library

## What's Real

| Component | Status |
|---|---|
| 6 smart contracts on testnet | ✅ Real, deployed, verifiable on explorer |
| 251+ testnet transactions | ✅ Real, with documented deploy hashes |
| BLS12-381 cryptography | ✅ Real (noble-curves library, not simulation) |
| GLEIF / CoinGecko / Companies House APIs | ✅ Real API calls to live services |
| Allium chain analytics | ✅ Real API with rate-limit handling |
| 6-factor scoring pipeline | ✅ Real weighted composite scoring |
| PostgreSQL persistence | ✅ Real (Neon), with in-memory fallback |
| Wallet connect (CSPR.click) | ✅ Real SDK integration |
| Phase 2 stubs in `contracts/stubs/` | 📋 Clearly labeled roadmap items |
