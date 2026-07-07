# RWA-Sentinel TypeScript SDK

Full-featured client for interacting with the RWA-Sentinel API from Node.js and browser environments.

## Installation

```bash
npm install @rwa-sentinel/sdk
```

## Quick Start

```typescript
import { SentinelClient } from '@rwa-sentinel/sdk'

const sentinel = new SentinelClient('https://rwa-sentinel-api.onrender.com')

// Check API health
const health = await sentinel.health()

// Register and score an asset
const asset = await sentinel.registerAsset({
  assetType: 'invoice',
  metadata: '{"vendor":"Acme","total":15000}',
  owner: 'account-hash-abc...',
})

// List attestations
const attestations = await sentinel.listAttestations()
```

## API Reference (9 methods)

### `health()`
Returns API health status, uptime, connected contracts, and database state.

### `runPipeline(options)`
Execute the full 6-factor scoring pipeline.
- `options.lei` — Legal Entity Identifier
- `options.invoices` — (optional) Array of real invoice objects for scoring
- Returns: `{ pipeline_id, status, scored, attested, dataSource }`

### `getScores()`
Retrieve all asset trust scores with per-factor breakdown.
- Returns: `AssetScore[]` with `score`, `factors[]`, `timestamp`, `metadata`

### `listAttestations(options?)`
List attestations with optional filters.
- `options.page`, `options.limit`, `options.status`, `options.min_score`
- Returns: `{ attestations, total, page, limit }`

### `getAttestation(id)`
Get a single attestation by ID.
- Returns: Full attestation object with `holder_did`, `attestation_hash`, `casper_block_hash`

### `getStats()`
Portal-wide statistics: scored assets, active/expired attestations, average trust score, asset type distribution.

### `registerAsset(assetData)`
Register a new asset for scoring.

### `challengeAttestation(attestationId, reason)`
Submit a challenge against an attestation.

### `stakeTokens(oraclePublicKey, amount)`
Stake CSPR tokens as an oracle via the deposit-stake-session WASM.

## Configuration

```typescript
const sentinel = new SentinelClient('https://rwa-sentinel-api.onrender.com', 'optional-api-key')
```

## Error Handling

All methods throw `SentinelError` on failure:

```typescript
try {
  const scores = await sentinel.getScores()
} catch (err) {
  if (err instanceof SentinelError) {
    console.error(err.statusCode, err.message)
  }
}
```

## License

MIT — triumphkrug 2026
