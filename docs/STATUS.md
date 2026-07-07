# RWA-Sentinel — Status & Roadmap

> Living document · Last updated 2026-07-07

## ✅ What's Live

**6 smart contracts deployed** across 4 testnet accounts with **338+ on-chain transactions**.

| Contract | Hash | Status |
|---|---|---|
| Asset Registry | `eac01f54…bd48c3` | ✅ Live |
| Attestation Store (v2) | `cffc53be…46a5` | ✅ Live — security-patched |
| Governance DAO v2 | `847a8016…c31138` | ✅ Live — vote params + register_voter + execute_proposal dispatch |
| Oracle Slashing v2 | `cf0e671c…9237df` | ✅ Live — EP name fixes + withdraw_stake transfer |
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
| 338+ testnet transactions | Documented deploy hashes |
| BLS12-381 cryptography | noble-curves library — real pairing verification |
| GLEIF / CoinGecko / Companies House APIs | Live API calls to production services |
| 6-factor scoring pipeline | Weighted composite scoring with real evaluators |
| PostgreSQL persistence | Neon serverless, with in-memory fallback |
| Wallet connect (CSPR.click) | SDK integration, light theme |
| KYC gate ↔ pipeline integration | On-chain KYC status check enriches scoring |
| Multi-asset category weights | 10 asset categories with tailored scoring profiles |
| Cross-chain bridge verification | Off-chain bridge logic for 3 EVM chains (Ethereum, Polygon, Arbitrum) |

## 🗺️ Phase 2 Roadmap

| Feature | Status | Notes |
|---|---|---|
| `withdraw_stake` fund transfer | ✅ **Deployed** | Real `transfer_from_purse_to_account` + `total_staked` sync (v2) |
| `execute_proposal` action dispatch | ✅ **Deployed** | Dispatches `ACTION_UPDATE_THRESHOLD` → updates `price_bps` (v2) |
| `register_voter` + real stake tracking | ✅ **Deployed** | `voter_stakes` dict + `total_staked` named key (v2) |
| KYC gate ↔ pipeline integration | ✅ **Integrated** | Pipeline checks on-chain `kyc_registry` dict via CSPR.cloud, applies trust score bonus/penalty |
| Multi-asset category scoring | ✅ **Integrated** | TS types mirror Rust `extensions/` crate; 10 categories with tailored weight profiles |
| Cross-chain RWA bridge | ✅ **Code ready** | Off-chain verification for Ethereum/Polygon/Arbitrum; on-chain bridge contract planned Phase 3 |
| BLS on-chain aggregated verification | ✅ **Off-chain complete** | 311-line real BLS12-381 implementation; on-chain requires Casper runtime precompile (tracked upstream) |
| zkSNARK attestation proofs (Groth16) | 🔧 **Architecture designed** | Circuit spec for attestation hash verification defined; snarkjs integration planned Phase 3 |
| Oracle rotation & key management | ✅ **Infrastructure ready** | Slashing + DAO governance deployed; automated rotation next phase |

## Phase 3 Targets

| Feature | Dependency |
|---|---|
| On-chain BLS signature verification | Casper runtime BLS12-381 precompile |
| zkSNARK (Groth16) proof generation & on-chain verification | circom circuit compilation + trusted setup |
| Cross-chain bridge smart contract | Bridge contract deployment on Casper + EVM |
| IoT device attestation | `extensions/data_source.rs` IoT types + device SDK |
| DID-based oracle identity | W3C DID registry integration |

## Agent Pipeline

- **Real data adapters**: GLEIF LEI, CoinGecko, Companies House/OpenCorporates — live API calls
- **Cross-reference integration**: Cross-ref checks run before scoring; results feed into `hasCrossRef` factor (weight 15%)
- **Merkle provenance**: SHA-256 Merkle root computed over each batch's factor/evidence hashes, stored on-chain
- **BLS consensus**: Real BLS12-381 sign/aggregate/pairing-verify via noble-curves library
- **KYC gate**: Pipeline queries on-chain KYC registry; verified submitters get +15 trust score bonus
- **Asset categories**: Category-aware scoring weights (e.g., bonds emphasize debtor rating 30%, real estate emphasizes valuation 25%)
- **Cross-chain bridge**: Off-chain EVM attestation verification with proof hash generation
