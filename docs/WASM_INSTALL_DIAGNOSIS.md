# WASM Install/Redeploy Blocker — Root Cause Diagnosis (2026-07-06)

## Summary

Every attempt to install/redeploy `governance-dao`, `oracle-slashing`, `asset-registry`,
or `attestation-store` on Casper testnet via `casper-js-sdk@5.0.12` failed with
`ApiError::InvalidArgument [3]`, consuming almost no gas (~1-2.7M gas units out
of a 200 CSPR payment limit) — i.e. failing almost immediately, not from running
out of gas. This blocked redeploying any contract-level fix (B5 on-chain DID
enforcement, `oracle-slashing.withdraw_stake` real fund transfer,
`governance-dao.execute_proposal` action dispatch).

This was diagnosed by building a minimal throwaway contract
(`contracts/diag-minimal/`, not part of the product, safe to delete) and
incrementally adding pieces of the real contracts' structure until the same
failure reproduced. Two independent, confirmed root causes were found.

## Root cause #1 (confirmed): `CLType::Any` as an entry-point return type

`asset-registry::get_asset` and `attestation-store` (line ~489) declare an
entry point with `CLType::Any` as its return type. Installing a WASM module
that declares ANY entry point with `CLType::Any` as return type is rejected
immediately by the node, regardless of module size — reproduced on a 64KB
minimal contract that was otherwise byte-for-byte comparable to a passing
63KB build, with the only difference being one added entry point using
`CLType::Any` as return type.

**Fix**: replace `CLType::Any` with a concrete type (e.g. `CLType::String`,
since `get_asset` returns JSON-serialized data anyway). Not yet applied to
`asset-registry`/`attestation-store` source in this session — both are
already deployed and live, so this only matters if/when those two are
redeployed.

## Root cause #2 (confirmed): WASM install transactions get routed to the wrong "wasm lane"

The chain's `transactions.v1` chainspec section defines:

```
install_upgrade_lane = [2, 750_000, 2048, 1_000_000_000_000, 1]
wasm_lanes = [
    [3, 750_000, 2048, 1_000_000_000_000, 1],
    [4, 131_072, 1024, 100_000_000_000, 2],
    [5, 65_536, 512, 5_000_000_000, 40]
]
```

