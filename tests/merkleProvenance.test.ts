import { computeMerkleRoot, buildMerkleProof, verifyMerkleProof, MerkleLeaf } from '../agent/src/data/merkleProvenance';

function makeLeaves(n: number): MerkleLeaf[] {
  return Array.from({ length: n }, (_, i) => ({
    invoiceId: `INV-${i}`,
    factorsHash: `factors-${i}`,
    evidenceHash: `evidence-${i}`,
  }));
}

describe('merkleProvenance', () => {
  test('root is deterministic for the same leaves', () => {
    const leaves = makeLeaves(5);
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });

  test('root changes if any leaf changes', () => {
    const leaves = makeLeaves(5);
    const mutated = [...leaves];
    mutated[2] = { ...mutated[2], evidenceHash: 'tampered' };
    expect(computeMerkleRoot(leaves)).not.toBe(computeMerkleRoot(mutated));
  });

  test('handles odd number of leaves', () => {
    expect(() => computeMerkleRoot(makeLeaves(1))).not.toThrow();
    expect(() => computeMerkleRoot(makeLeaves(3))).not.toThrow();
    expect(() => computeMerkleRoot(makeLeaves(7))).not.toThrow();
  });

  test('handles empty batch without throwing', () => {
    expect(() => computeMerkleRoot([])).not.toThrow();
  });

  test.each([1, 2, 3, 5, 8, 10])('every leaf in a %i-leaf batch produces a valid, independently-verifiable proof', (n) => {
    const leaves = makeLeaves(n);
    const root = computeMerkleRoot(leaves);
    for (const leaf of leaves) {
      const proof = buildMerkleProof(leaves, leaf.invoiceId);
      expect(proof).not.toBeNull();
      expect(verifyMerkleProof(proof!, root)).toBe(true);
    }
  });

  test('a proof does not verify against a tampered root', () => {
    const leaves = makeLeaves(4);
    const root = computeMerkleRoot(leaves);
    const proof = buildMerkleProof(leaves, 'INV-1')!;
    expect(verifyMerkleProof(proof, root.slice(0, -2) + '00')).toBe(false);
  });

  test('a proof from one batch does not verify against a different batch root', () => {
    const leavesA = makeLeaves(6);
    const leavesB = makeLeaves(6).map((l) => ({ ...l, evidenceHash: l.evidenceHash + '-different' }));
    const rootB = computeMerkleRoot(leavesB);
    const proofA = buildMerkleProof(leavesA, 'INV-3')!;
    expect(verifyMerkleProof(proofA, rootB)).toBe(false);
  });

  test('returns null for an invoice not in the batch', () => {
    const leaves = makeLeaves(4);
    expect(buildMerkleProof(leaves, 'INV-NOT-PRESENT')).toBeNull();
  });
});
