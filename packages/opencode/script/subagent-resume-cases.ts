// Run the fork's real retained-context recovery acceptance matrix.
// Registry-only actors cannot substitute for an admitted frozen Actor generation.
import { $ } from "bun"

await $`bun test test/actor/subagent-resume-cascade.test.ts test/actor/subagent-resume-negatives.test.ts test/actor/subagent-resume-route.integration.test.ts --timeout 120000`.cwd(new URL("..", import.meta.url).pathname)
