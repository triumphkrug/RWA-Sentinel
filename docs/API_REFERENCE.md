# RWA-Sentinel API Reference

Base URL: `https://rwa-sentinel-api.onrender.com`

## Core

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with uptime, contracts, DB status |
| GET | `/api/v1/stats` | Portal statistics (scored, attestations, avg score) |
| GET | `/api/v1/factors` | 6 scoring factors with weights |
| GET | `/api/v1/cache/stats` | Scoring cache metrics |

## Pipeline & Scoring

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/pipeline` | Run full 6-factor scoring pipeline |
| GET | `/api/v1/scores` | List all asset trust scores |

### POST /api/v1/pipeline

```json
{
  "lei": "5493001KJTIIGC8Y1R12",
  "invoices": [{ "invoiceId": "inv-001", "issuer": "...", "amountCents": 125000, ... }]
}
```

Response: `{ pipeline_id, status, scored, attested, dataSource }`

## Attestations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/attestations` | List attestations (query: page, limit, status, min_score) |
| GET | `/api/v1/attestations/:id` | Get attestation by ID |
| GET | `/api/v1/attestations/:tokenId/verify` | Verify attestation token |

## Data Adapters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/data/lei/:lei` | GLEIF LEI lookup |
| GET | `/api/v1/data/price/:symbol` | CoinGecko price data |
| GET | `/api/v1/data/company/:jurisdiction/:id` | Companies House lookup |
| GET | `/api/v1/data/cache/stats` | Data cache stats |
| POST | `/api/v1/data/cache/clear` | Clear data cache |

## Governance DAO

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/governance/proposals` | List all proposals |
| GET | `/api/v1/governance/proposals/:id` | Get proposal by ID |
| POST | `/api/v1/governance/propose` | Create proposal |
| POST | `/api/v1/governance/vote` | Vote on proposal |
| POST | `/api/v1/governance/execute` | Execute approved proposal |

### POST /api/v1/governance/propose

```json
{
  "type": "parameter_change",
  "description": "Adjust trust score threshold",
  "proposerPublicKey": "02029f26b4...",
  "executionData": {}
}
```

### POST /api/v1/governance/vote

```json
{
  "proposalId": "uuid",
  "voterPublicKey": "02029f26b4...",
  "choice": "for"
}
```

## Oracle Slashing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/slashing/reports` | List slashing reports |
| GET | `/api/v1/slashing/reports/:id` | Get report by ID |
| POST | `/api/v1/slashing/report` | Report oracle violation |
| POST | `/api/v1/slashing/challenge` | Challenge a report |
| POST | `/api/v1/slashing/validate` | Validate evidence |
| POST | `/api/v1/slashing/execute` | Execute slash |

## BLS Consensus

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/consensus/init` | Initialize consensus round |
| POST | `/api/v1/consensus/submit` | Submit partial signature |
| POST | `/api/v1/consensus/finalize` | Finalize consensus |
| GET | `/api/v1/consensus/:attestationId` | Get consensus state |

### POST /api/v1/consensus/init

```json
{
  "attestationId": "att-001",
  "messageHash": "abc123def456"
}
```

## Chain Explorer (Allium)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/chain/all` | Full overview + activity + txs + sentinel metrics |
| GET | `/api/v1/chain/overview` | Block height, era, validators |
| GET | `/api/v1/chain/activity` | Daily transaction activity (30d) |
| GET | `/api/v1/chain/transactions` | Recent large transactions |

## Extensions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/extensions/categories` | 10 asset categories with weight profiles |
| GET | `/api/v1/extensions/categories/:category/compliance` | Category compliance rules |
| POST | `/api/v1/extensions/kyc/check` | On-chain KYC status check |
| GET | `/api/v1/extensions/bridge/chains` | Supported bridge chains |
| POST | `/api/v1/extensions/bridge/verify` | Cross-chain attestation verify |

## Anomaly Detection

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/anomalies/detect` | Run AI anomaly detection |
| GET | `/api/v1/anomalies/:assetId/report` | Get anomaly report for asset |
| PUT | `/api/v1/anomalies/config` | Update detection config |

## Documents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/documents/verify` | Verify document hash |
| POST | `/api/v1/documents` | Submit document |
| GET | `/api/v1/documents/:hash/status` | Document status |

## Asset History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/assets/:assetId/history` | Scoring history for asset |

## Error Format

All errors return JSON with consistent format:

```json
{
  "error": "Description of what went wrong",
  "statusCode": 400
}
```
