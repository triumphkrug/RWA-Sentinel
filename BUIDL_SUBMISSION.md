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
| **Dashboard** | https://rwa-sentinel.xyz/dashboard |
| **Backend API** | https://rwa-sentinel-api.onrender.com |
| **Team** | triumphkrug |

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

RWA Sentinel replaces manual audits with an automated 6-factor AI scoring pipeline, on-chain attestation NFTs, and DAO governance — three capabilities no existing Casper-native system combines.

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

- **Oracle Panel:** [rwa-sentinel.xyz/dashboard](https://rwa-sentinel.xyz/dashboard) — real-time trust scores, active attestations, DAO vote panel
- **Smart Contracts on Casper testnet:**
  - asset-registry: [`eac01f54...`](https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3)
  - attestation-store: [`53c9e877...`](https://testnet.cspr.live/contract/53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust → WASM, Casper 2.x |
| Agent Pipeline | TypeScript, Node.js 20+ |
| Frontend | Next.js, Tailwind CSS (Vercel) |
| Backend API | Node.js / Express (Render) |
| SDK | TypeScript + MCP server |
| Testing | Jest + cargo test (23 contract tests) |
| CI/CD | GitHub Actions |

---

## What Makes It Unique

1. **Trust oracle, not price oracle** — RWA Sentinel attests to the *validity and trustworthiness* of underlying assets, not market price. No comparable system on Casper combines transparent scoring + expiring attestations + challenge-with-stake.

2. **Economic accountability** — Oracle operators stake CSPR. Misbehavior triggers on-chain slashing. This creates accountability that centralized custodians structurally cannot provide.

3. **Composable for DeFi** — Any lending protocol can call `is_valid(asset_id)` before accepting RWA collateral. The attestation NFT is the on-chain trust primitive that the ecosystem currently lacks.

4. **Fully autonomous** — No human in the scoring loop. The AI agent runs the pipeline end-to-end, publishes to chain,.
