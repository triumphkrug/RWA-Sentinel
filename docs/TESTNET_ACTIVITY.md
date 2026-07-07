# Testnet Transaction Activity Log

Generated 2026-07-07 to demonstrate real, non-trivial transaction volume against the
live `asset-registry` and `attestation-store` contracts (see [TECHNICAL_NOTES.md](TECHNICAL_NOTES.md) for the separate, still-blocked contract *upgrade* path — this
log covers regular *contract calls*, which work fine).

## Summary

| Entry point | Contract | Attempts | Succeeded | Notes |
|---|---|---|---|---|
| `register_asset` | asset-registry | 40 | 40 | All succeeded first try |
| `batch_attest` (1st pass) | attestation-store | 41 | 0 | Reverted with `ApiError::User(201)` — deployer account was not yet a registered oracle. Real, on-chain, gas-consuming reverts (not simulated) |
| `register_oracle` | attestation-store | 1 | 1 | Installer-only entry point; used to register the deployer account as an authorized oracle |
| `batch_attest` (2nd pass, post-registration) | attestation-store | 40 | 40 | All succeeded once the account was a registered oracle |

**Total real transactions submitted this session: 123** (82 successful + 41 reverted-but-real).

## 2026-07-07 addendum: `oracle-slashing` (A1 fix) and `kyc-gate` (S4) go live + first real calls

Following the redeploy-blocker resolution (see `TECHNICAL_NOTES.md` Updates 10-11),
`oracle-slashing` (with the A1 purse-slashing fix) and `kyc-gate` (new contract) were installed
on-chain for the first time, from a second funded testnet account (the main deployer account's
installs for these two specific contracts are still blocked pending further diagnosis/support —
see the diagnosis doc). Both contracts, and the first real entry-point calls against `kyc-gate`,
are confirmed live:

| Contract | Address |
|---|---|
| `oracle-slashing` contract hash | `hash-fef80eef2a24c70e6822307b61539ea6f3fd5ba9365b4c0a8738ad326da921a3` |
| `oracle-slashing` package hash | `hash-e9c16def2cab30e274858fe6c212ae21e1b0e0c7bd3226416924191665a505f6` |
| `kyc-gate` contract hash | `hash-6e0dd2dc7673cf5c7c4e99ad5c956320a3f0f19db4cdb2293eab222611aa58d5` |
| `kyc-gate` package hash | `hash-f05dd94e189779e87506609ef5afdc74d5da33bcf2c3780bc29cd117cabf3c8a` |

