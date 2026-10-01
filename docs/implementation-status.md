# Evidence-backed release status

## Implemented

1. **Offline foundation:** seeded roster, six cohorts, 90 daily API-shaped aggregate responses per cohort, paginated commits, SQLite normalization/SQL metrics, completeness and invalid-row handling, generated evidence catalogue, and parity-tested rule thresholds.
2. **Evidence-linked workflow:** versioned recommendation references, explicit baseline/outcome imports, manual evidence labels, non-overlapping window checks, changed-evidence invalidation and review decisions.
3. **QBR:** evidence references, conservative numeric/causal claim guards, human review, server-side approval validation and actual bounded one-page A4 PDF export. Unsupported glyphs or overflow block export instead of dropping content.
4. **Shared persistence:** SQLite locally and D1 hosted; revision-based conflict rejection; authenticated hosted actor attribution; legacy browser records downloadable without silently overwriting shared records.
5. **Live operations:** credential-configured read adapters and MCP tool discovery; durable action preparation, exact-payload approval, dry-run default, allowlist, single execution claim, and uncertain-result retry prevention. Mocked contracts are tested. No real credentials or external side effects were used during development.

## Scheduling

The nightly repository workflow runs at 18:00 UTC (02:00 Singapore) and can be started manually. It generates an offline report artifact retained for fourteen days. It does not update the hosted database or execute external actions. The dataset's fixed observation window remains disclosed; repeating this report is not fresh telemetry.

`node scripts/nightly.mjs` also supports a separately configured environment with a live telemetry credential and team mapping. Its live snapshot and diagnosis stay separate from the synthetic run. The repository workflow deliberately receives no live secrets: publishing raw customer observations as CI artifacts would require a separate private operational setup.

## Remaining limitations

- Real provider verification requires server-side credentials and a real team mapping. Generic CRM/chat/support adapters are still not implemented; allowlisted MCP tools can provide explicitly reviewed actions when configured.
- This is a single-account workspace. Hosted access is private by default; there is no multi-account tenancy or enterprise role matrix.
- Conservative QBR checks are not a general semantic fact checker. Review is still required. The PDF supports ASCII plus normalized common punctuation and enforces a length bound.
- Cohort aggregates do not imply individual daily activity histories or causal productivity effects.
- The optional model-assisted Python reviewers remain unverified with a live model; the working default runtime is deterministic.
- Deployment URL and publication outcome are reported separately after hosting verification. The public source repository is not itself the application deployment.

## Workflow navigation and source links

Account workflow opens Account summary, with customer goals, open and blocked interventions, assessable targets and pending evidence. Customer overview contains editable account context. The diagnostic map shows all six teams before the detailed explanation; simulations affect only the selected-team detail.

Interventions and product feedback accept labelled HTTPS references to PRs, conversations, screenshots and agent runs. The inbox, technical-issue handoffs and intervention results expose linked sources. Links are manually supplied; no automatic retrieval or screenshot upload is implied. Diagnostic measurements remain separately expandable.

Owner notification previews use hypothetical #account-example-actions routing. Recording a demo notification persists a simulated-not-sent record in the workspace. This is not Slack delivery, identity verification or automatic owner-change notification.

Diagnostic runs are three deterministic processing stages, separate from the five human workflow screens. Connections & execution contains live sync and explicitly reviewed MCP actions.

## Integrated intervention workflow

Open **Account summary → Open synthetic intervention example** to add a complete, explicitly fictional Payments pilot. Existing records are preserved. The example follows a linked objective, testable explanation, readiness checks, delivered work, dated manual measurements and a customer decision to revise the pilot after missing its target. The scenario includes future illustrative dates; it is not an observed customer outcome.

Deployment plans, Customer outcomes and Action inbox open one canonical intervention with Overview, Work, Evidence and Review tabs. Hypothesis plans capture alternative explanations and criteria that could weaken the proposed explanation. Accepting a test does not establish a cause.

Readiness covers repository access, environment, permitted workflow, champion and review capacity. Expansion requires all checks ready with evidence, the agreed result target and quality guardrail, and current evidence. Older records remain editable but must complete readiness before expansion.

Workflow observations distinguish human-led IDE assistance from delegated-agent tasks. Counts, dates, evidence and optional cost are recorded separately from the agreed intervention metric; no productivity or financial gains are inferred.

Customer decisions record person, date, source and rationale, plus server-side writer attribution. Changed intervention evidence makes a decision stale. QBRs include the current decision label/date, explicitly marking example decisions and excluding private rationale. All four features work without live credentials; external integrations remain subject to the limitations above.
