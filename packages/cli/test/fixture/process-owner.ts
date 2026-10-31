// A second real process that holds its liveness lock until the parent asks it to exit.
import { ProcessLiveness } from "../../src/session/process-liveness"

const [directory] = process.argv.slice(2)
if (!directory || !process.send) throw new Error("process-owner requires its test parent and a lock directory")
ProcessLiveness.ensureHeld(directory)
process.on("message", (message) => {
  if (message === "finish") process.exit(0)
})
process.send({ instanceID: ProcessLiveness.INSTANCE_ID, pid: process.pid })
