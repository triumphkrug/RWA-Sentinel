# RWA-Sentinel SDK

## TypeScript Client

```ts
import { SentinelClient } from './sdk';

const client = new SentinelClient('https://rwa-sentinel-api.onrender.com');

// Register an asset
const asset = await client.registerAsset({
  assetType: 'invoice',
  metadata: '{"vendor":"Acme","total":15000}',
  owner: 'account-hash-abc...',
});

// Submit oracle attestation
const attestation = await client.submitAttestation({
  assetId: asset.id,
  score: 92,
  evidence: 'sha256-of-evidence-doc',
  oracleId: 'oracle-001',
});

// Challenge a bad attestation
await client.submitChallenge({
  batchId: attestation.batchId,
  reason: 'Invoice metadata does not match source document',
  evidence: 'sha256-of-counter-evidence',
  challenger: 'auditor-001',
});

// Stake as oracle
await client.stakeOracle('oracle-001', 50000);
```

## MCP Server

```bash
npx tsx sdk/mcp.ts              # stdio mode
npx tsx sdk/mcp.ts --manifest   # print tool definitions
```

### Available Tools

| Tool | Description |
|------|-------------|
| `register_asset` | Register RWA on-chain |
| `get_asset` | Query asset details |
| `submit_attestation` | Oracle scores an asset |
| `challenge_attestation` | Dispute a bad attestation |
| `get_oracle_stake` | Check oracle's stake |
