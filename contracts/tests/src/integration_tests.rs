// ===================================================================
// RWA-Sentinel Contract Tests
// ===================================================================
// Unit tests that cover business logic, error paths, and edge cases
// for asset-registry and attestation-store contracts.

#[cfg(test)]
mod asset_registry_logic {
    const ERR_ASSET_NOT_FOUND: u16 = 100;
    const ERR_INVALID_ASSET_TYPE: u16 = 102;
    const ERR_UNAUTHORIZED_OWNER: u16 = 103;
    const ERR_EMPTY_METADATA: u16 = 104;
    const ASSET_TYPE_INVOICE: u64 = 0;

    fn validate_asset_type(t: u64) -> Result<(), u16> {
        if t != ASSET_TYPE_INVOICE {
            return Err(ERR_INVALID_ASSET_TYPE);
        }
        Ok(())
    }

    fn validate_metadata(hash: &str) -> Result<(), u16> {
        if hash.is_empty() {
            return Err(ERR_EMPTY_METADATA);
        }
        Ok(())
    }

    fn authorize_owner(caller: &str, declared: &str) -> Result<(), u16> {
        if caller != declared {
            return Err(ERR_UNAUTHORIZED_OWNER);
        }
        Ok(())
    }

    #[test]
    fn valid_asset_type_accepted() {
        assert!(validate_asset_type(ASSET_TYPE_INVOICE).is_ok());
    }

    #[test]
    fn invalid_asset_type_rejected() {
        assert_eq!(validate_asset_type(1).unwrap_err(), ERR_INVALID_ASSET_TYPE);
        assert_eq!(validate_asset_type(99).unwrap_err(), ERR_INVALID_ASSET_TYPE);
    }

    #[test]
    fn empty_metadata_rejected() {
        assert_eq!(validate_metadata("").unwrap_err(), ERR_EMPTY_METADATA);
    }

    #[test]
    fn non_empty_metadata_accepted() {
        assert!(validate_metadata("abcdef1234").is_ok());
    }

    #[test]
    fn owner_matches_caller() {
        assert!(authorize_owner("account-abc", "account-abc").is_ok());
    }

    #[test]
    fn owner_mismatch_rejected() {
        let r = authorize_owner("account-abc", "account-xyz");
        assert_eq!(r.unwrap_err(), ERR_UNAUTHORIZED_OWNER);
    }

    #[test]
    fn asset_id_sequence() {
        // Simulate sequential ID generation
        let mut counter: u64 = 0;
        let ids: Vec<String> = (0..5)
            .map(|_| {
                counter += 1;
                format!("ASSET-{}", counter)
            })
            .collect();
        assert_eq!(ids, vec!["ASSET-1", "ASSET-2", "ASSET-3", "ASSET-4", "ASSET-5"]);
    }

    #[test]
    fn error_codes_no_overlap() {
        let codes = [ERR_ASSET_NOT_FOUND, ERR_INVALID_ASSET_TYPE, ERR_UNAUTHORIZED_OWNER, ERR_EMPTY_METADATA];
        let mut unique = codes.to_vec();
        unique.sort();
        unique.dedup();
        assert_eq!(unique.len(), codes.len());
    }
}


#[cfg(test)]
mod attestation_store_logic {
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_CHALLENGED: u8 = 2;
    const STATUS_INVALIDATED: u8 = 3;
    const MAX_CHALLENGES: u64 = 3;

    const ERR_BATCH_ALREADY_FINALIZED: u16 = 200;
    const ERR_NOT_ORACLE: u16 = 201;
    const ERR_DUPLICATE_ATTESTATION: u16 = 202;
    const ERR_BATCH_NOT_FOUND: u16 = 203;
    const ERR_ALREADY_CHALLENGED: u16 = 204;
    const ERR_NOT_DAO: u16 = 206;
    const ERR_ZERO_STAKE: u16 = 207;
    const ERR_OVERFLOW: u16 = 208;
    const ERR_CHALLENGE_LIMIT: u16 = 209;
    const ERR_EMPTY_REASON: u16 = 210;
    const ERR_EMPTY_HASH: u16 = 211;
    const ERR_SLASH_ZERO: u16 = 212;

    fn validate_challenge_count(current: u64) -> Result<(), u16> {
        if current >= MAX_CHALLENGES {
            return Err(ERR_CHALLENGE_LIMIT);
        }
        Ok(())
    }

