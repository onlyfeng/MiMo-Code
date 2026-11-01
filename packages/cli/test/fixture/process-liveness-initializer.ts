// Run with `bun run`, never `bun test`. A process caught between publishing its
// lock file and locking it, the window that the coordination lock covers.
import { randomUUID } from "node:crypto"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { init } from "../../src/storage/db.bun"
import { ProcessLiveness } from "../../src/session/process-liveness"

const [directory, marker] = process.argv.slice(2)
if (!directory || !marker) throw new Error("process-liveness-initializer requires a lock directory and a marker path")
const instanceID = randomUUID()
const file = path.join(directory, `${instanceID}.lock`)
let held: ReturnType<typeof init>["$client"] | undefined
ProcessLiveness.withCoordination(directory, () => {
  writeFileSync(file, "")
  writeFileSync(marker, instanceID)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_500)
  held = init(file).$client
  held.exec("PRAGMA locking_mode = EXCLUSIVE")
  held.exec("CREATE TABLE instance (pid INTEGER NOT NULL)")
  held.exec(`INSERT INTO instance (pid) VALUES (${process.pid})`)
})
setInterval(() => void held, 1_000)
