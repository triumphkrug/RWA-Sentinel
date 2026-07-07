//! Minimal session wasm for calling `oracle-slashing.register_oracle`.
//!
//! `register_oracle` needs a real `source_purse: URef` runtime arg to move a
//! real CSPR stake into the contract's internal stake purse. A direct
//! stored-contract-call transaction (no session code) cannot supply this: the
//! callee's execution context builds its access-rights table from its own
//! `AddressableEntity` footprint (see `RuntimeFootprint::extract_access_rights`
//! in casper-node), which for a contract entity has no `main_purse` and none
//! of the caller's named keys — so any URef arg naming the caller's main
//! purse gets clamped to `AccessRights::NONE` regardless of what access bits
//! are encoded in the CLValue, and the mint's internal
//! `if !source.is_writeable() { return Err(InvalidAccessRights) }` check
//! (storage/src/system/mint.rs) reverts with `Mint error: 4`.
//!
//! The fix is to run this as *session* code under the caller's own account
//! context (which *does* have its main purse in its footprint), obtain the
//! purse via `account::get_main_purse()`, and call the stored contract from
//! there — the call_contract host function extends the callee's access
//! rights with the URef args the session already legitimately holds.
#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;

use casper_contract::contract_api::{account, runtime};
use casper_types::{contracts::ContractHash, runtime_args, U512};

#[no_mangle]
pub extern "C" fn call() {
    let contract_hash: ContractHash = runtime::get_named_arg("contract_hash");
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let stake: U512 = runtime::get_named_arg("stake");

    let source_purse = account::get_main_purse();

    runtime::call_contract::<()>(
        contract_hash,
        "register_oracle",
        runtime_args! {
            "oracle_id" => oracle_id,
            "stake" => stake,
            "source_purse" => source_purse,
        },
    );
}
