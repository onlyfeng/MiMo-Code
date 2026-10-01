import { expect, test } from "bun:test"
import { createRunApproval } from "../../src/cli/cmd/run-approval"

test("run approval isolates overlapping clients and permits only the creator run across child sessions", () => {
  const yolo = createRunApproval(true)
  const strict = createRunApproval(false)
  expect(yolo.runID).not.toBe(strict.runID)
  expect(yolo.reply({ runID: yolo.runID })).toBeUndefined()
  yolo.start()
  strict.start()
  expect(yolo.reply({ runID: strict.runID })).toBeUndefined()
  expect(strict.reply({ runID: yolo.runID })).toBeUndefined()
  expect(yolo.reply({})).toBeUndefined()
  expect(yolo.reply({ runID: yolo.runID })).toBe("once")
  expect(strict.reply({ runID: strict.runID })).toBe("reject")
  yolo.stop()
  expect(yolo.signal.aborted).toBe(true)
  expect(yolo.reply({ runID: yolo.runID })).toBeUndefined()
  yolo.start()
  expect(yolo.reply({ runID: yolo.runID })).toBeUndefined()
  expect(strict.reply({ runID: strict.runID })).toBe("reject")
  strict.stop()
})
