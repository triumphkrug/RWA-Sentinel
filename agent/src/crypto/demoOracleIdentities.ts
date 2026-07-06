/**
 * Demo oracle BLS12-381 identities for the 3-of-5 threshold consensus.
 *
 * These are real BLS keypairs (not placeholders/strings), generated once
 * for this demo deployment so the 5 "oracle" participants in the
 * BlsThresholdService demo have genuine, independently-verifiable public
 * keys instead of the labels 'oracle-1'/'oracle-2'/'oracle-3' used before.
 * Unlike the Casper deployer/oracle-owner-bot keys, these hold no CSPR
 * stake and sign no on-chain transactions - they exist purely to let each
 * simulated oracle produce a real, independently-verifiable BLS signature
 * over an attestation's message hash, so including the secret keys here
 * (to let a demo/test script act as each oracle) carries no economic risk.
 * In a production deployment each oracle would generate and hold its own
 * secret key independently.
 */
export const DEMO_ORACLE_IDENTITIES: Array<{ secretKeyHex: string; publicKeyHex: string }> = [
  {
    secretKeyHex: '1beb086d08f6525e9b36f3a8776ea6d9589448e336258ecc2222703c1de1c616',
    publicKeyHex: 'a9f8889d5a2bf36c93bedcd01099e988c648b77f493dbf19e782927f0ef42ed02748432e272125e8f4d15ce488a1e1ad',
  },
  {
    secretKeyHex: '1180fffd32a70d73a5a9383af06a5ded8af0a848796fffd28182fa2c0fe7f4bd',
    publicKeyHex: '8d9e7f9a37b4845ff796fa862a688e0e3ce53f9a70f78b71407fe0ecfbff2f0a60a872e6a5ef18f85a670ac0dcfb41fb',
  },
  {
    secretKeyHex: '464adf340da5a050f28abfbc4a2e151b0cdd0ddcd3b4a24ea247091f1eae0a79',
    publicKeyHex: 'afb59961876164d8b248aa4cd3c7f230f94c9995074f4456afd00f9c26ca467144fb136f52ef738015686d2925434844',
  },
  {
    secretKeyHex: '31d876f77f8a223035ed2ae1f5f1007915085550a75eb0442e3a6b5c59590455',
    publicKeyHex: '8fe7324661ea6ca158e7f115e15b56c0ef5922c64e3a511948abe13fe7f988911b920ce52037be878dbc05ed8a701d25',
  },
  {
    secretKeyHex: '027b7d13da61df2ce04e43025ae2e1548a6af52a3a0b83ef627ce174cc5d4d0c',
    publicKeyHex: '975bc2a18bccb5227ebb768b834b1e1bbb1497c9c13aee504a17a6697ded567c6c92cd34c138554bcbed4556386dc6d4',
  },
];

export const DEMO_ORACLE_PUBLIC_KEYS = DEMO_ORACLE_IDENTITIES.map((o) => o.publicKeyHex);
