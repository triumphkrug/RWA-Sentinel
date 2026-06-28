#![no_std]
#![no_main]

extern crate alloc;

use alloc::collections::BTreeMap;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;

use casper_contract::contract_api::{runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{
    ApiError, CLType, CLValue, EntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Key,
    Parameter, URef, U512,
};

// ── Error codes (200-599 range) ──────────────────────────────────────

const ERR_INVALID_BATCH_SIZE: u16 = 200;
const ERR_UNAUTHORIZED_ORACLE: u16 = 201;
const ERR_CHALLENGE_RATE_LIMIT: u16 = 202;
const ERR_ATTESTATION_EXPIRED: u16 = 203;
const ERR_ATTESTATION_NOT_FOUND: u16 = 204;
const ERR_SCORE_OUT_OF_RANGE: u16 = 205;
const ERR_INSUFFICIENT_ORACLE_SIGS: u16 = 300;
const ERR_ORACLE_NOT_REGISTERED: u16 = 301;
const ERR_INSUFFICIENT_STAKE: u16 = 400;
const ERR_SLASH_EXCEEDS_STAKE: u16 = 401;
const ERR_NFT_ALREADY_INVALIDATED: u16 = 500;
const ERR_NFT_NOT_FOUND: u16 = 501;
const ERR_SELF_CHALLENGE: u16 = 206;

// ── Storage keys ─────────────────────────────────────────────────────

const ATTESTATIONS_DICT: &str = "attestations";
const ORACLE_STAKES_DICT: &str = "oracle_stakes";
const CHALLENGE_COUNTS_DICT: &str = "challenge_counts";
const NFT_STATUS_DICT: &str = "nft_status";
const BATCH_COUNTER: &str = "batch_counter";
const DAO_ORACLES: &str = "dao_oracles";
const DAO_THRESHOLD: &str = "dao_threshold";
const INSTALLER_KEY: &str = "installer";
const STAKE_PURSE: &str = "stake_purse";

// ── Constants ────────────────────────────────────────────────────────

const MAX_BATCH_SIZE: usize = 10;
const MAX_CHALLENGES_PER_DAY: u8 = 3;
const MIN_ORACLE_STAKE: u64 = 1_000;
const SLASH_PERCENT: u64 = 10;
const DEFAULT_VALIDITY_SECONDS: u64 = 86_400;

// ── Helpers ──────────────────────────────────────────────────────────

fn emit_event(event_type: &str, fields: &[(&str, &str)]) {
    let mut event_data = BTreeMap::new();
    event_data.insert("event_type".to_string(), event_type.to_string());
    for (key, value) in fields {
        event_data.insert(key.to_string(), value.to_string());
    }
    let block_ts: u64 = runtime::get_blocktime().into();
    event_data.insert("timestamp".to_string(), block_ts.to_string());
    let cl_value = CLValue::from_t(event_data).unwrap_or_revert();
    let uref = storage::new_uref(cl_value);
    runtime::put_key(
        &alloc::format!("ev_{}_{}", event_type, block_ts),
        Key::from(uref),
    );
}

fn get_dict(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
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
    let next = current + 1;
    storage::write(counter_uref, next);
    alloc::format!("BATCH-{}", next)
}

// ── Entry points ─────────────────────────────────────────────────────

/// Publish attestations for a batch of assets and mint a batch NFT.
/// Each batch can contain up to 10 asset attestations.
#[no_mangle]
pub extern "C" fn batch_attest() {
    // Step 1: Read and validate batch parameters
    let asset_ids: Vec<String> = runtime::get_named_arg("asset_ids");
    let trust_scores: Vec<u8> = runtime::get_named_arg("trust_scores");
    let factors_hashes: Vec<String> = runtime::get_named_arg("factors_hashes");
    let evidence_hashes: Vec<String> = runtime::get_named_arg("evidence_hashes");

    // Step 2: Verify batch size limits (max 10 per call)
    if asset_ids.is_empty()
        || asset_ids.len() > MAX_BATCH_SIZE
        || asset_ids.len() != trust_scores.len()
        || asset_ids.len() != factors_hashes.len()
        || asset_ids.len() != evidence_hashes.len()
    {
        runtime::revert(ApiError::User(ERR_INVALID_BATCH_SIZE));
    }

    // Step 3: Verify caller is a registered oracle
    let caller = runtime::get_caller();
    if !is_registered_oracle(&caller) {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_ORACLE));
    }

    // Step 4: Validate all trust scores are within range
    for score in &trust_scores {
        if *score > 100 {
            runtime::revert(ApiError::User(ERR_SCORE_OUT_OF_RANGE));
        }
    }

    // Step 5: Generate batch ID and compute validity window
    let batch_id = next_batch_id();
    let now: u64 = runtime::get_blocktime().into();
    let valid_until = now + DEFAULT_VALIDITY_SECONDS;

    // Step 6: Create attestations and store them
    let att_dict = get_dict(ATTESTATIONS_DICT);
    for i in 0..asset_ids.len() {
        let attestation_record = (
            caller.to_string(),
            trust_scores[i],
            factors_hashes[i].clone(),
            evidence_hashes[i].clone(),
            now,
            false,
            0u8,
            batch_id.clone(),
            false,
            0u64,
            valid_until,
        );
        storage::dictionary_put(
            att_dict,
            &asset_ids[i],
            CLValue::from_t(attestation_record).unwrap_or_revert(),
        );
    }

    // Step 7: Store NFT status as active
    let nft_dict = get_dict(NFT_STATUS_DICT);
    let nft_record = (batch_id.clone(), true, now, valid_until);
    storage::dictionary_put(
        nft_dict,
        &batch_id,
        CLValue::from_t(nft_record).unwrap_or_revert(),
    );

    // Step 8: Emit batch event
    emit_event(
        "BatchAttested",
        &[
            ("batch_id", &batch_id),
            ("invoice_count", &asset_ids.len().to_string()),
            ("oracle", &caller.to_string()),
        ],
    );
}

