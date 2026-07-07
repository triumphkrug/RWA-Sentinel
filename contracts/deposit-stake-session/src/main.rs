//! Minimal session wasm for depositing real CSPR into `oracle-slashing`'s `stake_purse`
//! *before* calling `register_oracle`.
//!
//! `register_oracle` no longer takes a `source_purse: URef` arg (see
//! `contracts/oracle-slashing/src/main.rs` and `docs/KNOWN_LIMITATIONS.md` for why a
//! caller-supplied purse arg to a stored-contract entry point reliably reverted with
//! `Mint error: 4` on this network, even via the textbook session-wasm pattern). Instead,
//! deposits happen here, in session code that calls `system::transfer_from_purse_to_purse`
//! *directly* — no stored-contract call in between, so no entity-boundary access-rights
//! attenuation/extension is involved. This is the exact pattern from Casper's own
//! `writing-session-code.md` docs (the `transfer-to-purse` example), just targeting an
//! arbitrary known purse (the contract's `stake_purse`) instead of another account's main
//! purse. The target purse's own access bits (`Add` is sufficient — `transfer_from_purse_to_purse`
//! only requires `target.is_addable()`) are supplied by the caller, no ownership proof needed
//! for the target side; only the *source* (this session's own main purse) is validated against
//! the calling account's own context, which it always legitimately owns.
#![no_std]
#![no_main]

use casper_contract::contract_api::{account, runtime, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{URef, U512};

#[no_mangle]
pub extern "C" fn call() {
    let stake_purse: URef = runtime::get_named_arg("stake_purse");
    let amount: U512 = runtime::get_named_arg("amount");

    let source_purse = account::get_main_purse();

    system::transfer_from_purse_to_purse(source_purse, stake_purse, amount, None)
        .unwrap_or_revert();
}
