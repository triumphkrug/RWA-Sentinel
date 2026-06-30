# Video Walkthrough Script

Target length: 2:00–2:30

## Pre-recording checklist

- rwa-sentinel.xyz open in Chrome
- Backend running (rwa-sentinel-api.onrender.com)
- Casper testnet explorer tab ready

## Intro (0:00–0:12)

[SCREEN: rwa-sentinel.xyz landing page, hero with oracle mascot]
"Real-world assets — invoices, bonds, trade receivables — they all need trust verification before going on-chain. RWA-Sentinel does that automatically."

## The Problem (0:12–0:25)

[SCREEN: scroll to Problem section on landing]
"Today, RWA tokenization is stuck behind manual audits. Slow, expensive, and centralized. One firm signs off, everyone trusts it. That's not how decentralized finance should work."

## Pipeline Overview (0:25–0:50)

[SCREEN: scroll to Pipeline section]
"RWA-Sentinel runs a 6-factor scoring pipeline. Each asset gets analyzed across issuer history, document integrity, cross-referencing, amount plausibility, temporal consistency, and network reputation. The weighted composite score determines if the asset gets an on-chain attestation."

## Oracle Panel Demo (0:50–1:25)

[SCREEN: navigate to /dashboard]
"This is the Oracle Panel. Overview shows total scored assets, active attestations, average trust score, and expired records."

[SCREEN: click Pipeline tab, run pipeline]
"Hit 'Run Pipeline' and watch the verification process in real time. Ingestion, deduplication, 6-factor scoring, cross-reference check, batch attestation minting."

[SCREEN: click Attestations tab]
"Each scored asset shows its composite trust score, pass/fail status, and on-chain factor hashes."

[SCREEN: click Inspect tab, enter an invoice ID]
"You can inspect any asset — full factor breakdown with individual scores, weights, and evidence strings."

[SCREEN: click Operations tab]
"New in this release: revoke attestations, manually override scores with evidence, and DAO governance voting on oracle parameters."

## Smart Contracts (1:25–1:45)

[SCREEN: click contract link in Overview, open Casper Explorer]
"Two contracts live on Casper testnet. The Scoring Registry stores factor hashes and composite scores. The Attestation Store manages NFT lifecycle — minting, TTL expiry, and revocation."

## SDK (1:45–1:55)

[SCREEN: show terminal with SDK usage snippet]
```typescript
import { ScoringClient } from 'rwa-sentinel-sdk';
const client = new ScoringClient({ nodeUrl: '...' });
const score = await client.scoreAsset({ invoiceId: 'INV-A3E2045' });
```
"TypeScript SDK. Score assets, query attestations, verify factors. MCP server included for tool-use agents."

## Close (1:55–2:15)

[SCREEN: landing page CTA section]
"RWA-Sentinel. Trust scores for off-chain assets, published on-chain. Try the Oracle Panel, read the docs, check the repo."

[SCREEN: rwa-sentinel.xyz + GitHub URL]
