import yargs from "yargs/yargs"
import { LlmServerCommand } from "../../src/cli/cmd/llm-server"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util"

try {
  await yargs(process.argv.slice(2))
    .command(LlmServerCommand)
    .exitProcess(false)
    .strict()
    .fail((message, error) => {
      throw error ?? new Error(message)
    })
    .parseAsync()
  const directory = process.env.MIMOCODE_TEST_NO_INSTANCE
  if (directory && (await Instance.peek(directory)))
    throw new Error("Administrative CLI unexpectedly initialized an instance")
} catch (error) {
  process.stderr.write(String(error) + "\n")
  process.exitCode = 1
} finally {
  await Instance.disposeAll()
  await Log.shutdown()
  // Match src/index.ts: shared runtime handles can outlive a completed CLI command.
  process.exit()
}
