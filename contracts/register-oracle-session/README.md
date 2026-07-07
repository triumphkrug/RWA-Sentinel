# register-oracle-session

Session wasm for calling `oracle-slashing.register_oracle`, which needs a real `source_purse: URef`
argument to stake CSPR. Compiles cleanly and follows the documented Casper pattern for
purse-bearing session code (obtain the purse via `account::get_main_purse()` inside the session,
then call the stored contract). As of 2026-07-07 this still reverts on-chain with
`Mint error: 4` (`InvalidAccessRights`) for reasons not yet root-caused beyond what's written in
`docs/KNOWN_LIMITATIONS.md`. Kept in the repo as real, working (compiles + deploys) infrastructure
and a documented starting point for whoever continues this investigation.