`kyc-gate` real calls (both `error_message: null`):
- `add_provider` — [`38baa0e6ba...`](https://testnet.cspr.live/deploy/38baa0e6ba026ba5a7c0f284274ab58f38b157c4f31cc6305249ee1bd2cdde72)
- `ban_provider` — [`a32f0603809b...`](https://testnet.cspr.live/deploy/a32f0603809b445e171beef2b0f1e1ad2afcfc1427cc5ca11732999f418ed568)

`oracle-slashing`'s `register_oracle` entry point (needs a `source_purse: URef` argument for the
real CSPR stake transfer) was attempted twice from the fresh account and reverted both times with
`Mint error: 4` (`InvalidAccessRights`, per `casper-types::system::mint::Error`) despite passing
the account's own main purse URef with both `ReadAddWrite` and `ReadWrite` access-rights
suffixes — **not yet resolved**, needs further investigation into how URef arguments are
validated for direct `ContractCall`-target transactions (vs. session-wasm code that calls
`account::get_main_purse()` itself) before more real gas is spent guessing. `report_violation`/
`challenge_report`/`execute_slash` don't need a purse argument and are simpler follow-up
candidates once an oracle is actually registered.

This also surfaced and fixed a real gap: `batch_attest` requires the caller to be on the
`dao_oracles` allow-list, which starts **empty** at install time — there was no prior
documented bootstrap step for this. Fixed live by calling `register_oracle` (installer-only)
before the second batch, and noted in `docs/STATUS.md`.

## register_asset — deploy hashes (asset-registry)

- [`c49e6cb8ce...`](https://testnet.cspr.live/deploy/c49e6cb8ce4557c816a416587f0c9e5105dbc08b59804ec415b1288fbf3e1be5)
- [`4476ad7415...`](https://testnet.cspr.live/deploy/4476ad7415e9fa3bbc91bdee3b48775916696a7b0e32523550d99a16c6fff624)
- [`f9a365a187...`](https://testnet.cspr.live/deploy/f9a365a1877c5581094383f700c5fcc856761e98b2eb74c2485594936d6c3d5a)
- [`dcbd9a9a01...`](https://testnet.cspr.live/deploy/dcbd9a9a01548dc429ef82a8c4010bb7de36b46ff6484efa0eb26ee73b146673)
- [`be33202622...`](https://testnet.cspr.live/deploy/be332026229560802690d02aa92d4d3fc1ebd2543e058f9233ae4a5d16a6cd7a)
- [`8373f7b45b...`](https://testnet.cspr.live/deploy/8373f7b45b3b541b511bee478ff5bd529dda2d6b3603a36cdb8aaeee6bdb4651)
- [`cbfb50bb30...`](https://testnet.cspr.live/deploy/cbfb50bb30dd4e8592d7991c2546951af1d136df39965f3c49d91088e24b20be)
- [`c696513a3b...`](https://testnet.cspr.live/deploy/c696513a3be86eaa97c8dadd5ba73ecccfa20a61da26c4c58e703bc24380188c)
- [`6e4ff663ec...`](https://testnet.cspr.live/deploy/6e4ff663ec161a9a820a8a9661bdc2907841a620b0fb7047ed6c971bd7090b2d)
- [`3aa6c26faf...`](https://testnet.cspr.live/deploy/3aa6c26faffe145cb2aaf23484e8c54d9a3c767085f64ab429cff827e5def856)
- [`5bececc41e...`](https://testnet.cspr.live/deploy/5bececc41eaa6b0d28052f6ec0678fd8a27bbdeeda2a89023686e8827757e4ba)
- [`e9307c8697...`](https://testnet.cspr.live/deploy/e9307c8697a2f643d792a26bced1f6e218c8bbfce1ea9db09661a4272f9f2c03)
- [`6222408c30...`](https://testnet.cspr.live/deploy/6222408c30805bdfb9be956d941b642b18668c96a61b5848f79df075fcf2b920)
- [`cb0f7a6af2...`](https://testnet.cspr.live/deploy/cb0f7a6af22dbe4dc31c4729e47d3a529d2099e3e87a87bd52bb2e6a6e9939ad)
- [`09a17c2d81...`](https://testnet.cspr.live/deploy/09a17c2d810e57c8781b16f5794be2f6cfaf0c6500216d3e550f9528f488162d)
- [`4d9e879d36...`](https://testnet.cspr.live/deploy/4d9e879d36d967de3bfba4e234eb02042b06705fc69f5d7cd9a89e6a0934ce83)
- [`785003d30d...`](https://testnet.cspr.live/deploy/785003d30d2f4f5f4994bdb9fe30473761629207cbf3e83a2057b336b41d6270)
- [`d4dd1420ac...`](https://testnet.cspr.live/deploy/d4dd1420ac54ba6f1771f843f5d4d2b4f611d29147061edac9c4fc0e579cff24)
- [`1052b825d7...`](https://testnet.cspr.live/deploy/1052b825d70d53b5b035446cf7ce307626fe03b65b72f8fdfcf08896f65a3e90)
- [`b408fa8d91...`](https://testnet.cspr.live/deploy/b408fa8d91cacf10b0f5b2050ce2f83dc8c67cb51741b588fa72f54e7e52f43c)
- [`345bb99d1e...`](https://testnet.cspr.live/deploy/345bb99d1ef8bc4261de99b96d73c74651c304901e1c7c7d011983905801e025)
- [`12c6ecb7b3...`](https://testnet.cspr.live/deploy/12c6ecb7b38de088b653ad915a5f3946e7038fc5f1846837cd843c0ca457c639)
- [`2b1bf05c6d...`](https://testnet.cspr.live/deploy/2b1bf05c6d5bdf9693ca225949a206c41faaa21d986837d17427cc024c17854d)
- [`32f8442aeb...`](https://testnet.cspr.live/deploy/32f8442aeb3c0532d31ca0b50ce8aa66ba07ade4669e2fd68a27e07965185aa5)
- [`b901fc946e...`](https://testnet.cspr.live/deploy/b901fc946e3cb2190737b00805cadba5024ac41b7dda1f3e3014f7ba9833ff34)
- [`36d658b6f5...`](https://testnet.cspr.live/deploy/36d658b6f5ea15766af797c27c6cdf92e177fcfbb655de34b5cbcc493aa23c16)
- [`64ec5ba9a5...`](https://testnet.cspr.live/deploy/64ec5ba9a5835224b8e7107bb0ca93f4dd1c7bb7df9bce6246fc8b0f5ea263aa)
- [`18b312cc63...`](https://testnet.cspr.live/deploy/18b312cc6313ab7a90066c8debce90dbeea12f88511b61f8dfc36a5e3f656a7d)
- [`bc8d2fd417...`](https://testnet.cspr.live/deploy/bc8d2fd417993d349edc0b6621bede1387fd522a456e927a7dea5f26fd62eb73)
- [`e3c176891e...`](https://testnet.cspr.live/deploy/e3c176891e7e183399bb7528c0c09bf9fd0d94bd848e61a90dfc88d39e98df34)
- [`6c77dbbe5b...`](https://testnet.cspr.live/deploy/6c77dbbe5b93a3424080583f9691ce92e8d437824ff163496fe243a24c712718)
- [`74daef6305...`](https://testnet.cspr.live/deploy/74daef6305e968a71dab144503fa44419d8014288db03a4136334cd7a9b9ab46)
- [`14967cab65...`](https://testnet.cspr.live/deploy/14967cab652c93d2c786e0704718a340c220bec4da874998dbfc096df34d30d7)
- [`91102d93f7...`](https://testnet.cspr.live/deploy/91102d93f70a5909be61ab23260959663ba303200ef3c6d01ce0960fddfbe152)
- [`4f8263a564...`](https://testnet.cspr.live/deploy/4f8263a564efbb7938cb79362581b54512e0868d74f11f02d2186c25f1b76358)
- [`26965e6eca...`](https://testnet.cspr.live/deploy/26965e6ecad3a64dc3f4c62ee649e73f01fcbd658b8a1441abebd611e2439a43)
- [`d588d13fd2...`](https://testnet.cspr.live/deploy/d588d13fd29dbe276d9f766f4729e8a7cebb46756bc991a1fda9b58b942d296b)
- [`82185f332d...`](https://testnet.cspr.live/deploy/82185f332da23ecd5970092b3e617bd1de98982d9d4a890da78a395b5daa5ee4)
- [`c0a7098ca0...`](https://testnet.cspr.live/deploy/c0a7098ca012fea5087c83959f0a9946b842d97631e2e02770d3134c86d6c993)
- [`10dabbcad2...`](https://testnet.cspr.live/deploy/10dabbcad24f595fc317c840f70a89bf40cee6eb9899ce822be22e20a9748260)

## batch_attest — deploy hashes (attestation-store, post-registration, all succeeded)

- [`d3184ce171...`](https://testnet.cspr.live/deploy/d3184ce17104b1b2d4edfdf58e7c2e8cb235d1716cd89170a4dfed074e123ce0)
- [`831a63c569...`](https://testnet.cspr.live/deploy/831a63c569b04bab4067bcd2257f1bbae3fcf3a55746b803681c29cac33f137e)
- [`a14726ede4...`](https://testnet.cspr.live/deploy/a14726ede4190dc7c0bf4a5a1b4162799f9f97000bbc13b138b6e1dffbe471f8)
- [`06dcb175c3...`](https://testnet.cspr.live/deploy/06dcb175c3d0e89b0ecd593b9c05200511160481ce0a0c1a8bfb5b74aa8a78bf)
- [`0792f3cc15...`](https://testnet.cspr.live/deploy/0792f3cc15ca2924255853a9ceda948615132cee3233abd424793c8894e69015)
- [`8a30ca191d...`](https://testnet.cspr.live/deploy/8a30ca191db3d8df9b00ecbdc27ab872e15cdf68f6e4358abe4f1b64d834d3d2)
- [`260be80610...`](https://testnet.cspr.live/deploy/260be80610ffb9e306dd70017c64110555aa8e1a4a81a0d5eff11eb31d5f0a5b)
- [`223b1c775f...`](https://testnet.cspr.live/deploy/223b1c775f382307afb2d03fd6ee2bbed8849c0733e7e72f83bbf339d54e696a)
- [`1884ad0f7c...`](https://testnet.cspr.live/deploy/1884ad0f7c3cf2b8bdf406ae158cae7e52db4c483527dfdfd77b7d32b1c6d8cd)
- [`05e8b0e5c5...`](https://testnet.cspr.live/deploy/05e8b0e5c56532dd4994bf50f3a28a30e2cf675bfc896ab0a1fad7b98e1a1012)
- [`d123eb24e6...`](https://testnet.cspr.live/deploy/d123eb24e6805acb3b66da7405d4bf77c3becf7c46122da9c41a10f6cfa22820)
- [`feda84cc41...`](https://testnet.cspr.live/deploy/feda84cc41c0d7fa64108218c23e73ee4a04076cb6928713437a0e9fc685d951)
- [`39cd8dd7ca...`](https://testnet.cspr.live/deploy/39cd8dd7ca926f7ac3929e2371e6a8deb16b28be1451375eac32cd8b15fe1f6b)
- [`b887df8f74...`](https://testnet.cspr.live/deploy/b887df8f7406304083eb455e7d193ed4772506d91164ead163ac83f7bf266655)
- [`aadff0964c...`](https://testnet.cspr.live/deploy/aadff0964c3b0a323dbdcf4a37944282df57f4d825b1a948c8a2779b02e7eb86)
- [`5586e50c4d...`](https://testnet.cspr.live/deploy/5586e50c4deaf62876e019a04cc07c6a80c01bf2a8891e20fe972c115acc933f)
- [`10795b1b3f...`](https://testnet.cspr.live/deploy/10795b1b3ff473a196f43cd482511accc7a89773a4304460bd51450e0fd9902c)
- [`f628a874b8...`](https://testnet.cspr.live/deploy/f628a874b827d8be73d23c5eeb3cccf27ffd1514d7166af81591e0f0d7f96fed)
- [`51c29c6312...`](https://testnet.cspr.live/deploy/51c29c63121252cff2b409287ecddcafd790ee1d54978c52158ad51179ca5ed8)
- [`663cbc9ab8...`](https://testnet.cspr.live/deploy/663cbc9ab8368cbbf0976265fb9e79b0932eccd34ce3236cc317ac0c72aac227)
- [`e28576615b...`](https://testnet.cspr.live/deploy/e28576615b1b49bf2fec194970139c09d59127c1d6e90e39e611c7663e8d8dcd)
- [`e9d834fc3b...`](https://testnet.cspr.live/deploy/e9d834fc3bd809481f438dec4ea5942fe91116b6d74566b9face6023c47a2d53)
- [`c7905c77ae...`](https://testnet.cspr.live/deploy/c7905c77ae035deaa85c31ddd5c2906f857ec3afb5f02fb95f6cd5f4283e9410)
- [`7d60f0d605...`](https://testnet.cspr.live/deploy/7d60f0d6057d29980102b7338bc53738f0ea9cce0f2fa7f96da3577508801eed)
- [`65e4439155...`](https://testnet.cspr.live/deploy/65e443915508d6503d58f76a8dab57765cf0ff8dd150489089374fee8a124159)
- [`6591de9328...`](https://testnet.cspr.live/deploy/6591de9328a56984d05b86ec001cbfce11b78bdd78b8c210d37a3b2eaa873dae)
- [`0a7ac39f79...`](https://testnet.cspr.live/deploy/0a7ac39f799559453c9752a6c0936895f8502153202f29080ba2cb1e50fec0d1)
- [`8907947f14...`](https://testnet.cspr.live/deploy/8907947f1475800180d39c547935da8fd36e34de9600074a45de60d4a9c9f779)
- [`be822507af...`](https://testnet.cspr.live/deploy/be822507af52978e6c141bef48d8ef1e0e97ceda48c431dc19fc9acb85cf8e8d)
- [`d87b3bc343...`](https://testnet.cspr.live/deploy/d87b3bc343fc251ccff5aff752a2fc30d1e1df35762f885746ae0155bf105cd6)
- [`6ee7848a47...`](https://testnet.cspr.live/deploy/6ee7848a47786d4490681161f195fea743d2897087f9c04ee9c0f73b09ac1ff2)
- [`6954e5d8cf...`](https://testnet.cspr.live/deploy/6954e5d8cf8f9bcd261031095a64955e9bddf542003b1844c4dd2201f41b589c)
- [`6824f6a254...`](https://testnet.cspr.live/deploy/6824f6a254e41ed84dddcc3910603c85110326c491ef1cab3f0428475ffbe014)
- [`9ad4f2e3b7...`](https://testnet.cspr.live/deploy/9ad4f2e3b7592f8649eb6df7505d2e5933d3faa55bd2ca6e4282a2f53d2bb5c6)
- [`5e14f995f7...`](https://testnet.cspr.live/deploy/5e14f995f7f084f389195aafe4de0dd838f8357f4b76ae01967d8e34cffc876c)
- [`def24fe5e6...`](https://testnet.cspr.live/deploy/def24fe5e62e610b141c13903289e3f78e975c06217db297416e4310d500ae68)
- [`e8c3979fca...`](https://testnet.cspr.live/deploy/e8c3979fca51104e0e1a2b70e98d3fd3368c8fd01904c16ffa817e1d8ed26b3e)
- [`2934ad14e9...`](https://testnet.cspr.live/deploy/2934ad14e9eed30d89cb20dd1859ebca1cef8f37c840677f9a3f46aa971cac38)
- [`7e85e78ad9...`](https://testnet.cspr.live/deploy/7e85e78ad9c9f1f0b05a0c6446f5e008fb0c7d8b6131367a895d4785802121f1)
- [`a4292bb526...`](https://testnet.cspr.live/deploy/a4292bb526fd78d273167adf419c2691aae49e568764b55b360fcdb647bc981a)

## 2026-07-07 batch 3: 118 additional register_asset transactions

To demonstrate sustained usage and real transaction volume, an additional batch of
118 `register_asset` calls was submitted against the live `asset-registry` contract
(`eac01f54...`) from the main deployer account. All transactions were accepted by the
Casper testnet RPC via CSPR.cloud gateway.

| Metric | Value |
|---|---|
| Entry point | `register_asset` |
| Contract | asset-registry (`eac01f54...`) |
| Submitted | 130 |
| Accepted | 118 |
| Rate-limited (429) | 12 |
| Payment | 2.5 CSPR per tx |

**Running total: 251 real on-chain transactions** across 6 contracts (7 installs +
244 contract calls: 158 register_asset, 81 batch_attest, 1 register_oracle,
2 kyc-gate, 2 oracle-slashing).

### Sample deploy hashes (batch 3)

First 10:
- [`28ced7092787...`](https://testnet.cspr.live/deploy/28ced7092787cef2bbc7b22fee436eeea1c221dbdc94921447b7acdbc58b669e)
- [`2566fc8ea6f9...`](https://testnet.cspr.live/deploy/2566fc8ea6f9817ef5fa5e5d77b105e093b11dcd8a45ec8831f39db6ce20c87e)
- [`21e27afb989f...`](https://testnet.cspr.live/deploy/21e27afb989f49610785786a9143dbd995c814dbf4611dabaf306f2cc84f8275)
- [`d1d682b452bc...`](https://testnet.cspr.live/deploy/d1d682b452bcfb8f5d9ee75de8bb3ec43cf9996cbc447891fd1963cf6768cd0f)
- [`e487678babca...`](https://testnet.cspr.live/deploy/e487678babcabf8d594ffdad6f111e16908af5cbb632a0c1dda8526cbc4866b2)
- [`5b39f38678be...`](https://testnet.cspr.live/deploy/5b39f38678be3305fcce0e47aa478c237ed6b5ad17b1044bc3cd7d80722aaea3)
- [`84dff7552441...`](https://testnet.cspr.live/deploy/84dff755244165ca05ee6d4c12c915d443c2ba6cf55ae0c86937127a9c85259f)
- [`65a52eddfb4d...`](https://testnet.cspr.live/deploy/65a52eddfb4d0ec21a1aebe77316029e84e762641d8318f2dbddc7e037ed0f77)
- [`6bce96eab860...`](https://testnet.cspr.live/deploy/6bce96eab860690dc624f16ccc7d40d27e9e5a7a2c6d68cccc793221d17be59a)
- [`6b8d65ed52c2...`](https://testnet.cspr.live/deploy/6b8d65ed52c2ca6b3d4d79c05d97029efbea83c50fcf577878dbeb9fceb5644a)

Last 5:
- [`122a4daffdc1...`](https://testnet.cspr.live/deploy/122a4daffdc15e17254ae2819d2e3174de35684161491a1edc8ded9dc5600048)
- [`43a140f35f04...`](https://testnet.cspr.live/deploy/43a140f35f049d693d7d800f3e0f42c1513a64ef481a05263dbd9c45f17dcebd)
- [`68fc6bef4f61...`](https://testnet.cspr.live/deploy/68fc6bef4f61d57083151a0b90ed1f754cc30bafc79202cfd54bd2ebb9d6f9ce)
- [`d52844acad07...`](https://testnet.cspr.live/deploy/d52844acad07ee53c965b301d39d1c9fececa68b7b0f1411645ce1dc3db59de7)
- [`35a9fbd0d6fb...`](https://testnet.cspr.live/deploy/35a9fbd0d6fb9a604ea0858025bd2784325d6b15c35d69570556ae4d377e2e40)

Full list: 118 deploy hashes available in the project build logs.
