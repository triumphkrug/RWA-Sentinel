# Submission

## Project

**RWA-Sentinel** — Autonomous AI Oracle for Real-World Asset Verification on Casper Network

## Links

| Item | URL |
|------|-----|
| GitHub | https://github.com/triumphkrug/RWA-Sentinel |
| Demo Video | _pending_ |
| Landing Page | _pending_ |
| Testnet Contract | _pending_ |
| Casper Explorer TX | _pending_ |

## Track

Agentic Infrastructure

## Team

Solo developer: triumphkrug

## Summary

RWA-Sentinel is a decentralized AI agent that bridges off-chain Real-World Assets with on-chain trust attestations. It autonomously collects, validates, scores, and publishes asset data to Casper smart contracts, producing time-limited attestation NFTs. The system operates as a trust oracle, attesting to asset validity through a six-factor weighted analysis model, with DAO governance for dispute resolution.

## On-Chain Components

- `asset-registry.wasm` — RWA registration and metadata management
- `attestation-store.wasm` — Attestation, staking, slashing, DAO governance, NFT lifecycle

## Tech Stack

- TypeScript/Node.js (agent pipeline, dashboard)
- Rust (Casper smart contracts)
- Zod (configuration validation)
