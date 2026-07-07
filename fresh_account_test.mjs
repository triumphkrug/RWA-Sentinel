import pkg from "casper-js-sdk";
const { PrivateKey, KeyAlgorithm, NativeTransferBuilder, HttpHandler, RpcClient } = pkg;
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

  const freshPem = fs.readFileSync(
    "/work/temp/fresh_account/fresh_secret_key.pem",
    "utf8"
  );
  const freshKey = PrivateKey.fromPem(freshPem, KeyAlgorithm.ED25519);
  console.log("fresh pubkey:", freshKey.publicKey.toHex());

  const httpHandler = new HttpHandler(NODE_RPC);
  const rpcClient = new RpcClient(httpHandler);

  // 1. Transfer 260 CSPR from deployer to fresh account (covers 250 CSPR install payment + fees)
  const amountMotes = "260000000000"; // 260 CSPR
  const transferTx = new NativeTransferBuilder()
    .from(deployerKey.publicKey)
    .target(freshKey.publicKey)
    .amount(amountMotes)
    .id(Date.now())
    .chainName(CHAIN_NAME)
    .payment(100_000_000)
    .build();

  await transferTx.sign(deployerKey);
  const transferResult = await rpcClient.putTransaction(transferTx);
  console.log("transfer tx hash:", transferResult.transactionHash.transactionV1?.toHex?.() ?? transferResult);
  fs.writeFileSync("/work/temp/fresh_account/transfer_result.json", JSON.stringify(transferResult, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
