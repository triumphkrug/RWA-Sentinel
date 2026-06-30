# Changelog

All notable changes to RWA Sentinel are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-06-30

### Added
- **6-factor scoring engine** — fully live: issuer history (25%), document integrity (20%), cross-reference (15%), amount plausibility (15%), temporal consistency (15%), network reputation (10%)
- **DAO vote on-chain** — `dao_invalidate` entry point active; FOR/AGAINST vote panel in Oracle Panel dashboard with toast notifications
- **Oracle Panel dashboard** — live at rwa-sentinel.xyz/dashboard; overview cards (total scored, active attestations, avg trust score, expired), trust score table, DAO vote section
- **Telegram alerts** — bot notifications on new attestation, expiry, and challenge events
- **Trust attestation contract deployed** — `attestation-store.wasm` on Casper testnet ([`53c9e877...`](https://testnet.cspr.live/contract/53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8))
- **Asset registry contract deployed** — `asset-registry.wasm` on Casper testnet ([`eac01f54...`](https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3))
- Full content package: VIDEO_SCRIPT.md, BUIDL_SUBMISSION.md, BLOG_POST.md, SOCIAL_POSTS.md

### Changed
- README upgraded with live demo badge, Mermaid architecture diagram, full 6-factor scoring table, DAO governance section, tech stack table

---

## [0.3.0] — 2026-06-29

### Added
- 23 Rust integration tests for asset-registry and attestation-store
- CI pipeline: TypeScript lint/test + contract build/test on every push

### Changed
- Security hardening: access control on `register_asset()`, rate-limited challenges (max 3/block), minimum slash enforcement
- Renamed `dao_approve()` → `dao_invalidate()` for semantic clarity
- `saturating_add` on batch_id and challenge_count to prevent overflow

### Fixed
- Input validation on challenge arguments
- Risk score reduced from 4/10 → 2/10 (18 findings addressed)

---

## [0.2.0] — 2026-06-28

### Added
- Smart contracts deployed to Casper testnet (asset-registry, attestation-store)
- TypeScript agent pipeline: collector, validator, publisher, fallback cache
- Dashboard scaffold (UI shell)
- Architecture documentation and landing page

---

## [0.1.0] — 2026-06-27

### Added
- Initial project scaffold with agent pipeline structure
- Zod-validated configuration schema
- Docker + docker-compose setup

[1.0.0]: https://github.com/triumphkrug/RWA-Sentinel/releases/tag/v1.0.0
[0.3.0]: https://github.com/triumphkrug/RWA-Sentinel/releases/tag/v0.3.0
[0.2.0]: https://github.com/triumphkrug/RWA-Sentinel/releases/tag/v0.2.0
[0.1.0]: https://github.com/triumphkrug/RWA-Sentinel/releases/tag/v0.1.0
