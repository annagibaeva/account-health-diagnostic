# Metric contract — proposed rules v0.1

All thresholds are transparent portfolio assumptions, not Provider benchmarks or validated predictors of renewal. Do not rank engineers. Show team-level evidence and contextual differences.

## Value signals and contextual metrics

| Metric | Definition | Interpretation / limitation |
|---|---|---|
| Agent edit acceptance | Sum accepted diffs / sum suggested diffs | Suggestion fit signal; acceptance does not prove quality or time saved |
| AI share of tracked committed added lines | Sum(Tab added + Composer added) / sum(total added), on the same tracked commits | Contribution attribution; not all repository code, retained code, or productivity |
| Working-day active share | Sum daily active users / sum eligible team members on complete working days | Adoption breadth context; not unique monthly users |
| Raw DAU / Tab accepts | Counts with window and population shown | Useful diagnostic context; vanity when presented as proof of value |

Use ratios of sums, not averages of user percentages. Display denominators and sample size. Zero denominator means unavailable. Do not add deleted lines to an added-line denominator. Do not clamp invalid attribution into a plausible percentage; quarantine it and report the issue. No inference of exact accepted-to-committed retention without a defensible linkage.

## Proposed score

For the most recent complete 28 days:

`team_health = round(0.70 * acceptance_percent + 0.30 * working_day_active_percent)`

AI contribution appears beside the score but has no weight: maximizing generated code volume could reward the wrong behavior. A higher score means more consistent adoption and acceptance, not better engineering performance. The deliberately simple formula makes assumptions inspectable; V1 should include sensitivity analysis before presenting it as a decision aid.

Status: 70–100 “Healthy adoption”; 50–69 “Watch”; below 50 “Needs attention.” Labels use the unrounded score. Displayed whole numbers may sit at rounding boundaries; retain full values in evidence.

Withhold a team score if fewer than 100 suggested diffs, fewer than 10 eligible working days, or less than 90% of expected Analytics team-day responses are available. Expected days come from the ingestion manifest; a missing response is not zero usage. These minimums are configurable assumptions.

Missing code-tracking data does not suppress an otherwise valid adoption score; it marks contribution evidence unavailable. Never calculate repository coverage from Provider alone. The fixture generator can provide known simulation coverage; live coverage needs an independent inventory or shows “unknown.”

Account score = headcount-weighted mean of unrounded eligible team scores. Show included engineers / 400. Withhold if eligible teams represent less than 80% of headcount. Keep a missing-data badge alongside the score; do not silently reweight missing components inside a team.

## Stalled-team flag

Compare two adjacent complete 28-day windows. A team is “stalled” when current acceptance is below 55% AND its change is at most +2 percentage points, with the same minimum evidence gates in both windows. This means low, non-improving acceptance; it is not a diagnosis of cause. A drop of at least 10 points is a separate “declining acceptance” flag. Flags can coexist with status.

Use working-day calendars for adoption; calendar-day windows for endpoint filtering. MVP uses Monday–Friday without public-holiday adjustment, disclosed in the report. V2 supports team-specific calendars. Exclude the current partial day and report an ingestion watermark.

## Recommendations

See [the decision tree](decision-tree.md) for explicit primary-action precedence, independent flags, missing-baseline behavior and the worked Payments trace. Its additional action-routing thresholds are draft assumptions.

Precedence: insufficient evidence → repair measurement; low/non-improving acceptance → rejected-diff review or scoped pilot; high adoption with declining acceptance → workflow/context review; improving signals → staged expansion; sustained signals → share practices and monitor quality. Each action has evidence IDs, a hypothesis, an owner, a 30-day review date and an observable success criterion. Teams with policy constraints require a conversation, not an assumption that more AI code is always desirable.

## QBR contract

Target 350–450 words maximum for the eventual A4 one-page export, with visual verification. Include the decision requested, scope, observations, prioritized actions, owner/review date and limitations. Facts are deterministic. Narrative may be drafted by Model, but every numerical claim must match the evidence packet. Never equate acceptance or AI share with productivity, ROI, hours saved, code quality or causal impact.

The current design preview uses illustrative 28-day aggregates and a small template. It does not yet implement completeness gates or historical window detection from raw events; its scenario flags illustrate those future states.
