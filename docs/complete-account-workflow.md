# Complete account workflow

Five feature modules form one human-led account workflow. These are screens and records, not five additional runtime agents. Temporary implementation agents helped build the modules; they do not run inside the product.

| Feature | User decision | Record linkage |
|---|---|---|
| Account success plan | What does the customer want? | Objectives link to deployment IDs |
| Action inbox | Who must act next? | Derived from existing deployment and feedback records |
| Reproduction packet | Can technical friction be reproduced? | Packet links to feedback and deployment |
| Outcome review | Did the intervention meet its target and guardrail? | Review links to a deployment and its measured evidence |
| Reviewed QBR | What can we responsibly communicate? | Approved content based on current objectives and reviewed results |

All screens use the existing fictional account and browser-local workspace persistence. Agents implementing the features are development workers; they are distinct from the runtime triage/planning/execution agents under Agent operations.

## Intended walkthrough

1. Edit the success plan and link the Payments objective to DEP-001.
2. Open the action inbox and inspect its owner, next action and outstanding evidence.
3. Create a reproduction packet linked to FB-001 / DEP-001. Capture environment, steps, expected and actual behavior; review evidence before export.
4. Record the intervention measurement in Deployment plans. In Outcome review, assess the evidence and decide whether to expand, revise or stop.
5. Generate the reviewed QBR and inspect its customer-facing content before approval. Source changes require a new review.

These features support a local portfolio workflow, not production approval or authorization. No identities are authenticated and no external messages are sent. Connector checks do not supply new observations. Synthetic labels and non-causal limitations remain visible.
