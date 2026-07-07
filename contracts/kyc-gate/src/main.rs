#![no_std]
#![no_main]

//! RWA Sentinel — KYC Gate.
//!
//! S4 (2026-07-07): "legitimize an already-planned feature via an official
//! reference instead of inventing from scratch". The project's earlier plan
//! for compliance/KYC was TEE-attested + on-chain zkSNARK KYC proofs
//! (README/ROADMAP "future direction" bullet) — deliberately not built
//! because it's high-risk, experimental scope for a hackathon deadline.
//!
//! This contract replaces that vague, risky plan with a real, simple,
//! previously-shipped Casper ecosystem pattern: a KYC *proxy/gate* that asks
//! one or more registered KYC-provider contracts "is this account KYC
//! proved?" and aggregates the answer. Modeled directly on
//! <https://github.com/casper-ecosystem/kyc-proxy-contract> (official
//! casper-ecosystem reference, `is_kyc_proved(account, index) -> bool`
//! entry point contract), adapted to this project's newer
//! casper-contract 5.1 / casper-types 6.0 addressable-entity API and error
//! code conventions (rather than the reference's older classic-contract
//! API). No ZK, no TEE, no invented cryptography — just an on-chain
//! allow-list of trusted KYC-provider contracts and a boolean check, exactly
//! like the reference. An asset-registry/attestation-store integration would
//! call `is_kyc_proved` before registering a new asset issuer; that wiring
//! is not done yet (would require an upgrade to those contracts, which hits
//! the redeploy blocker documented in docs/WASM_INSTALL_DIAGNOSIS.md) — this
//! contract is written, compiles cleanly, and is ready to deploy/wire in
//! once that blocker is resolved. Real code, not yet live — same
//! transparency policy as the oracle-slashing purse fix.

extern crate alloc;

use alloc::string::ToString;
use alloc::vec;

use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::contracts::ContractPackageHash;
use casper_types::{
    runtime_args, ApiError, CLType, CLTyped, CLValue, EntityEntryPoint, EntryPointAccess,
    EntryPointPayment, EntryPointType, EntryPoints, Key, Parameter,
};

// ── Error codes (400-499 range, doesn't collide with other contracts'
//    100/200/300 ranges) ─────────────────────────────────────────────────

const ERR_UNAUTHORIZED_INSTALLER: u16 = 400;
const ERR_PROVIDER_NOT_FOUND: u16 = 401;
const ERR_INVALID_PROVIDER_KEY: u16 = 402;

// ── Storage keys ─────────────────────────────────────────────────────────

const PROVIDERS_DICT: &str = "kyc_providers"; // provider_index (as string) -> ContractPackageHash; provider hash (as string) -> is_active bool
const PROVIDER_COUNT: &str = "provider_count";
const INSTALLER_KEY: &str = "installer";

// ── Helpers ────────────────────────────────────────────────────────────

fn is_installer() -> bool {
    let installer_key = runtime::get_key(INSTALLER_KEY).unwrap_or_revert();
    let installer_account = installer_key.into_account().unwrap_or_revert();
    let caller: AccountHash = runtime::get_caller();
    caller == installer_account
}

