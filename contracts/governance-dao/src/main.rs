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

const GOVERNANCE_DAO_KEY: &str = "governance_dao";
const PROPOSALS_DICT: &str = "proposals";
const VOTES_DICT: &str = "votes";
const DELEGATIONS_DICT: &str = "delegations";
const INSTALLER_KEY: &str = "installer";
const PROPOSAL_COUNT_KEY: &str = "proposal_count";

const STATUS_ACTIVE: u64 = 0;
const STATUS_PASSED: u64 = 1;
const STATUS_REJECTED: u64 = 2;
const STATUS_EXECUTED: u64 = 3;
const STATUS_VETOED: u64 = 4;
const STATUS_EXPIRED: u64 = 5;

const ACTION_UPDATE_WEIGHTS: u64 = 0;
const ACTION_ADD_ORACLE: u64 = 1;
const ACTION_REMOVE_ORACLE: u64 = 2;
const ACTION_UPDATE_THRESHOLD: u64 = 3;
const ACTION_PAUSE: u64 = 4;

const QUORUM_PERCENT: u64 = 30;
const TIMELOCK_SECONDS: u64 = 86400;
const VOTING_PERIOD_SECONDS: u64 = 259200;

const ERR_NOT_INSTALLER: u16 = 1;
const ERR_PROPOSAL_NOT_FOUND: u16 = 2;
const ERR_ALREADY_VOTED: u16 = 3;
const ERR_VOTING_CLOSED: u16 = 4;
const ERR_NOT_PASSED: u16 = 5;
const ERR_TIMELOCK_NOT_MET: u16 = 6;
const ERR_ALREADY_EXECUTED: u16 = 7;
const ERR_INVALID_ACTION: u16 = 8;
const ERR_PROPOSAL_EXPIRED: u16 = 9;
const ERR_INVALID_VOTE: u16 = 10;
const ERR_SELF_DELEGATE: u16 = 11;

