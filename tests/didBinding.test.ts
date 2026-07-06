import { deriveHolderDid } from '../agent/src/data/didBinding';

describe('deriveHolderDid', () => {
  test('is deterministic for the same entity name', () => {
    expect(deriveHolderDid('Acme Corp')).toBe(deriveHolderDid('Acme Corp'));
  });

  test('differs for different entity names', () => {
    expect(deriveHolderDid('Acme Corp')).not.toBe(deriveHolderDid('TechFlow Inc'));
  });

  test('is shaped like a did:key identifier', () => {
    expect(deriveHolderDid('Acme Corp')).toMatch(/^did:key:z[0-9a-f]{40}$/);
  });

  test('is case- and whitespace-sensitive (distinct identities stay distinct)', () => {
    expect(deriveHolderDid('Acme Corp')).not.toBe(deriveHolderDid('acme corp'));
    expect(deriveHolderDid('Acme Corp')).not.toBe(deriveHolderDid('Acme Corp '));
  });
});
