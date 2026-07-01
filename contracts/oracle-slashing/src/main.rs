#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;
use alloc::vec;

use casper_contract::contract_api::{runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;

use casper_types::{
    ApiError, CLType, CLValue, EntityEntryPoint, EntryPointAccess, EntryPointType, EntryPoints,
    Parameter, URef, U512, Key,
};
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::EntryPointPayment;

const ORACLE_DICT: &str = "oracle_dict";
const REPORT_DICT: &str = "report_dict";
const REPORT_COUNTER: &str = "report_counter";

const ERR_ORACLE_EXISTS: u16 = 1;
const ERR_ORACLE_NOT_FOUND: u16 = 2;
const ERR_INSUFFICIENT_STAKE: u16 = 3;
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

const CHALLENGE_PERIOD: u64 = 172800;

type OracleRecord = (
    (String, String, u64),
    (u64, u64, u64),
    (u64, u64, u64),
);

type ReportRecord = (
    (String, String, String),
    (u64, String, String),
    (u64, u64, u64),
);

fn get_oracle_dict() -> URef {
    let key = runtime::get_key(ORACLE_DICT).unwrap_or_revert();
    key.into_uref().unwrap_or_revert()
}

fn get_report_dict() -> URef {
    let key = runtime::get_key(REPORT_DICT).unwrap_or_revert();
    key.into_uref().unwrap_or_revert()
}

fn get_report_counter() -> u64 {
    match runtime::get_key(REPORT_COUNTER) {
        Some(key) => {
            let uref = key.into_uref().unwrap_or_revert();
            storage::read(uref).unwrap_or_revert().unwrap_or_revert()
        }
        None => 0,
    }
}

fn set_report_counter(counter: u64) {
    let key = runtime::get_key(REPORT_COUNTER).unwrap_or_revert();
    let uref = key.into_uref().unwrap_or_revert();
    storage::write(uref, counter);
}

fn account_hash_to_string(account_hash: AccountHash) -> String {
    let bytes = account_hash.as_bytes();
    let mut hex_string = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let high = byte >> 4;
        let low = byte & 0x0F;
        hex_string.push(char::from_digit(high as u32, 16).unwrap());
        hex_string.push(char::from_digit(low as u32, 16).unwrap());
    }
    hex_string
}

fn string_to_account_hash(s: &str) -> AccountHash {
    let bytes = hex::decode(s).unwrap_or_revert();
    let mut array = [0u8; 32];
    array.copy_from_slice(&bytes);
    AccountHash::new(array)
}

fn severity_to_percentage(severity: u64) -> u64 {
    match severity {
        0 => 5,
        1 => 15,
        2 => 50,
        3 => 100,
        _ => runtime::revert(ApiError::User(ERR_INVALID_SEVERITY)),
    }
}

#[no_mangle]
pub extern "C" fn register_oracle() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let stake: U512 = runtime::get_named_arg("stake");

    let caller = runtime::get_caller();
    let owner_string = account_hash_to_string(caller);

    let dict = get_oracle_dict();

    let existing: Option<OracleRecord> = storage::dictionary_get(dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    if existing.is_some() {
        runtime::revert(ApiError::User(ERR_ORACLE_EXISTS));
    }

    let stake_u64: u64 = stake.try_into().unwrap_or_revert();

    let now = runtime::get_blocktime().into();

    let record: OracleRecord = (
        (oracle_id.clone(), owner_string, stake_u64),
        (0, 0, now),
        (1, 100, 0),
    );

    storage::dictionary_put(dict, &oracle_id, record);
}

#[no_mangle]
pub extern "C" fn report_violation() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let severity: u64 = runtime::get_named_arg("severity");
    let evidence: String = runtime::get_named_arg("evidence");

    let caller = runtime::get_caller();
    let reporter_string = account_hash_to_string(caller);

    let dict = get_oracle_dict();

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)));

    let ((stored_oracle_id, owner_string, _stake), _, _) = &oracle;
    if *stored_oracle_id != oracle_id {
        runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND));
    }

    if *owner_string == reporter_string {
        runtime::revert(ApiError::User(ERR_SELF_REPORT));
    }

    if severity > 3 {
        runtime::revert(ApiError::User(ERR_INVALID_SEVERITY));
    }

    let report_counter = get_report_counter();
    let report_id = format!("report_{}", report_counter);

    let now = runtime::get_blocktime().into();

    let report: ReportRecord = (
        (report_id.clone(), oracle_id.clone(), reporter_string),
        (severity, evidence, String::new()),
        (now, 0, 0),
    );

    let report_dict = get_report_dict();
    storage::dictionary_put(report_dict, &report_id, report);

    set_report_counter(report_counter + 1);
}

#[no_mangle]
pub extern "C" fn challenge_report() {
    let report_id: String = runtime::get_named_arg("report_id");
    let counter_evidence: String = runtime::get_named_arg("counter_evidence");

    let report_dict = get_report_dict();

    let report_opt: Option<ReportRecord> = storage::dictionary_get(report_dict, &report_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let report = report_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_REPORT_NOT_FOUND)));

    let ((_, oracle_id, _), _, (created_at, challenged, executed)) = report;

    if executed != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    if challenged != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_CHALLENGED));
    }

    let now: u64 = runtime::get_blocktime().into();
    if now > created_at + CHALLENGE_PERIOD {
        runtime::revert(ApiError::User(ERR_CHALLENGE_PERIOD_EXPIRED));
    }

    let oracle_dict = get_oracle_dict();
    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)));
    let ((_, owner_string, _), _, _) = oracle;

    let caller = runtime::get_caller();
    let caller_string = account_hash_to_string(caller);

    if caller_string != owner_string {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED));
    }

    let new_report: ReportRecord = (
        (report.0.0, report.0.1, report.0.2),
        (report.1.0, report.1.1, counter_evidence),
        (created_at, now, 0),
    );

    storage::dictionary_put(report_dict, &report_id, new_report);
}

