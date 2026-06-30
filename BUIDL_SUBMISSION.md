# RWA-Sentinel — BUIDL Submission

## Form Fields

| Field | Value |
|-------|-------|
| **BUIDL name** | RWA-Sentinel |
| **Logo** | Oracle shield with golden accents |
| **Category** | crypto/web3 |
| **GitHub** | https://github.com/triumphkrug/RWA-Sentinel |
| **Website** | https://rwa-sentinel.xyz |
| **Demo video** | _(pending)_ |
| **Social** | GitHub: https://github.com/triumphkrug |

---

## Vision (short)

Trust scores for off-chain assets, published on-chain as time-limited attestation NFTs. A verification oracle that doesn't need a committee.

## BUIDL Details

### The trust deficit in RWA tokenization

Real-world asset tokenization has a trust problem, and it's not technical — it's structural.

When a company wants to tokenize $2M in trade receivables, someone needs to verify those invoices are real. Today that means hiring an audit firm, waiting weeks, paying five figures, and trusting a single signature. The on-chain representation is only as trustworthy as that off-chain stamp.

The gap: there is no programmable, on-chain mechanism to continuously score and attest the quality of off-chain assets. Once an asset is tokenized, its trust score is frozen at minting time. Markets change. Issuers default. Documents expire. The token doesn't know.

### How RWA-Sentinel works

RWA-Sentinel is an autonomous scoring oracle. It ingests asset data, runs a multi-factor analysis pipeline, and publishes results as time-limited attestation NFTs on Casper Network.

**The 6-factor scoring model:**

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Issuer History | 20% | Track record of the entity issuing the asset |
| Document Integrity | 20% | SHA-256 verification, metadata consistency |
| Cross-Reference | 20% | Independent confirmation from external sources |
| Amount Plausibility | 15% | Statistical deviation from sector median |
| Temporal Consistency | 15% | Timeline coherence, expiry alignment |
| Network Reputation | 10% | On-chain reputation signals from prior interactions |

Each factor produces a score (0-100) with evidence strings. The weighted composite determines pass/fail against a configurable threshold (default: 60). Assets above threshold get minted as CEP-78 attestation NFTs with a built-in time-to-live. When TTL expires, the attestation is automatically invalidated — forcing periodic re-verification.

### Oracle Panel

The web interface provides five operational views:

1. **Overview** — aggregate stats (total scored, active attestations, average trust score, expired count) plus on-chain contract links and recent attestations table
2. **Pipeline** — real-time verification runner with step-by-step log output, batch metrics, and pipeline summary
3. **Attestations** — per-user attestation list with pass/fail badges, scores, and factor hashes
4. **Inspect** — full factor breakdown for any single asset: individual score bars, weight distribution, and evidence strings
5. **Operations** — revoke attestations (with on-chain audit trail), manual score override (with evidence), DAO governance voting on oracle parameters

### Smart contracts

Two contracts on Casper testnet:

**Scoring Registry** (`eac01f54...bd48c3`):
- Stores factor hashes, composite scores, and scoring metadata
- Indexed by invoice ID and public key
- Supports batch score submission

**Attestation Store** (`53c9e877...dce8`):
- Manages attestation NFT lifecycle (mint, expire, revoke)
- CEP-78 compatible token standard
- Time-limited validity with on-chain TTL enforcement
- Revocation flag preserves audit trail while invalidating the attestation

### Tech stack in detail

- **API**: Fastify (Node.js 20) with TypeScript. Endpoints for scoring, attestation queries, pipeline runs, and health checks. PostgreSQL on Neon with structured schema (scores, pipeline_runs, cache_entries tables)
- **Contracts**: Rust with casper-contract crate. CEP-78 events. Deployed via casper-client CLI
- **Frontend**: React 18 + Vite + Tailwind. Responsive design with white/blue/gold color scheme. Wallet integration for pipeline signing and attestation management
- **SDK**: TypeScript client (`ScoringClient`) with full API coverage. MCP server for tool-use agents (score, query, verify, inspect)
- **Testing**: 112 tests total — 90 vitest (API, scoring logic, pipeline) + 22 cargo test (contract entry points, state transitions)

### Data on-chain right now

- 90 scored assets across 6 asset types (invoices, trade receivables, real estate, supply chain, equipment leases, bonds)
- 28 pipeline runs with full metrics
- 2 deployed contracts with verified hashes
- Attestation status distribution: ~66% active, ~17% expired, ~17% revoked

### What separates this from existing oracles

Chainlink and other oracles focus on price feeds. They answer "what is ETH worth?" RWA-Sentinel answers "should you trust this invoice from Baltic Finance for $340,000?"

Price feeds are point-in-time snapshots. RWA-Sentinel attestations are time-bounded assessments that expire and require re-verification. The scoring model is transparent (every factor has a visible score and evidence string), not a black-box median.

The DAO governance layer means scoring parameters evolve through community consensus, not oracle operator decisions.

### Forward-looking

Multi-oracle consensus (3-of-5 independent agents scoring the same asset), real data source integrations (OpenCorporates, GLEIF), attestation secondary markets, and cross-chain bridging to EVM chains.
