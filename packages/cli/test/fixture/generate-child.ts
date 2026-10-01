import { GenerateCommand } from "../../src/cli/cmd/generate"

// Keep the generator's OpenAPI schema state separate from other server tests.
await GenerateCommand.handler()
process.exit(0)