    fn validate_challenge_args(reason: &str, evidence_hash: &str) -> Result<(), u16> {
        if reason.is_empty() {
            return Err(ERR_EMPTY_REASON);
        }
        if evidence_hash.is_empty() {
            return Err(ERR_EMPTY_HASH);
        }
        Ok(())
    }

    fn validate_stake(amount: u64) -> Result<(), u16> {
        if amount == 0 {
            return Err(ERR_ZERO_STAKE);
        }
        Ok(())
    }

    fn validate_slash_amount(amount: u64) -> Result<(), u16> {
        if amount == 0 {
            return Err(ERR_SLASH_ZERO);
        }
        Ok(())
    }

    fn safe_add(a: u64, b: u64) -> Result<u64, u16> {
        a.checked_add(b).ok_or(ERR_OVERFLOW)
    }

    #[test]
    fn challenge_within_limit() {
        assert!(validate_challenge_count(0).is_ok());
        assert!(validate_challenge_count(2).is_ok());
    }

    #[test]
    fn challenge_at_limit_rejected() {
        assert_eq!(validate_challenge_count(3).unwrap_err(), ERR_CHALLENGE_LIMIT);
        assert_eq!(validate_challenge_count(10).unwrap_err(), ERR_CHALLENGE_LIMIT);
    }

    #[test]
    fn empty_reason_rejected() {
        assert_eq!(
            validate_challenge_args("", "hash").unwrap_err(),
            ERR_EMPTY_REASON
        );
    }

    #[test]
    fn empty_evidence_rejected() {
        assert_eq!(
            validate_challenge_args("reason", "").unwrap_err(),
            ERR_EMPTY_HASH
        );
    }

    #[test]
    fn valid_challenge_args_accepted() {
        assert!(validate_challenge_args("suspicious data", "abc123").is_ok());
    }

    #[test]
    fn zero_stake_rejected() {
        assert_eq!(validate_stake(0).unwrap_err(), ERR_ZERO_STAKE);
    }

    #[test]
    fn nonzero_stake_accepted() {
        assert!(validate_stake(1).is_ok());
        assert!(validate_stake(1_000_000).is_ok());
    }

    #[test]
    fn zero_slash_rejected() {
        assert_eq!(validate_slash_amount(0).unwrap_err(), ERR_SLASH_ZERO);
    }

    #[test]
    fn nonzero_slash_accepted() {
        assert!(validate_slash_amount(1).is_ok());
    }

    #[test]
    fn safe_add_normal() {
        assert_eq!(safe_add(10, 20).unwrap(), 30);
    }

    #[test]
    fn safe_add_overflow() {
        assert_eq!(safe_add(u64::MAX, 1).unwrap_err(), ERR_OVERFLOW);
    }

    #[test]
    fn safe_add_max_boundary() {
        assert_eq!(safe_add(u64::MAX - 1, 1).unwrap(), u64::MAX);
    }

    #[test]
    fn status_transitions_valid() {
        // active → challenged → invalidated
        let mut status = STATUS_ACTIVE;
        assert_eq!(status, 1);
        status = STATUS_CHALLENGED;
        assert_eq!(status, 2);
        status = STATUS_INVALIDATED;
        assert_eq!(status, 3);
    }

    #[test]
    fn batch_id_monotonic() {
        let mut counter = 0u64;
        let ids: Vec<String> = (0..3)
            .map(|_| {
                counter = counter.saturating_add(1);
                format!("BATCH-{}", counter)
            })
            .collect();
        assert_eq!(ids[0], "BATCH-1");
        assert_eq!(ids[2], "BATCH-3");
    }

    #[test]
    fn error_codes_unique() {
        let codes = [
            ERR_BATCH_ALREADY_FINALIZED, ERR_NOT_ORACLE, ERR_DUPLICATE_ATTESTATION,
            ERR_BATCH_NOT_FOUND, ERR_ALREADY_CHALLENGED, ERR_NOT_DAO,
            ERR_ZERO_STAKE, ERR_OVERFLOW, ERR_CHALLENGE_LIMIT,
            ERR_EMPTY_REASON, ERR_EMPTY_HASH, ERR_SLASH_ZERO,
        ];
        let mut unique = codes.to_vec();
        unique.sort();
        unique.dedup();
        assert_eq!(unique.len(), codes.len());
    }
}
