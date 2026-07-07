/**
 * Deploy governance-dao and oracle-slashing WASMs to Casper testnet.
 * Uses casper-js-sdk v5 SessionBuilder for install transactions.
 */
import { readFileSync } from 'node:fs';
import casperSdk from 'casper-js-sdk';

const {
  PrivateKey, KeyAlgorithm, HttpHandler, RpcClient,
  SessionBuilder, Args, CLValue,
} = casperSdk;

const NODE_URL = 'https://node.testnet.cspr.cloud/rpc';
const CHAIN_NAME = 'casper-test';
const CSPR_CLOUD_KEY = '019f2c57-fc73-7a57-adaf-b88680549e01';
const TTL = 1800000; // 30 min
const PAYMENT = '50000000000'; // 50 CSPR

// 3rd account — has ~1 install slot left
const KEY_3RD = '/work/secrets/rwa_sentinel_keys/oracle_slashing_deployer.pem';

async function loadKey(path) {
  const pem = readFileSync(path, 'utf-8');
  // Try ed25519 first, then secp256k1
  try {
    return PrivateKey.fromPem(pem, KeyAlgorithm.ED25519);
  } catch {
    return PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
  }
}

async function deployWasm(rpcClient, privateKey, wasmPath, label) {
  const wasmBytes = readFileSync(wasmPath);
  console.log(`[${label}] WASM size: ${wasmBytes.length} bytes`);

  const tx = new SessionBuilder()
    .from(privateKey.publicKey)
    .chainName(CHAIN_NAME)
    .ttl(TTL)
    .payment(PAYMENT)
    .wasm(wasmBytes)
    .installOrUpgrade()
    .runtimeArgs(Args.fromNamedArgs([]))
    .buildFor1_5();

  tx.sign(privateKey);

  console.log(`[${label}] Deployer: ${privateKey.publicKey.toHex()}`);
  console.log(`[${label}] Submitting...`);

  try {
    const result = await rpcClient.putDeploy(tx.getDeploy());
    const hash = result?.deployHash?.toString() || result?.toString();
    console.log(`[${label}] ✅ Submitted: ${hash}`);
    return hash;
  } catch (err) {
    // Try putTransaction as fallback
    try {
      const result2 = await rpcClient.putTransaction(tx);
      const hash2 = result2?.transactionHash?.toString() || result2?.toString();
      console.log(`[${label}] ✅ Submitted (v2): ${hash2}`);
      return hash2;
    } catch (err2) {
      console.error(`[${label}] ❌ Failed:`, err2.message || err2);
      return null;
    }
  }
}

async function waitForDeploy(rpcClient, hash, label, timeoutMs = 300000) {
  console.log(`[${label}] Waiting for finalization (up to ${timeoutMs/1000}s)...`);
  try {
    const result = await rpcClient.waitForDeploy(hash, timeoutMs);
    console.log(`[${label}] ✅ Finalized!`);
    // Try to extract contract hash from execution results
    if (result?.executionInfo?.executionResult) {
      const execResult = result.executionInfo.executionResult;
      console.log(`[${label}] Execution result:`, JSON.stringify(execResult).substring(0, 500));
    }
    return result;
  } catch (err) {
    console.error(`[${label}] ⚠️ Wait failed:`, err.message || err);
    return null;
  }
}

async function main() {
  const handler = new HttpHandler(NODE_URL);
  handler.setCustomHeaders({ Authorization: CSPR_CLOUD_KEY });
  const rpcClient = new RpcClient(handler);

  const key3 = await loadKey(KEY_3RD);
  console.log(`3rd account: ${key3.publicKey.toHex()}`);

  const WASM_DIR = '/work/temp/rwa-sentinel/contracts/target/wasm32-unknown-unknown/release';

  // Deploy governance-dao with 3rd account
  const govHash = await deployWasm(
    rpcClient, key3,
    `${WASM_DIR}/governance-dao-opt.wasm`,
    'governance-dao'
  );

  if (govHash) {
    await waitForDeploy(rpcClient, govHash, 'governance-dao');
  }

  // Deploy oracle-slashing with same 3rd account (might fail if install cap reached)
  const slashHash = await deployWasm(
    rpcClient, key3,
    `${WASM_DIR}/oracle-slashing-opt.wasm`,
    'oracle-slashing'
  );

  if (slashHash) {
    await waitForDeploy(rpcClient, slashHash, 'oracle-slashing');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`governance-dao tx: ${govHash || 'FAILED'}`);
  console.log(`oracle-slashing tx: ${slashHash || 'FAILED'}`);
}

main().catch(console.error);
