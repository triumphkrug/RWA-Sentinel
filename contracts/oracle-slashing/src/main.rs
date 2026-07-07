#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;
use alloc::format;
use alloc::boxed::Box; // Included as per pattern, though not directly used for CLType::List in this contract

use casper_contract::contract_api::{runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{
    EntryPoints,
    EntryPointPayment, ApiError, CLType, CLValue, EntityEntryPoint, EntryPointAccess, EntryPointType, Key,
    Parameter, URef, U512,
};
use casper_types::bytesrepr::{FromBytes, ToBytes};
use casper_types::CLTyped;


// Constants
const ORACLE_DICT: &str = "oracle_dict";
const REPORT_DICT: &str = "report_dict";
const REPORT_COUNTER_KEY: &str = "report_counter";
const STAKE_PURSE: &str = "stake_purse";
const FEE_PURSE: &str = "fee_purse";
const FEE_BPS_KEY: &str = "fee_bps";
const DEFAULT_FEE_BPS: u64 = 0;
const INSTALLER_KEY: &str = "installer";

// Error Codes
const ERR_ORACLE_EXISTS: u16 = 1;
const ERR_ORACLE_NOT_FOUND: u16 = 2;
const ERR_INSUFFICIENT_STAKE: u16 = 3; // Not directly used, stake is transferred
const ERR_SELF_REPORT: u16 = 4;
const ERR_INVALID_SEVERITY: u16 = 5;
const ERR_REPORT_NOT_FOUND: u16 = 6;
const ERR_CHALLENGE_PERIOD_ACTIVE: u16 = 7;
const ERR_CHALLENGE_PERIOD_EXPIRED: u16 = 8;
const ERR_ALREADY_CHALLENGED: u16 = 9;
const ERR_ALREADY_EXECUTED: u16 = 10;
const ERR_UNAUTHORIZED: u16 = 11;
const ERR_WITHDRAW_TOO_HIGH: u16 = 12;
const ERR_REPORT_EXISTS: u16 = 13;
const ERR_INVALID_ACCOUNT_HASH: u16 = 14;

const CHALLENGE_PERIOD: u64 = 172800; // 48 hours in seconds

// Record Types (max 3 elements per tuple, nest triples)
// OracleRecord: ((oracle_id, owner_string, stake), (violations, slashed_amount, registered_at), (active, reputation))
type OracleRecord = ((String, String, U512), (u64, U512, u64), (u64, u64));

// ReportRecord: ((report_id, oracle_id, reporter_string), (severity, evidence, counter_evidence), (created_at, challenged_at, executed_at))
type ReportRecord = ((String, String, String), (u64, String, String), (u64, u64, u64));

// HELPERS (storage access)
fn get_dict_uref(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn read_uref<T: CLTyped + FromBytes>(name: &str) -> T {
    let uref = runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::read(uref)
        .unwrap_or_revert() // Option<T>
        .unwrap_or_revert() // T
}

fn write_uref<T: CLTyped + ToBytes>(name: &str, value: T) {
    let uref = runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::write(uref, value);
}

fn read_fee_bps() -> u64 {
    read_uref::<u64>(FEE_BPS_KEY)
}

fn get_report_counter() -> u64 {
    read_uref::<u64>(REPORT_COUNTER_KEY)
}

fn set_report_counter(counter: u64) {
    write_uref(REPORT_COUNTER_KEY, counter);
}

fn account_hash_to_string(account_hash: AccountHash) -> String {
    let bytes = account_hash.as_bytes();
    let mut hex_string = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let high = byte >> 4;
        let low = byte & 0x0F;
        hex_string.push(char::from_digit(high as u32, 16).unwrap_or_revert());
        hex_string.push(char::from_digit(low as u32, 16).unwrap_or_revert());
    }
    hex_string
}

fn string_to_account_hash(s: &str) -> AccountHash {
    AccountHash::from_formatted_str(s)
        .unwrap_or_else(|_| {
            let clean = if s.starts_with("account-hash-") { &s[13..] } else { s };
            let mut array = [0u8; 32];
            for i in 0..32 {
                let byte_str = &clean[i * 2..i * 2 + 2];
                array[i] = match u8::from_str_radix(byte_str, 16) {
                    Ok(v) => v,
                    Err(_) => runtime::revert(ApiError::User(ERR_INVALID_ACCOUNT_HASH)),
                };
            }
            AccountHash::new(array)
        })
}

fn severity_to_percentage(severity: u64) -> u64 {
    match severity {
        0 => 5,   // Low: 5%
        1 => 15,  // Medium: 15%
        2 => 50,  // High: 50%
        3 => 100, // Critical: 100%
        _ => runtime::revert(ApiError::User(ERR_INVALID_SEVERITY)),
    }
}

#[no_mangle]
pub extern "C" fn register_oracle() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let stake_amount: U512 = runtime::get_named_arg("stake");
    let source_purse: URef = runtime::get_named_arg("source_purse");

    let caller = runtime::get_caller();
    let owner_string = account_hash_to_string(caller);

    let oracle_dict = get_dict_uref(ORACLE_DICT);

    let existing: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    if existing.is_some() {
        runtime::revert(ApiError::User(ERR_ORACLE_EXISTS));
    }

    let stake_purse = runtime::get_key(STAKE_PURSE)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    system::transfer_from_purse_to_purse(source_purse, stake_purse, stake_amount, None)
        .unwrap_or_revert();

    let now: u64 = runtime::get_blocktime().into();

    let record: OracleRecord = (
        (oracle_id.clone(), owner_string, stake_amount),
        (0, U512::zero(), now), // violations, slashed_amount, registered_at
        (1, 100), // active (1=true), reputation (default 100)
    );

    storage::dictionary_put(oracle_dict, &oracle_id, record);
}

