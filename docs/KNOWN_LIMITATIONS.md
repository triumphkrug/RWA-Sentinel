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
  slashing/staking mechanism is not reachable on-chain in the current build. Needs: add
  `system::create_purse()` calls for both purses in `call()`, insert them into `named_keys`,
  redeploy.
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
- **BLS multi-oracle consensus (3-of-5)** — not implemented; single-oracle attestation only
  today. Roadmap item, not represented as working anywhere in the UI/docs.
- **TEE-attested compliance / on-chain ZK KYC** — deliberately not implemented for this
  submission; documented only as a future-direction roadmap note in the README, not claimed as
  a working feature anywhere.
