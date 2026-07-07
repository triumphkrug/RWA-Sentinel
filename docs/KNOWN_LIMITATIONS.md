# Known Limitations

Last verified against actual deployed contract source: 2026-07-07.

## Smart Contracts

- **`oracle-slashing`: stake/fee purses are never created by the installer.** `call()` never
  creates or registers `stake_purse`/`fee_purse` named keys (confirmed by reading
  `contracts/oracle-slashing/src/main.rs` — no `system::create_purse` call anywhere in the
  file, and the installer's `named_keys` map only contains `installer`, the oracle/report
  dictionaries, and the 4 counters/config urefs). `register_oracle` and `execute_slash` both
  call `runtime::get_key(STAKE_PURSE)`/`get_key(FEE_PURSE)` and `.unwrap_or_revert()` — so as
  currently deployed, both entry points will revert on any real invocation. The real-funds
  slashing/staking mechanism is not reachable on-chain in the current build.
  **Fix written and compiled (2026-07-07)**: `call()` now creates both purses via
  `system::create_purse()` and inserts them into `named_keys`. Not yet live on-chain — blocked
  on the same install-or-upgrade redeploy issue described below (confirmed to affect this
  contract too, even though it has no `CLType::Any` — see
  [docs/WASM_INSTALL_DIAGNOSIS.md](WASM_INSTALL_DIAGNOSIS.md) Update 4). Redeploy once that
  path is unblocked.
- **`attestation-store.batch_attest` requires a registered oracle, and the allow-list starts
  empty.** `dao_oracles` is initialized as an empty `Vec` at install time; there was no
  documented bootstrap step to register the first oracle. Discovered live on 2026-07-07 while
  building transaction volume (see [docs/TESTNET_ACTIVITY.md](TESTNET_ACTIVITY.md)) — 41 calls
  reverted with `ApiError::User(201)` before the deployer account was registered via
  `register_oracle` (installer-only). Fixed operationally (not a code bug — `register_oracle`
  already exists and works correctly); documenting so future sessions/agents don't waste calls
  rediscovering it. Any production onboarding flow should call `register_oracle` for each real
  oracle right after install.
- **`oracle-slashing.report_violation` will always revert as currently deployed (found 2026-07-07
  via AI-assisted code review, confirmed by reading source).** `call()` inserts the report counter
  as named key `"report_count"`, but `get_report_counter()`/`set_report_counter()` read/write the
  constant `REPORT_COUNTER_KEY = "report_counter"` — a one-character name mismatch (`report_count`
  vs. `report_counter`). `report_violation` calls `get_report_counter()` unconditionally, which
  will `unwrap_or_revert()` on the missing named key. Trivial one-line fix (`call()` should insert
  under `"report_counter"`, or the constant should read `"report_count"`) but needs a recompile +
  redeploy, which is still blocked on the main account (see the redeploy blocker above) and the
  fresh test account is nearly out of CSPR after this session's testing. Not yet fixed on-chain.
  `read_fee_bps()`/`FEE_BPS_KEY` has the same class of bug (never inserted into `named_keys` in
  `call()` at all) but is currently dead code — not called by any entry point yet, so it's latent,
  not user-facing today.
- **`attestation-store.slash_oracle` sends slashed stake directly to the installer's own account
  (found 2026-07-07 via AI-assisted code review, confirmed by reading source) — this is a real
  unilateral-withdraw path and violates the project's own A1/no-unilateral-withdraw invariant.**
  Unlike `oracle-slashing.execute_slash` (which always moves funds to a fixed `fee_purse`, never
  to a caller-controlled account — already verified safe), `attestation-store.slash_oracle` is
  installer-gated but then calls `system::transfer_from_purse_to_account(stake_purse, installer,
  ...)` — i.e. the same key that deploys/installs the contract can call this on any staked oracle
  and receive the slashed CSPR directly, with no DAO approval, multi-sig, or timelock. Needs a
  fix (route to a treasury purse or require DAO/multi-sig approval) before this can be called safe
  by the project's own stated security bar. Not yet fixed.
- **`attestation-store.dao_invalidate` does not verify any real cryptographic signatures (found
  2026-07-07 via AI-assisted code review, confirmed by reading source).** It takes `oracle_sigs:
  Vec<String>` and only checks whether each string is present in the (public) `dao_oracles`
  address list — i.e. it treats an oracle's own public address string as if it were that oracle's
  signature. Any caller who knows the registered oracle addresses (public data) can pass those
  same strings as "signatures" and satisfy the DAO threshold without any oracle actually signing
  anything. Needs real signature verification (e.g. `runtime::verify_signature` over a
  canonical message) before the DAO-invalidation flow can be considered a genuine multi-party
  control. Not yet fixed.
