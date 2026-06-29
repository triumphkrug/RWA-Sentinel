/**
 * Application configuration validated with zod.
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  nodeUrl: z.string().url().default('https://node.integration.cspr.cloud/'),
  chainName: z.string().default('casper-test'),
  deployerKeyPath: z.string().default('./keys/secret_key.pem'),
  batchSize: z.coerce.number().min(1).max(10).default(10),
  challengeRateLimit: z.coerce.number().min(1).default(3),
  nftValidityHours: z.coerce.number().min(1).default(24),
  staleThresholdMinutes: z.coerce.number().min(1).default(30),
  dashboardPort: z.coerce.number().min(1024).max(65535).default(3000),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  // Step 1: Collect environment variables
  const rawEnv = {
    nodeUrl: process.env.NODE_URL,
    chainName: process.env.CHAIN_NAME,
    deployerKeyPath: process.env.DEPLOYER_KEY_PATH,
    batchSize: process.env.BATCH_SIZE,
    challengeRateLimit: process.env.CHALLENGE_RATE_LIMIT,
    nftValidityHours: process.env.NFT_VALIDITY_HOURS,
    staleThresholdMinutes: process.env.STALE_THRESHOLD_MINUTES,
    dashboardPort: process.env.DASHBOARD_PORT,
  };

  // Step 2: Parse and validate
  const parsed = ConfigSchema.safeParse(rawEnv);

  // Step 3: Return validated config or throw
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${issues.join('\n')}`);
  }

  return parsed.data;
}
