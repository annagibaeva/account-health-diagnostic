# Internal deployment workspace MVP

Audience: an internal account team at an AI developer-tool provider. This is a working local portfolio MVP for a fictional customer.

## Implemented

- **Deployment plans:** create and edit an intervention, customer objective, hypothesis, next action, Internal owner, customer counterpart, execution status and review date. Record baseline, target, direction, unit, observed value, observation date, measurement source, evidence and quality guardrail.
- **Customer success:** calculate execution completion and objective attainment from the intervention records. Show evidence gaps and per-objective baseline/current/target. A completed intervention does not automatically count as an achieved outcome.
- **Product feedback:** create and triage workflow-specific feedback, severity, customer impact, reproduction evidence, owner and a linked intervention. Filter by status. Sharing status does not send anything externally.
- Browser-local persistence under a separate versioned key; internal JSON export for portability. Existing adoption diagnostic and customer-facing brief remain available.

## Metrics

Execution completion = interventions marked Complete / all interventions.

Objective attainment = Target met / assessable outcomes. An outcome is assessable only with a numeric observation, observation date, evidence and a quality decision. Passed guardrail plus reached target yields Target met. A failed guardrail yields Guardrail failed even when the numerical target is reached. Pending evidence is excluded from the denominator and shown separately. No assessable outcomes yields unavailable, never 0%.

Targets are fictional proposals. These descriptive measurements do not establish causal impact. Revenue retention, NRR and CSAT remain unavailable until appropriate commercial and survey sources exist.

## Demo

1. Open Deployment plans and edit Payments context pilot.
2. Record an observed acceptance, date and evidence; keep quality Not assessed. Customer success shows a pending outcome.
3. Change quality to Passed. Customer success evaluates the target separately from execution status.
4. Capture linked feedback from the intervention, add workflow impact and reproduction evidence, and move it through triage.
5. Reload to verify local persistence; export internal records if needed.

## Boundaries

All seed people, support references and CRM records are simulated. Limited provider and MCP connection checks exist, but no connector ingests live records. CRM, team chat, support and tracker adapters remain simulated. No authentication, shared database, permission system or audit history is implemented, so this MVP is for local portfolio demonstration only. It does not hold real customer data.

The CTO brief deliberately retains the original synthetic scenario and team action edits; internal feedback and deployment records are not automatically copied into a customer-facing export. The separate Reviewed QBR screen now includes current outcome reviews with explicit human approval.

Next implementation steps: shared account-record persistence and connector ingestion adapters, contract-validated Provider fixtures, SQL metric views, customer-specific source mappings, role permissions and an explicit human review before CRM updates or external sharing.
