# Fork difference documentation and audit plan

> Execute the already authorized documentation closure and code audit in parallel review groups. No runtime alignment or consolidation is implemented by this plan.

**Goal:** Correct accepted-sync records and reconcile every changed file with current FD/FC/DC contracts.

**Architecture:** Pin upstream/main/compat snapshots, derive file inventories from Git, review real hunks and callers, then reconcile owner records and publish a bounded audit result. Keep historical evidence separate from current contracts and proposed changes.

**Tech stack:** Git tree/diff evidence, Python inventory verification, Markdown registries, existing TypeScript/Bun implementation and tests.

**Spec:** User request to close documentation, audit actual upstream/fork differences and reassess alignment/consolidation.

## Constraints

- Accepted upstream `5198ff54`, main `648f7cdf`, compat `90abf6e4`; latest observed `b4cc11cd` is a separate unadopted delta.
- Preserve pre-existing checkouts. Shared FD/FC records are owned by main; compat-specific records remain in the overlay.
- Modify documentation only. Do not report static inspection as new runtime validation.
- Recommendations do not authorize implementing feature retirement or merging newer upstream.

## Tasks

- [x] Recheck refs, ancestry and accepted exact-SHA CI; create isolated documentation workspaces.
- [x] Correct FD-004/FD-012 wording and identify remaining FC-008 workflow quarantine.
- [x] Add accepted publication summary and final seven-row synchronization results; preserve historical test boundaries.
- [x] Inspect all 422 upstream-to-main changed files and all 107 main-to-compat changed files; inspect the latest upstream delta separately.
- [x] Reconcile each path with owners, actual behavior, documentation drift and a disposition. Verify no omitted or duplicate inventory paths.
- [x] Correct confirmed registry omissions and cross-links without changing source/test behavior references.
- [x] Produce final capability results and ranked alignment/consolidation recommendations with prerequisites and evidence limits.
- [x] Validate documentation links, counts, inventory coverage, snapshot stability and absence of source changes; obtain independent review.