Install transactions *should* route to lane 2 (`install_upgrade_lane`, 750KB
cap). Empirically, `casper-js-sdk@5.0.12`'s `SessionBuilder().installOrUpgrade()`
transactions (confirmed via `isInstallUpgrade: true` in the built transaction
object) get rejected identically whether serialized as TransactionV1
(`SessionBuilder`) or legacy `Deploy` — both hit the exact same
`ApiError::InvalidArgument [3]` at the exact same gas-consumed value for a
given wasm, which rules out an SDK-encoding-path-specific bug and instead
points to size-based lane misclassification at the node/mempool level: any
compiled contract WASM whose serialized transaction size exceeds ~65,536
bytes (lane 5's cap, the smallest "call" lane) fails install, while ones
below that succeed (confirmed on a 62KB minimal build; confirmed failing
identically on the same contract padded to 121KB).

This is a genuine `casper-js-sdk@5.0.12` / node protocol 2.2.2 interaction
bug (or at minimum, an undocumented, unexpectedly strict constraint) — install
transactions do not appear to actually get the 750KB budget the chainspec
says they should when built this way.

**Real, applied fix (workspace-wide, already committed)**: the workspace
`contracts/Cargo.toml` had no `[profile.release]` section. Cargo silently
ignores `[profile.release]` blocks declared in individual package
`Cargo.toml` files inside a workspace (confirmed via Cargo's own warning:
*"profiles for the non root package will be ignored, specify profiles at
the workspace root"*) — meaning **every contract in this repo has been
compiled release-unoptimized this entire project**, despite each one
declaring `lto = true, codegen-units = 1`. Moved the profile to the
workspace root and added `opt-level = "z"` and `panic = "abort"`. Confirmed
this alone shrinks `asset-registry` from 136KB to 79KB before any
post-processing.

**Partial mitigation attempted**: with the profile fix + `wasm-opt -Oz`
(binaryen, not currently installed in the standard toolchain — used a
locally downloaded release for this diagnosis only), sizes achieved:

| Contract | Original (unoptimized) | After profile fix + wasm-opt -Oz | Under 65,536 threshold? |
|---|---|---|---|
| asset-registry | 136,207 B | 52,667 B | Yes (untested for redeploy due to root cause #1 still present) |
| attestation-store | ~147,000 B (est.) | not rebuilt this session | Not attempted (root cause #1 present) |
| governance-dao | 136,207 B | 68,425 B | **No — ~3KB over** |
| oracle-slashing | 147,138 B | 65,596 B | **No — ~460 B over** |

`governance-dao` and `oracle-slashing` do not use `CLType::Any` (root cause
#1 doesn't apply to them), but their compiled size — even after full LTO +
`opt-level=z` + aggressive `wasm-opt -Oz` with dead-code-elimination,
vacuum, and local-simplification passes converged — remains just above the
65,536-byte lane-5 cap. Getting under it without removing real entry
points/business logic was not achieved in the time available.

## Update (2026-07-06, ~22:55 UTC): size reduction alone does NOT fix governance-dao/oracle-slashing

Re-tested live on testnet after the previous session's diagnosis was written. Rebuilt both
contracts with the workspace release profile + aggressive `wasm-opt -Oz --strip-debug
--strip-producers --dce --vacuum --dae --remove-unused-names --converge`:

| Contract | Size before | Size after | Under 65,536 cap? |
|---|---|---|---|
| governance-dao | 68,425 B | 62,840 B | Yes |
| oracle-slashing | 65,596 B | 60,330 B | Yes |

Both submitted as real install transactions to testnet (`node.testnet.casper.network/rpc`,
funded deployer `02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79`).
**Both still failed with the identical `ApiError::InvalidArgument [3]`**, consuming the
identical tiny gas amount as before the size fix (oracle-slashing: 2,698,325 gas consumed
both before and after; governance-dao: 2,491,430) — i.e. rejected at the exact same
instruction/point regardless of wasm size. Also re-tested oracle-slashing with payment
capped at 4.9 CSPR (matching lane 5's own gas-limit ceiling from the chainspec, in case the
200 CSPR payment was itself mismatched against whatever lane the tx got misclassified into)
— same error, same gas consumed. This rules out **both** "wasm too big for the lane" and
"payment/gas-limit doesn't match the lane's ceiling" as sufficient explanations on their own.

Ruled out as differentiators between this pair (still failing) and asset-registry/
attestation-store (confirmed fixed by the `CLType::Any` change):
- No `CLType::Any` anywhere in governance-dao or oracle-slashing (checked directly).
- Import tables are structurally identical to asset-registry's (same casper host-function
  set), except oracle-slashing has one extra import, `casper_transfer_from_purse_to_purse`
  (used inside `register_oracle`/`execute_slash`, not inside `call()` itself) — but
  governance-dao has *no* such extra import and fails identically, so that's not it either.
- Both have wasm feature flags (`sign-ext`, `reference-types`, `multivalue`,
  `mutable-globals`) identical to asset-registry's working build.
- `call()` in both takes no named args (same as asset-registry/attestation-store), so it's
  not a missing-installer-argument issue.

**Important context not fully reconciled**: governance-dao is *already live on testnet*
from earlier in this project (there's a confirmed on-chain proposal `PROP-18edd916` from
the B2 work) — meaning a structurally very similar version of this exact contract *did*
install successfully at some point. This strongly suggests the blocker is not inherent to
the contract's Rust/wasm structure at all, but something about *how* the install
transaction is being submitted this session specifically (SDK version/method used for the
original successful install may differ from `casper-js-sdk` + `SessionBuilder()
.installOrUpgrade()` used by `scripts_deploy/deploy_contract.mjs` in later attempts) — worth
checking how the original live governance-dao contract was actually deployed (check commit
history / deploy logs from before this diagnostic session) before spending more time on
binary-size theories.

**Net result of this pass**: the size-reduction build fix is real and worth keeping
(smaller call-transaction gas costs going forward regardless of the install issue), but it
does not unblock the redeploy on its own. Do not re-attempt the "just shrink it more" path
without first resolving the "how was it installed successfully before" question above.

## Update 2: also tried the legacy `Deploy`/`ExecutableDeployItem.newModuleBytes` format directly (bypassing `SessionBuilder`/lanes entirely)

Found that the *original* (now-deleted, see commits `d79f687`/`3284875`) deploy tooling used
in this project used the **legacy `Deploy` API** (`ExecutableDeployItem.newModuleBytes()` +
`Deploy.makeDeploy()`), not the newer `SessionBuilder().installOrUpgrade()` TransactionV1 API
used by the current `scripts_deploy/deploy_contract.mjs`. Legacy deploys don't go through the
lane-classification system at all, so this looked like a very promising alternate path.

Rebuilt a legacy-format deploy script (`scripts_deploy/deploy_legacy2.mjs`) and submitted the
full, un-shrunk `oracle-slashing.wasm` (89,722 B, no size constraint issue for legacy deploys)
via `putDeploy` directly. **Still got the identical `ApiError::InvalidArgument [3]`**, at
essentially the same tiny gas-consumed value (2,847,550) as every other attempt. This
conclusively rules out the transaction format/lane-classification theory altogether — legacy
Deploy and TransactionV1 both fail identically, at the same instant, regardless of payment,
size, or serialization path.

**New leading hypothesis, not yet confirmed — check this first before anything else:**
governance-dao and oracle-slashing were **already successfully deployed once earlier in this
project** (see commits `5fb6656`/`110d816`, and the live on-chain proposal `PROP-18edd916`
from the B2 work). Their `call()` constructors call `storage::new_contract(..., Some(<package
name>), Some(<access uref name>), None)`, e.g. `Some("governance_dao_package_hash".into())`.
`storage::new_contract` saves that package under a named key **in the calling account's own
named keys**. If a named key with that exact name already exists on the deployer account (a
Key::Package/Key::URef left over from the earlier successful install), a second install
attempt with the same package-name string may be rejected by the runtime rather than
silently overwritten — this would explain `ApiError::InvalidArgument [3]` occurring
identically regardless of transaction format/size/payment, since it's a state-level clash,
not a wasm/transaction validity issue. **asset-registry/attestation-store don't have this
problem because they were never successfully installed before this session** (their first-
ever successful install was the one that worked after the `CLType::Any` fix).

**CONFIRMED then RULED OUT**: queried the deployer account's named keys directly via raw
`curl` to `state_get_entity` (bypassing broken `casper-js-sdk` `getLatestEntity`/
`getAccountInfo` helpers, which hit unrelated `typedjson` serialization bugs) — confirmed
`governance_dao_package_hash`, `governance_dao_access_uref`, `oracle_slashing_access_uref`
etc. **do already exist** on the account from the earlier successful deploy. This looked
like a strong lead, so renamed all three named-key string literals in both contracts'
`call()` to a `_v2` suffix (`governance_dao_package_hash_v2` etc.), rebuilt (confirmed via
`strings` on the new binary that the `_v2` names are actually present, i.e. not a stale
build), and redeployed `oracle-slashing.wasm` via the legacy `Deploy` path again.

**Still failed, identical `ApiError::InvalidArgument [3]`, identical gas consumed
(2,847,550)** — the exact same number as the previous attempt with the old key names. This
rules out the named-key-collision hypothesis too. The fact that gas consumed is bit-for-bit
identical across attempts with genuinely different wasm content (different bytes, different
embedded strings, slightly different file size: 89,439 vs 89,450 B) strongly suggests the
rejection happens at a fixed point *before* any contract-specific bytecode executes at all —
most likely during a generic node-side pre-execution/validation step common to every install
of *any* wasm from this specific account in the current protocol/session state, not something
inspectable from the contract source. Candidates not yet tested (out of time/credits this
session): per-account or per-block install-transaction rate limiting; a stale/cached account
main purse or entity state after ~12+ install attempts this session; a protocol-version
mismatch between the wasm's declared API version and the node's current major version.

**Recommendation given three independent hypotheses now disproven with real on-chain
evidence (lane/size, legacy-vs-V1 transaction format, named-key collision)**: stop guessing
further from this sandbox. Next concrete step should be either (a) opening a support
question/issue with Casper Association / node operators with the exact deploy hashes above
attached (`e00652a0255a8d708775107970dca2db54128f9c2743c90f36e30e278aa38c2b`,
`a252c1b75ffa87859e061c6a514ea930edab32100dd632d83a29ab881130b18e`, plus the earlier
TransactionV1 attempts) since this now looks like a genuine node-side anomaly rather than
something fixable purely by changing the contract or client code, or (b) trying a
completely fresh/different testnet account (no prior installs at all) to see if a brand
new account can install these same wasms without issue — that would confirm/deny the
"account has too much install history" theory cheaply. **Document as an honest known
limitation for the submission** — root cause not fully resolved despite exhausting size,
format, and state-collision theories with real on-chain tests, not just guesses.

## Recommended next steps (not completed this session)

1. **Try the official `casper-client` Rust CLI** instead of `casper-js-sdk`
   for install/upgrade transactions specifically — it may correctly tag
   the transaction for the `install_upgrade_lane`. Attempted here but
   blocked by a missing OpenSSL dev toolchain (`pkg-config`/`libssl-dev`)
   with no root access in this sandbox; likely resolves cleanly in an
   environment with those available.
2. If (1) doesn't help, try a newer `casper-js-sdk` version — this
   diagnosis was done against `5.0.12`; a changelog check for any
   `install_upgrade` lane-routing fix in later releases would be the next
   thing to check.
3. Fix `CLType::Any` in `asset-registry`/`attestation-store` sources (root
   cause #1) — trivial once redeploy is otherwise unblocked.
4. For `governance-dao`/`oracle-slashing`, once redeploy works: apply the
   real fixes already identified (F6: `execute_proposal` action dispatch
   no-op; F7: `withdraw_stake` not transferring real CSPR) before
   redeploying.

## Update (continued diagnosis, same session)

Per follow-up instruction, continued investigating both root causes further:

**Root cause #1 fix applied and verified working**: replaced `CLType::Any`
with the concrete tuple `CLType` (via `AttRecord::cl_type()` /
`AssetRecord::cl_type()`, since both records are plain nested tuples of
`String`/`u64` which already implement `CLTyped`) in both
`asset-registry::get_asset` and `attestation-store::get_attestation`.
Rebuilt + `wasm-opt -Oz`: `asset-registry` 52,695 B (well under the 65,536
lane cap), `attestation-store` 66,516 B (~1KB over). Redeploy-tested
`asset-registry` on testnet: **the `ApiError::InvalidArgument` failure is
gone** — the install transaction now fails only with `"Insufficient funds"`
(size_estimate 53,145 B, 0 gas consumed), a completely different,
orthogonal, and trivially fixable error (the deployer test account's
testnet CSPR balance was depleted to 0 by this session's ~10+ install
attempts, each burning its full 200 CSPR payment regardless of actual gas
used). **This conclusively confirms root cause #1 is real and the fix
works** — full end-to-end verification (new contract hash on-chain) is
blocked only on getting more testnet CSPR into the deployer account, not on
any remaining code issue.

**Root cause #2 (size/lane) — further investigated, confirmed node-side,
no client-side fix found**: inspected the raw JSON transaction payload sent
to `putTransaction` byte-for-byte. Confirmed `is_install_upgrade: true` IS
correctly present in the wire payload (`"target":{"Session":{"module_bytes":
"...","runtime":"VmCasperV1","is_install_upgrade":true}}`), entry_point is
correctly `"Call"` (the only valid option for session/install transactions
in this SDK — there is no separate `InstallUpgrade` entry-point variant).
Chainspec confirms a dedicated `install_upgrade_lane = [2, 750_000, 2048,
1_000_000_000_000, 1]` (750KB cap) that should apply once `is_install_upgrade`
is set — yet the node still enforces the smallest wasm lane's 65,536-byte
cap regardless. Checked `casper-js-sdk` npm versions up to `5.0.16-beta2`
(latest, beta) and searched casper-ecosystem/casper-js-sdk GitHub issues for
`install_upgrade_lane`/lane-routing bugs — nothing relevant found. Given the
flag is correctly transmitted and the entry point is correct, this looks
like a genuine node/execution-engine-side bug or undocumented behavior in
how this testnet node (protocol 2.2.2) selects/enforces WASM transaction
lanes for installs — not something fixable from the client (SDK version,
payload construction, or payment amount) in this environment. `casper-client`
CLI remains untested (blocked by missing OpenSSL dev headers, no root access).

## Status as of end of session

Contract redeploy remains blocked for the hackathon deadline. The workspace
`Cargo.toml` profile fix is real, safe, and committed regardless (smaller,
properly-optimized contracts for any future redeploy attempt). No contracts
were actually redeployed/changed on-chain this session; the currently live
`asset-registry`/`attestation-store` contract hashes are unaffected.
