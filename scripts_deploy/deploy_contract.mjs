import { readFileSync } from 'node:fs';
import {
  PrivateKey, KeyAlgorithm, DeployHeader, ExecutableDeployItem, Deploy,
  HttpHandler, RpcClient, Args, Timestamp, Duration,
} from 'casper-js-sdk';

const [,, wasmPath, chainName, nodeUrl, pemPath, paymentMotes] = process.argv;
if (!wasmPath || !chainName || !nodeUrl || !pemPath) {
  console.error('usage: node deploy_contract.mjs <wasm> <chainName> <nodeUrl> <pemPath> [paymentMotes]');
  process.exit(1);
}

const wasmBytes = new Uint8Array(readFileSync(wasmPath));
const pem = readFileSync(pemPath, 'utf-8');
const privKey = PrivateKey.fromPem(pem, KeyAlgorithm.ED25519);
const pubKey = privKey.publicKey;

const session = ExecutableDeployItem.newModuleBytes(wasmBytes, Args.fromMap({}));
const payment = ExecutableDeployItem.standardPayment(paymentMotes || '200000000000'); // default 200 CSPR

const header = new DeployHeader(
  chainName,
  [],
  1,
  new Timestamp(new Date()),
  new Duration(30 * 60 * 1000),
  pubKey,
);

const deploy = Deploy.makeDeploy(header, payment, session);
deploy.sign(privKey);

const rpc = new RpcClient(new HttpHandler(nodeUrl));
const result = await rpc.putDeploy(deploy);
console.log(JSON.stringify({ deployHash: result.deployHash, account: pubKey.toHex(), wasmPath }, null, 2));