fn provider_count() -> u64 {
    let uref = runtime::get_key(PROVIDER_COUNT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

fn set_provider_count(n: u64) {
    let uref = runtime::get_key(PROVIDER_COUNT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::write(uref, n);
}

fn provider_hash_from_key(key: Key) -> ContractPackageHash {
    match key {
        Key::Hash(hash_addr) => ContractPackageHash::new(hash_addr),
        _ => runtime::revert(ApiError::User(ERR_INVALID_PROVIDER_KEY)),
    }
}

// ── Entry points ─────────────────────────────────────────────────────────

/// Registers a new KYC-provider contract (installer-only). The provider
/// must expose an `is_kyc_proved(account: Key) -> bool` entry point — same
/// interface convention as the official kyc-proxy-contract reference (this
/// gate omits the reference's optional `index: Option<U256>` provider-slot
/// argument since this project only expects one active record per account).
#[no_mangle]
pub extern "C" fn add_provider() {
    if !is_installer() {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_INSTALLER));
    }
    let provider_key: Key = runtime::get_named_arg("provider");
    let provider_hash = provider_hash_from_key(provider_key);
    let provider_str = provider_hash.to_string();

    let dict_uref = *runtime::get_key(PROVIDERS_DICT)
        .unwrap_or_revert()
        .as_uref()
        .unwrap_or_revert();

    if storage::dictionary_get::<bool>(dict_uref, &provider_str)
        .unwrap_or_revert()
        .is_none()
    {
        let count = provider_count();
        storage::dictionary_put(dict_uref, &count.to_string(), provider_hash);
        storage::dictionary_put(dict_uref, &provider_str, true);
        set_provider_count(count + 1);
    }
}

/// Marks a previously-registered provider as inactive (installer-only).
/// Banned providers are skipped by `is_kyc_proved` without being called.
#[no_mangle]
pub extern "C" fn ban_provider() {
    if !is_installer() {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_INSTALLER));
    }
    let provider_key: Key = runtime::get_named_arg("provider");
    let provider_str = provider_hash_from_key(provider_key).to_string();
    let dict_uref = *runtime::get_key(PROVIDERS_DICT)
        .unwrap_or_revert()
        .as_uref()
        .unwrap_or_revert();

    match storage::dictionary_get::<bool>(dict_uref, &provider_str).unwrap_or_revert() {
        Some(_) => storage::dictionary_put(dict_uref, &provider_str, false),
        None => runtime::revert(ApiError::User(ERR_PROVIDER_NOT_FOUND)),
    }
}

/// Restores a previously-banned provider (installer-only).
#[no_mangle]
pub extern "C" fn unban_provider() {
    if !is_installer() {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_INSTALLER));
    }
    let provider_key: Key = runtime::get_named_arg("provider");
    let provider_str = provider_hash_from_key(provider_key).to_string();
    let dict_uref = *runtime::get_key(PROVIDERS_DICT)
        .unwrap_or_revert()
        .as_uref()
        .unwrap_or_revert();

    match storage::dictionary_get::<bool>(dict_uref, &provider_str).unwrap_or_revert() {
        Some(_) => storage::dictionary_put(dict_uref, &provider_str, true),
        None => runtime::revert(ApiError::User(ERR_PROVIDER_NOT_FOUND)),
    }
}

/// Asks each active registered provider in turn "is this account KYC
/// proved?" (via `call_versioned_contract`) and returns `true` on the first
/// provider that confirms, `false` if none do or no providers are
/// registered. Same aggregation semantics as the official reference
/// contract's `is_kyc_proved`.
#[no_mangle]
pub extern "C" fn is_kyc_proved() {
    let account: Key = runtime::get_named_arg("account");
    let dict_uref = *runtime::get_key(PROVIDERS_DICT)
        .unwrap_or_revert()
        .as_uref()
        .unwrap_or_revert();
    let count = provider_count();

    let mut proved = false;
    for i in 0..count {
        if let Some(provider_hash) =
            storage::dictionary_get::<ContractPackageHash>(dict_uref, &i.to_string())
                .unwrap_or_revert()
        {
            let is_active: bool =
                storage::dictionary_get::<bool>(dict_uref, &provider_hash.to_string())
                    .unwrap_or_revert()
                    .unwrap_or(false);
            if !is_active {
                continue;
            }
            let result: bool = runtime::call_versioned_contract(
                provider_hash,
                None,
                "is_kyc_proved",
                runtime_args! { "account" => account },
            );
            if result {
                proved = true;
                break;
            }
        }
    }

    runtime::ret(CLValue::from_t(proved).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    let providers_dict = storage::new_dictionary(PROVIDERS_DICT).unwrap_or_revert();
    let provider_count_uref = storage::new_uref(0u64);

    let mut named_keys = NamedKeys::new();
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));
    named_keys.insert(PROVIDERS_DICT.into(), providers_dict.into());
    named_keys.insert(PROVIDER_COUNT.into(), provider_count_uref.into());

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntityEntryPoint::new(
        "add_provider",
        vec![Parameter::new("provider", Key::cl_type())],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "ban_provider",
        vec![Parameter::new("provider", Key::cl_type())],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "unban_provider",
        vec![Parameter::new("provider", Key::cl_type())],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "is_kyc_proved",
        vec![Parameter::new("account", Key::cl_type())],
        CLType::Bool,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("kyc_gate_package_hash".into()),
        Some("kyc_gate_access_uref".into()),
        None,
    );

    runtime::put_key("kyc_gate_contract_hash", contract_hash.into());
}
