/**
 * RWA-Sentinel MCP Server.
 *
 * Exposes asset registration, attestation, and challenge tools
 * via the Model Context Protocol for LLM agents.
 *
 * Start:
 *   npx tsx sdk/mcp.ts                    # stdio
 *   npx tsx sdk/mcp.ts --port 3402        # SSE on port 3402
 */

import { SentinelClient } from './index.js';

const API_URL = process.env.SENTINEL_API_URL ?? 'http://localhost:3000';

const TOOLS = [
  {
    name: 'register_asset',
    description: 'Register a new real-world asset (invoice, deed, etc.) on-chain.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetType: { type: 'string', description: 'Asset type (invoice, deed, certificate)' },
        metadata: { type: 'string', description: 'JSON metadata of the asset' },
        owner: { type: 'string', description: 'Owner account hash' },
      },
      required: ['assetType', 'metadata', 'owner'],
    },
  },
  {
    name: 'get_asset',
    description: 'Fetch details and status of a registered asset.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Asset ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'submit_attestation',
    description: 'Submit an oracle attestation scoring an asset.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetId: { type: 'number' },
        score: { type: 'number', description: '0-100 quality score' },
        evidence: { type: 'string', description: 'Hash of evidence document' },
        oracleId: { type: 'string' },
      },
      required: ['assetId', 'score', 'evidence', 'oracleId'],
    },
  },
  {
    name: 'challenge_attestation',
    description: 'Challenge a potentially fraudulent attestation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        batchId: { type: 'number' },
        reason: { type: 'string' },
        evidence: { type: 'string' },
        challenger: { type: 'string' },
      },
      required: ['batchId', 'reason', 'evidence', 'challenger'],
    },
  },
  {
    name: 'get_oracle_stake',
    description: 'Check how much an oracle has staked.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        oracleId: { type: 'string' },
      },
      required: ['oracleId'],
    },
  },
  {
    name: 'run_pipeline',
    description: 'Run the full attestation pipeline for an asset — collect, score, attest.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetId: { type: 'number', description: 'Asset ID to process' },
      },
      required: ['assetId'],
    },
  },
  {
    name: 'get_scores',
    description: 'Get all trust scores computed by the scoring engine.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        minScore: { type: 'number', description: 'Minimum score filter (0-100)' },
      },
    },
  },
  {
    name: 'get_stats',
    description: 'Get aggregate statistics: total assets, attestations, average score.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_cache_stats',
    description: 'Get data cache hit/miss statistics for the oracle.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'health_check',
    description: 'Check API, database, and blockchain connection health.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_attestations',
    description: 'List recent attestation NFTs with status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results', default: 20 },
      },
    },
  },
  {
    name: 'get_scoring_factors',
    description: 'Get the current scoring factor weights and descriptions.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'submit_dao_vote',
    description: 'Cast a vote on a DAO governance proposal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposalId: { type: 'number' },
        vote: { type: 'string', enum: ['for', 'against', 'abstain'] },
        voter: { type: 'string', description: 'Voter account hash' },
      },
      required: ['proposalId', 'vote', 'voter'],
    },
  },
  {
    name: 'get_asset_history',
    description: 'Get the full attestation history for an asset.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetId: { type: 'number' },
      },
      required: ['assetId'],
    },
  },
  {
    name: 'verify_attestation',
    description: 'Verify an attestation NFT is valid and not expired.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tokenId: { type: 'number', description: 'CEP-78 token ID' },
      },
      required: ['tokenId'],
    },
  },
];

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = new SentinelClient(API_URL);

  switch (name) {
    case 'register_asset':
      return JSON.stringify(
        await client.registerAsset({
          assetType: args.assetType as string,
          metadata: args.metadata as string,
          owner: args.owner as string,
        }),
        null,
        2,
      );

    case 'get_asset':
      return JSON.stringify(await client.getAsset(args.id as number), null, 2);

    case 'submit_attestation':
      return JSON.stringify(
        await client.submitAttestation({
          assetId: args.assetId as number,
          score: args.score as number,
          evidence: args.evidence as string,
          oracleId: args.oracleId as string,
        }),
        null,
        2,
      );

    case 'challenge_attestation':
      return JSON.stringify(
        await client.submitChallenge({
          batchId: args.batchId as number,
          reason: args.reason as string,
          evidence: args.evidence as string,
          challenger: args.challenger as string,
        }),
        null,
        2,
      );

    case 'get_oracle_stake':
      return JSON.stringify(
        await client.getOracleStake(args.oracleId as string),
        null,
        2,
      );

    case 'run_pipeline':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/pipeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: args.assetId }) }).then(r => r.json()),
        null, 2,
      );

    case 'get_scores': {
      const qs = args.minScore ? `?min=${args.minScore}` : '';
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/scores${qs}`).then(r => r.json()),
        null, 2,
      );
    }

    case 'get_stats':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/stats`).then(r => r.json()),
        null, 2,
      );

    case 'get_cache_stats':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/cache/stats`).then(r => r.json()),
        null, 2,
      );

    case 'health_check':
      return JSON.stringify(
        await fetch(`${API_URL}/health`).then(r => r.json()),
        null, 2,
      );

    case 'list_attestations':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/attestations?limit=${args.limit ?? 20}`).then(r => r.json()),
        null, 2,
      );

    case 'get_scoring_factors':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/factors`).then(r => r.json()),
        null, 2,
      );

    case 'submit_dao_vote':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/dao/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) }).then(r => r.json()),
        null, 2,
      );

    case 'get_asset_history':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/assets/${args.assetId}/history`).then(r => r.json()),
        null, 2,
      );

    case 'verify_attestation':
      return JSON.stringify(
        await fetch(`${API_URL}/api/v1/attestations/${args.tokenId}/verify`).then(r => r.json()),
        null, 2,
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// MCP stdio transport (simplified — full impl needs `@modelcontextprotocol/sdk`)
async function main(): Promise<void> {
  console.error(`RWA-Sentinel MCP server started (api: ${API_URL})`);
  console.error(`Available tools: ${TOOLS.map((t) => t.name).join(', ')}`);

  // Export tool definitions for MCP discovery
  const manifest = {
    name: 'rwa-sentinel',
    version: '0.3.0',
    tools: TOOLS,
  };

  if (process.argv.includes('--manifest')) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  // stdio JSON-RPC loop
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin });

  for await (const line of rl) {
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/list') {
        const resp = { jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } };
        console.log(JSON.stringify(resp));
      } else if (msg.method === 'tools/call') {
        const text = await handleTool(msg.params.name, msg.params.arguments ?? {});
        const resp = {
          jsonrpc: '2.0',
          id: msg.id,
          result: { content: [{ type: 'text', text }] },
        };
        console.log(JSON.stringify(resp));
      }
    } catch (err) {
      console.error('parse error:', err);
    }
  }
}

main().catch(console.error);
