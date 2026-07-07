import pkg from "casper-js-sdk";
const { PrivateKey, KeyAlgorithm, SessionBuilder, HttpHandler, RpcClient, Args } = pkg;
import fs from "fs";

const NODE_RPC = "https://node.testnet.casper.network/rpc";
const CHAIN_NAME = "casper-test";

async function main() {
  const freshPem = fs.readFileSync(
    "/work/temp/fresh_account/fresh_secret_key.pem",
    "utf8"
  );
  const freshKey = PrivateKey.fromPem(freshPem, KeyAlgorithm.ED25519);
  console.log("fresh pubkey:", freshKey.publicKey.toHex());

  const wasmBytes = fs.readFileSync(
    "/work/temp/rwa-sentinel/contracts/target/wasm32-unknown-unknown/release/oracle-slashing.wasm"
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
    .payment(250_000_000_000) // 250 CSPR, same as every prior attempt
    .build();

  await tx.sign(freshKey);
  const result = await rpcClient.putTransaction(tx);
  console.log("install tx hash:", JSON.stringify(result));
  fs.writeFileSync("/work/temp/fresh_account/install_result.json", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