/// Retrieve an attestation record for a specific asset.
#[no_mangle]
pub extern "C" fn get_attestation() {
    // Step 1: Read asset ID parameter
    let asset_id: String = runtime::get_named_arg("asset_id");

    // Step 2: Fetch attestation from dictionary
    let att_dict = get_dict(ATTESTATIONS_DICT);
    let record: (String, u8, String, String, u64, bool, u8, String, bool, u64, u64) =
        storage::dictionary_get(att_dict, &asset_id)
            .unwrap_or_revert()
            .unwrap_or_revert_with(ApiError::User(ERR_ATTESTATION_NOT_FOUND));

    // Step 3: Return to caller
    runtime::ret(CLValue::from_t(record).unwrap_or_revert());
}

/// Challenge an attestation with counter-evidence (rate-limited).
#[no_mangle]
pub extern "C" fn challenge() {
    // Step 1: Read parameters
    let asset_id: String = runtime::get_named_arg("asset_id");
    let counter_evidence_hash: String = runtime::get_named_arg("counter_evidence_hash");
    let caller = runtime::get_caller();

    // Step 2: Load attestation
    let att_dict = get_dict(ATTESTATIONS_DICT);
    let record: (String, u8, String, String, u64, bool, u8, String, bool, u64, u64) =
        storage::dictionary_get(att_dict, &asset_id)
            .unwrap_or_revert()
            .unwrap_or_revert_with(ApiError::User(ERR_ATTESTATION_NOT_FOUND));

    let (oracle_str, score, fh, eh, ts, _challenged, challenge_count, batch, stale, ss, vu) =
        record;

    // Step 3: Prevent self-challenge
    if caller.to_string() == oracle_str {
        runtime::revert(ApiError::User(ERR_SELF_CHALLENGE));
    }

    // Step 4: Check challenge rate limit (max 3 per asset per 24h window)
    if challenge_count >= MAX_CHALLENGES_PER_DAY {
        runtime::revert(ApiError::User(ERR_CHALLENGE_RATE_LIMIT));
    }

    // Step 5: Update attestation as challenged
    let updated = (
        oracle_str,
        score,
        fh,
        eh,
        ts,
        true,
        challenge_count + 1,
        batch,
        stale,
        ss,
        vu,
    );
    storage::dictionary_put(
        att_dict,
        &asset_id,
        CLValue::from_t(updated).unwrap_or_revert(),
    );

    // Step 6: Emit challenge event
    emit_event(
        "Challenged",
        &[
            ("asset_id", &asset_id),
            ("challenger", &caller.to_string()),
        ],
    );
}

