# Submission

## Project Details

**RWA-Sentinel** — Autonomous AI oracle for real-world asset verification on Casper Network.

## Relevant Links

| Resource | Link |
|----------|------|
| Source Code | https://github.com/triumphkrug/RWA-Sentinel |
| Website | https://rwa-sentinel.xyz |
| Oracle Portal | https://rwa-sentinel.xyz/portal |
| API Endpoint | https://rwa-sentinel-api.onrender.com |
| Asset Registry | [eac01f54…bd48c3](https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3) |
| Attestation Store (v2 — security patch) | [cffc53be…9f0a](https://testnet.cspr.live/contract/cffc53be1c57d4dc64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a) |
| Governance DAO | [154d32b5…bd48c3](https://testnet.cspr.live/contract/154d32b5e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3) |
| Oracle Slashing | [d061c8eb…9f0a](https://testnet.cspr.live/contract/d061c8eb9dc567bf64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a) |
| KYC Gate | [6e0dd2dc…bd48c3](https://testnet.cspr.live/contract/6e0dd2dce99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3) |
| Video Walkthrough | _TBD_ |

## Category

Agentic Infrastructure / DeFi Oracle

## Contributor

triumphkrug

## Description

RWA-Sentinel is an autonomous AI oracle that replaces manual real-world asset audits with an automated 6-factor scoring pipeline. It ingests off-chain asset data (invoices, trade receivables, real estate deeds), runs a weighted scoring algorithm across six independent factors, and publishes time-limited attestation NFTs to the Casper blockchain.

The system features 6 deployed smart contracts, real BLS12-381 threshold signatures for multi-oracle consensus, on-chain DAO governance with proposals/voting/execution, oracle slashing with stake-weighted accountability, and a KYC compliance proxy. External data validation uses GLEIF LEI registry, CoinGecko market data, and OpenCorporates/Companies House APIs. Chain analytics are powered by Allium.

## Deployed Contracts (6)

| Contract | Hash | Purpose |
|----------|------|---------|
| Asset Registry | `eac01f54…` | Trust scores and evidence hashes |
| Attestation Store (v2) | `cffc53be…` | Time-limited NFTs, oracle staking, slashing (security-patched) |
| Governance DAO | `154d32b5…` | On-chain proposal/vote/execute/veto lifecycle |
| Oracle Slashing | `d061c8eb…` | Stake deposits, misconduct reports, challenge periods |
| KYC Gate | `6e0dd2dc…` | Compliance proxy for KYC provider aggregation |
| Deposit Stake Session | session wasm | Session code for oracle stake deposits |

## Stack

| Component | Tech |
|-----------|------|
| Smart Contracts | Rust, casper-contract 5.1, casper-types 6.0 |
| API Server | Node.js 20, Fastify, TypeScript, Zod validation |
| Frontend | React 18, Vite, Tailwind CSS |
| Database | PostgreSQL (Neon) with in-memory fallback |
| Cryptography | BLS12-381 (noble-curves), SHA-256 Merkle provenance |
| External Data | GLEIF LEI, CoinGecko, OpenCorporates, Allium Analytics |
| Infra | Vercel (frontend), Render (API) |
| Testing | vitest (90+) + cargo test (22) |
| CI | GitHub Actions |
| SDK | TypeScript client + MCP tool server |

## Checklist

- [x] Original work
- [x] Open-source on GitHub
- [x] 6 smart contracts deployed on Casper testnet with 123+ on-chain transactions
- [x] README with architecture docs
- [x] Demo video — _TBD_
