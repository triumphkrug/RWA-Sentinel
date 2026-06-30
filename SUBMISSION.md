# Submission

## Project Details

**RWA-Sentinel** — Autonomous AI oracle for real-world asset verification on Casper Network.

## Relevant Links

| Resource | Link |
|----------|------|
| Source Code | https://github.com/triumphkrug/RWA-Sentinel |
| Website | https://rwa-sentinel.xyz |
| Oracle Panel | https://rwa-sentinel.xyz/dashboard |
| API Endpoint | https://rwa-sentinel-api.onrender.com |
| Scoring Registry | [eac01f54...bd48c3](https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3) |
| Attestation Store | [53c9e877...dce8](https://testnet.cspr.live/contract/53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8) |
| Video Walkthrough | _TBD_ |

## Category

Agentic Infrastructure / DeFi Oracle

## Contributor

triumphkrug

## Description

RWA-Sentinel ingests off-chain asset data (invoices, trade receivables, real estate deeds), runs a 6-factor trust score algorithm, and publishes time-limited attestation NFTs to the Casper blockchain. The scoring pipeline uses document integrity verification, cross-referencing, amount plausibility, temporal analysis, and network reputation signals to produce a composite trust score (0-100). Assets above threshold get minted as CEP-78 attestation tokens with built-in TTL expiry.

## Deployed Contracts

| Contract | Hash |
|----------|------|
| Scoring Registry | `eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3` |
| Attestation Store | `53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8` |

## Stack

| Component | Tech |
|-----------|------|
| API Server | Node.js 20, Fastify, TypeScript |
| Contracts | Rust, casper-contract, CEP-78 |
| Frontend | React, Vite, Tailwind CSS |
| Database | PostgreSQL (Neon) |
| Infra | Vercel (static), Render (API) |
| Testing | vitest (90+) + cargo test (22) |
| CI | GitHub Actions |

## Checklist

- [x] Original work
- [x] Open-source on GitHub
- [x] Prototype on Casper testnet with on-chain transactions
- [x] README with architecture docs
- [x] Demo video — _TBD_
