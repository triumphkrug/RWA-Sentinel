#![no_std]
#![no_main]

extern crate alloc;

use alloc::collections::BTreeMap;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;

use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{
    ApiError, CLType, CLValue, EntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Key,
    Parameter, URef, U512,
};

// ── Error codes (100-199 range) ──────────────────────────────────────

const ERR_ASSET_NOT_FOUND: u16 = 100;
const ERR_ASSET_ALREADY_EXISTS: u16 = 101;
const ERR_INVALID_ASSET_TYPE: u16 = 102;
const ERR_UNAUTHORIZED_OWNER: u16 = 103;
const ERR_EMPTY_METADATA: u16 = 104;

// ── Storage keys ─────────────────────────────────────────────────────

const ASSETS_DICT: &str = "assets";
const ASSET_COUNTER: &str = "asset_counter";
const INSTALLER_KEY: &str = "installer";

// ── Asset type constants ─────────────────────────────────────────────

const ASSET_TYPE_INVOICE: u8 = 0;

// ── Helpers ──────────────────────────────────────────────────────────

fn emit_event(event_type: &str, fields: &[(&str, &str)]) {
    // Step 1: Build event map
    let mut event_data = BTreeMap::new();
    event_data.insert("event_type".to_string(), event_type.to_string());

    // Step 2: Add all custom fields
    for (key, value) in fields {
        event_data.insert(key.to_string(), value.to_string());
    }

    // Step 3: Add timestamp
    let block_ts: u64 = runtime::get_blocktime().into();
    event_data.insert("timestamp".to_string(), block_ts.to_string());

    // Step 4: Store as named key (CEP-88 compatible)
    let cl_value = CLValue::from_t(event_data).unwrap_or_revert();
    let uref = storage::new_uref(cl_value);
    runtime::put_key(
        &alloc::format!("ev_{}_{}", event_type, block_ts),
        Key::from(uref),
    );
}

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

fn get_assets_dict() -> URef {
    runtime::get_key(ASSETS_DICT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

// ── Entry points ─────────────────────────────────────────────────────

/// Register a new real-world asset in the on-chain registry.
/// Currently only Invoice type is supported in the MVP scope.
#[no_mangle]
pub extern "C" fn register_asset() {
    // Step 1: Read and validate input parameters
    let asset_type: u8 = runtime::get_named_arg("asset_type");
    let metadata_hash: String = runtime::get_named_arg("metadata_hash");
    let owner: AccountHash = runtime::get_named_arg("owner");

    // Step 2: Validate asset type (MVP: Invoice only)
    if asset_type != ASSET_TYPE_INVOICE {
        runtime::revert(ApiError::User(ERR_INVALID_ASSET_TYPE));
    }

    // Step 3: Validate metadata hash is not empty
    if metadata_hash.is_empty() {
        runtime::revert(ApiError::User(ERR_EMPTY_METADATA));
    }

    // Step 4: Generate unique asset ID
    let asset_id = next_asset_id();
    let asset_id_str = alloc::format!("ASSET-{}", asset_id);

    // Step 5: Store asset record
    let registered_at: u64 = runtime::get_blocktime().into();
    let asset_record = (
        asset_id_str.clone(),
        asset_type,
        metadata_hash.clone(),
        owner.to_string(),
        registered_at,
    );

    let dict_uref = get_assets_dict();
    let encoded = CLValue::from_t(asset_record).unwrap_or_revert();
    storage::dictionary_put(dict_uref, &asset_id_str, encoded);

    // Step 6: Emit registration event
    emit_event(
        "AssetRegistered",
        &[
            ("asset_id", &asset_id_str),
            ("asset_type", "invoice"),
            ("owner", &owner.to_string()),
        ],
    );

    // Step 7: Return asset ID to caller
    runtime::ret(CLValue::from_t(asset_id_str).unwrap_or_revert());
}

/// Update metadata hash for an existing asset (owner only).
#[no_mangle]
pub extern "C" fn update_asset() {
    // Step 1: Read parameters
    let asset_id: String = runtime::get_named_arg("asset_id");
    let new_metadata_hash: String = runtime::get_named_arg("new_metadata_hash");
    let caller = runtime::get_caller();

    // Step 2: Load existing record
    let dict_uref = get_assets_dict();
    let record: (String, u8, String, String, u64) = storage::dictionary_get(dict_uref, &asset_id)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_ASSET_NOT_FOUND));

    let (id, asset_type, _old_hash, owner_str, registered_at) = record;

    // Step 3: Verify caller is the asset owner
    if caller.to_string() != owner_str {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_OWNER));
    }

    // Step 4: Validate new metadata
    if new_metadata_hash.is_empty() {
        runtime::revert(ApiError::User(ERR_EMPTY_METADATA));
    }

    // Step 5: Write updated record
    let updated = (id, asset_type, new_metadata_hash, owner_str, registered_at);
    storage::dictionary_put(
        dict_uref,
        &asset_id,
        CLValue::from_t(updated).unwrap_or_revert(),
    );

    // Step 6: Emit update event
    emit_event("AssetUpdated", &[("asset_id", &asset_id)]);
}

/// Retrieve an asset record by its ID.
#[no_mangle]
pub extern "C" fn get_asset() {
    // Step 1: Read asset ID
    let asset_id: String = runtime::get_named_arg("asset_id");

    // Step 2: Fetch from dictionary
    let dict_uref = get_assets_dict();
    let record: (String, u8, String, String, u64) = storage::dictionary_get(dict_uref, &asset_id)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_ASSET_NOT_FOUND));

    // Step 3: Return to caller
    runtime::ret(CLValue::from_t(record).unwrap_or_revert());
}

// ── Contract installation ────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    // Step 1: Create storage dictionaries
    let assets_dict = storage::new_dictionary(ASSETS_DICT).unwrap_or_revert();
    let counter_uref = storage::new_uref(0u64);

    // Step 2: Set up named keys
    let mut named_keys = NamedKeys::new();
    named_keys.insert(ASSETS_DICT.into(), assets_dict.into());
    named_keys.insert(ASSET_COUNTER.into(), counter_uref.into());
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));

    // Step 3: Define entry points
    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntryPoint::new(
        "register_asset",
        vec![
            Parameter::new("asset_type", CLType::U8),
            Parameter::new("metadata_hash", CLType::String),
            Parameter::new("owner", CLType::ByteArray(32)),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "update_asset",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("new_metadata_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "get_asset",
        vec![Parameter::new("asset_id", CLType::String)],
        CLType::Any,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // Step 4: Install contract
    let (contract_hash, _) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("asset_registry_package".into()),
        Some("asset_registry_access".into()),
    );
    runtime::put_key("asset_registry_contract", contract_hash.into());
}
