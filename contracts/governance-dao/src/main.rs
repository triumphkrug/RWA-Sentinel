#![no_std]
#![no_main]

extern crate alloc;

use alloc::boxed::Box;
use alloc::format;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;

use casper_contract::contract_api::{runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::account::AccountHash;
use casper_types::contracts::NamedKeys;
use casper_types::{
    ApiError, CLType, CLValue, EntityEntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Key,
    Parameter, URef, U512, EntryPointPayment,
};

// Constants
const GOVERNANCE_DAO_CONTRACT_HASH_KEY: &str = "governance_dao_contract_hash";
const GOVERNANCE_DAO_PACKAGE_HASH_KEY: &str = "governance_dao_package_hash";
const GOVERNANCE_DAO_ACCESS_UREF_KEY: &str = "governance_dao_access_uref";

const PROPOSALS_DICT: &str = "proposals";
const PROPOSAL_DETAILS_DICT: &str = "proposal_details"; // New dictionary for description, params, price_bps
const VOTES_DICT: &str = "votes";
const DELEGATIONS_DICT: &str = "delegations";
const INSTALLER_KEY: &str = "installer";
const PROPOSAL_COUNT_KEY: &str = "proposal_count";
const PRICE_BPS_KEY: &str = "price_bps"; // For revenue model

const DEFAULT_PRICE_BPS: u64 = 0; // Default fee for proposals

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
const VOTING_PERIOD_SECONDS: u64 = 7 * 24 * 60 * 60; // 7 days

// Error codes
const ERR_NOT_INSTALLER: u16 = 1;
const ERR_PROPOSAL_NOT_FOUND: u16 = 2;
const ERR_ALREADY_VOTED: u16 = 3;
const ERR_VOTING_CLOSED: u16 = 4;
const ERR_NOT_PASSED: u16 = 5;
const ERR_ALREADY_EXECUTED: u16 = 6;
const ERR_INVALID_ACTION: u16 = 7;
const ERR_PROPOSAL_EXPIRED: u16 = 8;
const ERR_INVALID_VOTE: u16 = 9;
const ERR_SELF_DELEGATE: u16 = 10;
const ERR_INVALID_ACCOUNT_HASH: u16 = 11;

// Record types for dictionary storage
// ProposalRecord: ((proposer_hash, title, action_type), (votes_for, votes_against, status), (created_at, voting_end, executed_at))
type ProposalRecord = ((String, String, u64), (u64, u64, u64), (u64, u64, u64));
// ProposalDetailsRecord: (description, params, price_bps)
type ProposalDetailsRecord = (String, String, u64);

// Helper functions
fn get_installer() -> AccountHash {
    runtime::get_key(INSTALLER_KEY)
        .unwrap_or_revert()
        .into_account()
        .unwrap_or_revert()
}

fn is_installer() -> bool {
    runtime::get_caller() == get_installer()
}

fn get_dict_uref(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert()
}

fn read_price_bps() -> u64 {
    let uref = runtime::get_key(PRICE_BPS_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::read::<u64>(uref)
        .unwrap_or_revert()
        .unwrap_or(DEFAULT_PRICE_BPS)
}

fn proposal_key(proposal_id: u64) -> String {
    format!("proposal_{}", proposal_id)
}

fn vote_key(proposal_id: u64, voter: &AccountHash) -> String {
    format!("{}:{}", proposal_id, voter.to_string())
}

fn get_current_timestamp() -> u64 {
    runtime::get_blocktime().into()
}

/// Placeholder for total staked tokens in the DAO.
/// In a real DAO, this would query a token contract.
fn get_total_staked() -> u64 {
    1000 // Example total staked tokens
}

/// Placeholder for an account's voting power.
/// In a real DAO, this would query a token contract for balance or delegated balance.
fn get_voting_power(account: &AccountHash) -> u64 {
    let delegations_uref = get_dict_uref(DELEGATIONS_DICT);
    let delegation: Option<String> = storage::dictionary_get(delegations_uref, &account.to_string())
        .unwrap_or_revert();
    
    // If an account has delegated, their voting power is 0.
    // If an account has not delegated, their voting power is 100 (example).
    if delegation.is_some() {
        0
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
    let price_bps: u64 = runtime::get_named_arg("price_bps"); // New parameter for revenue model

    if action_type > ACTION_PAUSE {
        runtime::revert(ApiError::User(ERR_INVALID_ACTION));
    }

    let proposer = runtime::get_caller();
    let timestamp = get_current_timestamp();

    let count_uref: URef = runtime::get_key(PROPOSAL_COUNT_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    let count: u64 = storage::read(count_uref).unwrap_or_revert().unwrap_or_default(); // Use unwrap_or_default for initial 0
    let new_count = count + 1;
    storage::write(count_uref, new_count);

    let proposal_id = new_count;
    let proposal_key_str = proposal_key(proposal_id);

    // Main proposal record (9 fields)
    let proposal: ProposalRecord = (
        (proposer.to_string(), title, action_type),
        (0u64, 0u64, STATUS_ACTIVE), // votes_for, votes_against, status
        (timestamp, timestamp + VOTING_PERIOD_SECONDS, 0u64), // created_at, voting_end, executed_at (0 if not executed)
    );

    // Proposal details record (3 fields)
    let proposal_details: ProposalDetailsRecord = (description, params, price_bps);

    let proposals_uref = get_dict_uref(PROPOSALS_DICT);
    storage::dictionary_put(proposals_uref, &proposal_key_str, proposal);

    let proposal_details_uref = get_dict_uref(PROPOSAL_DETAILS_DICT);
    storage::dictionary_put(proposal_details_uref, &proposal_key_str, proposal_details);
}

#[no_mangle]
pub extern "C" fn vote() {
    let proposal_id: u64 = runtime::get_named_arg("proposal_id");
    let support: u64 = runtime::get_named_arg("support"); // 0 for against, 1 for for
    let weight: u64 = runtime::get_named_arg("weight");

    if support != 0 && support != 1 {
        runtime::revert(ApiError::User(ERR_INVALID_VOTE));
    }

    let voter = runtime::get_caller();
    let proposals_uref = get_dict_uref(PROPOSALS_DICT);
    let votes_uref = get_dict_uref(VOTES_DICT);

    let proposal_key_str = proposal_key(proposal_id);
    let vote_key_str = vote_key(proposal_id, &voter);

    let existing_vote: Option<bool> = storage::dictionary_get(votes_uref, &vote_key_str).unwrap_or_revert();
    if existing_vote.is_some() {
        runtime::revert(ApiError::User(ERR_ALREADY_VOTED));
    }

    let proposal_option: Option<ProposalRecord> = storage::dictionary_get(proposals_uref, &proposal_key_str).unwrap_or_revert();

    let mut proposal = match proposal_option {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    let current_time = get_current_timestamp();
    let ((_, _, _), (votes_for, votes_against, status), (created_at, voting_end, _)) = &mut proposal;

    if *status != STATUS_ACTIVE {
        runtime::revert(ApiError::User(ERR_VOTING_CLOSED));
    }

    if current_time > *voting_end {
        // Update status to EXPIRED if voting period has passed
        *status = STATUS_EXPIRED;
        storage::dictionary_put(proposals_uref, &proposal_key_str, proposal);
        runtime::revert(ApiError::User(ERR_PROPOSAL_EXPIRED));
    }

    let voting_power = get_voting_power(&voter);
    let effective_weight = weight.min(voting_power);

    if support == 1 {
        *votes_for += effective_weight;
    } else {
        *votes_against += effective_weight;
    }

    let total_staked = get_total_staked();
    let quorum_threshold = (total_staked * QUORUM_PERCENT) / 100;

    // Check if quorum is met and if proposal passes
    if *votes_for + *votes_against >= quorum_threshold {
        if *votes_for > *votes_against {
            *status = STATUS_PASSED;
        } else {
            // If quorum met but votes against are equal or higher, it's rejected
            *status = STATUS_REJECTED;
        }
    } else if current_time >= *voting_end {
        // If voting period ends and quorum not met, it's expired
        *status = STATUS_EXPIRED;
    }
    // Otherwise, status remains ACTIVE

    storage::dictionary_put(proposals_uref, &proposal_key_str, proposal);
    storage::dictionary_put(votes_uref, &vote_key_str, true); // Record that voter has voted
}

#[no_mangle]
pub extern "C" fn execute_proposal() {
    let proposal_id: u64 = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_dict_uref(PROPOSALS_DICT);

    let proposal_key_str = proposal_key(proposal_id);
    let proposal_option: Option<ProposalRecord> = storage::dictionary_get(proposals_uref, &proposal_key_str).unwrap_or_revert();

    let mut proposal = match proposal_option {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    {
        let status = proposal.1.2;
        if status == STATUS_EXECUTED {
            runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
        }
        if status == STATUS_VETOED {
            runtime::revert(ApiError::User(ERR_NOT_PASSED));
        }
    }

    // Check if voting period has ended and update status if necessary
    let current_time = get_current_timestamp();
    if current_time > proposal.2.1 && proposal.1.2 == STATUS_ACTIVE {
        let total_staked = get_total_staked();
        let quorum_threshold = (total_staked * QUORUM_PERCENT) / 100;

        if proposal.1.0 + proposal.1.1 >= quorum_threshold {
            if proposal.1.0 > proposal.1.1 {
                proposal.1.2 = STATUS_PASSED;
            } else {
                proposal.1.2 = STATUS_REJECTED;
            }
        } else {
            proposal.1.2 = STATUS_EXPIRED;
        }
        storage::dictionary_put(proposals_uref, &proposal_key_str, proposal.clone());
    }

    if proposal.1.2 != STATUS_PASSED {
        runtime::revert(ApiError::User(ERR_NOT_PASSED));
    }

    // Perform the action based on action_type (status update for this version)
    // Extended action dispatch planned for Phase 2 integration

    proposal.1.2 = STATUS_EXECUTED;
    proposal.2.2 = current_time;

    storage::dictionary_put(proposals_uref, &proposal_key_str, proposal);
}

#[no_mangle]
pub extern "C" fn veto_proposal() {
    if !is_installer() {
        runtime::revert(ApiError::User(ERR_NOT_INSTALLER));
    }

    let proposal_id: u64 = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_dict_uref(PROPOSALS_DICT);

    let proposal_key_str = proposal_key(proposal_id);
    let proposal_option: Option<ProposalRecord> = storage::dictionary_get(proposals_uref, &proposal_key_str).unwrap_or_revert();

    let mut proposal = match proposal_option {
        Some(p) => p,
        None => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    };

    if proposal.1.2 == STATUS_EXECUTED {
        runtime::revert(ApiError::User(ERR_ALREADY_EXECUTED));
    }

    proposal.1.2 = STATUS_VETOED;
    proposal.2.2 = get_current_timestamp();

    storage::dictionary_put(proposals_uref, &proposal_key_str, proposal);
}

#[no_mangle]
pub extern "C" fn get_proposal() {
    let proposal_id: u64 = runtime::get_named_arg("proposal_id");
    let proposals_uref = get_dict_uref(PROPOSALS_DICT);
    let proposal_details_uref = get_dict_uref(PROPOSAL_DETAILS_DICT);

    let proposal_key_str = proposal_key(proposal_id);

    let proposal_option: Option<ProposalRecord> = storage::dictionary_get(proposals_uref, &proposal_key_str).unwrap_or_revert();
    let proposal_details_option: Option<ProposalDetailsRecord> = storage::dictionary_get(proposal_details_uref, &proposal_key_str).unwrap_or_revert();

    match (proposal_option, proposal_details_option) {
        (Some(p), Some(pd)) => {
            let ((proposer_hash, title, action_type), (votes_for, votes_against, status), (created_at, voting_end, executed_at)) = p;
            let (description, params, price_bps) = pd;

            // Return as nested tuples (max 3 elements each for CLTyped)
            let ret = (
                (proposal_id, proposer_hash, title),
                (description, params, action_type),
                (
                    (votes_for, votes_against, status),
                    (created_at, voting_end, executed_at),
                    price_bps,
                ),
            );
            runtime::ret(CLValue::from_t(ret).unwrap_or_revert());
        }
        _ => runtime::revert(ApiError::User(ERR_PROPOSAL_NOT_FOUND)),
    }
}

#[no_mangle]
pub extern "C" fn delegate() {
    let to_account_hash_str: String = runtime::get_named_arg("to");
    let delegator = runtime::get_caller();

    let to_account_hash = AccountHash::from_formatted_str(&to_account_hash_str)
        .map_err(|_| ApiError::User(ERR_INVALID_ACCOUNT_HASH))
        .unwrap_or_revert();

    if delegator == to_account_hash {
        runtime::revert(ApiError::User(ERR_SELF_DELEGATE));
    }

    let delegations_uref = get_dict_uref(DELEGATIONS_DICT);
    storage::dictionary_put(delegations_uref, &delegator.to_string(), to_account_hash_str);
}

#[no_mangle]
pub extern "C" fn call() {
    let installer = runtime::get_caller();

    let proposals_dict = storage::new_dictionary(PROPOSALS_DICT).unwrap_or_revert();
    let proposal_details_dict = storage::new_dictionary(PROPOSAL_DETAILS_DICT).unwrap_or_revert();
    let votes_dict = storage::new_dictionary(VOTES_DICT).unwrap_or_revert();
    let delegations_dict = storage::new_dictionary(DELEGATIONS_DICT).unwrap_or_revert();
    let proposal_count_uref = storage::new_uref(0u64);
    let price_bps_uref = storage::new_uref(DEFAULT_PRICE_BPS);

    let mut named_keys = NamedKeys::new();
    named_keys.insert(INSTALLER_KEY.into(), Key::Account(installer));
    named_keys.insert(PROPOSAL_COUNT_KEY.into(), proposal_count_uref.into());
    named_keys.insert(PROPOSALS_DICT.into(), proposals_dict.into());
    named_keys.insert(PROPOSAL_DETAILS_DICT.into(), proposal_details_dict.into());
    named_keys.insert(VOTES_DICT.into(), votes_dict.into());
    named_keys.insert(DELEGATIONS_DICT.into(), delegations_dict.into());
    named_keys.insert("price_bps".into(), price_bps_uref.into());

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntityEntryPoint::new(
        "create_proposal",
        vec![
            Parameter::new("title", CLType::String),
            Parameter::new("description", CLType::String),
            Parameter::new("action_type", CLType::U64),
            Parameter::new("params", CLType::String),
            Parameter::new("price_bps", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "vote",
        vec![
            Parameter::new("proposal_id", CLType::U64),
            Parameter::new("support", CLType::Bool),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "execute_proposal",
        vec![
            Parameter::new("proposal_id", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "veto_proposal",
        vec![
            Parameter::new("proposal_id", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "get_proposal",
        vec![
            Parameter::new("proposal_id", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    entry_points.add_entry_point(EntityEntryPoint::new(
        "delegate",
        vec![
            Parameter::new("to", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("governance_dao_package_hash".into()),
        Some("governance_dao_access_uref".into()),
        None,
    );

    runtime::put_key("governance_dao_contract_hash", contract_hash.into());
}
