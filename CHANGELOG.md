# Changelog

## 0.3.0 — 2026-06-29

- Added 23 Rust integration tests for asset-registry and attestation-store
- Security hardening: access control on `register_asset()`, rate-limited challenges, min slash enforcement
- Renamed `dao_approve()` to `dao_invalidate()` for clarity
- Added `saturating_add` on batch_id and challenge_count
- Input validation on challenge arguments
- CI pipeline: TypeScript lint/test + contract build/test
- Risk score: 5/10 → 2/10

## 0.2.0 — 2026-06-28

- Smart contracts deployed to Casper testnet (asset-registry, attestation-store)
- TypeScript agent pipeline with collector, validator, publisher
- Dashboard scaffold
- Documentation and landing page

## 0.1.0 — 2026-06-28

- Initial project scaffold with agent pipeline structure
