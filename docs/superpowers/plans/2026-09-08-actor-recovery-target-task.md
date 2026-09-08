# Actor recovery targets and task binding

The user approved POLICY-02 last in order 6 -> 1 -> 4 -> 3 -> 2. Local work
starts from the POLICY-04 preview `110222157896b16e7ba85bc3d5d3f5eef975a6e1`;
accepted POLICY-03 must be inherited before publication. This is the selected
behavior from upstream `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`, released
at `2a0eb706e95a77cba34a319e9f11f33f26d4450c`; overall upstream review stays
at `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.

1. Share the HTTP/tool resolver for registered local Actors and peers addressed
   through their own or original parent session. Retain actual directory,
   persistent/full live receiver, model identity and supervisor checks.
2. Accept optional task_id on POST/tool resume. Omission retains persisted
   state; an equal value validates without rewriting; a conflicting value
   fails. Missing bindings require a real claimable task in a namespace derived
   from trusted spawn provenance, never a client-supplied namespace.
3. After runner admission, revalidate candidate/user/task and atomically claim
   the task, bind the original user and settle the old assistant. Busy, invalid,
   conflicting and cancelled-before-admission requests must make no mutations.
   Synchronous ownership handoff must cover the commit boundary; accepted
   resumes remain supervisor-owned and receive no inherited RunApproval.
4. Prove real main/subagent/peer recovery and task-path propagation, same-task
   and missing-task cases, competing resumes/task claims, cancellation, frozen
   native schema and foreign-scope rejection. No cross-restart recovery or
   none/state receiver redesign is included.
5. Regenerate the source-derived SDK/OpenAPI and verify actual callable query
   encoding plus typed errors. Reconcile FD/FC/DC and current guidance, then
   require current-head Codex completion/all CI before each formal merge and
   exact-tip ancestry/CI verification after main-to-compat propagation.