#[no_mangle]
pub extern "C" fn report_violation() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let severity: u64 = runtime::get_named_arg("severity");
    let evidence: String = runtime::get_named_arg("evidence");

    let caller = runtime::get_caller();
    let reporter_string = account_hash_to_string(caller);

    let oracle_dict = get_dict_uref(ORACLE_DICT);

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_revert_with(ApiError::User(ERR_ORACLE_NOT_FOUND));

    let ((_stored_oracle_id, owner_string, _stake), _, _) = &oracle;

    if *owner_string == reporter_string {
        runtime::revert(ApiError::User(ERR_SELF_REPORT));
    }

    if severity > 3 {
        runtime::revert(ApiError::User(ERR_INVALID_SEVERITY));
    }

    let report_counter = get_report_counter();
    let report_id = format!("report_{}", report_counter);

    let report_dict = get_dict_uref(REPORT_DICT);

    let existing_report: Option<ReportRecord> = storage::dictionary_get(report_dict, &report_id)
        .unwrap_or_revert();

    if existing_report.is_some() {
        runtime::revert(ApiError::User(ERR_REPORT_EXISTS));
    }

    let now: u64 = runtime::get_blocktime().into();

    let report: ReportRecord = (
        (report_id.clone(), oracle_id.clone(), reporter_string),
        (severity, evidence, String::new()), // severity, evidence, counter_evidence (empty initially)
        (now, 0, 0), // created_at, challenged_at (0 initially), executed_at (0 initially)
    );

    storage::dictionary_put(report_dict, &report_id, report);

    set_report_counter(report_counter + 1);
}

