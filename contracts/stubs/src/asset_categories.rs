//! Extensible asset classification system for RWA scoring.
//!
//! Different asset categories may require different scoring factors,
//! compliance frameworks, and verification procedures.

use alloc::string::String;

/// High-level asset classifications.
#[derive(Clone, Debug, PartialEq)]
pub enum AssetCategory {
    RealEstate,
    Commodity,
    Invoice,
    Equity,
    Bond,
    Vehicle,
    Art,
    Healthcare,
    CarbonCredit,
    IntellectualProperty,
    Custom(String),
}

/// Compliance frameworks applicable to regulated assets.
#[derive(Clone, Debug, PartialEq)]
pub enum ComplianceFramework {
    /// US Health Insurance Portability and Accountability Act.
    HIPAA,
    /// EU General Data Protection Regulation.
    GDPR,
    /// US FDA 510(k) for medical devices.
    FDA510K,
    /// EU Medical Device Regulation.
    CEMDR,
    /// ISO 13485 quality management for medical devices.
    ISO13485,
    /// EU Markets in Crypto-Assets regulation.
    MiCA,
    Custom(String),
}

/// Extended asset metadata including category and compliance.
#[derive(Clone, Debug)]
pub struct AssetMetadata {
    pub category: AssetCategory,
    pub jurisdiction: String,
    pub compliance_frameworks: alloc::vec::Vec<ComplianceFramework>,
    pub metadata_hash: [u8; 32],
    pub owner_did: Option<String>,
}
