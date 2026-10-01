import { fingerprint } from "./tool-schema-helper"

export type Case = {
  id: string
  prompt: string
  files: Record<string, string>
  expected: { answer: string | null; requiredReads: string[] }
  calls: { name: string; input: Record<string, unknown> }[]
}

export function cases(seed: string): Case[] {
  const value = (id: string) => fingerprint([seed, id]).slice(0, 16)
  return [
    {
      id: "glob-read",
      prompt: 'Find target.txt under case1 using glob, then read its answer. Return JSON {"answer":"value"}.',
      files: { "case1/nested/target.txt": `answer=${value("1")}\n`, "case1/nested/other.txt": "irrelevant\n" },
      expected: { answer: value("1"), requiredReads: ["case1/nested/target.txt"] },
      calls: [
        { name: "glob", input: { pattern: "case1/**/target.txt" } },
        { name: "read", input: { file_path: "case1/nested/target.txt" } },
      ],
    },
    {
      id: "grep-read",
      prompt:
        "Search case2 for regex TARGET_[0-9]+, then read the matching file. Return JSON containing its answer value.",
      files: { "case2/module.ts": `// TARGET_327\n// answer=${value("2")}\n`, "case2/other.ts": "// TARGET_none\n" },
      expected: { answer: value("2"), requiredReads: ["case2/module.ts"] },
      calls: [
        { name: "grep", input: { pattern: "TARGET_[0-9]+", path: "case2" } },
        { name: "read", input: { file_path: "case2/module.ts" } },
      ],
    },
    {
      id: "read-window",
      prompt:
        "Read line 2051 of case3/lines.txt using a bounded one-line window. Return JSON containing that line's answer value.",
      files: {
        "case3/lines.txt": [
          ...Array.from({ length: 2050 }, (_, i) => `line ${i + 1}`),
          `answer=${value("3")}`,
          "end",
        ].join("\n"),
      },
      expected: { answer: value("3"), requiredReads: ["case3/lines.txt"] },
      calls: [{ name: "read", input: { file_path: "case3/lines.txt", offset: 2051, limit: 1 } }],
    },
    {
      id: "grep-include",
      prompt:
        "Find ANSWER_VALUE in case4, restricting filenames to *.tsx. Read the matching file and return JSON containing its answer value.",
      files: {
        "case4/ui.tsx": `// ANSWER_VALUE answer=${value("4")}\n`,
        "case4/decoy.txt": "ANSWER_VALUE answer=wrong\n",
      },
      expected: { answer: value("4"), requiredReads: ["case4/ui.tsx"] },
      calls: [
        { name: "grep", input: { pattern: "ANSWER_VALUE", path: "case4", include: "*.tsx" } },
        { name: "read", input: { file_path: "case4/ui.tsx" } },
      ],
    },
    {
      id: "read-chain",
      prompt:
        "Read case5/manifest.txt. It names a second file containing the answer. Read that file and return JSON containing its answer value.",
      files: { "case5/manifest.txt": "case5/value.txt\n", "case5/value.txt": `answer=${value("5")}\n` },
      expected: { answer: value("5"), requiredReads: ["case5/manifest.txt", "case5/value.txt"] },
      calls: [
        { name: "read", input: { file_path: "case5/manifest.txt" } },
        { name: "read", input: { file_path: "case5/value.txt" } },
      ],
    },
    {
      id: "absent-entry",
      prompt:
        'Inspect case6/index.txt for an entry named missing. If absent return exactly {"answer":null}; otherwise return its answer value.',
      files: { "case6/index.txt": "present: not-requested\n" },
      expected: { answer: null, requiredReads: ["case6/index.txt"] },
      calls: [{ name: "read", input: { file_path: "case6/index.txt" } }],
    },
  ]
}
