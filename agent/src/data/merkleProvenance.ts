/**
 * Merkle root utility for on-chain data provenance (B4).
 *
 * Computes a real Merkle tree root over the set of evidence hashes in a
 * scoring batch (each leaf = SHA-256(invoiceId + factorsHash + evidenceHash)),
 * so a single root anchors the whole batch's evidence set. Anyone can
 * independently recompute the same root from the same leaves and verify a
 * specific invoice's evidence is included via a standard Merkle proof,
 * without needing every individual evidence hash to be anchored on-chain
 * separately.
 */
import { createHash } from 'node:crypto';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export interface MerkleLeaf {
  invoiceId: string;
  factorsHash: string;
  evidenceHash: string;
}

export interface MerkleProof {
  leaf: string;
  siblings: Array<{ hash: string; position: 'left' | 'right' }>;
}

function leafHash(leaf: MerkleLeaf): string {
  return sha256Hex(`${leaf.invoiceId}:${leaf.factorsHash}:${leaf.evidenceHash}`);
}

/** Builds all tree levels, from leaves (level 0) to the single root (last level). */
function buildLevels(leafHashes: string[]): string[][] {
  if (leafHashes.length === 0) {
    return [[sha256Hex('empty')]];
  }
  const levels: string[][] = [leafHashes];
  let current = leafHashes;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate last if odd
      next.push(sha256Hex(left + right));
    }
    levels.push(next);
    current = next;
  }
  return levels;
}

/** Computes the Merkle root for a batch of evidence leaves. */
export function computeMerkleRoot(leaves: MerkleLeaf[]): string {
  const hashes = leaves.map(leafHash);
  const levels = buildLevels(hashes);
  return levels[levels.length - 1][0];
}

/** Builds an inclusion proof for one leaf within the batch, verifiable independently of this module. */
export function buildMerkleProof(leaves: MerkleLeaf[], targetInvoiceId: string): MerkleProof | null {
  const hashes = leaves.map(leafHash);
  const targetIndex = leaves.findIndex((l) => l.invoiceId === targetInvoiceId);
  if (targetIndex === -1) return null;

  const levels = buildLevels(hashes);
  const siblings: MerkleProof['siblings'] = [];
  let index = targetIndex;
  for (let level = 0; level < levels.length - 1; level++) {
    const currentLevel = levels[level];
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    const siblingHash = siblingIndex < currentLevel.length ? currentLevel[siblingIndex] : currentLevel[index];
    siblings.push({ hash: siblingHash, position: isRightNode ? 'left' : 'right' });
    index = Math.floor(index / 2);
  }
  return { leaf: hashes[targetIndex], siblings };
}

/** Independently verifies a Merkle proof against a claimed root - the actual verification a third party would run. */
export function verifyMerkleProof(proof: MerkleProof, root: string): boolean {
  let hash = proof.leaf;
  for (const sibling of proof.siblings) {
    hash = sibling.position === 'left' ? sha256Hex(sibling.hash + hash) : sha256Hex(hash + sibling.hash);
  }
  return hash === root;
}
