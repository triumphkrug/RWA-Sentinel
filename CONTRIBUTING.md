# Contributing

## Prerequisites

- Node.js ≥ 20
- Rust toolchain (stable) with `wasm32-unknown-unknown` target
- npm

## Setup

```bash
git clone https://github.com/triumphkrug/RWA-Sentinel.git
cd RWA-Sentinel
npm install
```

## Development workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Write code and tests
3. Run the full test suite:
   ```bash
   npx eslint agent/src --ext .ts
   npx prettier --check 'agent/src/**/*.ts'
   npx jest --ci
   cd contracts/tests && cargo test --release
   ```
4. Commit using conventional format (`feat:`, `fix:`, `docs:`, `test:`)
5. Open a pull request against `main`

## Code standards

- TypeScript: ESLint + Prettier (see `.eslintrc.json` and `.prettierrc`)
- Rust: `cargo fmt` + `cargo clippy`
- All public functions must have JSDoc/rustdoc comments
- New features require corresponding tests

## Reporting issues

Please use [GitHub Issues](https://github.com/triumphkrug/RWA-Sentinel/issues). For bugs, include:
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output
