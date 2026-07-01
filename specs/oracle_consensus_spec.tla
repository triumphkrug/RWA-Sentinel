---- MODULE OracleConsensusSpec ----
\* Formal specification of RWA-Sentinel oracle consensus and attestation.
\* Status: initial stub — full verification planned for Phase 4.

EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS NumOracles, Threshold, MaxScore

VARIABLES oracles, attestations, proposals

TypeOK ==
    /\ \A a \in attestations: a.score \in 0..MaxScore
    /\ \A o \in oracles: o.stake >= 0
    /\ \A p \in proposals: p.votes_for + p.votes_against <= p.total_voters

\* Invariant: trust score always in valid range [0, 100]
ScoreRange == \A a \in attestations: a.score \in 0..100

\* Invariant: scoring factor weights sum to 100
WeightSum == \A a \in attestations:
    LET weights == [f \in a.factors |-> f.weight]
    IN SumAll(weights) = 100

\* Invariant: attestation valid only with threshold oracle signatures
ThresholdMet == \A a \in attestations:
    a.status = "finalized" => Cardinality(a.oracle_sigs) >= Threshold

\* Invariant: slashed oracle cannot attest
SlashedOracleBlocked == \A o \in oracles:
    o.slashed_pct > 50 => o.status = "suspended"

\* Invariant: finalized attestation is immutable
AttestationImmutability == \A a \in attestations:
    a.status = "finalized" => UNCHANGED a

\* Invariant: DAO quorum required for proposal passage
DAOQuorum == \A p \in proposals:
    p.status = "passed" => p.votes_for >= p.quorum

SafetyInvariant == ScoreRange /\ ThresholdMet /\ SlashedOracleBlocked

====
