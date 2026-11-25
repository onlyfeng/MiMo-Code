// DC-RESOURCE-001: `fps` in the TUI config caps how often the TUI redraws. opentui runs
// animations (spinners, thinking indicators) at `targetFps` and throttles on-demand
// redraws, such as streaming output, by `maxFps`, so one value sets both. A plain
// terminal keeps its lower fixed rates unless `fps` is lower still.
export function frameRates(fps: number | undefined, plainTerminal: boolean) {
  if (plainTerminal) return { targetFps: Math.min(10, fps ?? 10), maxFps: Math.min(15, fps ?? 15) }
  return { targetFps: fps ?? 60, maxFps: fps ?? 60 }
}
