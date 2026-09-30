# CTO quarterly review — illustrative draft

**Example customer · fictional account · synthetic scenario**
Observation period: 1 July–28 September 2026 (90 days). Review date: 30 September 2026.

**Decision requested.** Sponsor two targeted enablement pilots and one telemetry repair effort before expanding the programme. Assign Payments and Core Banking engineering leads to the pilots, and Developer Platform to tracking validation. Review progress on 30 October.

**Account perspective.** The proposed diagnostic covers 400 engineers across six teams. The front-end concept illustrates an adoption health score of 61/100, using the latest 28-day acceptance and active-share assumptions, weighted by team size. This is an investigation aid, not a renewal forecast or engineering performance rating. The value is illustrative and has not been computed from API-shaped daily fixtures.

**What merits attention.** Payments and Core Banking illustrate low acceptance that is not improving. Payments combines substantial activity with weaker acceptance, suggesting that an enablement conversation should inspect rejected edits and task fit. Core Banking should start with one bounded legacy-code workflow. Neither observation identifies a root cause. Developer Platform illustrates incomplete code tracking; its contribution evidence should remain unavailable until that gap is resolved.

**Next 30 days.** Payments' lead should run a rejected-diff review and document the most common failure patterns. Core Banking's lead should pair a champion with a small pilot group and review acceptance alongside qualitative feedback and code review findings. Developer Platform should verify attribution against an independently defined repository sample. Digital Channels can share a reviewed workflow, Data Platform can expand its pilot gradually, and Risk & Compliance should clarify permitted use cases with its lead.

**How to judge the follow-up.** Recheck the same window definitions and denominators, verify telemetry completeness, and record whether teams found the interventions useful. Look for improving acceptance without deterioration in independently collected quality indicators. Do not treat a higher percentage of AI-attributed code as a universal target. The next review should report actions completed, changes observed and unresolved uncertainty.

**Limits.** DAU and Tab accepts describe activity. Accepted edits and AI-attributed committed lines are closer to workflow value, but neither proves faster delivery, better quality or financial benefit. This demonstration has no comparison group or independently measured delivery outcomes. It therefore makes no causal productivity claim. The production QBR must replace these illustrative statements with validated, traceable evidence and pass human review.
