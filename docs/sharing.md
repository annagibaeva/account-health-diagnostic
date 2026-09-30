# Running and sharing the prototype

## Local quick start

Use Node.js 22 or newer and Python 3.12 or newer. The offline demo has no third-party runtime dependencies to install.

```sh
npm start
```

Open http://127.0.0.1:4173. For Python outside PATH, set `SIGNAL_PYTHON` to its executable before starting the server. Configuration examples are in `.env.example`; the application does not automatically load that file.

```sh
npm test
python -m unittest discover -s agents -p "test_*.py"
```

## Five-minute demo

1. Inspect Account health and the Payments decision-tree explanation.
2. Add a customer objective in Account success plan and link an intervention.
3. Open Action inbox to inspect missing evidence and accountable owners.
4. Capture a Reproduction packet when technical friction needs investigation.
5. Record a measurement in Deployment plans, assess it in Outcome review, and review the QBR before export.
6. Run Agent operations to create local draft tasks. Repeat the run to see deduplication.

All observations are synthetic. Acceptance and attribution do not establish causal productivity gains. The three runtime workers are deterministic by default; optional model-assisted commentary is not required for this demo.

## Repository and source archive

The repository contains source, specifications, screenshots and offline tests. It excludes local run history, SQLite state, environment secrets, Python caches and generated archives. Browser-local records are not included in a clone or archive.

To create a portable source archive from a committed revision:

```sh
git archive --format=zip --output=account-health-diagnostic.zip HEAD
```

Store generated archives outside the repository or in the ignored `dist/` directory.

## Website publishing boundary

Publishing this repository shares the source; it does not deploy a website. The current server binds to localhost and the API permits local origins only. It has no authenticated shared-account access. A static host cannot run its Python workers or SQLite history.

A hosted interactive version needs a deliberate deployment configuration, authenticated account access, persistent storage, and configured origins. For now, reviewers can run the complete offline demo locally. No live credentials or real customer records are needed.

## Reuse

Product-facing labels are neutral. Actual provider endpoints and optional SDK identifiers remain in the integration source. The bundled provider probe is not a universal connector. No open-source license has been selected; public visibility alone does not grant a reuse license.