#[no_mangle]
pub extern "C" fn challenge_report() {
    let report_id: String = runtime::get_named_arg("report_id");
    let counter_evidence: String = runtime::get_named_arg("counter_evidence");

    let report_dict = get_dict_uref(REPORT_DICT);

    let report_opt: Option<ReportRecord> = storage::dictionary_get(report_dict, &report_id)
        .unwrap_or_revert();

    let mut report = report_opt.unwrap_or_revert_with(ApiError::User(ERR_REPORT_NOT_FOUND));

    let oracle_id = report.0.1.clone();
    let created_at = report.2.0;
    let challenged_at = report.2.1;
    let executed_at = report.2.2;

    if executed_at != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    if challenged_at != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_CHALLENGED));
    }

    let now: u64 = runtime::get_blocktime().into();
    if now > created_at + CHALLENGE_PERIOD {
        runtime::revert(ApiError::User(ERR_CHALLENGE_PERIOD_EXPIRED));
    }

    let oracle_dict = get_dict_uref(ORACLE_DICT);
    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_revert_with(ApiError::User(ERR_ORACLE_NOT_FOUND));
    let owner_string = oracle.0.1.clone();

    let caller = runtime::get_caller();
    let caller_string = account_hash_to_string(caller);

    if caller_string != owner_string {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED));
    }

    // Update counter_evidence and challenged_at
    report.1.2 = counter_evidence;
    report.2.1 = now;

    storage::dictionary_put(report_dict, &report_id, report);
}

#[no_mangle]
pub extern "C" fn execute_slash() {
    let report_id: String = runtime::get_named_arg("report_id");

    let report_dict = get_dict_uref(REPORT_DICT);

    let report_opt: Option<ReportRecord> = storage::dictionary_get(report_dict, &report_id)
        .unwrap_or_revert();

    let mut report = report_opt.unwrap_or_revert_with(ApiError::User(ERR_REPORT_NOT_FOUND));

    let oracle_id = report.0.1.clone();
    let severity = report.1.0;
    let created_at = report.2.0;
    let challenged_at = report.2.1;
    let executed_at = report.2.2;

    if executed_at != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    let now: u64 = runtime::get_blocktime().into();

    // If challenged, this function cannot execute it. A separate "resolve_dispute" would be needed.
    // This function is for unchallenged reports after the challenge period.
    if challenged_at != 0 {
        runtime::revert(ApiError::User(ERR_CHALLENGE_PERIOD_ACTIVE)); // Re-using error code
    }

    if now < created_at + CHALLENGE_PERIOD {
        runtime::revert(ApiError::User(ERR_CHALLENGE_PERIOD_ACTIVE));
    }

    let oracle_dict = get_dict_uref(ORACLE_DICT);
    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_revert_with(ApiError::User(ERR_ORACLE_NOT_FOUND));

    let ((oracle_id_inner, owner_string, stake), (violations, slashed_amount, registered_at), (active, reputation)) = oracle;

    let slash_percentage = severity_to_percentage(severity);
    let slash_amount_u512 = stake.checked_mul(U512::from(slash_percentage))
        .unwrap_or_revert()
        .checked_div(U512::from(100))
        .unwrap_or_revert();

    let new_stake = stake.checked_sub(slash_amount_u512).unwrap_or_revert();
    let new_violations = violations + 1;
    let new_slashed_amount = slashed_amount.checked_add(slash_amount_u512).unwrap_or_revert();
    let new_active = if new_stake.is_zero() { 0 } else { active };
    let new_reputation = reputation.saturating_sub(slash_percentage);

    let updated_oracle: OracleRecord = (
        (oracle_id_inner, owner_string, new_stake),
        (new_violations, new_slashed_amount, registered_at),
        (new_active, new_reputation),
    );

    storage::dictionary_put(oracle_dict, &oracle_id, updated_oracle);

    // Transfer slashed funds from the stake purse to the fee purse
    let stake_purse = runtime::get_key(STAKE_PURSE)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let fee_purse = runtime::get_key(FEE_PURSE)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    system::transfer_from_purse_to_purse(stake_purse, fee_purse, slash_amount_u512, None)
        .unwrap_or_revert();

    // Update report status
    report.2.2 = now; // executed_at

    storage::dictionary_put(report_dict, &report_id, report);
}

