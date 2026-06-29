# Known Limitations

## Smart Contracts

- **Oracle registration is missing** — The `DAO_ORACLES` list is initialized empty with no entry point to add oracles. This must be added before testnet deployment.
- **Slash does not transfer funds** — `slash_oracle` updates the dictionary balance but does not move tokens from the stake purse. Slashed funds remain locked.
- **Signature verification is name-based** — `dao_approve` checks oracle names against a list rather than verifying cryptographic signatures. This is a placeholder for actual sig verification.
- **Duplicate signatures not deduplicated** — A single oracle address repeated in `oracle_sigs` can satisfy the threshold. A dedup step is needed.
- **Attestation overwrite** — `batch_attest` overwrites existing attestations without checking for prior entries. Historical data can be lost.

## Agent

- **No real external data source** — The collector uses `generateDemoInvoices` by default. Real API integration is stubbed.
- **History lookups return zero** — `lookupIssuerHistory` and `lookupDebtorHistory` are stubs returning 0, reducing scoring accuracy.
- **Cross-reference has no effect** — `hasCrossRef` is hardcoded to `false` in the scoring context. The `CrossRefChecker` output is ignored.
- **Fallback cache is unused** — `FallbackCache` and `StalenessDetector` are initialized but never queried by the pipeline.
- **NFT minting is incomplete** — The batch NFT minting call is truncated in the publisher.

## General

- **No persistent state** — The agent runs as a one-shot script. Production use requires a scheduler or long-running process.
- **Contract hash is empty** — `contractHash: ''` in config is a placeholder awaiting testnet deployment.
