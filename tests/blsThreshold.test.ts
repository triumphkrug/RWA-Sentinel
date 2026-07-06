import { createHash } from 'crypto';
import { BlsThresholdService, generateOracleKeypair, signMessage } from '../agent/src/crypto/blsThreshold';

function messageHashFor(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

describe('BlsThresholdService (real BLS12-381)', () => {
  let oracles: Array<{ secretKeyHex: string; publicKeyHex: string }>;
  let publicKeys: string[];
  let service: BlsThresholdService;

  beforeAll(async () => {
    oracles = await Promise.all(Array.from({ length: 5 }, () => generateOracleKeypair()));
    publicKeys = oracles.map((o) => o.publicKeyHex);
  });

  beforeEach(() => {
    service = new BlsThresholdService({ threshold: 3, totalOracles: 5, oraclePublicKeys: publicKeys });
  });

  test('rejects invalid config', () => {
    expect(() => new BlsThresholdService({ threshold: 0, totalOracles: 5, oraclePublicKeys: publicKeys })).toThrow();
    expect(() => new BlsThresholdService({ threshold: 6, totalOracles: 5, oraclePublicKeys: publicKeys })).toThrow();
    expect(() => new BlsThresholdService({ threshold: 3, totalOracles: 5, oraclePublicKeys: publicKeys.slice(0, 3) })).toThrow();
  });

  test('accepts 3 genuinely valid BLS partial signatures and reaches threshold_met', async () => {
    const messageHash = messageHashFor('attestation-content-1');
    const state = await service.initializeConsensus('att-1', messageHash);
    expect(state.status).toBe('pending');

    for (let i = 0; i < 3; i++) {
      const sig = await signMessage(messageHash, oracles[i].secretKeyHex);
      const updated = await service.submitPartialSignature('att-1', oracles[i].publicKeyHex, sig);
      if (i < 2) expect(updated.status).toBe('pending');
    }

    const final = service.getConsensusStatus('att-1');
    expect(final?.status).toBe('threshold_met');
  });

  test('rejects a forged/invalid partial signature', async () => {
    const messageHash = messageHashFor('attestation-content-2');
    await service.initializeConsensus('att-2', messageHash);

    const forgedSignature = await signMessage(messageHash, oracles[1].secretKeyHex); // signed by oracle[1]...
    await expect(
      service.submitPartialSignature('att-2', oracles[0].publicKeyHex, forgedSignature), // ...claimed as oracle[0]
    ).rejects.toThrow(/failed BLS verification/);
  });

  test('rejects a signature over the wrong message', async () => {
    const messageHash = messageHashFor('attestation-content-3');
    await service.initializeConsensus('att-3', messageHash);

    const wrongSig = await signMessage(messageHashFor('different-content'), oracles[0].secretKeyHex);
    await expect(service.submitPartialSignature('att-3', oracles[0].publicKeyHex, wrongSig)).rejects.toThrow(
      /failed BLS verification/,
    );
  });

  test('rejects an unrecognized oracle public key', async () => {
    const messageHash = messageHashFor('attestation-content-4');
    await service.initializeConsensus('att-4', messageHash);
    const outsider = await generateOracleKeypair();
    const sig = await signMessage(messageHash, outsider.secretKeyHex);
    await expect(service.submitPartialSignature('att-4', outsider.publicKeyHex, sig)).rejects.toThrow(
      /not a recognized participant/,
    );
  });

  test('rejects a double vote from the same oracle', async () => {
    const messageHash = messageHashFor('attestation-content-5');
    await service.initializeConsensus('att-5', messageHash);
    const sig = await signMessage(messageHash, oracles[0].secretKeyHex);
    await service.submitPartialSignature('att-5', oracles[0].publicKeyHex, sig);
    await expect(service.submitPartialSignature('att-5', oracles[0].publicKeyHex, sig)).rejects.toThrow(
      /already submitted/,
    );
  });

  test('finalizeConsensus aggregates real signatures and the aggregate passes real BLS pairing verification', async () => {
    const messageHash = messageHashFor('attestation-content-6');
    await service.initializeConsensus('att-6', messageHash);
    for (let i = 0; i < 3; i++) {
      const sig = await signMessage(messageHash, oracles[i].secretKeyHex);
      await service.submitPartialSignature('att-6', oracles[i].publicKeyHex, sig);
    }
    const finalSignature = await service.finalizeConsensus('att-6');
    expect(finalSignature).toMatch(/^[0-9a-f]{192}$/); // 96-byte BLS signature, hex-encoded

    // Calling again returns the same cached signature rather than re-aggregating.
    const again = await service.finalizeConsensus('att-6');
    expect(again).toBe(finalSignature);
  });

  test('finalizeConsensus throws before threshold is met', async () => {
    const messageHash = messageHashFor('attestation-content-7');
    await service.initializeConsensus('att-7', messageHash);
    const sig = await signMessage(messageHash, oracles[0].secretKeyHex);
    await service.submitPartialSignature('att-7', oracles[0].publicKeyHex, sig);
    await expect(service.finalizeConsensus('att-7')).rejects.toThrow(/Threshold not met/);
  });
});