fn get_installer() -> AccountHash {
    let uref: URef = runtime::get_key(INSTALLER_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::read(uref).unwrap_or_revert().unwrap_or_revert()
}

fn is_installer() -> bool {
    runtime::get_caller() == get_installer()
}

fn get_proposals_uref() -> URef {
    runtime::get_key(PROPOSALS_DICT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn get_votes_uref() -> URef {
    runtime::get_key(VOTES_DICT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn get_delegations_uref() -> URef {
    runtime::get_key(DELEGATIONS_DICT)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn proposal_key(proposal_id: &str) -> String {
    proposal_id.to_string()
}

fn vote_key(proposal_id: &str, voter: &AccountHash) -> String {
    format!("{}:{:?}", proposal_id, voter)
}

fn get_current_timestamp() -> u64 {
    runtime::get_blocktime().into()
}

fn get_total_staked() -> u64 {
    1000
}

fn get_voting_power(account: &AccountHash) -> u64 {
    let delegations_uref = get_delegations_uref();
    let delegation: Option<String> = storage::dictionary_get(delegations_uref, &format!("{:?}", account))
        .unwrap_or_revert();
    
    if let Some(delegatee) = delegation {
        if delegatee == format!("{:?}", account) {
            100
        } else {
            0
        }
    } else {
        100
    }
}

#[no_mangle]
pub extern "C" fn create_proposal() {
    let title: String = runtime::get_named_arg("title");
    let description: String = runtime::get_named_arg("description");
    let action_type: u64 = runtime::get_named_arg("action_type");
    let params: String = runtime::get_named_arg("params");

    if action_type > ACTION_PAUSE {
        runtime::revert(ApiError::User(ERR_INVALID_ACTION));
    }

    let proposer = runtime::get_caller();
    let timestamp = get_current_timestamp();

    let count_uref: URef = runtime::get_key(PROPOSAL_COUNT_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let count: u64 = storage::read(count_uref).unwrap_or_revert().unwrap_or_revert();
    let new_count = count + 1;
    storage::write(count_uref, new_count);

    let proposal_id = format!("proposal_{}", new_count);

    let proposal = (
        (proposal_id.clone(), format!("{:?}", proposer), title),
        (description, action_type, params),
        (0u64, 0u64, STATUS_ACTIVE),
        (timestamp, timestamp + VOTING_PERIOD_SECONDS, 0u64),
    );

    let proposals_uref = get_proposals_uref();
    storage::dictionary_put(proposals_uref, &proposal_key(&proposal_id), proposal);
}

#[no_mangle]
pub extern "C" fn vote() {
    let proposal_id: String = runtime::get_named_arg("proposal_id");
    let support: u64 = runtime::get_named_arg("support");
    let weight: u64 = runtime::get_named_arg("weight");

    if support != 0 && support != 1 {
        runtime::revert(ApiError::User(ERR_INVALID_VOTE));
    }

    let voter = runtime::get_caller();
    let proposals_uref = get_proposals_uref();
    let votes_uref = get_votes_uref();

    let key = proposal_key(&proposal_id);
    let vote_key_str = vote_key(&proposal_id, &voter);

    let existing_vote: Option<bool> = storage::dictionary_get(votes_uref, &vote_key_str).unwrap_or_revert();
    if existing_vote.is_some() {
        runtime::revert(ApiError::User(ERR_ALREADY_VOTED));
    }

    let proposal: Option<(
        (String, String, String),
        (String, u64, String),
        (u64, u64, u64),
        (u64, u64, u64),
    )> = storage::dictionary_get(proposals_uref, &key).unwrap_or_revert();

    let mut proposal = match proposal {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    let current_time = get_current_timestamp();
    let (_, _, (votes_for, votes_against, status), (created, voting_end, _)) = &proposal;

    if *status != STATUS_ACTIVE {
        runtime::revert(ApiError::User(ERR_VOTING_CLOSED));
    }

    if current_time > *voting_end {
        runtime::revert(ApiError::User(ERR_PROPOSAL_EXPIRED));
    }

    let voting_power = get_voting_power(&voter);
    let effective_weight = weight.min(voting_power);

    let new_votes_for = if support == 1 {
        *votes_for + effective_weight
    } else {
        *votes_for
    };

    let new_votes_against = if support == 0 {
        *votes_against + effective_weight
    } else {
        *votes_against
    };

    let total_staked = get_total_staked();
    let quorum_threshold = (total_staked * QUORUM_PERCENT) / 100;

    let new_status = if new_votes_for + new_votes_against >= quorum_threshold {
        if new_votes_for > new_votes_against {
            STATUS_PASSED
        } else if current_time >= *voting_end {
            STATUS_REJECTED
        } else {
            STATUS_ACTIVE
        }
    } else if current_time >= *voting_end {
        STATUS_EXPIRED
    } else {
        STATUS_ACTIVE
    };

    let ((a, b, c), (d, e, f), _, (g, h, i)) = proposal;
    let updated_proposal = (
        (a, b, c),
        (d, e, f),
        (new_votes_for, new_votes_against, new_status),
        (*created, *h, current_time),
    );

    storage::dictionary_put(proposals_uref, &key, updated_proposal);
    storage::dictionary_put(votes漫_uref, &vote_key_str, true);
}

#[no_mangle]
pub extern "C" fn execute_proposal() {
    let proposal_id: String = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_proposals_uref();

    let key = proposal_key(&proposal_id);
    let proposal: Option<(
        (String, String, String),
        (String, u64, String),
        (u64, u64, u64),
        (u64, u64, u64),
    )> = storage::dictionary_get(proposals_uref, &key).unwrap_or_revert();

    let mut proposal = match proposal {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    let (_, _, (votes_for, votes_against, status), (_, _, _)) = &proposal;

    if *status == STATUS_EXECUTED {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    if *status == STATUS_VETOED {
        runtime::revert(ApiError::User(ERR_NOT_PASSED));
    }

    if *status != STATUS_PASSED {
        let current_time = get_current_timestamp();
        let total_staked = get_total_staked();
        let quorum_threshold = (total_staked * QUORUM_PERCENT) / 100;

        if *votes_for + *votes_against < quorum_threshold {
            runtime::revert(ApiError::User(ERR_NOT_PASSED));
        }

        if *votes_for <= *votes_against {
            runtime::revert(ApiError::User(ERR_NOT_PASSED));
        }

        let ((a, b, c), (d, e, f), (g, h, _), (i, j, k)) = proposal;
        proposal = (
            (a, b, c),
            (d, e, f),
            (g, h, STATUS_PASSED),
            (i, j, k),
        );
    }

    let ((a, b, c), (d, action_type, f), (g, h, _), (i, j, k)) = proposal;
    let executed_proposal = (
        (a, b, c),
        (d, action_type, f),
        (g, h, STATUS_EXECUTED),
        (i, j, get_current_timestamp()),
    );

    storage::dictionary_put(proposals_uref, &key, executed_proposal);
}

#[no_mangle]
pub extern "C" fn veto_proposal() {
    if !is_installer() {
        runtime::revert(ApiError::User(ERR_NOT_INSTALLER));
    }

    let proposal_id: String = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_proposals_uref();

    let key = proposal_key(&proposal_id);
    let proposal: Option<(
        (String, String, String),
        (String, u64, String),
        (u64, u64, u64),
        (u64, u64, u64),
    )> = storage::dictionary_get(proposals_uref, &key).unwrap_or_revert();

    let proposal = match proposal {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    let ((a, b, c), (d, e, f), (g, h, _), (i, j, k)) = proposal;
    let vetoed_proposal = (
        (a, b, c),
        (d, e, f),
        (g, h, STATUS_VETOED),
        (i, j, get_current_timestamp()),
    );

    storage::dictionary_put(proposals_uref, &key, vetoed_proposal);
}

#[no_mangle]
pub extern "C" fn get_proposal() {
    let proposal_id: String = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_proposals_uref();

    let key = proposal_key(&proposal_id);
    let proposal: Option<(
        (String, String, String),
        (String, u64, String),
        (u64, u64, u64),
        (u64, u64, u64),
    )> = storage::dictionary_get(proposals_uref, &key).unwrap_or_revert();

    match proposal {
        Some(p) => {
            let ret = (
                p.0.0, p.0.1, p.0.2,
                p.1.0, p.1.1, p.1.2,
                p.2.0, p.2.1, p.2.2,
                p.3.0, p.3.1, p.3.2,
            );
            runtime::ret(CLValue::from_t(ret).unwrap_or_revert());
        }
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    }
}

#[no_mangle]
pub extern "C" fn delegate() {
    let to: String = runtime::get_named_arg("to");
    let delegator = runtime::get_caller();

    if format!("{:?}", delegator) == to {
        runtime::revert(ApiError::User(ERR_SELF_DELEGATE));
    }

    let delegations_uref = get_delegations_uref();
    storage::dictionary_put(delegations_uref, &format!("{:?}", delegator), to);
}

#[no_mangle]
pub extern "C" fn call() {
    let mut named_keys = NamedKeys::new();

    let installer = runtime::get_caller();
    let installer_uref = storage::new_uref(installer);
    named_keys.insert(INSTALLER_KEY.to_string(), Key::URef(installer_uref));

    let count_uref = storage::new_uref(0u64);
    named_keys.insert(PROPOSAL_COUNT_KEY.to_string(), Key::URef(count_uref));

    let proposals_uref = storage::new_dictionary(PROPOSALS_DICT).unwrap_or_revert();
    named_keys.insert(PROPOSALS_DICT.to_string(), Key::URef(proposals_uref));

    let votes_uref = storage::new_dictionary(VOTES_DICT).unwrap_or_revert();
    named_keys.insert(VOTES_DICT.to_string(), Key::URef(votes_uref));

    let delegations_uref = storage::new_dictionary(DELEGATIONS_DICT).unwrap_or_revert();
    named_keys.insert(DELEGATIONS_DICT.to_string(), Key::URef(delegations_uref));

    let mut entry_points = EntryPoints::new();

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "create_proposal".to_string(),
        vec![
            Parameter::new("title", CLType::String),
            Parameter::new("description", CLType::String),
            Parameter::new("action_type", CLType::U64),
            Parameter::new("params", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "vote".to_string(),
        vec![
            Parameter::new("proposal_id", CLType::String),
            Parameter::new("support", CLType::U64),
            Parameter::new("weight", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "execute_proposal".to_string(),
        vec![Parameter::new("proposal_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "veto_proposal".to_string(),
        vec![Parameter::new("proposal_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "get_proposal".to_string(),
        vec![Parameter::new("proposal_id", CLType::String)],
        CLType::Any,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entrypoint(EntityEntryPoint::new(
        "delegate".to_string(),
        vec![Parameter::new("to", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some(GOVERNANCE_DAO_KEY.to_string()),
        None,
    );

    runtime::put_key(GOVERNANCE_DAO_KEY, Key::Hash(contract_hash.value()));
}