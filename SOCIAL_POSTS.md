# SOCIAL_POSTS.md — RWA Sentinel

---

## Twitter/X Thread (6 tweets)

**Tweet 1 — Hook**
There's $16 trillion in real-world assets waiting to go on-chain.

The bottleneck isn't the blockchain. It's trust verification.

Every invoice, bond, and receivable needs an auditor's sign-off before tokenization. That process takes weeks and costs five figures.

We built an AI oracle that does it in seconds. 🧵

---

**Tweet 2 — Problem**
Manual RWA audits have 3 structural flaws:

1. Centralized: one firm signs off, everyone trusts it
2. Frozen: trust score is locked at mint time — underlying risk changes silently
3. Opaque: no on-chain record of *how* an asset was evaluated

DeFi can't scale on that. We need programmable trust.

---

**Tweet 3 — Solution**
RWA Sentinel is an autonomous AI oracle on Casper Network.

It scores every asset across 6 independent factors:
→ Issuer history
→ Debtor rating
→ Cross-reference
→ Amount plausibility
→ Temporal consistency
→ Invoice detail level

Composite score gets published on-chain as an attestation NFT. Expires in 24h. Auto-renewed.

---

**Tweet 4 — Demo**
Live at rwa-sentinel.xyz/portal

The Oracle Panel shows:
• Real-time trust scores for every scored asset
• Active vs expired attestation counts
• DAO vote panel for challenged attestations
• One-click FOR/AGAINST voting with on-chain confirmation

Smart contracts deployed on Casper testnet.

→ https://rwa-sentinel.xyz

---

**Tweet 5 — DAO angle**
The governance layer is the part most oracles skip.

In RWA Sentinel, any holder can challenge an attestation. The challenge triggers a DAO vote. If AGAINST wins — the NFT is revoked, the oracle operator's staked CSPR is slashed, and the challenger gets rewarded.

Economic accountability. On-chain. No committees.

---

**Tweet 6 — CTA**
Built for the Casper Agentic Buildathon 2026.

Full stack: Rust/WASM contracts + TypeScript agent + Next.js portal + Telegram alerts + SDK.

Try the demo → https://rwa-sentinel.xyz
Source → https://github.com/triumphkrug/RWA-Sentinel

RWA tokenization needs trustless trust infrastructure. This is it.

---

## LinkedIn Post (150 words)

**Real-world asset tokenization has a trust problem — and it's structural.**

Manual audits gate every invoice, bond, and receivable before it can go on-chain. The result: weeks of delay, five-figure costs, and trust concentrated in a single custodian. When that custodian fails, the tokens fail with it.

We built **RWA Sentinel** to fix this — an autonomous AI oracle on Casper Network that replaces manual verification with a transparent 6-factor scoring pipeline. Every asset gets scored across issuer history, debtor rating, cross-referencing, amount plausibility, temporal consistency, and invoice detail level. Scores above 65/100 get published on-chain as time-limited attestation NFTs. Challenged attestations go to DAO governance with economic consequences for misbehaving oracles.

The Oracle Panel is live: **rwa-sentinel.xyz/portal**
Smart contracts deployed on Casper testnet.
Open source: github.com/triumphkrug/RWA-Sentinel

The $16T RWA market needs programmable trust infrastructure. This is the starting point.

---

## Telegram Announcement (3 sentences)

🛡️ **RWA Sentinel is live on Casper Network.** We built an AI oracle that scores real-world assets across 6 independent factors and publishes trust attestations on-chain automatically — no manual audits, no centralized custodians. Try the Oracle Panel at rwa-sentinel.xyz and explore the contracts on Casper testnet: github.com/triumphkrug/RWA-Sentinel