/// Oracle stakes CSPR as collateral before attesting.
#[no_mangle]
pub extern "C" fn stake_oracle() {
    // Step 1: Read stake amount
    let amount: U512 = runtime::get_named_arg("amount");
    let caller = runtime::get_caller();

    // Step 2: Verify minimum stake
    if amount < U512::from(MIN_ORACLE_STAKE) {
        runtime::revert(ApiError::User(ERR_INSUFFICIENT_STAKE));
    }

    // Step 3: Transfer to stake purse
    let stake_purse = get_dict(STAKE_PURSE);
    system::transfer_from_purse_to_purse(
        runtime::get_caller().value().into(),
        stake_purse,
        amount,
        None,
    )
    .unwrap_or_revert();

    // Step 4: Record stake in dictionary
    let stakes_dict = get_dict(ORACLE_STAKES_DICT);
    let existing: u64 = storage::dictionary_get(stakes_dict, &caller.to_string())
        .unwrap_or_revert()
        .unwrap_or(0);
    let new_total = existing + amount.as_u64();
    storage::dictionary_put(
        stakes_dict,
        &caller.to_string(),
        CLValue::from_t(new_total).unwrap_or_revert(),
    );

    // Step 5: Emit stake event
    emit_event(
        "OracleStaked",
        &[
            ("oracle", &caller.to_string()),
            ("amount", &amount.to_string()),
        ],
    );
}

/// Slash an oracle for confirmed invalid attestation.
#[no_mangle]
pub extern "C" fn slash_oracle() {
    // Step 1: Read parameters and verify DAO authority
    let oracle_address: String = runtime::get_named_arg("oracle_address");
    let reason: String = runtime::get_named_arg("reason");
    let caller = runtime::get_caller();

    // Step 2: Only registered oracles (DAO members) can slash
    if !is_registered_oracle(&caller) {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED_ORACLE));
    }

    // Step 3: Load oracle stake
    let stakes_dict = get_dict(ORACLE_STAKES_DICT);
    let current_stake: u64 = storage::dictionary_get(stakes_dict, &oracle_address)
        .unwrap_or_revert()
        .unwrap_or(0);

    if current_stake == 0 {
        runtime::revert(ApiError::User(ERR_SLASH_EXCEEDS_STAKE));
    }

    // Step 4: Calculate slash amount (10% of stake)
    let slash_amount = current_stake * SLASH_PERCENT / 100;
    let remaining = current_stake - slash_amount;

    // Step 5: Update stake record
    storage::dictionary_put(
        stakes_dict,
        &oracle_address,
        CLValue::from_t(remaining).unwrap_or_revert(),
    );

    // Step 6: Emit slash event
    emit_event(
        "OracleSlashed",
        &[
            ("oracle", &oracle_address),
            ("slash_amount", &slash_amount.to_string()),
            ("reason", &reason),
        ],
    );
}

/// DAO approval for a challenged attestation (2-of-3 oracles).
#[no_mangle]
pub extern "C" fn dao_approve() {
    // Step 1: Read parameters
    let asset_id: String = runtime::get_named_arg("asset_id");
    let oracle_sigs: Vec<String> = runtime::get_named_arg("oracle_sigs");

    // Step 2: Load DAO threshold
    let threshold_uref = runtime::get_key(DAO_THRESHOLD)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let threshold: u8 = storage::read(threshold_uref)
        .unwrap_or_revert()
        .unwrap_or(2);

    // Step 3: Verify sufficient oracle signatures
    let oracles_uref = runtime::get_key(DAO_ORACLES)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let registered: Vec<String> = storage::read(oracles_uref)
        .unwrap_or_revert()
        .unwrap_or_default();

    let mut valid_count = 0u8;
    for sig_account in &oracle_sigs {
        if registered.contains(sig_account) {
            valid_count += 1;
        }
    }
    if valid_count < threshold {
        runtime::revert(ApiError::User(ERR_INSUFFICIENT_ORACLE_SIGS));
    }

    // Step 4: Load and invalidate the attestation
    let att_dict = get_dict(ATTESTATIONS_DICT);
    let record: (String, u8, String, String, u64, bool, u8, String, bool, u64, u64) =
        storage::dictionary_get(att_dict, &asset_id)
            .unwrap_or_revert()
            .unwrap_or_revert_with(ApiError::User(ERR_ATTESTATION_NOT_FOUND));

    let (oracle_str, score, fh, eh, ts, _, cc, batch, stale, ss, _) = record;

    // Step 5: Mark attestation as invalidated (valid_until = 0)
    let updated = (oracle_str, score, fh, eh, ts, true, cc, batch, stale, ss, 0u64);
    storage::dictionary_put(
        att_dict,
        &asset_id,
        CLValue::from_t(updated).unwrap_or_revert(),
    );

    // Step 6: Emit approval event
    emit_event(
        "DAOApproved",
        &[
            ("asset_id", &asset_id),
            ("oracle_count", &valid_count.to_string()),
        ],
    );
}

