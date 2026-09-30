# Solution draft

## Product brief

Audience: a customer-success engineer preparing an executive account review. Secondary audience: the bank's CTO and engineering enablement lead.

The workflow is: inspect account health → identify a stalled or uncertain team → inspect its evidence → choose an intervention with an owner and review date → prepare a concise CTO QBR.

The design uses a calm enterprise workspace with three views: Overview, Team evidence and CTO brief. Every view retains a synthetic-data label. The health number has an explanation beside it, and weak telemetry becomes “insufficient evidence,” not a red performance judgment.

## Fictional account

90 calendar days: **2026-07-01 through 2026-09-28**, inclusive. Singapore is the display timezone; storage uses UTC timestamps and endpoint-native daily dates with documented normalization.

| Team | Engineers | Seed scenario | First intervention hypothesis |
|---|---:|---|---|
| Digital Channels | 90 | Sustained uptake | Share a reviewed workflow; monitor quality |
| Payments | 80 | High usage, falling acceptance | Review a sample of rejected diffs and repository context |
| Core Banking | 85 | Low adoption, weak acceptance | Pilot one safe legacy-code task with a champion |
| Risk & Compliance | 55 | Low contribution, policy constraints | Review permitted workflows with the team lead |
| Data Platform | 50 | Improving adoption | Expand a successful workflow gradually |
| Developer Platform | 40 | Strong uptake, missing tracking | Repair telemetry before interpreting contribution |
| Total | 400 | | |

These are generator scenarios, not known causes. Recommendations must say what to investigate rather than assert why a team stalled.

## Delivery approach

1. Freeze the metric definitions and selected endpoint contracts before generating data.
2. Generate a seeded user roster, team mapping and 90-day event history. Include weekdays/weekends, gradual uptake, stalled cohorts, zero denominators, missing days, late commits and duplicate pages. Keep scenario ground truth in a separate file used only by tests.
3. Serialize endpoint-shaped JSON fixtures. Keep simulation metadata outside the response body.
4. Read those fixtures through the same client interface planned for live HTTP. Validate raw responses before normalization.
5. Use SQL to build daily and 28-day aggregates, with explicit denominators and completeness flags.
6. Use versioned Python rules for scores, flags and intervention candidates.
7. Render the dashboard and deterministic QBR. Later, pass the same evidence packet to Model for narrative drafting, validate the result, and require a human review before export.

## MVP — smallest complete story

Include one account, six stable team assignments, 400 users, 90 days, a fixture-backed client and DuckDB. Build overview, selected-team evidence, a rule explanation, six interventions, and an offline QBR export. Persist overrides separately from computed results.

Acceptance: one repeatable command recreates the dataset and report from a seed; roster counts sum to 400; date coverage is 90 days; schemas match pinned documentation for the selected endpoints; aggregates reconcile to raw rows; missing/zero data never becomes a fabricated percentage; two planted stalled teams are detected; missing tracking triggers uncertainty; every QBR number references evidence; the exported QBR fits one page.

Exclude live credentials, scheduled jobs, individual rankings, SSO, predictive churn, cost-saving estimates, and assertions of time saved. A useful offline product must not depend on a paid model call.

## V1 — portfolio release

Add a polished responsive front end, reproducible FastAPI responses, explanations down to metric IDs and source windows, an evidence-constrained Model narrative adapter, a human-editable QBR, printable PDF output, and a short demo recording. Add CI for contract fixtures, SQL invariants, pagination/deduplication, weighted aggregation and narrative factuality. Include screenshots and a limitations section in the portfolio case study.

The narrative adapter accepts facts, eligible recommendations and limitations. It cannot write SQL, change scores, infer hours saved, or invent causes. Numeric validation compares generated claims with the evidence packet; failures fall back to the deterministic draft. Store prompt version, model, evidence hash and review state. Human edits invalidate automated verification until rechecked.

## V2 — integration and outcome learning

Implement the live enterprise HTTP adapter with credentials supplied at runtime, retries, endpoint-specific pagination, incremental watermarks and raw-response provenance. Add historical group membership, configurable working calendars and telemetry coverage against an independent repository inventory.

Track intervention owner, date, hypothesis and follow-up measures. Optional Git/CI/issue-system integrations can add cycle time, rework and failure data with separate permissions. Before/after changes remain observational; estimating causal effects would require a credible comparison design and control of confounding factors.

## Demo story — five minutes

Open the account overview, explain why DAU is contextual, inspect Payments' acceptance decline, open Developer Platform's missing-data state, edit an intervention, then show the CTO brief and its evidence limitations. End on the interchangeable client interface and reproducibility.

## Decisions to review after seeing the draft

Is the audience primarily a customer-success interviewer or an engineering interviewer? Does the proposed health score help prioritize investigation? Is the Overview → Team evidence → CTO brief flow sufficient? Keep these decisions editable before building the full pipeline.
