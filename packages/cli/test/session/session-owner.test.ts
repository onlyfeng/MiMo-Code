import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { ProcessLiveness } from "../../src/session/process-liveness"
import { SessionOwner } from "../../src/session/session-owner"
import { SessionOwnerTable } from "../../src/session/session-owner.sql"
import { Database, eq } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { startProcessOwner } from "../lib/process-owner"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer))

afterEach(() => Instance.disposeAll())

const ownerRow = (sessionID: Parameters<typeof SessionOwner.status>[1]) =>
  Database.use((db) => db.select().from(SessionOwnerTable).where(eq(SessionOwnerTable.session_id, sessionID)).get())

const assign = (sessionID: Parameters<typeof SessionOwner.status>[1], instanceID: string, pid: number) =>
  Database.use((db) => db.insert(SessionOwnerTable).values({ session_id: sessionID, instance_id: instanceID, pid, time_claimed: Date.now() })
    .onConflictDoUpdate({ target: SessionOwnerTable.session_id, set: { instance_id: instanceID, pid } }).run())

describe("session owner", () => {
  it.live("claims an unowned session for this process; status alone never writes", provideTmpdirInstance(() => Effect.gen(function* () {
    const session = yield* (yield* Session.Service).create({})
    expect(Database.use((db) => SessionOwner.status(db, session.id))).toEqual({ kind: "unowned" })
    expect(ownerRow(session.id)).toBeUndefined()

    expect(Database.use((db) => SessionOwner.claim(db, session.id))).toEqual({ kind: "self" })
    expect(ownerRow(session.id)).toMatchObject({ instance_id: ProcessLiveness.INSTANCE_ID, pid: process.pid })
    expect(Database.use((db) => SessionOwner.status(db, session.id))).toEqual({ kind: "self" })
  })))

  it.live("leaves a session owned by another live process alone and adopts it once that process is gone", provideTmpdirInstance(() => Effect.gen(function* () {
    const session = yield* (yield* Session.Service).create({})
    const owner = yield* Effect.promise(() => startProcessOwner(ProcessLiveness.directory()))
    yield* Effect.addFinalizer(() => Effect.promise(owner.kill))
    assign(session.id, owner.instanceID, owner.pid)

    const other: SessionOwner.Status = { kind: "other", pid: owner.pid }
    expect(Database.use((db) => SessionOwner.status(db, session.id))).toEqual(other)
    expect(Database.use((db) => SessionOwner.claim(db, session.id))).toEqual(other)
    expect(ownerRow(session.id)?.instance_id).toBe(owner.instanceID)

    yield* Effect.promise(owner.kill)
    expect(Database.use((db) => SessionOwner.status(db, session.id))).toEqual({ kind: "unowned" })
    expect(Database.use((db) => SessionOwner.claim(db, session.id))).toEqual({ kind: "self" })
    expect(ownerRow(session.id)?.instance_id).toBe(ProcessLiveness.INSTANCE_ID)
  })), 30_000)
})
