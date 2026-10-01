# Account health diagnostic

An internal workspace for teams helping enterprise customers adopt AI coding tools. It brings customer goals, usage evidence, deployment work and outcome reviews into one account record.

This portfolio implementation uses a fictional APAC bank with 400 engineers, six teams and 90 days of synthetic usage data. No real customer data is required.

## Business problem

Buying an AI coding tool does not ensure that engineering teams can use it effectively. Some teams adopt it quickly; others struggle with repository context, task selection, access or internal policy. High usage can hide poor results, while missing telemetry can look like low adoption.

The account team must answer four questions:

- Which teams need help, and what evidence supports that assessment?
- What should we investigate or change, and who owns the next step?
- Did the intervention meet the customer's target without compromising quality?
- What can we report to engineering leadership with confidence?

The information needed to answer these questions is often spread across usage reports, account notes, support issues, engineering work and customer conversations. This project follows the workflow in the [solution specification](docs/solution-draft.md) and [internal deployment brief](docs/internal-mvp.md): identify a problem, inspect the evidence, agree an intervention and review the result. Those documents describe earlier designs; [implementation status](docs/implementation-status.md) records what is built today.

## Users

The primary users are the AI tool provider's internal deployment and account teams. Customer executives receive the reviewed outputs; they are not the main operators of the workspace.

| User | What they use it for |
|---|---|
| AI deployment manager / customer-success engineer | Prioritise teams, agree success criteria, assign work and review adoption and outcomes. |
| Field engineer / forward-deployed engineer | Investigate technical blockers, check rollout readiness and link fixes to evidence. |
| Account manager / sales partner | Understand commitments, unresolved risks and evidence relevant to renewal or expansion conversations. |
| Product team | Review customer suggestions, affected workflows and linked reproduction details. |
| Customer CTO, VP of Engineering or enablement lead | Review results, limitations and decisions through the QBR and account discussions. |

These are intended roles, not implemented access-control levels. The app does not forecast renewals or manage a sales pipeline.

## Solution

The workspace connects three kinds of information:

1. **Customer context:** goals, stakeholders, success criteria and source references.
2. **Deployment evidence:** team usage, code attribution, technical issues and readiness checks.
3. **Account actions:** an intervention, its owner and due date, the measured result and the customer's decision.

The account summary shows outstanding work and evidence gaps. The diagnostic map explains which teams need investigation. Each intervention has one shared record with Overview, Work, Evidence and Review tabs, so the action inbox and outcome screens do not become separate copies of the same work.

Recommendations are hypotheses to test. The manager records alternative explanations, chooses an intervention and agrees how to assess it. A reviewed QBR then reports the result and the next decision, with references to the supporting evidence.

## Business value

The intended value is better deployment decisions and clearer accountability. The portfolio demonstrates the workflow; it has not established time savings, productivity gains or commercial impact.

| Intended value | How the solution supports it | How to evaluate it in a real deployment |
|---|---|---|
| Focus support on teams that need it | Team-level flags distinguish adoption problems from missing evidence. | Time from a flagged issue to an agreed investigation. |
| Keep customer commitments visible | Actions have owners, dates and linked objectives. | Overdue commitments and time spent blocked. |
| Make rollout decisions based on results | Baselines, targets, follow-up observations and quality checks sit beside the intervention. | Share of interventions with assessable outcomes; targets met with guardrails passed. |
| Prepare defensible customer reviews | QBR observations reference evidence and require human approval. | Review preparation time and corrections needed before approval. |
| Give product teams usable feedback | Suggestions include customer impact, technical context and source links. | Time to triage and the share of feedback with a documented response. |

Usage and AI-attributed code describe activity and contribution. They do not, by themselves, prove faster delivery, better code or financial return. The health score is an investigation aid, not a rating of individual engineers.

## Example customer journey

The Payments team has high activity but falling acceptance of agent edits. The deployment manager investigates repository context and task selection, then agrees a bounded maintenance pilot with the customer champion.

In the worked example, substantial review rework falls from 40% to 35%, missing a 25% target. The customer chooses to revise the pilot before expanding it. The app records the observations, missed target, quality checks and decision, then carries the reviewed result into the QBR. These figures and decisions are explicitly synthetic; the observed change is not treated as proof of causation.

![Account health dashboard](prototype/preview.png)

## Run locally

Requires Node.js 22.13+ and Python 3.12+. No API credentials are needed for the offline workflow.

```sh
npm ci
npm run data:build
npm start
```

Open http://127.0.0.1:4173. The generator creates fixtures based on documented API response schemas, a SQLite analytics database and 36 evidence records. Raw fixtures and databases stay out of Git. The evidence records used by the app are checked in.

## Using the app

Start at **Account summary → Open synthetic intervention example**. The Payments pilot misses its target, and the customer decides to revise it. All measurements and customer decisions in this example are fictional.

The account workflow has five steps:

1. **Account success plan:** record goals, owners and source references.
2. **Action inbox:** assign owners and due dates.
3. **Technical issues:** document a problem and the steps needed to reproduce it.
4. **Outcome review:** compare results with targets and record the next decision.
5. **Reviewed QBR:** approve and export a one-page PDF with evidence references.

Each intervention has Overview, Work, Evidence and Review tabs. These use the same record. Hypotheses include alternative explanations and a proposed test. Readiness checks cover repository access, environment setup, permitted workflows, a customer champion and review capacity.

The diagnostic map shows adoption, trends and missing evidence for each team. Its rules and score weights are demonstration assumptions, not validated predictors of customer success.

## Data and automation

- Python generates the synthetic fixtures. SQL calculates the metrics and their denominators.
- JavaScript runs the web app and diagnostic rules. Python and JavaScript rule results are checked for consistency.
- SQLite stores local workspace data; the hosted app uses D1. Conflicting saves are rejected, and approvals record the signed-in user.
- Diagnostic runs use three rule-based stages: summarise the account, recommend actions and create draft tasks. They do not require a language model.
- The repository schedule runs at 02:00 Singapore time. It produces a synthetic report artifact; it does not update the hosted workspace or send external messages.

SQLite is the analytics engine. DuckDB appears in the original design documents but is not used in the implementation.

## Limitations

- Live telemetry and MCP adapters need server-side credentials. Their tests use mocked responses; they have not been verified against a real customer account.
- PR, conversation, screenshot and agent-run links are entered manually. Slack notifications are simulated and send no messages.
- CRM, chat and support integrations are not implemented. The optional model-assisted Python reviewers have not been tested with a live model.
- QBR checks catch specific unsupported claims and stale evidence. They are not a general fact checker; a person must review the report. PDF export rejects content that exceeds one page.
- The app handles one account. It does not provide multi-account isolation or an enterprise role system.

## Validate and build

```sh
npm test
npm run test:data
npm run test:python
npm run build
node scripts/nightly.mjs
```

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

Use `.env.example` to configure server environment variables; the file is not loaded automatically. Do not commit credentials or store them in the browser. The hosted app is private. Development used no live customer records and performed no external actions.
