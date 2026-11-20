// GPT-6.2's cacheable prefix starts in Responses input. Top-level instructions are billed each turn.
export function prefersDeveloperPrefix(apiID: string) {
  return /^gpt-6\.2-(?:sol|astra)(?:-|$)/.test(apiID)
}
