# Account health diagnostic

An explainable account-success workspace for a fictional customer: 400 engineers, six teams and 90 days of synthetic telemetry. It connects adoption evidence to interventions, reviewed outcomes and a one-page executive QBR. It does not claim causal productivity gains.

![Account health dashboard](prototype/preview.png)

## Run locally

Requires Node.js 22.13+ and Python 3.12+. No API credentials are needed for the offline workflow.

```sh
npm ci
npm run data:build
npm start
```

Open http://127.0.0.1:4173. The generator produces endpoint-shaped cohort responses, a SQLite analytics database and 36 versioned evidence records. Generated raw fixtures and databases are ignored; the compact evidence catalogue is versioned.

## What works

- SQL metrics, denominators, completeness gates and parity-tested diagnostic rules.
- Success plan, action inbox, reproduction packets, outcome reviews and reviewed QBR.
- Explicit baseline/outcome evidence imports, manual observation labels and stale-evidence checks.
- Actual bounded one-page A4 PDF with evidence references and conservative claim validation.
- Shared SQLite workspace locally and D1 hosted, optimistic concurrency and recorded approval actors.
- Three deterministic runtime stages: triage, recommendations and deduplicated draft tasks.
- Configurable live telemetry and MCP adapters with exact-payload approvals, dry-run defaults and durable execution history.
- Nightly repository review at 02:00 Singapore; synthetic artifact only unless a separate environment is configured for live operation.

Live verification needs credentials and a team mapping. The synthetic account is never silently replaced by live records. CRM, chat and support are not universal built-in integrations. Optional model-assisted Python reviewers remain unverified with a live model.

## Validate and build

```sh
npm test
npm run test:data
npm run test:python
npm run build
node scripts/nightly.mjs
```

The web runtime uses JavaScript so local and hosted routes use the same rules. Python generates fixtures and SQL evidence, and retains the offline agent CLI. SQLite is the implemented analytics engine; DuckDB was the original design proposal.

## Documentation

- [Implementation status and remaining limits](docs/implementation-status.md)
- [Current runtime architecture](docs/runtime-architecture.md)
- [Offline data and schema provenance](docs/offline-data.md)
- [Live adapters and external action controls](docs/live-operations.md)
- [Complete account workflow](docs/complete-account-workflow.md)
- [Original solution, MVP, V1 and V2 specification](docs/solution-draft.md)
- [Planned ingestion architecture](docs/architecture.md)
- [Decision tree](docs/decision-tree.md)
- [Metric contract](docs/metric-contract.md)
- [Setup and sharing](docs/sharing.md)

Set server environment variables using `.env.example` as a guide; it is not automatically loaded. Keep credentials out of Git and browser storage. Hosted access starts private. No live customer records or external actions were used during development.
