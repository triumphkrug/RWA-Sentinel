# RWA-Sentinel — Roadmap to Production

> Agentic AI oracle that verifies real-world assets and publishes trust scores as NFT attestations on Casper blockchain.

---

## Current State (Hackathon Prototype)

**Done:**
- [x] Project scaffold (Node.js/TypeScript, contracts, dashboard skeleton, CI)
- [x] Smart contracts: AssetRegistry + AttestationStore (Rust/Wasm)
- [x] Agent pipeline: Collector → LocalScorer → Publisher → FallbackCache
- [x] Invoice generator for demo data
- [x] Scoring factors: 6 weighted factors with configurable thresholds
- [x] Cross-reference checker + staleness detector
- [x] Batch NFT minter (local simulation)
- [x] Tests: 14/14 jest (collector, scorer, full pipeline)
- [x] CI/CD: GitHub Actions (eslint + jest)
- [x] README with abstract + architecture

**Not done:**
- [ ] Smart contracts not compiled / not deployed to testnet
- [ ] No on-chain integration (all is local simulation)
- [ ] Dashboard is skeleton HTML only
- [ ] No real data source integration (only generator)
- [ ] No landing page / demo video
- [ ] No MCP server

---

## Phase 1 — Hackathon Submission (Deadline: July 1, 2026)

### 1.1 Testnet Deployment
- [ ] Set up Casper 2.0 local dev environment (NCTL Docker)
- [ ] Compile AssetRegistry contract → Wasm
- [ ] Compile AttestationStore contract → Wasm
- [ ] Fix compilation issues with Casper 2.0 API
- [ ] Deploy both contracts to Casper Integration Testnet
- [ ] Run smoke test: register_asset → batch_attest → get_attestation
- [ ] Record deploy hashes for submission

### 1.2 On-Chain Integration
- [ ] Wire `casperPublisher.ts` to real Casper JS SDK (`casper-js-sdk`)
- [ ] Implement on-chain batch_attest (bundle up to 10 invoices per NFT)
- [ ] CEP-88 event listener via `casper-sidecar` for attestation confirmations
- [ ] Test full pipeline: generate invoices → score → publish → verify on-chain

### 1.3 Landing Page
- [ ] Single-page site: dark-blue theme, academic/enterprise aesthetic
- [ ] Live scoring demo: paste invoice JSON → get trust score + factor breakdown
- [ ] Architecture diagram (interactive SVG)
- [ ] Deploy to GitHub Pages

### 1.4 Demo Video
- [ ] Script: RWA problem → Sentinel solution → pipeline demo → on-chain proof
- [ ] Record 3-5 min video
- [ ] Upload to YouTube, add thumbnail + description

### 1.5 Submission Package
- [ ] DoraHacks submission text
- [ ] Logo (generated externally)
- [ ] Final README polish with testnet links

---

## Phase 2 — Post-Hackathon MVP (Weeks 1–6)

### 2.1 Smart Contract Hardening
- [ ] Full Rust integration test suite
- [ ] Challenge mechanism: rate-limited (3/asset/24h), counter-evidence hash
- [ ] Oracle staking and slashing logic
- [ ] DAO Light: 3 fixed oracles, 2-of-3 approval for high-value attestations
- [ ] NFT invalidation by timestamp (auto-expiry)
- [ ] Contract upgrade mechanism (CEP-86 factory)

### 2.2 Real Data Sources
- [ ] Invoice API connectors:
  - [ ] QuickBooks Online API
  - [ ] Xero API
  - [ ] FreshBooks API
  - [ ] CSV/PDF invoice import (OCR pipeline)
- [ ] Price feed oracles: Pyth Network, Chainlink CCIP
- [ ] Company registry: OpenCorporates API for debtor verification
- [ ] KYB data: Dun & Bradstreet or similar for business credit scores

### 2.3 AI Scoring Engine
- [ ] Replace hardcoded weights with ML model (logistic regression → gradient boosting)
- [ ] Training pipeline: historical invoice data → fraud/default labels
- [ ] Feature engineering: 20+ features from invoice + external data
- [ ] Model versioning: hash model weights for on-chain commitment
- [ ] Explainability: SHAP values per scoring factor
- [ ] A/B testing framework: compare scoring models on live data

### 2.4 Dashboard (Full)
- [ ] Invoice list: filterable, sortable, paginated
- [ ] Status badges: 🟢 Verified / 🟡 Pending / 🔴 Challenged / ⚪ Stale
- [ ] Attestation detail page: trust score chart, factor breakdown, on-chain proof link
- [ ] Oracle reputation table: stake, attestations count, slash history
- [ ] Real-time WebSocket updates for new attestations
- [ ] Export: CSV, PDF reports

### 2.5 Agent API
- [ ] REST API: `POST /api/v1/verify`, `GET /api/v1/attestation/:id`
- [ ] MCP Server: `verify_invoice`, `get_attestation`, `challenge_attestation`
- [ ] Webhook notifications: attestation created, challenged, invalidated
- [ ] Rate limiting: tiered by API key

### 2.6 Testing
- [ ] Contract integration tests on NCTL
- [ ] End-to-end: real invoice → score → on-chain attestation → verify
- [ ] Load test: 1000 invoices/batch scoring throughput
- [ ] Chaos: data source downtime → fallback cache behavior
- [ ] Coverage gate: ≥80%