#[no_mangle]
pub extern "C" fn withdraw_stake() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let amount: U512 = runtime::get_named_arg("amount");

    let caller = runtime::get_caller();
    let caller_string = account_hash_to_string(caller);

    let oracle_dict = get_dict_uref(ORACLE_DICT);

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_revert_with(ApiError::User(ERR_ORACLE_NOT_FOUND));

    let ((_stored_oracle_id, owner_string, stake), violations_slashed, active_reputation) = oracle;

    if owner_string != caller_string {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED));
    }

    if amount > stake {
        runtime::revert(ApiError::User(ERR_WITHDRAW_TOO_HIGH));
    }

    let new_stake = stake.checked_sub(amount).unwrap_or_revert();

    let updated_oracle: OracleRecord = (
        (oracle_id.clone(), owner_string, new_stake),
        (violations_slashed.0, violations_slashed.1, violations_slashed.2),
        (active_reputation.0, active_reputation.1),
    );

    storage::dictionary_put(oracle_dict, &oracle_id, updated_oracle);
}

#[no_mangle]
pub extern "C" fn get_oracle() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let oracle_dict = get_dict_uref(ORACLE_DICT);

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert();

    match oracle_opt {
        Some(oracle) => {
            runtime::ret(CLValue::from_t(oracle).unwrap_or_revert());
        }
        None => runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)),
    }
}

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    let oracles_dict = storage::new_dictionary(ORACLE_DICT).unwrap_or_revert();
    let reports_dict = storage::new_dictionary(REPORT_DICT).unwrap_or_revert();
    let oracle_count_uref = storage::new_uref(0u64);
    let report_count_uref = storage::new_uref(0u64);
    let min_stake_uref = storage::new_uref(U512::from(1_000_000_000u64)); // 1 CSPR min stake
    let slash_bps_uref = storage::new_uref(1000u64); // 10% slash rate

    // Real fund-custody purses for register_oracle (stake deposit) and
    // execute_slash (stake -> fee transfer on confirmed slash). Without
    // these, both entry points revert on `get_key(STAKE_PURSE/FEE_PURSE)`
    // the moment they're actually invoked — this was a real bug found in
    // the 2026-07 A1 no-unilateral-withdraw audit: the installer never
    // created either purse, so the whole real-funds stake/slash mechanism
    // was unreachable on-chain despite the access-control logic being correct.
    let stake_purse = system::create_purse();
    let fee_purse = system::create_purse();

    let mut named_keys = NamedKeys::new();
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));
    named_keys.insert(ORACLE_DICT.into(), oracles_dict.into());
    named_keys.insert(REPORT_DICT.into(), reports_dict.into());
    named_keys.insert("oracle_count".into(), oracle_count_uref.into());
    named_keys.insert("report_count".into(), report_count_uref.into());
    named_keys.insert("min_stake".into(), min_stake_uref.into());
    named_keys.insert("slash_bps".into(), slash_bps_uref.into());
    named_keys.insert(STAKE_PURSE.into(), stake_purse.into());
    named_keys.insert(FEE_PURSE.into(), fee_purse.into());

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntityEntryPoint::new(
        "register_oracle",
        vec![
            Parameter::new("oracle_id", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "report_violation",
        vec![
            Parameter::new("oracle_id", CLType::String),
            Parameter::new("reason", CLType::String),
            Parameter::new("evidence", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "challenge_report",
        vec![
            Parameter::new("report_id", CLType::String),
            Parameter::new("evidence", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "execute_slash",
        vec![
            Parameter::new("oracle_id", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "withdraw_stake",
        vec![
            Parameter::new("oracle_id", CLType::String),
            Parameter::new("amount", CLType::U512),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "get_oracle",
        vec![
            Parameter::new("oracle_id", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("oracle_slashing_package_hash".into()),
        Some("oracle_slashing_access_uref".into()),
        None,
    );

    runtime::put_key("oracle_slashing_contract_hash", contract_hash.into());
}
