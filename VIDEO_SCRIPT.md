# Demo Video Script

Target duration: 2:00-2:30

## Timeline

| Time | Scene | Description |
|------|-------|-------------|
| 0:00-0:10 | Title | "RWA-Sentinel: Autonomous Trust Oracle for Real-World Assets" |
| 0:10-0:30 | Problem context | RWA tokenization depends on centralized custodians. Show a manual verification flow (slow, opaque, single point of failure). |
| 0:30-0:50 | Solution overview | Introduce the four-stage pipeline. Show the architecture diagram. Emphasize "trust oracle, not price oracle." |
| 0:50-1:20 | Live pipeline run | Start the agent in demo mode. Show invoices being collected, scored (highlight the 6-factor model), and attested on-chain. |
| 1:20-1:40 | On-chain evidence | Open Casper Explorer. Show the batch_attest transaction. Show the attestation dictionary entry with trust score and evidence hash. |
| 1:40-1:55 | Challenge flow | Demonstrate a challenge submission. Show the DAO approval mechanism. |
| 1:55-2:10 | Dashboard | Show the monitoring dashboard with real-time scoring data, cache status, and staleness indicators. |
| 2:10-2:25 | DeFi integration | Explain how DeFi protocols query attestation validity before accepting collateral. |
| 2:25-2:30 | Close | "Decentralized trust for real-world assets, powered by Casper." |

## Commands

```bash
# Start agent
npm start

# Start dashboard
npm run dashboard

# Show explorer
open https://integration.cspr.live/
```

## Research Points to Mention

- Weighted factor analysis with configurable thresholds
- SHA-256 evidence anchoring for audit trails
- Time-limited NFTs prevent stale attestations
- DAO governance for high-value asset disputes
