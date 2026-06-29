# RWA-Sentinel

**An Autonomous AI Oracle for Real-World Asset Verification on Casper Network**

---

## Abstract

RWA-Sentinel is a decentralized AI agent that bridges off-chain Real-World Assets (RWA) — such as invoices, trade receivables, and supply chain documents — with on-chain trust attestations. It autonomously collects, validates, scores, and publishes asset data to Casper Network smart contracts, producing time-limited attestation NFTs that DeFi protocols can consume as verified data feeds.

The system addresses a fundamental challenge in RWA tokenization: the oracle problem. Unlike traditional price-feed oracles, RWA-Sentinel operates as a _trust oracle_ — it does not provide pricing; instead, it attests to the validity and trustworthiness of underlying assets through multi-factor analysis.

## Table of Contents

- [Architecture](#architecture)
- [Pipeline](#pipeline)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Testing](#testing)
- [Technical Design](#technical-design)
- [License](#license)

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │            RWA-Sentinel              │
                    │                                      │
  External Data ──▶ │  Collector ─▶ Validator ─▶ Publisher  │ ──▶ Casper Network
                    │      │            │            │      │
                    │      ▼            ▼            ▼      │
                    │   Dedup +     Scoring +    Batch NFT   │
                    │   Hashing    Cross-Ref    Minting     │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  Fallback: Cache + Staleness  │    │
                    │  └──────────────────────────────┘    │
                    └─────────────────────────────────────┘
```

## Pipeline

The Sentinel agent follows a four-stage pipeline:

### 1. Collection (`agent/src/collector/`)

Ingests invoice data from external APIs or generates demo data for testing. Each invoice is hashed (SHA-256) for deduplication and later on-chain anchoring.

### 2. Validation (`agent/src/validator/`)

Scores each invoice against six weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Issuer History | 25% | Track record of the entity issuing the invoice |
| Debtor Rating | 20% | Payment reliability of the debtor |
| Amount Reasonableness | 15% | Whether the amount is within expected bounds |
| Time Validity | 15% | Freshness of issue date and proximity to due date |
| Detail Level | 10% | Completeness of line items and metadata |
| Cross-Reference | 15% | Corroboration against external sources |

A composite trust score (0–100) determines whether the asset passes the attestation threshold.

### 3. Publishing (`agent/src/publisher/`)

Approved attestations are submitted to Casper in batches via the `batch_attest` entry point on the `attestation-store` contract. Each batch produces a time-limited NFT that auto-invalidates after the configured validity window.

### 4. Fallback (`agent/src/fallback/`)

An in-memory cache stores recent scores for fast retrieval. A staleness detector monitors data age and triggers re-scoring when thresholds are exceeded.

## Smart Contracts

### Asset Registry (`contracts/asset-registry/`)

- `register_asset` — Register a new RWA with metadata
- `update_asset` — Update asset details after re-evaluation
- `get_asset` — Query asset by ID

### Attestation Store (`contracts/attestation-store/`)

- `batch_attest` — Submit a batch of scored attestations
- `get_attestation` — Query attestation by asset ID
- `challenge` — Challenge an existing attestation (rate-limited)
- `stake_oracle` — Stake CSPR as an oracle operator
- `slash_oracle` — Slash a misbehaving oracle's stake
- `dao_approve` — DAO governance approval for high-value attestations
- `invalidate_nft` — Revoke an attestation NFT

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Rust toolchain (for contract compilation)
- Casper node access (testnet or local NCTL)

### Installation

```bash
git clone https://github.com/triumphkrug/RWA-Sentinel.git
cd RWA-Sentinel

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run the agent
npm start
```

### Demo Mode

The agent runs in demo mode by default, generating synthetic invoices and scoring them locally without requiring a Casper node connection:

```bash
npm start
# [sentinel] Starting with chain=casper-test, batch=10
# [sentinel] Generated 10 demo invoices
# [sentinel] Collected 10 unique invoices
# [sentinel] Scored: 10/10 above threshold
# [sentinel] Pipeline complete. Cache size: 10
```

## Configuration

Configuration is validated at startup using [zod](https://zod.dev/). All values can be set via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_URL` | `https://node.integration.cspr.cloud/` | Casper node RPC URL |
| `CHAIN_NAME` | `casper-test` | Network chain name |
| `DEPLOYER_KEY_PATH` | `./keys/secret_key.pem` | Path to deployer's secret key |
| `BATCH_SIZE` | `10` | Maximum attestations per batch |
| `CHALLENGE_RATE_LIMIT` | `3` | Max challenges per block |
| `NFT_VALIDITY_HOURS` | `24` | Attestation NFT lifetime |
| `STALE_THRESHOLD_MINUTES` | `30` | Data staleness threshold |
| `DASHBOARD_PORT` | `3000` | Dashboard HTTP port |

## Testing

```bash
# Run all tests
npx jest

# Run unit tests only
npx jest tests/invoiceCollector.test.ts
npx jest tests/localScorer.test.ts

# Run integration tests
npx jest tests/integration/
```

## Technical Design

### Scoring Model

The local scorer implements a weighted factor analysis model. Each factor is independently evaluated and produces a score (0–100). The composite trust score is the weighted average across all factors. Factors are modular and can be extended by implementing the `FactorDefinition` interface.

### On-Chain Anchoring

Every scored invoice produces two deterministic hashes:
1. **Factors Hash** — SHA-256 of all factor names, scores, and weights
2. **Evidence Hash** — SHA-256 of `rawHash:factorsHash`

These hashes are stored on-chain via the attestation-store contract, providing an immutable audit trail without revealing sensitive invoice data.

### Staleness Detection

The agent tracks the last refresh timestamp for each data key. When a key's age exceeds the configurable threshold, it is flagged for re-collection and re-scoring. This ensures attestation freshness in volatile markets.

## Project Structure

```
RWA-Sentinel/
├── agent/src/
│   ├── collector/         # Invoice ingestion and dedup
│   ├── validator/         # Scoring and cross-reference
│   ├── publisher/         # Casper submission and NFT minting
│   ├── fallback/          # Cache and staleness detection
│   ├── config.ts          # Validated configuration
│   └── index.ts           # Entry point
├── contracts/
│   ├── asset-registry/    # RWA registration contract
│   └── attestation-store/ # Attestation and NFT contract
├── tests/                 # Unit and integration tests
└── docker-compose.yaml    # Container orchestration
```

## Casper Agentic Buildathon 2026

Built for the [Casper Agentic Buildathon](https://devfolio.co/casper-agentic-buildathon). Track: Agentic Infrastructure.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