---

## Phase 3 — Production Beta (Months 2–4)

### 3.1 Multi-Asset Support
- [ ] Invoice → Production ready (current focus)
- [ ] Real Estate: property deed verification, appraisal data
- [ ] Commodities: warehouse receipts, shipping manifests
- [ ] Financial Instruments: bond coupons, promissory notes
- [ ] Asset type plugin architecture: register new types without contract upgrade

### 3.2 Oracle Network
- [ ] Multi-oracle consensus: N-of-M oracles must agree on attestation
- [ ] Oracle registration portal: stake CSPR, provide credentials
- [ ] Reputation algorithm: weighted by accuracy, uptime, stake amount
- [ ] Slashing conditions: wrong attestation, downtime, collusion detection
- [ ] Oracle rewards: fee distribution from attestation charges

### 3.3 NFT Attestation Market
- [ ] CEP-78 compliant NFTs on Casper
- [ ] NFT metadata: full attestation details, scoring factors, evidence links
- [ ] NFT transfer: attestation follows asset ownership
- [ ] NFT marketplace integration: trade verified assets
- [ ] Batch NFT optimization: gas-efficient minting (up to 50 per batch)

### 3.4 Security
- [ ] Smart contract audit (external firm)
- [ ] Data validation: schema enforcement, input sanitization
- [ ] Encryption: sensitive invoice data encrypted at rest (AES-256)
- [ ] Access control: role-based (admin, oracle, verifier, viewer)
- [ ] Penetration testing on API endpoints

### 3.5 Infrastructure
- [ ] PostgreSQL: invoice history, attestation metadata, oracle registry
- [ ] Redis: caching, rate limiting, real-time pub/sub
- [ ] Message queue (RabbitMQ/NATS): pipeline stage orchestration
- [ ] Docker Compose: full stack (agent + dashboard + db + cache)
- [ ] Kubernetes Helm chart for production deployment

---

## Phase 4 — Commercial Launch (Months 4–8)

### 4.1 Business Model
- [ ] Pricing: Free (50 attestations/month), Pro ($99/mo, 5K), Enterprise (custom)
- [ ] Pay-per-attestation: $0.10 per invoice verified
- [ ] Oracle staking fees: 2% of attestation value
- [ ] White-label solution for banks and lending platforms

### 4.2 DeFi Integration
- [ ] Lending protocol: use attestation as collateral proof
- [ ] Invoice factoring: tokenized invoices backed by attestations
- [ ] Insurance: underwriting based on trust scores
- [ ] Yield: lending pools collateralized by verified RWAs

### 4.3 Mainnet Deployment
- [ ] Casper Mainnet deployment
- [ ] Contract versioning and migration path
- [ ] Production RPC cluster
- [ ] Monitoring: Grafana dashboards, PagerDuty alerts

### 4.4 Compliance
- [ ] SOC 2 Type II preparation
- [ ] GDPR compliance: data residency, right to erasure
- [ ] Invoice data handling: PCI DSS considerations
- [ ] Legal review: attestation as evidence in disputes

### 4.5 Developer Experience
- [ ] npm SDK: `npm install rwa-sentinel-sdk`
- [ ] Python SDK: `pip install rwa-sentinel`
- [ ] API documentation (OpenAPI auto-generated)
- [ ] Integration guides: Node.js, Python, Go
- [ ] Sandbox environment with demo data

---

## Phase 5 — Scale & Ecosystem (Months 8–12+)

### 5.1 Advanced AI
- [ ] Deep learning model: transformer-based invoice fraud detection
- [ ] Multi-modal: OCR + NLP for scanned invoice verification
- [ ] Anomaly detection: unsupervised learning for outlier invoices
- [ ] Cross-entity graph: network analysis for supply chain verification
- [ ] Federated learning: train models across oracles without sharing raw data

### 5.2 Cross-Chain
- [ ] EVM deployment (Ethereum, Polygon, Arbitrum)
- [ ] Solana deployment
- [ ] Cross-chain attestation relay: verify on chain A, use on chain B
- [ ] IBC bridge for Cosmos ecosystem

### 5.3 Enterprise Features
- [ ] Multi-tenant architecture: isolated data per client
- [ ] SSO/SAML integration
- [ ] Custom scoring models per client
- [ ] SLA guarantees: 99.95% uptime, <30s attestation time
- [ ] Dedicated oracle clusters for enterprise clients

### 5.4 Regulatory Oracle
- [ ] Regulatory data feeds: sanctions lists, PEP databases
- [ ] Automated compliance checks integrated into scoring
- [ ] Audit trail: immutable log of all scoring decisions
- [ ] Regulatory reporting: automated filings for financial institutions

---

## Key Metrics

| Metric | Hackathon | MVP | Production | Scale |
|--------|-----------|-----|------------|-------|
| Asset types | Invoice only | + Real Estate | + Commodities | All RWA |
| Data sources | Demo generator | 3 APIs | 10+ APIs | 50+ feeds |
| Oracle nodes | 1 (local) | 3 (DAO Light) | 10+ | 100+ |
| Attestations/month | demo | 5K | 100K | 1M+ |
| Scoring model | Rule-based | ML (GBM) | Deep learning | Federated |
| Test coverage | 70% | 80% | 90% | 95% |
