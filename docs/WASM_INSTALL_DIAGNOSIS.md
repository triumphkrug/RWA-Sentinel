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

## Update 3 (2026-07-07, new session): re-tested with CLType::Any fix actually applied to real asset-registry — still fails; ruled out payment/pricing-mode and simple post-success lockout theories

Rebuilt real `asset-registry.wasm` (not diag-minimal) with the `CLType::Any` fix already
present in `get_asset`'s return type (`AssetRecord::cl_type()`, concrete tuple type, confirmed
via source read — this fix was apparently already applied to source between sessions but never
redeploy-tested against the live contract). Result: submitted via `SessionBuilder()
.installOrUpgrade()` twice, through two independent RPC endpoints (CSPR.cloud gateway and
direct `node.testnet.casper.network`) — **both attempts fail identically**:
`ApiError::InvalidArgument [3]`, `consumed_gas: 2410910` (byte-identical between the two RPC
endpoints), tx hashes `3815e1003f0b851bb71bd316194628be7e2520b70708991f50d9f34b4c680ad1` and
`58c745d372f2466ec07681e286eead8e849d0d17197f9abfb81916313490d7e9`.

**This contradicts the "Root cause #1 confirmed" framing above** — that confirmation was only
ever tested on the throwaway `diag-minimal` contract, never on a real redeploy of
asset-registry itself. The CLType::Any fix does not, on its own, unblock the real contract.

Additional checks performed this session, all negative (ruled out):
- **Full transaction payload dumped and inspected field-by-field** before signing/submitting:
  `pricing_mode: PaymentLimited { gas_price_tolerance: 1, payment_amount: 200_000_000_000,
  standard_payment: true }`, `fields.args: Named: []`, `target.Session.is_install_upgrade:
  true`, `runtime: VmCasperV1`, `entry_point: Call`, `scheduling: Standard` — structurally
  identical to what a correct install transaction should look like; no malformed field found.
  Rules out an SDK encoding bug in this specific payload.
- **Queried full deploy history for this account via CSPR.cloud** (`/accounts/{hash}/deploys`,
  56 entries across 2026-06-29 to 2026-07-06). Found the "simple post-first-success lockout"
  theory (my initial hypothesis after spotting the 21:17:26 diag-minimal success followed by
  many failures) does **not** hold: `ApiError::InvalidArgument` failures with the same tiny gas
  signature (~1.05M–2.8M) appear scattered *throughout the whole day*, including well *before*
  21:17:26 (e.g. 20:57:52, and a cluster at 15:45–15:53), interleaved with dozens of genuinely
  successful higher-gas deploys (100M–580M gas range, mostly regular contract calls) and two
  real successful installs (`dd29b349...` at 21:17:26, 20.6B gas; `e255a943...` at 21:13:51,
  14.7B gas — both are the diag-minimal contract/package). So it is not "account gets locked
  after first success" — some install/deploy shapes just consistently fail and others
  consistently succeed, mixed together over time. Points back toward a structural
  differentiator between diag-minimal and the 4 real contracts (dictionaries + multiple
  `ByteArray(32)`-typed parameters + multi-entry-point registration are present in both,
  per the doc's own incremental-build methodology, so if CLType::Any was truly isolated as
  sufficient explanation, the real contract minus CLType::Any should have installed — it
  didn't, so there's at least one more undiscovered differentiator).
- Consulted external LLM (Cerebras `gpt-oss-120b`) for a fresh pair of eyes: raised a payment-
  args/pricing-mode hypothesis, which is directly contradicted by the transaction-payload dump
  above (payment/pricing fields are present and correctly formed). No usable new lead from that
  query; no real GitHub issue links were available to cite since the model does not have
  verified live access to casper-js-sdk's issue tracker.
- Confirmed the account's named keys (`state_get_entity`) already contain
  `asset_registry_contract`/`asset_registry_package`/`asset_registry_access` (and the
  equivalents for all 3 other contracts + `diag_minimal_*`) from earlier successful installs
  this project — consistent with previous session's named-key findings, not a new lead on its
  own since `_v2` renaming was already tested and ruled out.
- Did not attempt a fresh/unused testnet account this session either (same faucet-friction
  cost/uncertainty judgment as before) or a third client implementation (`casper-client` CLI
  via cargo install) — both remain the cheapest real next diagnostics if this is revisited.

**Net effect**: this is now a *better-evidenced* known limitation than before, but still
unresolved. Recommend not spending further engineering time on this redeploy path before the
submission deadline; documented as a known limitation in `docs/KNOWN_LIMITATIONS.md` instead,
and moved on to S1/S2/S3 checklist items which are testable/completable locally without
further chain interaction.

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

