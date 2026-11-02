// Run with `bun run`, never `bun test`. Another process mid-write on a shared
// database file: takes the write lock, reports it, and commits when the parent
// says so.
import { Database } from "bun:sqlite"

const [file] = process.argv.slice(2)
if (!file || !process.send) throw new Error("sqlite-write-holder requires its test parent and a database file")
const db = new Database(file)
db.run("PRAGMA busy_timeout = 5000")
db.run("BEGIN IMMEDIATE")
process.on("message", (message) => {
  if (message !== "commit") return
  db.run("COMMIT")
  db.close()
  process.send!("committed")
})
process.send("locked")
