import path from "node:path"
import fs from "node:fs/promises"
import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util"
import { LLMServerTokens } from "../../llm-server/tokens"
import { LLMServerScope } from "../../llm-server/scope"
import { LLMServerCapability } from "../../llm-server/capability"

/** Both the idle window and absolute lifetime must be finite. */
export function duration(input: string | undefined, fallback: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/.exec((input ?? fallback).trim().toLowerCase())
  if (!match) throw new Error("Invalid duration; use a finite positive value such as 30m, 12h or 7d")
  const scale = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] ?? "ms"]!
  const value = Number(match[1]) * scale
  if (value <= 0 || !Number.isSafeInteger(value) || !Number.isSafeInteger(Date.now() + value)) {
    throw new Error("Duration must be positive whole milliseconds within the safe timestamp range")
  }
  return value
}

function directoryOption(yargs: Argv) {
  return yargs.option("directory", {
    type: "string",
    default: process.cwd(),
    describe: "project directory to authorize",
  })
}

async function directory(input: string) {
  const resolved = Filesystem.resolve(input)
  if (!(await fs.stat(resolved)).isDirectory()) throw new Error("Project directory must be a directory")
  return resolved
}

function invocation(args: string[]) {
  if (process.env.MIMOCODE_BIN_PATH) return [process.env.MIMOCODE_BIN_PATH, ...args]
  const interpreter = /^(bun|node)(?:\.exe)?$/i.exec(path.basename(process.execPath))
  if (!interpreter || !process.argv[1]) return [process.execPath, ...args]
  // Bun's implicit bunfig preload and relative runtime arguments depend on cwd.
  // Pin that runtime context independently of the token's explicit --directory.
  const runtime =
    interpreter[1].toLowerCase() === "bun"
      ? [
          "--cwd",
          Filesystem.resolve(process.cwd()),
          ...process.execArgv.filter(
            (value, index, all) => value !== "--cwd" && !value.startsWith("--cwd=") && all[index - 1] !== "--cwd",
          ),
        ]
      : process.execArgv
  return [process.execPath, ...runtime, path.resolve(process.argv[1]), ...args]
}

const issue = cmd({
  command: "issue",
  describe: "mint a temporary credential for selected models or all models without starting a server",
  builder: (yargs: Argv) =>
    directoryOption(yargs)
      .option("ttl", { type: "string", describe: "idle lifetime from last use (default 1h)" })
      .option("max-age", { type: "string", describe: "absolute lifetime from issue (default 24h)" })
      .option("model", {
        type: "string",
        array: true,
        describe: "explicit provider/model to authorize (repeat for multiple models)",
      })
      .option("all-models", {
        type: "boolean",
        describe: "authorize all current and future available models in this directory",
      })
      .option("capability", {
        type: "string",
        choices: ["chat", "speech", "transcription"] as const,
        describe: "select one currently usable model by capability",
      })
      .option("label", { type: "string", describe: "a note shown by llm-server list" })
      .option("json", { type: "boolean", default: false, describe: "print connection details as JSON" }),
  handler: async (args) => {
    if (
      [args.model !== undefined, args["all-models"] !== undefined, args.capability !== undefined].filter(Boolean)
        .length !== 1 ||
      (args["all-models"] !== undefined && args["all-models"] !== true) ||
      (args.capability !== undefined && typeof args.capability !== "string")
    )
      throw new Error("Specify exactly one of --model provider/model (repeatable), --all-models or --capability")
    if (
      args.model &&
      (!LLMServerScope.Models.safeParse(args.model).success || args.model.some((model) => model.includes("*")))
    )
      throw new Error("Specify 1–64 unique explicit models without wildcards")
    const expiry = { idleMs: duration(args.ttl, "1h"), maxAgeMs: duration(args["max-age"], "24h") }
    const target = await directory(args.directory)
    const run = async () => {
      const chosen = await (async () => {
        if (!args.capability) return undefined
        const matches = await LLMServerCapability.resolve(args.capability)
        if (!matches[0]) throw new Error(LLMServerCapability.explain(args.capability, await LLMServerCapability.all()))
        return {
          capability: args.capability,
          best: matches[0],
          alternatives: matches.slice(1).map((entry) => entry.ref),
        }
      })()
      const models = chosen ? [chosen.best.ref] : args.model
      if (!chosen && models) {
        const available = await LLMServerCapability.available(undefined, { type: "models", models })
        const missing = models.filter((model) => !available.some((entry) => entry.ref === model))
        if (missing.length) throw new Error(`Model is not available: ${missing.join(", ")}`)
      }
      const issued = await LLMServerTokens.issue({
        directory: target,
        ...(models ? { models } : { allModels: true }),
        expiry,
        label: args.label,
      })
      const address = (await LLMServerTokens.addresses(target))[0]
      const output = {
        api_key: issued.token,
        id: issued.record.id,
        base_url: address ? `${address.url}/v1` : null,
        expires_at: LLMServerTokens.expiresAt(issued.record),
        scope: issued.record.scope,
        ...(issued.record.scope.type === "models"
          ? {
              models: issued.record.scope.models,
              ...(issued.record.scope.models.length === 1 ? { model: issued.record.scope.models[0] } : {}),
            }
          : {}),
        ...(chosen
          ? {
              capability: chosen.capability,
              fallback: !chosen.best.dedicated,
              alternatives: chosen.alternatives.slice(0, 5),
              alternatives_total: chosen.alternatives.length,
            }
          : {}),
        renew_argv: invocation([
          "llm-server",
          "issue",
          "--directory",
          target,
          ...(issued.record.scope.type === "models"
            ? issued.record.scope.models.flatMap((model) => ["--model", model])
            : ["--all-models"]),
          "--ttl",
          `${expiry.idleMs}ms`,
          "--max-age",
          `${expiry.maxAgeMs}ms`,
          ...(args.label ? ["--label", args.label] : []),
          "--json",
        ]),
      }
      if (args.json) {
        process.stdout.write(JSON.stringify(output) + "\n")
        return
      }
      process.stdout.write(
        `token issued\n  api_key   ${output.api_key}\n  id        ${output.id}\n  base_url  ${output.base_url ?? "(no verified loopback listener for this directory)"}\n  expires   ${output.expires_at}\n  scope     ${issued.record.scope.type === "all" ? "all models" : issued.record.scope.models.join(", ")}\n`,
      )
      process.stdout.write("The plaintext token is shown once; only its hash is stored.\n")
      if (!address)
        process.stdout.write("Run mimo serve --llm-server from this project directory to start an explicit listener.\n")
    }
    // An explicit all grant does not enumerate models or need provider factories at issuance.
    if (args["all-models"]) return run()
    await Instance.provide({ directory: target, fn: run })
  },
})