#[no_mangle]
pub extern "C" fn execute_slash() {
    let report_id: String = runtime::get_named_arg("report_id");

    let report_dict = get_report_dict();

    let report_opt: Option<ReportRecord> = storage::dictionary_get(report_dict)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let report = report_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_REPORT_NOT_FOUND)));

    let ((_, oracle_id, _), (severity, _, _), (created_at, challenged, executed)) = report;

    if executed != 0 {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    let now: u64 = runtime::get_blocktime().into();

    if now < created_at + CHALLENGE_PERIOD {
        runtime::revert(ApiError::User(ERR_CHALLENGE_PERIOD_ACTIVE));
    }

    let oracle_dict = get_oracle_dict();
    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)));

    let ((oracle_id_inner, owner_string, stake), (violations, slashed, registered_at), (active, reputation, last_attest)) = oracle;

    let slash_percentage = severity_to_percentage(severity);
    let slash_amount = (stake * slash_percentage) / 100;

    let new_stake = stake - slash_amount;
    let new_violations = violations + 1;
    let new_slashed = slashed + slash_amount;
    let new_active = if new_stake == 0 { 0 } else { active };
    let new_reputation = if reputation > slash_percentage { reputation - slash_percentage } else { 0 };

    let updated_oracle: OracleRecord = (
        (oracle_id_inner, owner_string, new_stake),
        (new_violations, new_slashed, registered_at),
        (new_active, new_reputation, last_attest),
    );

    storage::dictionary_put(oracle_dict, &oracle_id, updated_oracle);

    let updated_report: ReportRecord = (
        (report.0.0, report.0.1, report.0.2),
        (report.1.0, report.1.1, report.1.2),
        (created_at, challenged, now),
    );

    storage::dictionary_put(report_dict, &report_id, updated_report);
}

#[no_mangle]
pub extern "C" fn withdraw_stake() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");
    let amount: U512 = runtime::get_named_arg("amount");

    let caller = runtime::get_caller();
    let caller_string = account_hash_to_string(caller);

    let oracle_dict = get_oracle_dict();

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)));

    let ((stored_oracle_id, owner_string, stake), violations_slashed, active_reputation) = oracle;

    if stored_oracle_id != oracle_id {
        runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND));
    }

    if owner_string != caller_string {
        runtime::revert(ApiError::User(ERR_UNAUTHORIZED));
    }

    let amount_u64: u64 = amount.try_into().unwrap_or_revert();

    if amount_u64 > stake {
        runtime::revert(ApiError::User(ERR_WITHDRAW_TOO_HIGH));
    }

    let new_stake = stake - amount_u64;

    let updated_oracle: OracleRecord = (
        (oracle_id.clone(), caller_string, new_stake),
        violations_slashed,
        active_reputation,
    );

    storage::dictionary_put(oracle_dict, &oracle_id, updated_oracle);
}

#[no_mangle]
pub extern "C" fn get_oracle() {
    let oracle_id: String = runtime::get_named_arg("oracle_id");

    let oracle_dict = get_oracle_dict();

    let oracle_opt: Option<OracleRecord> = storage::dictionary_get(oracle_dict, &oracle_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let oracle = oracle_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_ORACLE_NOT_FOUND)));

    runtime::ret(CLValue::from_t(oracle).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn get_report() {
    let report_id: String = runtime::get_named_arg("report_id");

    let report_dict = get_report_dict();

    let report_opt: Option<ReportRecord> = storage::dictionary_get(report_dict, &report_id)
        .unwrap_or_revert()
        .unwrap_or_revert();

    let report = report_opt.unwrap_or_else(|| runtime::revert(ApiError::User(ERR_REPORT_NOT_FOUND)));

    runtime::ret(CLValue::from_t(report).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn call() {
    let mut named_keys = NamedKeys::new();

    let oracle_dict_uref = storage::new_dictionary(ORACLE_DICT).unwrap_or_revert();
    let report_dict_uref = storage::new_dictionary(REPORT_DICT).unwrap_or_revert();
    let report_counter_uref = storage::new_uref(0u64);

    named_keys.insert(String::from(ORACLE_DICT), Key::URef(oracle_dict_uref));
    named_keys.insert(String::from(REPORT_DICT), Key::URef(report_dict_uref));
    named_keys.insert(String::from(REPORT_COUNTER), Key::URef(report_counter_uref));

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("register_oracle"),
            vec![
                Parameter::new("oracle_id", CLType::String),
                Parameter::new("stake", CLType::U512),
            ],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("report_violation"),
            vec![
                Parameter::new("oracle_id", CLType::String),
                Parameter::new("severity", CLType::U64),
                Parameter::new("evidence", CLType::String),
            ],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("challenge_report"),
            vec![
                Parameter::new("report_id", CLType::String),
                Parameter::new("counter_evidence", CLType::String),
            ],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("execute_slash"),
            vec![
                Parameter::new("report_id", CLType::String),
            ],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("withdraw_stake"),
            vec![
                Parameter::new("oracle_id", CLType::String),
                Parameter::new("amount", CLType::U512),
            ],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("get_oracle"),
            vec![
                Parameter::new("oracle_id", CLType::String),
            ],
            CLType::Any,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    entry_points.add_entry_point(
        EntityEntryPoint::new(
            String::from("get_report"),
            vec![
                Parameter::new("report_id", CLType::String),
            ],
            CLType::Any,
            EntryPointAccess::Public,
            EntryPointType::Contract,
            EntryPointPayment::Caller,
        ),
    );

    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        None,
        None,
    );

    runtime::put_key("OracleSlashing", contract_hash.into());
}