#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::{String, ToString};
use alloc::vec;

use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{EntryPointPayment, 
    ApiError, CLType, CLValue, EntityEntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Key,
    Parameter, URef,
};

// ── Error codes (100-199 range) ──────────────────────────────────────

const ERR_ASSET_NOT_FOUND: u16 = 100;
const ERR_INVALID_ASSET_TYPE: u16 = 102;
const ERR_UNAUTHORIZED_OWNER: u16 = 103;
const ERR_EMPTY_METADATA: u16 = 104;

// ── Storage keys ─────────────────────────────────────────────────────

const ASSETS_DICT: &str = "assets";
const ASSET_COUNTER: &str = "asset_counter";
const INSTALLER_KEY: &str = "installer";

const ASSET_TYPE_INVOICE: u64 = 0;

// ── Types ────────────────────────────────────────────────────────────
// Nested triples: ((id, asset_type, metadata_hash), (owner, registered_at))
type AssetRecord = ((String, u64, String), (String, u64));

// ── Helpers ──────────────────────────────────────────────────────────

fn next_asset_id() -> u64 {
    let counter_uref = runtime::get_key(ASSET_COUNTER)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0);
    let next = current + 1;
    storage::write(counter_uref, next);
    next
}

fn get_dict(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn read_asset(dict: URef, key: &str) -> AssetRecord {
    storage::dictionary_get::<AssetRecord>(dict, key)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_ASSET_NOT_FOUND))
}

// ── Entry points ─────────────────────────────────────────────────────

/// Register a new real-world asset in the on-chain registry.
/// Only the owner (caller) can register assets for themselves.
#[no_mangle]
pub extern "C" fn register_asset() {
    let asset_type: u64 = runtime::get_named_arg("asset_type");
    let metadata_hash: String = runtime::get_named_arg("metadata_hash");
    let owner: AccountHash = runtime::get_named_arg("owner");
    let caller = runtime::get_caller();

    // Caller must be the declared owner — prevents impersonation
    if caller != owner {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_OWNER));
    }
    if asset_type != ASSET_TYPE_INVOICE {
        runtime::revert(ApiError::User(ERR_INVALID_ASSET_TYPE));
    }
    if metadata_hash.is_empty() {
        runtime::revert(ApiError::User(ERR_EMPTY_METADATA));
    }

    let asset_id = next_asset_id();
    let asset_id_str = alloc::format!("ASSET-{}", asset_id);
    let registered_at: u64 = runtime::get_blocktime().into();

    let record: AssetRecord = (
        (asset_id_str.clone(), asset_type, metadata_hash),
        (owner.to_string(), registered_at),
    );

    let dict_uref = get_dict(ASSETS_DICT);
    storage::dictionary_put(dict_uref, &asset_id_str, record);

    runtime::ret(CLValue::from_t(asset_id_str).unwrap_or_revert());
}

/// Update metadata hash for an existing asset (owner only).
#[no_mangle]
pub extern "C" fn update_asset() {
    let asset_id: String = runtime::get_named_arg("asset_id");
    let new_metadata_hash: String = runtime::get_named_arg("new_metadata_hash");
    let caller = runtime::get_caller();

    let dict_uref = get_dict(ASSETS_DICT);
    let ((id, asset_type, _), (owner_str, registered_at)) = read_asset(dict_uref, &asset_id);

    if caller.to_string() != owner_str {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_OWNER));
    }
    if new_metadata_hash.is_empty() {
        runtime::revert(ApiError::User(ERR_EMPTY_METADATA));
    }

    let updated: AssetRecord = (
        (id, asset_type, new_metadata_hash),
        (owner_str, registered_at),
    );
    storage::dictionary_put(dict_uref, &asset_id, updated);
}

/// Retrieve an asset record by its ID.
#[no_mangle]
pub extern "C" fn get_asset() {
    let asset_id: String = runtime::get_named_arg("asset_id");
    let dict_uref = get_dict(ASSETS_DICT);
    let record = read_asset(dict_uref, &asset_id);
    runtime::ret(CLValue::from_t(record).unwrap_or_revert());
}

// ── Contract installation ────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    let assets_dict = storage::new_dictionary(ASSETS_DICT).unwrap_or_revert();
    let counter_uref = storage::new_uref(0u64);

    let mut named_keys = NamedKeys::new();
    named_keys.insert(ASSETS_DICT.into(), assets_dict.into());
    named_keys.insert(ASSET_COUNTER.into(), counter_uref.into());
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntityEntryPoint::new(
        "register_asset",
        vec![
            Parameter::new("asset_type", CLType::U64),
            Parameter::new("metadata_hash", CLType::String),
            Parameter::new("owner", CLType::ByteArray(32)),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "update_asset",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("new_metadata_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "get_asset",
        vec![Parameter::new("asset_id", CLType::String)],
        CLType::Any,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("asset_registry_package".into()),
        Some("asset_registry_access".into()),
        None,
    );
    runtime::put_key("asset_registry_contract", contract_hash.into());
}
