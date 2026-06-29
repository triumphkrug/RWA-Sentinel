# RWA-Sentinel

**An Autonomous AI Oracle for Real-World Asset Verification on Casper Network**

---

| | |
|---|---|
| ![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg) | Licensed under Apache 2.0 |
| ![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-green.svg) | Requires Node.js 20+ |
| ![Casper](https://img.shields.io/badge/Casper-2.x_(Zug_Consensus)-red.svg) | Casper 2.x with Zug |
| ![Tests](https://img.shields.io/badge/Jest-passing-brightgreen.svg) | Unit and integration tests |

## Abstract

RWA-Sentinel is a decentralized AI agent that bridges off-chain Real-World Assets (RWA) — such as invoices, trade receivables, and supply chain documents — with on-chain trust attestations. It autonomously collects, validates, scores, and publishes asset data to Casper Network smart contracts, producing time-limited attestation NFTs that DeFi protocols can consume as verified data feeds.

The system addresses a fundamental challenge in RWA tokenization: **the oracle problem**. Unlike traditional price-feed oracles, RWA-Sentinel operates as a _trust oracle_. It does not provide pricing; instead, it attests to the validity and trustworthiness of underlying assets through multi-factor analysis.

## Problem Statement

Current RWA tokenization relies on centralized custodians or manual verification processes. This creates three critical issues:

1. **Trust Concentration** — a single entity decides which assets are valid
2. **Latency** — manual review introduces hours-to-days delays
3. **Opacity** — verification criteria are often opaque to token holders

## Solution

RWA-Sentinel introduces a decentralized trust attestation pipeline:

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

Each attestation carries an expiration timestamp. DeFi protocols can query whether an attestation is still valid before allowing collateral operations.

## Pipeline

The Sentinel agent follows a four-stage pipeline:

### Stage 1: Collection (`agent/src/collector/`)

Ingests invoice data from external APIs or generates demo data for testing. Each invoice is hashed (SHA-256) for deduplication and later on-chain anchoring.

### Stage 2: Validation (`agent/src/validator/`)

Scores each invoice against six weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Issuer History | 25% | Track record of the invoicing entity |
| Debtor Rating | 20% | Payment reliability of the debtor |
| Amount Reasonableness | 15% | Whether the amount falls within expected bounds |
| Time Validity | 15% | Freshness of issue date and proximity to due date |
| Detail Level | 10% | Completeness of line items and metadata |
| Cross-Reference | 15% | Corroboration against external data sources |

A composite trust score S ∈ [0, 100] is computed as the weighted average. Assets where S ≥ threshold (default: 65) proceed to Stage 3.

### Stage 3: Publishing (`agent/src/publisher/`)

Approved attestations are submitted to Casper in batches via `batch_attest`. Each batch produces a time-limited NFT that auto-invalidates after the configured validity window (default: 24h).

### Stage 4: Fallback (`agent/src/fallback/`)

An in-memory cache stores recent scores for fast retrieval. A staleness detector monitors data age and triggers re-scoring when thresholds are exceeded.

## Smart Contracts

### Asset Registry (`contracts/asset-registry/`)

| Entry Point | Parameters | Description |
|-------------|-----------|-------------|
| `register_asset` | owner, asset_type, metadata_hash | Register a new RWA with metadata |
| `update_asset` | asset_id, new_metadata_hash | Update asset details (owner only) |
| `get_asset` | asset_id | Query asset record by ID |

### Attestation Store (`contracts/attestation-store/`)

| Entry Point | Parameters | Description |
|-------------|-----------|-------------|
| `batch_attest` | asset_ids, trust_scores, evidence_hashes, ... | Submit a batch of scored attestations |
| `get_attestation` | asset_id | Query attestation by asset ID |
| `challenge` | asset_id, counter_evidence_hash | Challenge an existing attestation |
| `stake_oracle` | source_purse, amount | Stake CSPR as an oracle operator |
| `slash_oracle` | oracle | Slash a misbehaving oracle's stake |
| `dao_approve` | asset_id, oracle_sigs | DAO governance approval for challenges |
| `invalidate_nft` | batch_id | Revoke an attestation NFT |

## Getting Started

### Prerequisites

- Node.js ≥ 20 and npm
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

The agent runs in demo mode by default, generating synthetic invoices and scoring them locally:

```bash
npm start
# [sentinel] Starting with chain=casper-test, batch=10
# [sentinel] Generated 10 demo invoices
# [sentinel] Collected 10 unique invoices
# [sentinel] Scored: 10/10 above threshold
# [sentinel] Pipeline complete. Cache size: 10
```

### Docker

```bash
cp .env.example .env
docker-compose up
# Agent + dashboard available at http://localhost:3000
```

## Configuration

All values are set via environment variables (validated with [zod](https://zod.dev/)):

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_URL` | `https://node.integration.cspr.cloud/` | Casper node RPC endpoint |
| `CHAIN_NAME` | `casper-test` | Network chain name |
| `DEPLOYER_KEY_PATH` | `./keys/secret_key.pem` | Path to deployer secret key |
| `BATCH_SIZE` | `10` | Maximum attestations per batch |
| `CHALLENGE_RATE_LIMIT` | `3` | Max challenges per block |
| `NFT_VALIDITY_HOURS` | `24` | Attestation NFT lifetime (hours) |
| `STALE_THRESHOLD_MINUTES` | `30` | Data staleness threshold |
| `DASHBOARD_PORT` | `3000` | Dashboard HTTP port |

## Testing

```bash
# All tests
npx jest

# Unit tests
npx jest tests/invoiceCollector.test.ts
npx jest tests/localScorer.test.ts

# Integration tests
npx jest tests/integration/

# Contract tests
cd contracts/tests && cargo test
```

## Technical Design

### Scoring Model

The local scorer implements a weighted factor analysis model. Each factor independently evaluates the asset and produces a score in [0, 100]. The composite trust score is:

```
S = Σ(w_i × s_i) / Σ(w_i)
```

where `w_i` is the weight and `s_i` is the individual factor score. Factors are modular; new factors can be added by implementing the `FactorDefinition` interface.

### On-Chain Anchoring

Every scored asset produces two deterministic hashes:

1. **Factors Hash** — `SHA-256(factor_names || scores || weights)`
2. **Evidence Hash** — `SHA-256(rawHash || factorsHash)`

These hashes are stored on-chain via the attestation-store contract, providing an immutable audit trail without revealing sensitive asset data.

### Staleness Detection

The agent tracks the last refresh timestamp for each data key. When a key's age exceeds the configurable threshold, it is flagged for re-collection and re-scoring. This mechanism ensures attestation freshness in volatile markets.

## Project Structure

```
RWA-Sentinel/
├── agent/src/
│   ├── collector/         # Invoice ingestion and dedup
│   ├── validator/         # Scoring engine and cross-reference
│   ├── publisher/         # Casper submission and NFT minting
│   ├── fallback/          # Cache and staleness detection
│   ├── config.ts          # Validated configuration
│   └── index.ts           # Pipeline entry point
├── contracts/
│   ├── asset-registry/    # RWA registration contract
│   └── attestation-store/ # Attestation, staking, DAO contract
├── dashboard/             # Express.js monitoring dashboard
├── tests/                 # Unit and integration tests
├── landing/               # Project landing page
├── docs/                  # Architecture and deployment docs
└── docker-compose.yaml    # Container orchestration
```

## References

- Casper Network 2.x Documentation: https://docs.casper.network/
- CEP-88 Native Events: https://github.com/casper-network/ceps/blob/master/text/0088-native-events.md


## Context

This project was submitted to the [Casper Friendly Buildathon](https://dorahacks.io/hackathon/casper-the-friendly-buildathon) (2026 cohort) under the Agentic Infrastructure track.

## License

Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) for details.
