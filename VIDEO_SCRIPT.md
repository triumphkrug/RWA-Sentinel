# RWAS Oracle — VIDEO SCRIPT
**Format:** Faceless tutorial | ~2 min | English  
**Style:** Terminal-first — pipeline terminal output first, then dashboard  
**No voiceover** — subtitles + tooltips + background music

---

## HOOK OPTIONS (pick one — first 5 seconds)

**Hook A:**
[SHOW: Pipeline terminal output — `[0.023] Scored: 12 | Passing (≥60): 9` — green lines scrolling]  
[SUBTITLE: "12 invoices scored. 9 minted as NFT attestations on Casper. In under a second."]

**Hook B:**
[SHOW: testnet.cspr.live/contract/eac01f54... loading — the Scoring Registry contract]  
[SUBTITLE: "Real-world assets, scored by AI, verified on Casper blockchain."]

**Hook C:**
[SHOW: Dashboard — attestation row with score 87, green ACTIVE badge, ExternalLink icon]  
[SUBTITLE: "This $84K invoice is scored, attested, and verifiable by anyone on-chain."]

---

## SECTION 1 — Pipeline Terminal (0:00–0:40)

[SHOW: Dashboard, connect wallet, navigate to Pipeline tab]

[SUBTITLE: "Connect your wallet, then hit Run Pipeline."]

[SHOW: Click "Run Pipeline" button — terminal output starts scrolling]

```
[0.003] Starting verification pipeline...
[0.007] Account: 02022a4f...
[0.021] Collecting invoice data from off-chain sources...
[0.089] Ingested 15 invoices from sentinel feed
[0.134] Deduplicated: 12 unique records
[0.201] Running 6-factor trust scoring...
[0.387] Scored: 12 | Passing (≥60): 9
[0.412]   Cross-ref INV-7F99339A: PASS ✓
[0.419]   Cross-ref INV-B3E2045: PASS ✓
[0.501] Minting batch attestation NFT (validity: 24h)...
[0.623] Publishing to Casper testnet via batch_attest...
[0.891] Pipeline complete. Cache: 12 entries.
```

[SHOW: Stats: Ingested 15 | Collected 12 | Passing 9 | Rejected 3]

[TOOLTIP: "6-factor scoring: payment history, counterparty risk, doc integrity, and more."]

---

## RE-HOOK at ~0:40

[SHOW: Switch to Attestations tab — list of scored invoices with trust scores]  
[SUBTITLE: "Each row is a live attestation — click the explorer icon to verify on-chain."]

---

## SECTION 2 — Attestations & On-Chain Verification (0:40–1:20)

[SHOW: Attestations tab — rows: INV-A7F1001 | score 87 | PASS | green badge]

[SHOW: Click ExternalLink icon on a passing attestation → testnet.cspr.live/contract/53c9e877... opens]

[TOOLTIP: "Attestation Store: 53c9e877... — every attestation NFT lives here."]

[SHOW: Overview tab → On-Chain Contracts section]

[SHOW: Click "Scoring Registry" card → testnet.cspr.live/contract/eac01f54... opens]

[SHOW: Click "Attestation Store" card → testnet.cspr.live/contract/53c9e877... opens]

[SUBTITLE: "Two contracts. One for scoring logic, one for attestation NFTs."]

[B-ROLL: Recent Attestations table — 5 rows with types: Invoice, Real Estate, Supply Chain]

---

## SECTION 3 — Operations & DAO (1:20–1:55)

[SHOW: Operations tab — three cards: Revoke, Score Override, DAO Vote]

[SHOW: Operations Log at the bottom — each row has an ExternalLink icon]

[SHOW: Click ExternalLink on "Pipeline Run" log entry → testnet.cspr.live/deploy/e1a4c7... opens]

[TOOLTIP: "Every operation is recorded as a deploy hash on Casper testnet."]

[SHOW: DAO Vote card — click "FOR" on RSP-014, then click the Casper explorer icon next to it]

[SUBTITLE: "Governance votes are on-chain too — click the link next to any proposal."]

[SHOW: Inspect tab — enter INV-A7F1001 — factor breakdown bars animate: Payment History, Counterparty Risk, etc.]

[TOOLTIP: "Score breakdown: transparent, auditable, court-admissible."]

---

## OUTRO (1:55–2:00)

[SHOW: Overview dashboard with stats + Casper testnet explorer in corner]  
[SUBTITLE: "RWAS Oracle. Real-world assets, trustlessly scored."]  
[B-ROLL: GitHub repo URL]
