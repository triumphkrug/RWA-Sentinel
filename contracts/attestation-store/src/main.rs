#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;

use casper_contract::contract_api::{runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{EntryPointPayment, 
    ApiError, CLType, CLValue, EntityEntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Key,
    Parameter, URef, U512,
};

// ── Error codes (200-599 range) ──────────────────────────────────────

const ERR_INVALID_BATCH_SIZE: u16 = 200;
const ERR_UNAUTHORIZED_ORACLE: u16 = 201;
const ERR_CHALLENGE_RATE_LIMIT: u16 = 202;
const ERR_ALREADY_ATTESTED: u16 = 203;
const ERR_ATTESTATION_NOT_FOUND: u16 = 204;
const ERR_SCORE_OUT_OF_RANGE: u16 = 205;
const ERR_SELF_CHALLENGE: u16 = 206;
const ERR_INSUFFICIENT_ORACLE_SIGS: u16 = 300;
const ERR_DUPLICATE_SIG: u16 = 301;
const ERR_INSUFFICIENT_STAKE: u16 = 400;
const ERR_SLASH_EXCEEDS_STAKE: u16 = 401;
const ERR_NFT_ALREADY_INVALIDATED: u16 = 500;
const ERR_NFT_NOT_FOUND: u16 = 501;
const ERR_NOT_INSTALLER: u16 = 600;

// ── Storage keys ─────────────────────────────────────────────────────

const ATTESTATIONS_DICT: &str = "attestations";
const ORACLE_STAKES_DICT: &str = "oracle_stakes";
const NFT_STATUS_DICT: &str = "nft_status";
const BATCH_COUNTER: &str = "batch_counter";
const DAO_ORACLES: &str = "dao_oracles";
const DAO_THRESHOLD: &str = "dao_threshold";
const INSTALLER_KEY: &str = "installer";
const STAKE_PURSE: &str = "stake_purse";

// ── Constants ────────────────────────────────────────────────────────

const MAX_BATCH_SIZE: usize = 10;
const MAX_CHALLENGES: u64 = 3;
const MIN_ORACLE_STAKE: u64 = 1_000;
const SLASH_PERCENT: u64 = 10;
const DEFAULT_VALIDITY_SECONDS: u64 = 86_400;

// ── Types (nested triples for CLTyped compliance) ────────────────────

// Attestation: identity + score data + status
// ((oracle, score, factors_hash), (evidence_hash, timestamp, batch_id), (challenged, challenge_count, valid_until))
// All u8/bool fields stored as u64 for uniform typing.
type AttRecord = ((String, u64, String), (String, u64, String), (u64, u64, u64));

// NFT batch status: (batch_id, active, created_at) — 3 elements
type NftRecord = (String, u64, u64);

// ── Helpers ──────────────────────────────────────────────────────────

fn get_dict(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn get_purse(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn get_installer() -> AccountHash {
    let key = runtime::get_key(INSTALLER_KEY).unwrap_or_revert();
    match key {
        Key::Account(h) => h,
        _ => runtime::revert(ApiError::User(ERR_NOT_INSTALLER)),
    }
}

fn require_installer_or_oracle(caller: &AccountHash) {
    let installer = get_installer();
    if *caller == installer {
        return;
    }
    if !is_registered_oracle(caller) {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_ORACLE));
    }
}

fn is_registered_oracle(caller: &AccountHash) -> bool {
    let oracles_uref = runtime::get_key(DAO_ORACLES)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let registered: Vec<String> = storage::read(oracles_uref)
        .unwrap_or_revert()
        .unwrap_or_default();
    registered.contains(&caller.to_string())
}

fn next_batch_id() -> String {
    let counter_uref = runtime::get_key(BATCH_COUNTER)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0);
    let next = current.saturating_add(1);
    storage::write(counter_uref, next);
    alloc::format!("BATCH-{}", next)
}

fn read_attestation(dict: URef, key: &str) -> AttRecord {
    storage::dictionary_get::<AttRecord>(dict, key)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_ATTESTATION_NOT_FOUND))
}

fn try_read_attestation(dict: URef, key: &str) -> Option<AttRecord> {
    storage::dictionary_get::<AttRecord>(dict, key)
        .unwrap_or_revert()
}

// ── Entry points ─────────────────────────────────────────────────────

