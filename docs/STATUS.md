# RWA-Sentinel — Status & Roadmap

> Living document · Last updated 2026-07-07

## ✅ What's Live

**6 smart contracts deployed** across 3 testnet accounts with **251+ on-chain transactions**.

| Contract | Hash | Status |
|---|---|---|
| Asset Registry | `eac01f54…bd48c3` | ✅ Live |
| Attestation Store (v2) | `cffc53be…46a5` | ✅ Live — security-patched |
| Governance DAO | `154d32b5…` | ✅ Live |
| Oracle Slashing | `d061c8eb…301d` | ✅ Live — redesigned register_oracle |
| KYC Gate | `6e0dd2dc…` | ✅ Live |
| Deposit Stake Session | session WASM | ✅ Ready |

## ✅ Security Hardening (Applied)

1. **Attestation Store — slash fund routing**: Slashed funds remain in `stake_purse` — eliminates unilateral-withdraw path.
2. **Attestation Store — `dao_invalidate` auth**: Caller must be registered oracle or installer.
3. **Oracle Slashing — deposit-first registration**: Session WASM → `register_oracle` avoids cross-entity URef issues. Balance verification fully on-chain.
4. **Oracle Slashing — named-key alignment**: Fixed `report_count` → `report_counter`; added missing `fee_bps` named key.

## ✅ Verified Real (Not Simulated)

| Component | Evidence |
|---|---|
| 6 smart contracts on testnet | Deployed, verifiable on Casper explorer |
| 251+ testnet transactions | Documented deploy hashes |
| BLS12-381 cryptography | noble-curves library — real pairing verification |
| GLEIF / CoinGecko / Companies House APIs | Live API calls to production services |
| 6-factor scoring pipeline | Weighted composite scoring with real evaluators |
| PostgreSQL persistence | Neon serverless, with in-memory fallback |
| Wallet connect (CSPR.click) | SDK integration, light theme |

## 🗺️ Phase 2 Roadmap

These items are architecturally prepared and planned for the next development phase:

| Feature | Status | Notes |
|---|---|---|
| `withdraw_stake` fund transfer | Access control ✅, transfer pending | Owner-only, capped — safe by design. Requires contract upgrade. |
| `execute_proposal` action dispatch | Status tracking ✅, dispatch pending | Cross-contract action routing planned for Phase 2. |
| BLS on-chain aggregated verification | Off-chain ✅, on-chain pending | Requires Casper runtime BLS precompile support. |
| KYC gate ↔ asset-registry wiring | Both contracts ✅, integration pending | `is_kyc_proved` check ready to plug in on upgrade. |
| Multi-asset category scoring | Extension types defined in `contracts/extensions/` | Enum-driven: real estate, commodities, bonds, carbon credits, etc. |
| Oracle rotation & key management | Slashing infrastructure ✅ | Automated oracle set rotation with DAO governance. |

## Agent Pipeline

- **Real data adapters**: GLEIF LEI, CoinGecko, Companies House/OpenCorporates — live API calls
- **Cross-reference integration**: Cross-ref checks run before scoring; results feed into `hasCrossRef` factor (weight 15%)
- **Merkle provenance**: SHA-256 Merkle root computed over each batch's factor/evidence hashes, stored on-chain
- **BLS consensus**: Real BLS12-381 sign/aggregate/pairing-verify via noble-curves library