const list = cmd({
  command: "list",
  describe: "list this directory's tokens and verified loopback listeners",
  builder: (yargs: Argv) => directoryOption(yargs).option("json", { type: "boolean", default: false }),
  handler: async (args) => {
    const target = await directory(args.directory)
    const [tokens, servers] = await Promise.all([LLMServerTokens.list(target), LLMServerTokens.addresses(target)])
    if (args.json) {
      process.stdout.write(JSON.stringify({ servers, server: servers[0] ?? null, tokens }) + "\n")
      return
    }
    process.stdout.write(
      servers.length
        ? servers.map((server) => `server    ${server.url} (pid ${server.pid})\n`).join("")
        : "server    none verified for this directory\n",
    )
    process.stdout.write(
      tokens.length
        ? tokens
            .map(
              (token) =>
                `${token.id}  ${token.expired ? "EXPIRED" : `expires ${token.expires_at}`}  ${token.scope.type === "all" ? "all models" : token.scope.models.join(",")}${token.label ? `  (${token.label})` : ""}\n`,
            )
            .join("")
        : "tokens    none\n",
    )
  },
})

const revoke = cmd({
  command: "revoke [id]",
  describe: "revoke one token by id or all tokens for this directory",
  builder: (yargs: Argv) =>
    directoryOption(yargs).positional("id", { type: "string" }).option("all", { type: "boolean", default: false }),
  handler: async (args) => {
    if (Boolean(args.id) === args.all) throw new Error("Specify one token id or --all")
    const target = await directory(args.directory)
    if (args.all) {
      process.stdout.write(`revoked ${await LLMServerTokens.revokeAll({ directory: target })} token(s)\n`)
      return
    }
    if (!(await LLMServerTokens.revoke({ directory: target, id: args.id! }))) throw new Error("No token with that id")
    process.stdout.write(`revoked ${args.id}\n`)
  },
})

export const LlmServerCommand = cmd({
  command: "llm-server",
  describe: "issue and manage directory-scoped temporary model credentials",
  builder: (yargs: Argv) => yargs.command(issue).command(list).command(revoke).demandCommand(1),
  handler: () => {},
})