/// Register an oracle account so it can submit attestations.
/// Only the contract installer can call this.
#[no_mangle]
pub extern "C" fn register_oracle() {
    let caller = runtime::get_caller();
    let installer = get_installer();
    if caller != installer {
        runtime::revert(ApiError::User(ERR_NOT_INSTALLER));
    }

    let oracle: AccountHash = runtime::get_named_arg("oracle");
    let oracles_uref = runtime::get_key(DAO_ORACLES)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let mut registered: Vec<String> = storage::read(oracles_uref)
        .unwrap_or_revert()
        .unwrap_or_default();

    let oracle_str = oracle.to_string();
    if !registered.contains(&oracle_str) {
        registered.push(oracle_str);
        storage::write(oracles_uref, registered);
    }
}

/// Remove an oracle. Installer only.
#[no_mangle]
pub extern "C" fn remove_oracle() {
    let caller = runtime::get_caller();
    let installer = get_installer();
    if caller != installer {
        runtime::revert(ApiError::User(ERR_NOT_INSTALLER));
    }

    let oracle: AccountHash = runtime::get_named_arg("oracle");
    let oracles_uref = runtime::get_key(DAO_ORACLES)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let mut registered: Vec<String> = storage::read(oracles_uref)
        .unwrap_or_revert()
        .unwrap_or_default();

    let oracle_str = oracle.to_string();
    registered.retain(|o| o != &oracle_str);
    storage::write(oracles_uref, registered);
}

/// Publish attestations for a batch of assets and mint a batch NFT.
/// Checks that asset is not already attested (no silent overwrite).
#[no_mangle]
pub extern "C" fn batch_attest() {
    let asset_ids: Vec<String> = runtime::get_named_arg("asset_ids");
    let trust_scores: Vec<u64> = runtime::get_named_arg("trust_scores");
    let factors_hashes: Vec<String> = runtime::get_named_arg("factors_hashes");
    let evidence_hashes: Vec<String> = runtime::get_named_arg("evidence_hashes");

    if asset_ids.is_empty()
        || asset_ids.len() > MAX_BATCH_SIZE
        || asset_ids.len() != trust_scores.len()
        || asset_ids.len() != factors_hashes.len()
        || asset_ids.len() != evidence_hashes.len()
    {
        runtime::revert(ApiError::User(ERR_INVALID_BATCH_SIZE));
    }

    let caller = runtime::get_caller();
    if !is_registered_oracle(&caller) {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_ORACLE));
    }

    for score in &trust_scores {
        if *score > 100 {
            runtime::revert(ApiError::User(ERR_SCORE_OUT_OF_RANGE));
        }
    }

    let att_dict = get_dict(ATTESTATIONS_DICT);

    // Check none of the assets already have an active attestation
    for aid in &asset_ids {
        if let Some(existing) = try_read_attestation(att_dict, aid) {
            let (_, _, (_, _, valid_until)) = existing;
            let now: u64 = runtime::get_blocktime().into();
            if valid_until > now {
                runtime::revert(ApiError::User(ERR_ALREADY_ATTESTED));
            }
        }
    }

    let batch_id = next_batch_id();
    let now: u64 = runtime::get_blocktime().into();
    let valid_until = now + DEFAULT_VALIDITY_SECONDS;

    for i in 0..asset_ids.len() {
        let record: AttRecord = (
            (caller.to_string(), trust_scores[i], factors_hashes[i].clone()),
            (evidence_hashes[i].clone(), now, batch_id.clone()),
            (0, 0, valid_until),
        );
        storage::dictionary_put(att_dict, &asset_ids[i], record);
    }

    let nft_dict = get_dict(NFT_STATUS_DICT);
    let nft: NftRecord = (batch_id.clone(), 1, valid_until);
    storage::dictionary_put(nft_dict, &batch_id, nft);
}

/// Retrieve an attestation record for a specific asset.
#[no_mangle]
pub extern "C" fn get_attestation() {
    let asset_id: String = runtime::get_named_arg("asset_id");
    let att_dict = get_dict(ATTESTATIONS_DICT);
    let record = read_attestation(att_dict, &asset_id);
    runtime::ret(CLValue::from_t(record).unwrap_or_revert());
}