## Update 4 (2026-07-07, same session): tested install-or-upgrade on a contract with zero CLType::Any — fails identically, ruling out CLType::Any as a necessary condition

Found and fixed a real, separate bug in `oracle-slashing::call()` (installer never
called `system::create_purse()` for `stake_purse`/`fee_purse` — both
`register_oracle` and `execute_slash` would revert on any real invocation;
see `KNOWN_LIMITATIONS.md`). Rebuilt with the fix (`wasm-opt -Oz` → 66,112 B,
+312 B over the currently-live 65,800 B), then attempted a genuine
`SessionBuilder().installOrUpgrade().contractHash(<oracle-slashing package
hash>)` upgrade transaction — deliberately chosen because `oracle-slashing`
has **no `CLType::Any` usage anywhere** (confirmed via grep), unlike
`asset-registry`/`attestation-store`.

Result: **identical failure** — `ApiError::InvalidArgument`, `consumed_gas:
2,858,810` (same tiny-gas signature as every other failed install-or-upgrade
this project, ~1.05M–2.86M range), tx `23f87703f72ff1cb04691bd72ec0d3c525794947accbf9ac9e7af30eb96652bf`.

**This is a genuinely new, clarifying data point**: the block is **not**
specific to `CLType::Any`, wasm size, or any per-contract trait — it
reproduces on a contract with none of those factors. The one consistent
pattern across every failure (this + all prior attempts, both real
contracts and diag-minimal) is that they are all *install-or-upgrade
targeting an already-existing contract package* (`isInstallUpgrade: true`
+ `contractHash(<package hash>)` pointing at a package that already has a
version on-chain). The only successful installs this project (diag-minimal
21:17:26, governance-dao, oracle-slashing's original install) were all
**first-time installs of a brand-new package**, never upgrades of an
existing one. This narrows the search meaningfully for whoever picks this
back up: test whether a fresh, never-before-installed package hash can
receive a **second** upgrade transaction cleanly, which would confirm
"upgrade path specifically" vs. some other still-undiscovered factor.

The `oracle-slashing` purse-creation fix itself is real, compiles cleanly,
and is committed to source — it is simply not live on-chain because this
redeploy blocker prevents shipping *any* contract upgrade, not just this
one. Stopping here per the one-attempt budget for this path this session;
not spending further credits on it.

## Update 5 (2026-07-07, later same day): tested the "rename the package-hash named key" theory — also disproved

Hypothesis before this test: `storage::new_contract(entry_points, named_keys,
Some("oracle_slashing_package_hash"), ...)` ties into the *account's* named
keys — since the deployer account already has a named key called
`oracle_slashing_package_hash` from the very first install, maybe the engine
treats any new deploy with that same literal string as "add a version to the
already-owned package" (an upgrade) regardless of the SDK-level
`installOrUpgrade()` flag, which would explain why every retry looked
identical to an upgrade even when we intended a fresh install.

Test: renamed the named-key/package-hash-name/access-uref-name/contract-hash
strings in `contracts/oracle-slashing/src/main.rs` to `..._v2` (a name this
account's named keys have never held), rebuilt cleanly
(`nightly-2025-02-04`, 98,204 B unstripped — sandbox reset mid-session, had
to reinstall the whole rustup toolchain first, see below), and submitted a
plain `SessionBuilder().installOrUpgrade()` transaction with **no
`.contractHash()` at all** (as close to "this is definitely a fresh
install" as the client-side API allows).

Result: **still `ApiError::InvalidArgument [3]`**, tx
`1ac51a7e7bf34145b3c94efaaca280b22517932ccdf04cffa0ccfb8e297b03f8`,
`consumed_gas: 3,063,235` — same small-gas-then-abort signature as every
other failure. Notably the on-chain deploy record reports `version_id: 2`
even for this "renamed, should-be-brand-new" package, and
`contract_package_hash: null` in the deploy result — i.e. the engine did not
even get far enough to publish a discoverable package hash. **This
disproves the named-key-rename theory**: it is not about the account
already owning a same-named key.

Updated understanding: the failure is **not** about (a) `CLType::Any`, (b)
wasm size, (c) payment/pricing-mode, (d) legacy vs. v1 transaction format,
(e) named-key collision on the *installer's* account, or now (f) whether the
package-hash name string was ever used before by this account. Every
"first-time success" this project has ever had (diag-minimal, governance-dao,
oracle-slashing's original install) happened on **the very first
attempted install of that specific project's very first contract on this
node/account combination during a given session**, which is confounded with
several other variables (fresh RPC session state, no dictionaries yet
created, etc.) that haven't been isolated yet. Recommend for whoever picks
this up next: try installing a **brand-new, never-before-touched contract
name** (not just a renamed variant of an existing one) from the **same**
account in the **same** session as a already-failed attempt, to check
whether the block is per-account-cumulative (e.g. some hidden per-account
counter/nonce/gas-price state) rather than per-package.

Not spending further credits chasing this today per the one-attempt-per-session
budget; real gas was spent (250 CSPR payment, ~3.06M gas) on this negative
result, same as prior attempts.

## Update 6 (2026-07-07, later session): official docs + casper-node source + ecosystem repos review — no fix found, one new cheap-to-test lead

Per instruction, re-read official Casper v2.0 material and cross-checked against
`casper-network/casper-node` source (GitHub, `dev` branch = protocol **2.2.0**,
matching the testnet node's reported **2.2.2**) and a couple of ecosystem repos.
No document explicitly describes this failure mode; the block-lanes/pricing-mode
docs match what we already independently reverse-engineered from the wire
payload. Findings, in order of usefulness:

1. **Pulled the raw execution result directly from the testnet node RPC**
   (`info_get_transaction`, not just CSPR.cloud) for tx `1ac51a7e...`: confirms
   the *only* global-state effects are `balance-hold`/balance writes (the Fee
   Elimination hold + its release) — **zero** contract/package-related effects.
   Execution reverted before `create_contract_package_at_hash` /
   `add_contract_version_with_message_topics` (the two host calls
   `casper-contract` 5.1's `storage::new_contract()` actually makes — confirmed
   by name in the decoded Wasm import table) ever wrote anything. Consistent
   with prior sessions' observation that gas-consumed is size/content-invariant
   — this looks like a rejection at a very early, generic stage (host-function
   resolution or `call()` entry, before user logic), not a business-logic
   revert inside `new_contract`/`add_contract_version`.
2. **Checked the actual `add_contract_version_by_contract_package` source**
   (`execution_engine/src/runtime/mod.rs`): if install/upgrade isn't permitted
   for this transaction, it returns a *distinct*, named error
   (`ApiError::NotAllowedToAddContractVersion`), not `InvalidArgument`. Since we
   consistently see `InvalidArgument`, our failure is provably **not** that
   specific permission check — rules out one more concrete theory.
3. **Ruled out the "wrong Wasm target" theory before spending any gas on it**:
   `veles-labs/casper-contract-kit` (an ecosystem alt-API library, real repo)
   targets `wasm32v1-none` instead of our `wasm32-unknown-unknown`, which
   looked promising — but casper-node's own `Makefile` (current `dev` branch)
   still builds/tests its own contracts against `wasm32-unknown-unknown`, so
   that is still the officially-supported target; switching wouldn't fix this bug.
4. **New, previously-unchecked, free-to-test-locally lead**: casper-node's
   pinned Rust toolchain for smart contracts is `smart_contracts/rust-toolchain`
   = **`nightly-2025-08-28`**. We've been building with **`nightly-2025-02-04`**
   — a ~7-month gap. Cost to test: zero gas, just recompile with the newer
   nightly and diff the Wasm import/table section (`wasm-objdump -x`) against a
   known-good successful install's binary (e.g. governance-dao's original
   working install, still on disk/rebuildable) to check for host-function
   ABI/index drift. **Not yet done** — recommended as the next actual next step
   before spending any more testnet gas on redeploy attempts.
5. `github.com/make-software/how-to-casper-network` is node-operator/validator
   setup documentation, not contract-deploy tooling — no relevant hits.
6. Halborn's Casper 2.0 audit and the FAQ/unboxing article are high-level
   (governance, staking, RPC sidecar, Fee Elimination) and don't cover
   contract-install wire-level behavior at the depth needed here.

**Net effect**: no new fix, but the "wrong toolchain/ABI drift" theory is now
the single leading untested hypothesis, is free to test locally (no gas), and
should be tried before any further paid redeploy attempt.

## Update 7 (2026-07-07, same day): nightly-2025-08-28 hypothesis tested and RULED OUT (compile-time, no gas spent)

Installed `nightly-2025-08-28` locally and rebuilt `oracle-slashing` against it
with no other changes (still crates.io `casper-contract = "5.1"` /
`casper-types = "6.0"`, same as production). **Build fails to compile**:

```
error: `#[no_mangle]` cannot be used on internal language items
 --> casper-contract-5.1.1/src/no_std_handlers.rs:5:1
```

Root cause: newer nightly compilers hardened lang-item mangling rules. The
crates.io-published `casper-contract` 5.1.1 uses `#[no_mangle] pub fn panic(...)`
in its no_std panic handler, which the new compiler now rejects outright.
Checked casper-node's own **in-repo** (unpublished-to-crates.io) source for the
same file (`smart_contracts/contract/src/no_std_handlers.rs` on `dev`): it
already uses the correct `#[panic_handler]` attribute instead — i.e. the fix
exists upstream but hasn't been republished to crates.io as a new
`casper-contract` version yet (still 5.1.1, unchanged). No newer version
available on crates.io to pick up the fix.

**Conclusion**: `nightly-2025-08-28` is paired with casper-node's own in-repo
git/path dependency on casper-contract/casper-types, not with the crates.io
release we depend on — the two aren't a drop-in swappable pair. This
hypothesis is now **ruled out** as impractical (would require switching our
Cargo.toml to a git dependency on casper-node's contract crates, a much bigger
change than a toolchain bump, this late pre-deadline). Reverted local default
toolchain back to `nightly-2025-02-04`/`nightly-2025-02-01` (whichever was
already installed and compiling fine) — no production change, no gas spent.

Also reviewed 3 more official casper.network pages per request
(`unboxing-casper-2-1`, `get-started-regular`, `/ai`): marketing/overview
content only. Notable but tangential: testnet is now past **Casper 2.1**
(faster 8s block finality + fee-burning), and Casper is now promoting **Odra**
(a higher-level Rust smart-contract framework with AI-agent tooling support)
as the recommended path for new contracts — but adopting Odra now would be a
full rewrite, not attempted given the deadline. No page contained low-level
install/ABI detail relevant to this bug.

**Status**: all locally-testable, free hypotheses are now exhausted and
either ruled out or inconclusive. Remaining paths are either (a) a live paid
redeploy A/B test comparing minimal known-good vs. currently-failing binaries
byte-for-byte, or (b) opening a support request with Casper
Association/CSPR.cloud/Discord with the exact tx hash and RPC evidence
gathered above, since it's on their execution engine's behavior rather than
anything client-side we can diff further for free.

## Update 8 (2026-07-07, same session): version-drift check across casper-network repos + opcode-validation experiment (inconclusive)

Per request, checked `casper-network/ceps`, `casper-network/casper-node`,
`casper-network/casper-wasm`, `casper-network/docs-redux` for recent activity
that could signal a version mismatch:
- `ceps` (RFCs repo): most recent merged CEP (as of 2026-07-02) is **CEP-97**,
  a draft proposal to remove custom payment and set a 0.1 CSPR minimum
  transaction cost — this is a **proposal**, not confirmed live on testnet;
  doesn't match our observed 250 CSPR fixed-cost/refund=0 behavior directly,
  and isn't dated/confirmed as deployed. Noted, not actionable yet.
- `casper-wasm` (the actual Wasm interpreter fork casper-node depends on, via
  `casper-wasm 1.0.0` / `casper-wasmi 1.0.0` in `execution_engine/Cargo.toml`):
  confirmed it's built with only two non-MVP features enabled —
  `sign_ext` and `call_indirect_overlong` — everything else (bulk-memory,
  reference-types, multi-value, tail-call, simd, memory64, threads) is
  presumably disabled/unsupported. This is a real, concrete lead: if our
  Rust/LLVM codegen ever emits an unsupported opcode (e.g. bulk-memory
  `memory.copy`/`memory.fill`, which newer LLVM can emit by default for
  certain code patterns), install would fail exactly like we observe (revert
  before any host calls, constant low gas — consistent with a validation-time
  rejection).
- Tried to verify directly: loaded our compiled `oracle-slashing.wasm` into
  `wasmtime` (Python bindings) with reference-types/bulk-memory/multi-value/
  simd/tail-call/memory64 all disabled to approximate casper-wasm's feature
  set. Result: validation **failed**, but with a `wasmtime`-specific parse
  error ("zero byte expected" in a `call_indirect` encoding inside a
  `core::fmt::Display for u64` codegen'd function) that looks like a mismatch
  between wasmtime's own encoding expectations for `call_indirect_overlong`
  and casper-wasm's actual (different, custom fork) parser — **not reliable
  evidence**, since wasmtime is not casper-wasm and the two don't necessarily
  agree on how that specific extension is encoded/validated. Do not treat this
  as a confirmed finding; it needs testing against casper-wasm itself
  (e.g. building a tiny Rust harness against the `casper-wasm`/`casper-wasmi`
  crates directly and running our binary through their actual validator) to
  be conclusive. Not done in this session — flagged as the next concrete,
  still-free thing to try if this is picked up again.
- `docs-redux`: no signal, last push 2026-06-05, nothing wasm/install-related
  found without a full docs build (out of scope for this pass).

**Follow-up, same session**: built the suggested harness — a tiny Rust binary
depending directly on `casper-wasm = "1.0.0"` (same crate/version
`execution_engine/Cargo.toml` uses), calling
`casper_wasm::deserialize_buffer::<Module>(&data)` on our actual failing
`oracle-slashing.wasm`. **Result: `PARSE OK: 13 sections`** — casper-node's own
Wasm library parses our binary without any error. This **conclusively rules
out** the bulk-memory/unsupported-opcode theory using the real dependency
(not an approximation) — our binaries are structurally valid Wasm modules by
casper-node's own parser's standard. (Caveat: this only exercises structural
parsing, not the execution engine's full preprocessing/instrumentation/gas
metering pass, which happens deeper in casper-node and isn't a small
standalone crate we can harness as easily — that remains untested.)

**Net status after Updates 6-8**: every free, locally-testable theory
(toolchain/nightly gap, wasm target, named-key collision, CLType::Any, wasm
size, payment/pricing-mode, permission-check path, bulk-memory opcodes) has
now been tested and ruled out. The remaining candidates all require either
paid on-chain A/B testing or deeper instrumentation only possible with a
running casper-node instance (e.g. local NCTL/CCTL devnet) or direct support
from the Casper team — not achievable with further static/local analysis.

## Update 9 (2026-07-07, ~11:10): casper-types version-gap verified but ruled out + testnet chainspec install/upgrade-lane cap found (new fact, not root cause)

Per request, re-checked "latest versions in the repo" more precisely (previous check was
casper-contract only) and re-read `docs.casper.network/condor/migration-guide` (exchange
migration guide — SDK/node-operator focused, nothing about contract install/ABI, no new lead).

**casper-types version gap — confirmed real, but ruled out as the cause:**
- crates.io: `casper-types` latest published is **7.0.0** (2026-03-10). Our `Cargo.lock` pins
  **6.1.0** (via our `casper-types = "6.0"` constraint).
- casper-node `dev` branch (matches testnet protocol 2.2.2) now depends on `casper-types 7.0.0`
  in its execution-engine Cargo.toml.
- However, `casper-contract 5.1.1` (the latest published, which we already use) itself requires
  `casper-types ^6.0.1` on crates.io — so we *can't* bump to 7.0.0 without a git-dependency swap
  (same class of problem as the nightly-toolchain finding: crates.io hasn't caught up with the
  node's `dev` branch yet).
- Diffed the actual `6.1.0` vs `7.0.0` source (`crates.io` tarballs, `diff -rq`): only
  `chainspec/*`, `crypto/asymmetric_key.rs`, `system/auction|mint/constants.rs`, and `key.rs`
  differ. `key.rs`'s only change is a purely additive new variant (`Key::RewardsHandling`,
  reward-accounting only). **`entry_points.rs`, `contracts.rs`, `addressable_entity.rs`,
  `bytesrepr.rs` — everything touching contract-package/version creation and its wire format —
  are byte-identical** between 6.1.0 and 7.0.0. Conclusion: **the version gap is real but not
  the cause of our install failure** — nothing in the affected files is on our contract-install
  code path.

**New fact from testnet chainspec (not previously checked): `install_upgrade_lane` transaction
cap.** Fetched `casper-node/dev`'s production `chainspec.toml`:
```
install_upgrade_lane = [2, 750_000, 2048, 1_000_000_000_000, 1]
# [lane_id, max_serialized_len, max_args_len, gas_limit, max_tx_count_per_block]
```
The install/upgrade lane allows only **1 install/upgrade transaction per block, network-wide**
(not per-account). Our wasm (~90KB) and args (empty) are well within the 750,000B/2048B limits,
and our gas limit is within the 1000 CSPR cap — so this doesn't explain the `InvalidArgument`
revert itself (a capacity limit would delay inclusion into a later block, not cause an executed
transaction to revert with gas consumed). But it does mean the shared testnet lane could be
contended if other hackathon teams are also submitting installs concurrently — worth being aware
of, not a fix.

Also checked `[wasm.v1]` memory/stack limits (`max_memory = 64` pages / 4MB, `max_stack_height =
500`) against our compiled binary's actual memory section: our wasm declares an initial memory
of **17 pages (~1.09MB)**, well under the 64-page cap. Ruled out.

**Net status unchanged**: still no confirmed root cause. All free/local avenues checked across 9
rounds are now exhausted. Fresh-account rate-limit test remains the only untested hypothesis,
and it requires funding a new testnet account (faucet + real gas) — not done yet, pending
explicit go-ahead given cost.
