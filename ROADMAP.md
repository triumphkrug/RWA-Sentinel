# RWA-Sentinel — Roadmap

> Autonomous AI oracle for real-world asset verification

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

## Next — Post-Hackathon

- [ ] Real data source adapters (OpenCorporates, GLEIF, trade finance APIs)
- [ ] Multi-oracle consensus (3-of-5 independent scoring agents)
- [ ] Attestation marketplace (secondary market for trust scores)
- [ ] Historical score charts and trend analysis
- [ ] Webhook notifications on score changes

## Later — Mainnet

- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Integration with existing RWA protocols (Centrifuge, Goldfinch)
- [ ] Cross-chain attestation bridging
- [ ] Regulatory reporting module (MiCA compliance)

## Vision

- [ ] Interoperable trust score standard across chains
- [ ] Insurance pool for attestation failures
- [ ] Multi-asset class support (equities, commodities, carbon credits)
