import pkg from "casper-js-sdk";
const { PrivateKey, KeyAlgorithm, SessionBuilder, HttpHandler, RpcClient, Args } = pkg;
import fs from "fs";

const NODE_RPC = "https://node.testnet.casper.network/rpc";
const CHAIN_NAME = "casper-test";

async function main() {
  const freshPem = fs.readFileSync("/work/temp/fresh_account/fresh_secret_key.pem", "utf8");
  const freshKey = PrivateKey.fromPem(freshPem, KeyAlgorithm.ED25519);

  const wasmBytes = fs.readFileSync(
    "/work/temp/rwa-sentinel/contracts/target/wasm32-unknown-unknown/release/kyc-gate.wasm"
  );
  console.log("wasm size:", wasmBytes.length);

  const httpHandler = new HttpHandler(NODE_RPC);
  const rpcClient = new RpcClient(httpHandler);

  const tx = new SessionBuilder()
    .from(freshKey.publicKey)
    .wasm(new Uint8Array(wasmBytes))
    .installOrUpgrade()
    .runtimeArgs(Args.fromMap({}))
    .chainName(CHAIN_NAME)
    .payment(115_000_000_000)
    .build();

  await tx.sign(freshKey);
  const result = await rpcClient.putTransaction(tx);
  console.log("kyc-gate install tx hash:", JSON.stringify(result));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
