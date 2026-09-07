import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "../../flag/flag"
import { Log } from "../../util"
import { Instance } from "../../project/instance"

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) =>
    withNetworkOptions(yargs)
      .option("llm-server", {
        type: "boolean",
        default: false,
        describe: "enable the model API with directory-scoped temporary tokens",
      })
      .option("audio-api", {
        type: "boolean",
        default: false,
        describe: "enable authenticated speech and transcription endpoints (requires MIMOCODE_AUDIO_API_KEY)",
      }),
  describe: "starts a headless mimocode server",
  handler: async (args) => {
    if (args["audio-api"] && args["llm-server"]) throw new Error("audio-api and llm-server are mutually exclusive")
    const opts = await resolveNetworkOptions(args)
    const isLoopback = opts.hostname === "127.0.0.1" || opts.hostname === "localhost" || opts.hostname === "::1"

    if (!isLoopback && !Flag.MIMOCODE_SERVER_PASSWORD && !opts.noAuth) {
      console.error("ERROR: Binding to non-loopback address without MIMOCODE_SERVER_PASSWORD is not allowed.")
      console.error("Set MIMOCODE_SERVER_PASSWORD or pass --no-auth to override (DANGEROUS).")
      await Log.exit(1)
    }

    if (!Flag.MIMOCODE_SERVER_PASSWORD) {
      console.log("Warning: MIMOCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }

    const server = await Server.listen({
      ...opts,
      llm: args["llm-server"] ? { directory: process.cwd() } : undefined,
      audio: args["audio-api"]
        ? { key: process.env.MIMOCODE_AUDIO_API_KEY ?? "", directory: process.cwd() }
        : undefined,
    })
    console.log(`mimocode server listening on http://${server.hostname}:${server.port}`)

    if (args["llm-server"]) console.log("Model API enabled at /v1 (temporary Bearer token required)")
    if (args["audio-api"]) console.log("Audio API enabled at /v1/audio (Bearer authentication required)")
    await new Promise<void>((resolve) => {
      const stop = () => {
        process.off("SIGINT", stop)
        process.off("SIGTERM", stop)
        resolve()
      }
      process.once("SIGINT", stop)
      process.once("SIGTERM", stop)
    })
    await server.stop(true)
    await Instance.disposeAll()
  },
})