- **`oracle-slashing.register_oracle` redesigned (2026-07-07) to not need a `source_purse: URef`
  arg at all — code fix compiles cleanly, but not yet deployed on-chain.** Original design took a
  caller-supplied `source_purse: URef` and called `system::transfer_from_purse_to_purse` inside
  the entry point; 3 real on-chain attempts (direct `ContractCallBuilder`, and a session-wasm
  doing the textbook `account::get_main_purse()` + `runtime::call_contract()` pattern from
  Casper's own docs) all reverted with `Mint error: 4` (`InvalidAccessRights`) — traced through
  `casper-node` source (`execution_engine/src/runtime/mod.rs`, `runtime_footprint.rs`,
  `access_rights.rs`) without finding the exact root cause. **New design**: caller deposits real
  CSPR into the contract's already-public `stake_purse` first via a plain session
  (`contracts/deposit-stake-session/`, calls `system::transfer_from_purse_to_purse` directly, no
  stored-contract call in between — doesn't cross an entity boundary so none of the above
  access-rights issues apply), then calls `register_oracle(oracle_id, stake)` (no purse arg) —
  the entry point verifies the deposit really happened by reading the contract's own
  `system::get_purse_balance(stake_purse)` (a purse it fully owns, no caller URef needed) against
  a `total_staked` running-total uref, only accepting the claim if
  `live_balance >= total_staked + stake`. This is fully on-chain enforced, not a trusted claim.
  Also fixed in the same pass: the `report_counter`/`report_count` named-key mismatch (see below)
  and the never-inserted `fee_bps` named key.
  **Blocked on redeploy, new finding (2026-07-07)**: the fresh test account that successfully
  installed `oracle-slashing` + `kyc-gate` earlier this session failed its 3rd install/upgrade
  attempt (this fix) with the exact same `ApiError::InvalidArgument [3]` signature as the
  original main-account redeploy blocker (tiny gas consumed, revert before any real work) — this
  strongly suggests a **per-account cap on install/upgrade-lane transactions (looks like ~2)**
  rather than a permanently-broken-vs-fresh-account distinction as previously believed. Not
  confirmed with a controlled 3rd account yet (would cost more real CSPR — none refunds on this
  network, `refund` is always `0` even on revert). Code is ready and compiles; deployment is
  waiting on resolving this install-lane limit (fund + try a brand-new 3rd account, or find
  whether the cap resets after some time window).
- **`oracle-slashing.withdraw_stake` never moves real funds.** Access control is correct (only
  the oracle's registered owner can call it, capped to their own remaining stake), but the
  function only decrements the internal dictionary record — it never calls
  `system::transfer_from_purse_to_purse` to actually send CSPR back to the caller. Functionally
  a no-op on real balances today (this makes it "safe but broken" rather than an unauthorized-
  withdrawal risk — no way to over-withdraw since no funds move at all).
- **`governance-dao.execute_proposal` is not wired to a real on-chain proposal ID.** Off-chain
  proposals live only in agent memory; `create_proposal`/`vote`/`execute_proposal` on-chain
  entry points exist and have correct access control (`veto_proposal` is
  installer-gated via `is_installer()`), but the agent-side governance flow doesn't call them
  with matching numeric IDs yet. ~Half a day of integration work estimated.
- **No-unilateral-withdraw invariant (checked 2026-07-07)**: `governance-dao` has no fund-
  custody entry points at all (no purses, no transfers) — nothing to unilaterally withdraw.
  `oracle-slashing.execute_slash` is public (anyone can trigger slashing of any oracle after
  the challenge period, by design for permissionless dispute resolution) but always moves
  funds to the fixed `fee_purse`, never to the caller's own address — so even once the purse-
  creation bug above is fixed, a caller cannot self-enrich by invoking `execute_slash`.
  `withdraw_stake` is correctly owner-gated. No unilateral-withdraw path found in either
  contract as currently written.
- **Redeploy blocker for the `CLType::Any` fix** (`asset-registry`/`attestation-store`): a fix
  for a rejected entry-point return type is present in source but has not been successfully
  redeployed to the live contracts — install transactions fail with
  `ApiError::InvalidArgument [3]` for reasons not fully root-caused despite two full sessions
  of testing (lane/size, transaction format, named-key collision, payment/pricing-mode all
  ruled out with real on-chain evidence). See `docs/WASM_INSTALL_DIAGNOSIS.md` for the full
  investigation log. The currently-live contract hashes (see README) are unaffected by this —
  they're the pre-fix versions, already working.

## Agent

- **GLEIF/company data**: real API calls with a synthetic-invoice fallback when no LEI is
  found or the API is unreachable — always labeled in logs. See README "What Is Real vs.
  Simulated".
- **History lookups return zero** — `lookupIssuerHistory` and `lookupDebtorHistory` are stubs
  returning 0, reducing scoring accuracy for issuers/debtors without prior on-chain history.
- **Cross-reference has no effect** — `hasCrossRef` is hardcoded to `false` in the scoring
  context; the `CrossRefChecker` output is computed but not consumed.
- **Fallback cache is unused** — `FallbackCache`/`StalenessDetector` are initialized but never
  queried by the pipeline.

## General

- **No persistent state / scheduler** — the agent runs as a one-shot script; production use
  would need a scheduler or long-running process.
- **BLS multi-oracle consensus (3-of-5)** — the off-chain crypto (`agent/src/crypto/blsThreshold.ts`,
  real BLS12-381 sign/aggregate/pairing-verify, `/api/v1/consensus/*`) is real and wired in
  (fixed a stale doc claim of "not implemented" on 2026-07-07 — see README's What Is Real table).
  What's still not done: the on-chain `attestation-store` contract accepts single-oracle
  attestation only and doesn't require/verify the aggregated threshold signature on-chain.
- **KYC gate** — `contracts/kyc-gate/` (new 2026-07-07) is a real contract modeled on the
  official `casper-ecosystem/kyc-proxy-contract` reference, compiles cleanly, but is not yet
  deployed or wired into `asset-registry`/`attestation-store` (blocked on the same redeploy
  issue as everything else needing an upgrade). Replaces the previous TEE/ZK-KYC "future
  direction" note with real, ready code instead of an invented-from-scratch plan.
- **TEE-attested compliance / on-chain ZK KYC** — deliberately not implemented for this
  submission (see kyc-gate above for the lower-risk real alternative that was built instead);
  documented only as a future-direction roadmap note in the README, not claimed as
  a working feature anywhere.
