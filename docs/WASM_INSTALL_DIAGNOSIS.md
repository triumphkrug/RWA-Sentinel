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

## Status as of end of session

Contract redeploy remains blocked for the hackathon deadline. The workspace
`Cargo.toml` profile fix is real, safe, and committed regardless (smaller,
properly-optimized contracts for any future redeploy attempt). No contracts
were actually redeployed/changed on-chain this session; the currently live
`asset-registry`/`attestation-store` contract hashes are unaffected.
