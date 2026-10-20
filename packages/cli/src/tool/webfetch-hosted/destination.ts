// Where a webfetch target lives, deciding whether a hosted fetch model may see
// it (DC-WEBFETCH-001). Unlike util/ssrf.ts (FC-010, owned by main and unused
// by compat WebFetch), this never throws and never blocks: it only routes. A
// private target stays on the direct fetch; a public or unresolvable one may
// also go to a gateway, because a host that cannot resolve public names is the
// environment hosted fetch exists for.
import { lookup } from "dns/promises"
import { isIP } from "net"

export type Destination = "private" | "public" | "unresolved"

export type Lookup = (hostname: string, options: { all: true }) => Promise<{ address: string; family: number }[]>

const LOCAL_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata.goog"])
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".svc", ".cluster.local"]

function ip4(address: string) {
  const parts = address.split(".").map(Number)
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : undefined
}

export function isPrivateIPv4(address: string): boolean {
  const parts = ip4(address)
  if (!parts) return false
  const [a, b] = parts
  return (
    a === 0 || // current network
    a === 10 || // private class A
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // shared address (CGN)
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) || // private class B
    (a === 192 && b === 168) // private class C
  )
}

export function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase()
  if (normalized === "::" || normalized === "::1") return true // unspecified, loopback
  if ((parseInt(normalized.split(":")[0] ?? "", 16) & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true // ULA
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  if (mapped) return isPrivateIPv4(mapped)
  const hexMapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hexMapped?.[1] && hexMapped[2]) {
    const hi = parseInt(hexMapped[1], 16)
    const lo = parseInt(hexMapped[2], 16)
    return isPrivateIPv4(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`)
  }
  return false
}

function isPrivateAddress(address: string, family: number) {
  return family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address)
}

/**
 * Classifies a URL's host. Literal private addresses, single-label and
 * local-suffix names, and names with any private DNS answer are `private`.
 * Names that resolve only to public addresses are `public`; names the resolver
 * cannot answer are `unresolved`.
 */
export async function classify(url: string, lookupImpl: Lookup = lookup): Promise<Destination> {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "")
  const family = isIP(hostname)
  if (family) return isPrivateAddress(hostname, family) ? "private" : "public"
  if (!hostname.includes(".")) return "private"
  if (LOCAL_HOSTNAMES.has(hostname) || LOCAL_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return "private"
  const resolved = await lookupImpl(hostname, { all: true }).catch(() => undefined)
  if (!resolved || resolved.length === 0) return "unresolved"
  return resolved.some((item) => isPrivateAddress(item.address, item.family)) ? "private" : "public"
}
