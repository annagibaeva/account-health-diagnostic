# Live operations

The operations panel separates live ingestion from the synthetic portfolio dataset. It never overwrites synthetic metrics with partially fetched or unmapped production records.

## Configuration

Set credentials in the server environment or deployment secret store, never in browser storage or a committed file:

| Variable | Purpose |
| --- | --- |
| `TELEMETRY_API_KEY` | Enterprise telemetry API credential |
| `SIGNAL_TEAM_MAPPING` | Optional JSON array of `{ "name": "Team", "userIds": ["provider-id-or-email"] }` |
| `SIGNAL_MCP_URL` | Authorized HTTPS MCP endpoint; no query, fragment or embedded credential |
| `SIGNAL_MCP_TOKEN` | Optional server-side bearer credential |
| `SIGNAL_MCP_ALLOWED_TOOLS` | JSON array of exact tool names; default `[]` |
| `SIGNAL_ALLOW_EXTERNAL_EXECUTION` | Exact `true` enables reviewed live calls; otherwise dry runs only |

No live credentials were supplied during development. Tests use mocked provider responses; a configured label does not mean a verified connection.

## Read-only ingestion

`TelemetryClient` uses a fixed provider origin and Basic authentication. It fetches the roster, paginated per-user agent edits, and paginated committed-code attribution. Dates must be explicit ISO dates with a maximum ninety-day range. Redirects are rejected, network timeouts apply, and schema/pagination failures abort publication. The client does not retry silently or publish partial data.

Successful runs persist a separate raw snapshot and aggregate acceptance/committed-code measurements. The public response contains aggregate counts rather than member identities or commit messages. Durable raw snapshots require appropriate storage access and retention controls before real customer data is ingested.

Without an organizational mapping, live account-health scores are withheld. Configure `SIGNAL_TEAM_MAPPING` to fetch team-filtered edits and daily active users over adjacent current/prior windows, normalize versioned evidence records, and run the shared diagnostic rules. The mapping is validated against current roster identities; duplicate or removed members are rejected. No fixed engineer count or team count is assumed. Mapped current windows are limited to forty-five days because the paired fetch is capped at ninety days. Coverage and sample gates can still withhold an account score. The normalized live evidence is available through the operations panel, separately from the synthetic account. Worker normalization follows the same metric contract; it does not execute SQLite itself.

`scheduledSyncAndDiagnose(options)` requests the previous twenty-eight complete UTC days. It can be invoked from an authenticated scheduler with the same durable store and secret configuration. It performs read-only sync and an evidence-availability diagnosis; it cannot execute prepared external actions. A scheduler must be configured separately, with monitoring and retention appropriate to its host.

## Reviewed actions

1. Discover tools through MCP. Only names in the server allowlist are presented.
2. Prepare an exact endpoint, tool, JSON argument object and dry-run mode. The operator sees the returned schema and entire prepared specification.
3. Approve its SHA-256 digest with an authenticated server-derived operator identity. Approval expires after thirty minutes.
4. Execute that approved record. The server atomically claims it before any network call. Changed configuration or another operator cannot reuse the approval.
5. Persist a receipt. Dry runs never invoke `tools/call`. Transport uncertainty permanently blocks automatic retry; the operator must reconcile the destination. An in-flight state left by a process crash also remains blocked.

The action digest is deterministic: preparing identical content returns the existing action, including its final or uncertain status. The prototype intentionally has no automatic reset/retry button for external side effects. Duplicate prevention applies to the exact target/tool/arguments/mode combination, not to semantically equivalent actions with different arguments.

The UI and client validate basic object/required-argument structure. The MCP server remains responsible for full JSON Schema validation. Tool descriptions, schemas and results are untrusted data and are never interpreted as agent instructions. Full tool result content is not returned or logged; receipts record success/error and content-item count. This is not a universal CRM integration: a compatible, allowlisted MCP server must implement the desired destination operation.

Supported transport: HTTPS Streamable HTTP with JSON responses and protocol `2025-06-18`. SSE, OAuth flows, stdio, dynamic endpoint entry and model-autonomous tool execution are not implemented.

## Storage and API contract

`handleOperation(action, body, {env, store, request, actor})` supports `status`, `sync`, `evidence`, `tools`, `prepare`, `approve`, `execute`, and `history`. The host exposes these as same-origin authenticated POST routes below `/api/operations/`.

The durable store provides `kvGet(key) -> {revision, value}` and atomic `kvPut(key, expectedRevision, value) -> boolean`. An action ledger and audit trail are committed together with compare-and-swap. Ledger caps fail closed instead of deleting audit history. Authentication, role policy, encryption, backups and archival belong to the hosting layer.

## Primary references and verification

Adapters follow the [Admin API schema](https://cursor.com/docs/account/teams/admin-api), [Analytics API schema](https://cursor.com/docs/account/teams/analytics-api), [Code Tracking API schema](https://cursor.com/docs/account/teams/ai-code-tracking-api), and [MCP tool protocol](https://modelcontextprotocol.io/specification/2025-06-18/server/tools). The attribution API is documented as alpha; validate contracts again before production use.

Run `node --test integrations/operations.test.mjs`. Tests cover pagination, malformed data, dry-run isolation, digest approval, allowlist changes, concurrent execution claims, uncertain-outcome retry prevention, missing credentials and unsupported streaming responses. No external side effect was sent during implementation.