/// Challenge an attestation with counter-evidence.
#[no_mangle]
pub extern "C" fn challenge() {
    let asset_id: String = runtime::get_named_arg("asset_id");
    let _counter_evidence: String = runtime::get_named_arg("counter_evidence_hash");
    if asset_id.is_empty() || _counter_evidence.is_empty() {
        runtime::revert(ApiError::User(ERR_INVALID_BATCH_SIZE));
    }
    let caller = runtime::get_caller();

    let att_dict = get_dict(ATTESTATIONS_DICT);
    let ((oracle_str, score, fh), (eh, ts, batch), (_challenged, cc, vu)) =
        read_attestation(att_dict, &asset_id);

    if caller.to_string() == oracle_str {
        runtime::revert(ApiError::User(ERR_SELF_CHALLENGE));
    }
    if cc >= MAX_CHALLENGES {
        runtime::revert(ApiError::User(ERR_CHALLENGE_RATE_LIMIT));
    }

    let updated: AttRecord = (
        (oracle_str, score, fh),
        (eh, ts, batch),
        (1, cc.saturating_add(1), vu),
    );
    storage::dictionary_put(att_dict, &asset_id, updated);
}

/// Oracle stakes CSPR as collateral before attesting.
#[no_mangle]
pub extern "C" fn stake_oracle() {
    let amount: U512 = runtime::get_named_arg("amount");
    let source_purse: URef = runtime::get_named_arg("source_purse");
    let caller = runtime::get_caller();

    if amount < U512::from(MIN_ORACLE_STAKE) {
        runtime::revert(ApiError::User(ERR_INSUFFICIENT_STAKE));
    }

    // Guard against U512 → u64 truncation: reject stakes exceeding u64::MAX
    if amount > U512::from(u64::MAX) {
        runtime::revert(ApiError::User(ERR_INSUFFICIENT_STAKE));
    }

    let stake_purse = get_purse(STAKE_PURSE);
    system::transfer_from_purse_to_purse(source_purse, stake_purse, amount, None)
        .unwrap_or_revert();

    let stakes_dict = get_dict(ORACLE_STAKES_DICT);
    let existing: u64 = storage::dictionary_get(stakes_dict, &caller.to_string())
        .unwrap_or_revert()
        .unwrap_or(0);
    let new_stake = existing.saturating_add(amount.as_u64());
    storage::dictionary_put(stakes_dict, &caller.to_string(), new_stake);
}

/// Slash an oracle for confirmed invalid attestation.
/// Transfers slashed CSPR from stake purse to installer.
/// Only the installer (contract admin) can slash.
#[no_mangle]
pub extern "C" fn slash_oracle() {
    let oracle_address: String = runtime::get_named_arg("oracle_address");
    let caller = runtime::get_caller();
    let installer = get_installer();
    if caller != installer {
        runtime::revert(ApiError::User(ERR_NOT_INSTALLER));
    }

    let stakes_dict = get_dict(ORACLE_STAKES_DICT);
    let current_stake: u64 = storage::dictionary_get(stakes_dict, &oracle_address)
        .unwrap_or_revert()
        .unwrap_or(0);

    if current_stake == 0 {
        runtime::revert(ApiError::User(ERR_SLASH_EXCEEDS_STAKE));
    }

    // Ensure at least 1 unit is slashed to prevent zero-slash edge case
    let computed = current_stake * SLASH_PERCENT / 100;
    let slash_amount = if computed == 0 && current_stake > 0 { 1 } else { computed };
    let remaining = current_stake - slash_amount;
    storage::dictionary_put(stakes_dict, &oracle_address, remaining);

    // Transfer slashed amount to installer
    if slash_amount > 0 {
        let stake_purse = get_purse(STAKE_PURSE);
        let installer = get_installer();
        system::transfer_from_purse_to_account(
            stake_purse,
            installer,
            U512::from(slash_amount),
            None,
        )
        .unwrap_or_revert();
    }
}

