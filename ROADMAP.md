# RWA-Sentinel — Roadmap

> Autonomous AI oracle for real-world asset verification on Casper Network

---

## Done (Hackathon Release)

- [x] 2 smart contracts on Casper testnet (Scoring Registry + Attestation Store)
- [x] Fastify API with PostgreSQL persistence (Neon)
- [x] 6-factor trust scoring pipeline with weighted composites
- [x] Time-limited attestation NFTs (CEP-78) with TTL expiry
- [x] Oracle Panel with pipeline runner, attestation viewer, factor inspector, operations
- [x] DAO governance stubs (vote on scoring parameters)
- [x] TypeScript SDK + MCP tool server
- [x] 112 tests passing (90 TS + 22 Rust)
- [x] CI/CD via GitHub Actions

## Phase 2 — Core Upgrades

- [ ] Oracle slashing with challenge period (48h dispute, severity levels)
- [ ] GovernanceDAO full implementation — proposal → voting → execution lifecycle
- [ ] BLS threshold oracle signatures (3-of-5 multi-oracle consensus)
- [ ] Real data adapters (GLEIF LEI, OpenCorporates, CoinGecko, property registries)
- [ ] On-chain data provenance with MerkleRoot of input data
- [ ] Soulbound attestation tokens (SBT) with DID-binding
- [ ] zkAttestation (Groth16) — prove score > threshold without revealing data
- [ ] Anomaly detection (time-series) — price feed manipulation alerts
- [ ] MCP server expansion to 15+ tools with push-subscriptions via WebSocket
- [ ] Attestation leasing — rent attestation NFTs for temporary access
- [ ] Demo/Real data toggle in portal

## Phase 3 — Advanced

- [ ] IoT oracle data feeds — BLS-signed sensor data (GPS, temperature, humidity)
- [ ] Healthcare ZK-attestation (HIPAA/GDPR compliance proofs)
- [ ] Full MPC oracle consensus (Shamir Secret Sharing for oracle keys)
- [ ] Cross-chain asset verification (RemoteVerifier trait)
- [ ] RWA risk heatmap — geographic risk visualization
- [ ] Oracle Sybil attack simulation
- [ ] DAO 51% attack testing
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

## Planned Infrastructure (stubs in codebase)

- `DataSource` trait — API/IoT/Manual adapter abstraction
- `AssetCategory` enum — extensible asset classifications
- `ConsensusConfig` struct — MPC-ready oracle parameters
- `RemoteVerifier` trait — cross-chain attestation interface