/// Invalidate a batch NFT that has expired.
#[no_mangle]
pub extern "C" fn invalidate_nft() {
    // Step 1: Read NFT token batch ID
    let batch_id: String = runtime::get_named_arg("batch_id");

    // Step 2: Load NFT status
    let nft_dict = get_dict(NFT_STATUS_DICT);
    let nft_record: (String, bool, u64, u64) = storage::dictionary_get(nft_dict, &batch_id)
        .unwrap_or_revert()
        .unwrap_or_revert_with(ApiError::User(ERR_NFT_NOT_FOUND));

    let (id, active, created, valid_until) = nft_record;

    // Step 3: Check if already invalidated
    if !active {
        runtime::revert(ApiError::User(ERR_NFT_ALREADY_INVALIDATED));
    }

    // Step 4: Mark as inactive
    let updated = (id, false, created, valid_until);
    storage::dictionary_put(
        nft_dict,
        &batch_id,
        CLValue::from_t(updated).unwrap_or_revert(),
    );

    // Step 5: Emit invalidation event
    emit_event("NFTInvalidated", &[("batch_id", &batch_id)]);
}

// ── Contract installation ────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    // Step 1: Initialize storage dictionaries
    let att_dict = storage::new_dictionary(ATTESTATIONS_DICT).unwrap_or_revert();
    let stakes_dict = storage::new_dictionary(ORACLE_STAKES_DICT).unwrap_or_revert();
    let challenge_dict = storage::new_dictionary(CHALLENGE_COUNTS_DICT).unwrap_or_revert();
    let nft_dict = storage::new_dictionary(NFT_STATUS_DICT).unwrap_or_revert();

    // Step 2: Initialize scalar values
    let batch_counter = storage::new_uref(0u64);
    let threshold_uref = storage::new_uref(2u8);
    let dao_oracles_uref = storage::new_uref(Vec::<String>::new());
    let stake_purse = system::create_purse();

    // Step 3: Assemble named keys
    let mut named_keys = NamedKeys::new();
    named_keys.insert(ATTESTATIONS_DICT.into(), att_dict.into());
    named_keys.insert(ORACLE_STAKES_DICT.into(), stakes_dict.into());
    named_keys.insert(CHALLENGE_COUNTS_DICT.into(), challenge_dict.into());
    named_keys.insert(NFT_STATUS_DICT.into(), nft_dict.into());
    named_keys.insert(BATCH_COUNTER.into(), batch_counter.into());
    named_keys.insert(DAO_THRESHOLD.into(), threshold_uref.into());
    named_keys.insert(DAO_ORACLES.into(), dao_oracles_uref.into());
    named_keys.insert(STAKE_PURSE.into(), stake_purse.into());
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));

    // Step 4: Define entry points
    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntryPoint::new(
        "batch_attest",
        vec![
            Parameter::new("asset_ids", CLType::List(Box::new(CLType::String))),
            Parameter::new("trust_scores", CLType::List(Box::new(CLType::U8))),
            Parameter::new("factors_hashes", CLType::List(Box::new(CLType::String))),
            Parameter::new("evidence_hashes", CLType::List(Box::new(CLType::String))),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "get_attestation",
        vec![Parameter::new("asset_id", CLType::String)],
        CLType::Any,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "challenge",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("counter_evidence_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "stake_oracle",
        vec![Parameter::new("amount", CLType::U512)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "slash_oracle",
        vec![
            Parameter::new("oracle_address", CLType::String),
            Parameter::new("reason", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "dao_approve",
        vec![
            Parameter::new("asset_id", CLType::String),
            Parameter::new("oracle_sigs", CLType::List(Box::new(CLType::String))),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "invalidate_nft",
        vec![Parameter::new("batch_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    // Step 5: Install contract
    let (contract_hash, _) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("attestation_store_package".into()),
        Some("attestation_store_access".into()),
    );
    runtime::put_key("attestation_store_contract", contract_hash.into());
}