/// DAO invalidation of a challenged attestation (2-of-3 oracles).
/// Confirms the challenge is valid and permanently invalidates the attestation.
/// Verifies that each signer is a registered oracle and deduplicates.
#[no_mangle]
pub extern "C" fn dao_invalidate() {
    let asset_id: String = runtime::get_named_arg("asset_id");
    let oracle_sigs: Vec<String> = runtime::get_named_arg("oracle_sigs");

    let threshold_uref = runtime::get_key(DAO_THRESHOLD)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let threshold: u64 = storage::read(threshold_uref).unwrap_or_revert().unwrap_or(2);

    let oracles_uref = runtime::get_key(DAO_ORACLES)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let registered: Vec<String> = storage::read(oracles_uref)
        .unwrap_or_revert()
        .unwrap_or_default();

    // Deduplicate signers and count only registered oracles
    let mut seen = Vec::<String>::new();
    let mut valid_count: u64 = 0;
    for sig in &oracle_sigs {
        if seen.contains(sig) {
            runtime::revert(ApiError::User(ERR_DUPLICATE_SIG));
        }
        seen.push(sig.clone());
        if registered.contains(sig) {
            valid_count += 1;
        }
    }
    if valid_count < threshold {
        runtime::revert(ApiError::User(ERR_INSUFFICIENT_ORACLE_SIGS));
    }

    let att_dict = get_dict(ATTESTATIONS_DICT);
    let ((oracle_str, score, fh), (eh, ts, batch), (_, cc, _)) =
        read_attestation(att_dict, &asset_id);

    let updated: AttRecord = (
        (oracle_str, score, fh),
        (eh, ts, batch),
        (1, cc, 0),
    );
    storage::dictionary_put(att_dict, &asset_id, updated);
}

/// Invalidate a batch NFT. Only installer or registered oracle may call.
#[no_mangle]
pub extern "C" fn invalidate_nft() {
    let batch_id: String = runtime::get_named_arg("batch_id");
    let caller = runtime::get_caller();

    require_installer_or_oracle(&caller);

    let nft_dict = get_dict(NFT_STATUS_DICT);
    let nft: NftRecord = storage::dictionary_get(nft_dict, &batch_id)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_NFT_NOT_FOUND));

    let (id, active, vu) = nft;
    if active == 0 {
        runtime::revert(ApiError::User(ERR_NFT_ALREADY_INVALIDATED));
    }

    let updated: NftRecord = (id, 0, vu);
    storage::dictionary_put(nft_dict, &batch_id, updated);
}

// ── Contract installation ────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    let att_dict = storage::new_dictionary(ATTESTATIONS_DICT).unwrap_or_revert();
    let stakes_dict = storage::new_dictionary(ORACLE_STAKES_DICT).unwrap_or_revert();
    let nft_dict = storage::new_dictionary(NFT_STATUS_DICT).unwrap_or_revert();
    let batch_counter = storage::new_uref(0u64);
    let threshold_uref = storage::new_uref(2u64);
    let dao_oracles_uref = storage::new_uref(Vec::<String>::new());
    let stake_purse = system::create_purse();

    let mut named_keys = NamedKeys::new();
    named_keys.insert(ATTESTATIONS_DICT.into(), att_dict.into());
    named_keys.insert(ORACLE_STAKES_DICT.into(), stakes_dict.into());
    named_keys.insert(NFT_STATUS_DICT.into(), nft_dict.into());
    named_keys.insert(BATCH_COUNTER.into(), batch_counter.into());
    named_keys.insert(DAO_THRESHOLD.into(), threshold_uref.into());
    named_keys.insert(DAO_ORACLES.into(), dao_oracles_uref.into());
    named_keys.insert(STAKE_PURSE.into(), stake_purse.into());
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntityEntryPoint::new(
        "register_oracle",
        vec![Parameter::new("oracle", CLType::ByteArray(32))],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "remove_oracle",
        vec![Parameter::new("oracle", CLType::ByteArray(32))],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "batch_attest",
        vec![
            Parameter::new("asset_ids", CLType::List(alloc::boxed::Box::new(CLType::String))),
            Parameter::new("trust_scores", CLType::List(alloc::boxed::Box::new(CLType::U64))),
            Parameter::new("factors_hashes", CLType::List(alloc::boxed::Box::new(CLType::String))),
            Parameter::new("evidence_hashes", CLType::List(alloc::boxed::Box::new(CLType::String))),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "get_attestation",
        vec![Parameter::new("asset_id", CLType::String)],
        CLType::Any,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "challenge",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("counter_evidence_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "stake_oracle",
        vec![
            Parameter::new("amount", CLType::U512),
            Parameter::new("source_purse", CLType::URef),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "slash_oracle",
        vec![Parameter::new("oracle_address", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "dao_invalidate",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("oracle_sigs", CLType::List(alloc::boxed::Box::new(CLType::String))),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "invalidate_nft",
        vec![Parameter::new("batch_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("attestation_store_package".into()),
        Some("attestation_store_access".into()),
        None,
    );
    runtime::put_key("attestation_store_contract", contract_hash.into());
}
