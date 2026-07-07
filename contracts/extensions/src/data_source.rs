//! Abstraction for multiple data source types in the oracle pipeline.
//!
//! Enables pluggable data collection from APIs, IoT devices, and manual inputs.
//! Planned: Phase 2 — real data adapters; Phase 3 — IoT device integration.

use alloc::string::String;
use alloc::vec::Vec;

/// Supported data source categories.
#[derive(Clone, Debug, PartialEq)]
pub enum DataSourceType {
    /// REST API data source (OpenCorporates, GLEIF, CoinGecko).
    Api { endpoint: String, auth_method: AuthMethod },
    /// IoT device with cryptographic signatures.
    IoT { device_id: String, device_type: DeviceType },
    /// Manually submitted and oracle-verified data.
    Manual { submitter: [u8; 32], verified_by: Option<[u8; 32]> },
}

/// IoT device classifications.
#[derive(Clone, Debug, PartialEq)]
pub enum DeviceType {
    GPS,
    Temperature,
    Humidity,
    Accelerometer,
    Camera,
    RFID,
    Custom(String),
}

/// Authentication methods for API data sources.
#[derive(Clone, Debug, PartialEq)]
pub enum AuthMethod {
    ApiKey,
    OAuth2,
    None,
}

/// A single reading from an IoT device, cryptographically signed.
#[derive(Clone, Debug)]
pub struct IoTReading {
    pub device_id: String,
    pub device_type: DeviceType,
    pub data: Vec<u8>,
    /// Ed25519 signature by the device's private key.
    pub signature: Vec<u8>,
    pub timestamp: u64,
    pub received_at: u64,
}

impl IoTReading {
    /// Maximum acceptable clock drift between device and server (seconds).
    pub const MAX_DRIFT_SECS: u64 = 60;

    /// Check if the reading's timestamp is within acceptable drift.
    pub fn check_drift(&self) -> bool {
        let drift = if self.received_at > self.timestamp {
            self.received_at - self.timestamp
        } else {
            self.timestamp - self.received_at
        };
        drift <= Self::MAX_DRIFT_SECS
    }
}
