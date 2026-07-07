# Security

## Responsible disclosure

Report vulnerabilities via [GitHub Security Advisories](https://github.com/triumphkrug/RWA-Sentinel/security/advisories/new) or email triumphkrug@gmail.com.

Please allow 48 hours for initial response before public disclosure.

## Current status

RWA-Sentinel is a prototype deployed on Casper **testnet**. The smart contracts have undergone an internal security audit with 18 findings addressed (average risk score: 2/10). No external audit has been performed.

## Threat model

The system assumes:
- Oracle operators are semi-trusted (stake required, slashing enforced)
- Challenge mechanism rate-limited to prevent griefing (max 3 per block)
- Attestation NFTs auto-expire; stale data is not permanently trusted

## Key management

- Deployer secret keys must never be committed to the repository
- `.env.example` contains only placeholder paths and values
- Testnet keys are for development; do not reuse on mainnet

## Known issues

Documented in [docs/STATUS.md](docs/STATUS.md):
- No contract upgrade mechanism (hackathon scope)
- Oracle rotation not yet implemented
- Scoring weight updates require redeployment
