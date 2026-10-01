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
