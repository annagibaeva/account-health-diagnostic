# Explainable diagnostic — decision tree draft

This is a proposed rule system, not a trained model or a causal explanation. Every result exposes the input values, rule ID, comparison, branch taken and evidence window. Thresholds are portfolio assumptions.

## End-to-end journey

```mermaid
flowchart TD
  A[Admin roster + Analytics + AI Code Tracking fixtures] --> B[Validate response schemas and request windows]
  B --> C[Deduplicate, join business-team roster, quarantine invalid rows]
  C --> D[SQL: numerators, denominators and completeness for adjacent 28-day windows]
  D --> E{Current Analytics evidence sufficient?}
  E -->|No| F[Withhold score and trend flags; repair measurement]
  E -->|Yes| G[Compute adoption score and status]
  G --> H{Prior-window evidence sufficient?}
  H -->|No| I[Trend unknown; collect baseline]
  H -->|Yes| J[Evaluate stalled and declining flags independently]
  D --> K{Commit attribution valid and available?}
  K -->|No| L[Contribution unavailable; repair tracking]
  K -->|Yes| M[AI share of tracked added lines; coverage caveat]
  F --> N[Prioritized intervention with evidence IDs]
  I --> N
  J --> N
  L --> N
  M --> N
  N --> O[Headcount-weighted account summary; 80% eligibility gate]
  O --> P[Deterministic evidence packet]
  P --> Q[Template or Model narrative draft]
  Q --> R{Numbers traceable and claims supported?}
  R -->|No| S[Reject draft; deterministic fallback]
  R -->|Yes| T[Human review]
  S --> T
  T --> U[One-page CTO QBR]
  U --> V[30-day intervention review; observational findings only]
```

## Rule decisions

| ID | Decision | Output |
|---|---|---|
| D0 | Valid schemas, identities and counts? | Quarantine invalid rows and surface exclusions before aggregation |
| D1 | At least 100 suggested diffs, 10 eligible working days, 90% expected Analytics responses, and valid nonzero denominators? | Otherwise withhold team score and trend flags |
| D2 | Current data passes D1? | Score = 0.7 × acceptance% + 0.3 × active-share%; ≥70 healthy, ≥50 watch, otherwise needs attention; classify before rounding |
| D3 | Prior window also passes D1? | Otherwise trend unknown; do not treat it as stable or improving |
| D4 | Current acceptance <55% AND change ≤+2 percentage points? | Stalled |
| D5 | Change ≤−10 percentage points? | Declining; may coexist with stalled |
| D6 | Valid tracked-commit attribution with nonzero added-line denominator? | Compute contribution share or mark unavailable; never alter adoption score |
| D7 | At least 80% of account headcount has an eligible score? | Headcount-weighted account score or withhold; always show included headcount |
| D8 | Draft numbers match evidence and claims stay within evidence? | Allow human review or fall back to template |

## Primary intervention tree

Evaluate from top to bottom; first matching rule selects the primary action. Other flags and secondary actions stay visible. This makes the earlier recommendation prose deterministic. The 70% active-share and +2-point improvement boundaries below are additional draft assumptions.

```mermaid
flowchart TD
  A{D1: Current evidence sufficient?} -->|No| B[Repair Analytics measurement]
  A -->|Yes| C{D6: Contribution available?}
  C -->|No| D[Repair code tracking; retain adoption score]
  C -->|Yes| E{D3: Comparable prior window?}
  E -->|No| F[Collect a comparable baseline]
  E -->|Yes| G{D4: Stalled?}
  G -->|Yes| H{Active share at least 70%?}
  H -->|Yes| I[Review rejected edits and task fit]
  H -->|No| J[Run a bounded champion-led pilot]
  G -->|No| K{D5: Declining?}
  K -->|Yes| L[Review workflow and repository context]
  K -->|No| M{Acceptance improved more than 2 points?}
  M -->|Yes| N[Consider staged expansion after suitability review]
  M -->|No| O{Score at least 70?}
  O -->|Yes| P[Share reviewed practices and monitor quality]
  O -->|No| Q[Investigate barriers with team lead]
```

A team lead's policy or task-suitability information can modify an action, but must be recorded as human context, never inferred from usage. Risk & Compliance's policy discussion is such a context override. Each recommendation needs an owner, review date and success criterion.

## Worked example: Payments

Illustrative current window: 480 accepted / 1,000 suggested diffs = 48%; active share = 82%; prior acceptance = 64%; both windows pass evidence gates. Acceptance change = −16 points. Score = 33.6 + 24.6 = 58.2, displayed as 58, status Watch. Both stalled and declining flags fire. With contribution available, the stalled branch takes precedence; 82% active share routes to rejected-edit review. This is an investigation hypothesis, not proof of a cause.

Counterfactual: if only 80% of expected Analytics responses arrive, D1 fails. Score and flags become unavailable; the recommendation changes to measurement repair. If only commit tracking is missing, the adoption score remains 58, both flags remain, contribution becomes unavailable and tracking repair becomes the primary action.

## Interface requirement

Add “Why this recommendation?” beside every diagnostic. Open a trace with inputs → highlighted decision path → score arithmetic → independent flags → primary/secondary actions → permitted QBR claim. Show untaken branches too. A scenario selector should demonstrate missing current data, missing baseline, missing tracking and successful evidence. Mark all preview inputs synthetic.

This walkthrough expands the earlier static-metric design; neither preview is the implemented ingestion pipeline. A production audit record should additionally include raw response references, query/version hashes, rule version, timestamps and reviewer edits.
