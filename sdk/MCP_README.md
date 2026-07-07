# RWA-Sentinel MCP Server

Model Context Protocol (MCP) server for AI agent integration. Exposes 24 tools for LLM workflows.

## Quick Start

```bash
npx rwa-sentinel-mcp
```

Or configure in your MCP client:

```json
{
  "mcpServers": {
    "rwa-sentinel": {
      "command": "npx",
      "args": ["rwa-sentinel-mcp"],
      "env": {
        "RWA_API_URL": "https://rwa-sentinel-api.onrender.com"
      }
    }
  }
}
```

## Available Tools (24)

### Core
| Tool | Description |
|------|-------------|
| `rwa_health` | API health check |
| `rwa_stats` | Portal statistics |
| `rwa_factors` | List 6 scoring factors with weights |
| `rwa_cache_stats` | Scoring cache metrics |

### Pipeline & Scoring
| Tool | Description |
|------|-------------|
| `rwa_run_pipeline` | Execute full scoring pipeline |
| `rwa_get_scores` | Fetch all asset trust scores |
| `rwa_check_validity` | Query attestation validity |

### Attestations
| Tool | Description |
|------|-------------|
| `rwa_list_attestations` | List attestations with filters |
| `rwa_get_attestation` | Get attestation by ID |
| `rwa_verify_token` | Verify attestation token on-chain |

### Data Adapters
| Tool | Description |
|------|-------------|
| `rwa_lei_lookup` | GLEIF LEI entity lookup |
| `rwa_price_data` | CoinGecko market data |
| `rwa_company_data` | Companies House lookup |

### Governance
| Tool | Description |
|------|-------------|
| `rwa_list_proposals` | List DAO proposals |
| `rwa_create_proposal` | Create governance proposal |
| `rwa_vote` | Vote on proposal |
| `rwa_execute_proposal` | Execute approved proposal |

### Slashing
| Tool | Description |
|------|-------------|
| `rwa_slashing_reports` | List slashing reports |
| `rwa_report_violation` | Report oracle misconduct |
| `rwa_challenge_report` | Challenge a report |

### Extensions
| Tool | Description |
|------|-------------|
| `rwa_kyc_check` | On-chain KYC status check |
| `rwa_asset_categories` | List asset category profiles |
| `rwa_detect_anomalies` | Run AI anomaly detection |
| `rwa_bridge_verify` | Cross-chain attestation verification |

## Example Usage

```typescript
// In an AI agent workflow:
// Run the pipeline with demo data (no args needed):
const result = await mcp.callTool('rwa_run_pipeline', {})

// Get all scored assets:
const scores = await mcp.callTool('rwa_get_scores', {})

// Check KYC status:
const kyc = await mcp.callTool('rwa_kyc_check', {
  submitterPublicKey: '0197cedb...'
})
```

## License

MIT — triumphkrug 2026
