# RWA-Sentinel — Roadmap

> Autonomous AI oracle for real-world asset verification on Casper Network

---

## Done (Hackathon Release)

- [x] 6 smart contracts deployed on Casper testnet (251+ transactions)
  - Asset Registry — trust scores and evidence hashes
  - Attestation Store (v2) — time-limited NFTs with oracle staking and slashing (security-patched: A1 slash fund fix + caller auth on dao_invalidate)
  - Governance DAO — on-chain proposals, weighted voting, veto mechanism
  - Oracle Slashing — stake deposits, misconduct reports, challenge periods, severity levels
  - KYC Gate — compliance proxy for KYC provider aggregation (casper-ecosystem reference pattern)
  - Deposit Stake Session — session code for oracle operators
- [x] Fastify API with PostgreSQL persistence (Neon) and in-memory fallback
- [x] 6-factor trust scoring pipeline with weighted composites and cross-reference integration
- [x] Time-limited attestation NFTs with TTL expiry
- [x] Oracle Portal — 12 pages: Overview, Assets, Oracles (with slashing UI), Governance, SBTs, Contracts, Chain Explorer, Data Adapters, KYC Gate, Anomalies, Agent Demo, API Playground
- [x] BLS12-381 threshold oracle signatures (3-of-5 multi-oracle consensus) — real cryptography via noble-curves with pairing verification
- [x] Real data adapters (GLEIF LEI, CoinGecko, Companies House/OpenCorporates) wired into scoring pipeline
- [x] On-chain data provenance with SHA-256 Merkle root of input data
- [x] Allium chain analytics with rate-limit retry and 30min caching
- [x] DAO governance — full proposal → voting → execution → veto lifecycle
- [x] Oracle slashing — stake-weighted accountability with challenge periods
- [x] TypeScript SDK + MCP tool server
- [x] Wallet connect via CSPR.click (Casper Wallet, Ledger, MetaMask Snap)
- [x] 112 tests passing (90 TS + 22 Rust)
- [x] CI/CD via GitHub Actions

## Phase 2 — Core Upgrades

- [ ] Wire BLS threshold signature verification into the on-chain attestation-store contract (requires Casper runtime BLS precompile support)
- [ ] KYC gate ↔ asset-registry integration (requires contract upgrade deployment)
- [ ] `withdraw_stake` — add `transfer_from_purse` for actual fund withdrawal
- [ ] `execute_proposal` — extended action dispatch (cross-contract calls based on action_type)
- [ ] Soulbound attestation tokens (SBT) with DID-binding
- [ ] zkAttestation (Groth16) — prove score > threshold without revealing data
- [ ] Anomaly detection (time-series) — price feed manipulation alerts
- [ ] MCP server expansion to 15+ tools with push-subscriptions via WebSocket
- [ ] Attestation leasing — rent attestation NFTs for temporary access
- [ ] Rate limiting and API authentication for public endpoints

## Phase 3 — Advanced

- [ ] IoT oracle data feeds — BLS-signed sensor data (GPS, temperature, humidity)
- [ ] Healthcare ZK-attestation (HIPAA/GDPR compliance proofs)
- [ ] Full MPC oracle consensus (Shamir Secret Sharing for oracle keys)
- [ ] Cross-chain asset verification (RemoteVerifier trait)
- [ ] RWA risk heatmap — geographic risk visualization
- [ ] Property-based testing (fast-check) with oracle invariants

## Phase 4 — Mainnet & Ecosystem

- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Integration with RWA protocols (Centrifuge, Goldfinch)
- [ ] Cross-chain attestation bridging
- [ ] MiCA compliance report
- [ ] Formal verification (TLA+ specification for oracle consensus)
- [ ] Multi-asset class support (equities, commodities, carbon credits)
- [ ] Insurance pool for attestation failures

## Extensibility Points

- `DataSource` trait — API/IoT/Manual adapter abstraction
- `AssetCategory` enum — extensible asset classifications
- `ConsensusConfig` struct — MPC-ready oracle parameters
- `RemoteVerifier` trait — cross-chain attestation interface
- Phase 2 stub contracts in `contracts/stubs/` — ready for implementation
