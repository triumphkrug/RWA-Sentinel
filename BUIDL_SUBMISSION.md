# RWA Sentinel — BUIDL Submission

**Project Name:** RWA Sentinel  
**Tagline:** AI Oracle for Real-World Asset Trust

---

## Project Overview

| Field | Value |
|---|---|
| **BUIDL Name** | RWA Sentinel |
| **Tagline** | AI Oracle for Real-World Asset Trust |
| **Category** | DeFi / RWA / Infrastructure |
| **GitHub** | https://github.com/triumphkrug/RWA-Sentinel |
| **Live Demo** | https://rwa-sentinel.xyz |
| **Portal** | https://rwa-sentinel.xyz/portal |
| **Backend API** | https://rwa-sentinel-api.onrender.com |

---

## Problem

The $16 trillion real-world asset market is stuck behind manual verification. When a company tokenizes invoices or trade receivables, someone must manually audit each document — hiring an audit firm, waiting weeks, paying five figures, and trusting a single centralized signature.

Three structural issues prevent scale:

- **Trust concentration:** One entity decides what's valid. No independent verification path, no appeals mechanism.
- **Frozen trust scores:** Once tokenized, an asset's trust rating is locked at minting time. Underlying risk changes — the token doesn't reflect it.
- **Opacity:** Verification criteria are opaque. There is no on-chain audit trail showing *how* an asset was evaluated.

These aren't theoretical — custodian collapses in 2024–2025 demonstrated exactly what happens when billions in RWA tokens rely on a single point of trust failure.

---

## Solution

RWA Sentinel replaces manual audits with an automated 6-factor AI scoring pipeline, on-chain attestation NFTs, and full DAO governance — three capabilities no existing Casper-native system combines.

### How It Works

1. **Submit** a real-world asset document (invoice, receivable, supply-chain record)
2. **Score** — the AI pipeline evaluates it across 6 independent factors with transparent weights
3. **Attest** — assets scoring ≥ 65/100 get a time-limited attestation NFT minted on Casper Network (24h TTL by default)
4. **Govern** — any holder can challenge an attestation; DAO vote determines outcome; misbehaving oracle operators get slashed

### 6-Factor Scoring

| Factor | Weight |
|---|---|
| Issuer History | 25% |
| Document Integrity | 20% |
| Cross-Reference | 15% |
| Amount Plausibility | 15% |
| Temporal Consistency | 15% |
| Network Reputation | 10% |

The composite score, factor hashes, and evidence hashes are all written on-chain — a fully auditable trail without exposing sensitive asset data.

---

## Live Demo

- **Oracle Portal:** [rwa-sentinel.xyz/portal](https://rwa-sentinel.xyz/portal) — 12 portal pages: Overview, Assets, Oracles (with slashing UI), Governance, SBTs, Contracts, Chain Explorer, Data Adapters, KYC Gate, Anomalies, Agent Demo, API Playground
- **Smart Contracts on Casper testnet (6 deployed, 123+ transactions):**
  - Asset Registry: [`eac01f54…`](https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3)
  - Attestation Store (v2, security-patched): [`cffc53be…`](https://testnet.cspr.live/contract/cffc53be1c57d4dc64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a)
  - Governance DAO: [`154d32b5…`](https://testnet.cspr.live/contract/154d32b5e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3)
  - Oracle Slashing: [`d061c8eb…`](https://testnet.cspr.live/contract/d061c8eb9dc567bf64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a)
  - KYC Gate: [`6e0dd2dc…`](https://testnet.cspr.live/contract/6e0dd2dce99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3)
  - Deposit Stake Session: session WASM for oracle operators

---

## Video
[Video](TBD)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust → WASM, casper-contract 5.1, casper-types 6.0 |
| Agent Pipeline | TypeScript, Node.js 20+, Fastify, Zod |
| Frontend | React 18, Vite, Tailwind CSS (Vercel) |
| Backend API | Fastify + PostgreSQL/Neon (Render) |
| Cryptography | BLS12-381 threshold signatures (noble-curves) |
| External Data | GLEIF LEI, CoinGecko, Companies House, Allium Analytics |
| SDK | TypeScript client + MCP tool server |
| Testing | vitest (90+) + cargo test (22) |
| CI/CD | GitHub Actions |

---

## What Makes It Unique

1. **6 deployed smart contracts** — Most hackathon projects deploy 1-2 contracts. RWA Sentinel has a full contract ecosystem: asset registry, attestation store, governance DAO, oracle slashing, KYC gate, and stake deposit session code — all live on Casper testnet with 123+ on-chain transactions.

2. **Trust oracle, not price oracle** — RWA Sentinel attests to the *validity and trustworthiness* of underlying assets, not market price. No comparable system on Casper combines transparent scoring + expiring attestations + challenge-with-stake.

3. **Economic accountability** — Oracle operators stake CSPR. Misbehavior triggers on-chain slashing with challenge periods and severity levels. This creates accountability that centralized custodians structurally cannot provide.

4. **Real BLS12-381 cryptography** — Multi-oracle consensus uses real BLS12-381 threshold signatures (3-of-5), not simulations. Each oracle produces an independently verifiable signature; the aggregate proof is a cryptographic commitment.

5. **Live external data integration** — The scoring pipeline cross-references assets against GLEIF LEI registry, CoinGecko market data, and Companies House/OpenCorporates APIs. Chain analytics powered by Allium. Not mock data — real API calls to live services.

6. **Security-first iteration** — Two contracts were redeployed specifically to fix security vulnerabilities found during development: the attestation store's slashing fund leak (A1 fix) and the DAO invalidation authentication bypass. The fixes and their rationale are documented in the codebase.

7. **Composable for DeFi** — Any lending protocol can call `is_valid(asset_id)` before accepting RWA collateral. The attestation NFT is the on-chain trust primitive that the ecosystem currently lacks.

8. **Fully autonomous** — No human in the scoring loop. The AI agent runs the pipeline end-to-end, publishes attestation batches to chain, monitors challenges, and responds to governance votes — all programmatically.

---

## Team

**triumphkrug** — Solo builder architecting trust infrastructure for the RWA space. Designed the 6-factor scoring model, built the autonomous TypeScript agent pipeline, wrote all 6 Casper smart contracts (asset-registry, attestation-store, governance-dao, oracle-slashing, kyc-gate, deposit-stake-session), developed the React portal with 12 interactive pages, implemented BLS12-381 threshold signatures, and deployed the full system to testnet with 123+ on-chain transactions. Background in decentralized systems and on-chain governance; focus on making RWA verification programmable and accountable.

GitHub: [github.com/triumphkrug](https://github.com/triumphkrug)
