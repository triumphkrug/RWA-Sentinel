import pkg from "casper-js-sdk";
const { PrivateKey, KeyAlgorithm, SessionBuilder, HttpHandler, RpcClient, Args } = pkg;
import fs from "fs";

const NODE_RPC = "https://node.testnet.casper.network/rpc";
const CHAIN_NAME = "casper-test";

async function main() {
  const deployerPem = fs.readFileSync(
    "/work/skills/projects/ae402_hackathon/keys/deployer_keys/triumphkrug_secret_key.pem",
    "utf8"
  );
  const deployerKey = PrivateKey.fromPem(deployerPem, KeyAlgorithm.SECP256K1);
  console.log("deployer pubkey:", deployerKey.publicKey.toHex());

  const wasmBytes = fs.readFileSync(
    "/work/temp/rwa-sentinel/contracts/target/wasm32-unknown-unknown/release/oracle-slashing.wasm"
  );
  console.log("oracle-slashing (_v3 named keys) wasm size:", wasmBytes.length);

  const httpHandler = new HttpHandler(NODE_RPC);
  const rpcClient = new RpcClient(httpHandler);

  const tx = new SessionBuilder()
    .from(deployerKey.publicKey)
    .wasm(new Uint8Array(wasmBytes))
    .installOrUpgrade()
    .runtimeArgs(Args.fromMap({}))
    .chainName(CHAIN_NAME)
    .payment(250_000_000_000)
    .build();

  await tx.sign(deployerKey);
  const result = await rpcClient.putTransaction(tx);
  console.log("main-account governance-dao redeploy tx hash:", JSON.stringify(result));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
