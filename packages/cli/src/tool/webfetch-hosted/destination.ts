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

/** Any IPv4 address that is not globally reachable unicast. */
export function isPrivateIPv4(address: string): boolean {
  const parts = ip4(address)
  if (!parts) return false
  const [a, b, c] = parts
  return (
    a === 0 || // current network
    a === 10 || // private class A
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // shared address (CGN)
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) || // private class B
    (a === 192 && b === 168) || // private class C
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol assignments, TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // deprecated 6to4 relay anycast
    (a === 198 && (b === 18 || b === 19)) || // benchmarking, also fake-IP DNS proxies
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reserved, broadcast
  )
}

/** The eight 16-bit groups of an IPv6 address, or undefined when it is malformed. */
function ip6(address: string): number[] | undefined {
  let text = address.toLowerCase().split("%")[0] ?? ""
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  if (dotted) {
    const parts = ip4(dotted)
    if (!parts) return undefined
    text = `${text.slice(0, -dotted.length)}${((parts[0] << 8) | parts[1]).toString(16)}:${((parts[2] << 8) | parts[3]).toString(16)}`
  }
  const halves = text.split("::")
  if (halves.length > 2) return undefined
  const groups = (part: string | undefined) => (part ? part.split(":").map((group) => parseInt(group, 16)) : [])
  const head = groups(halves[0])
  const tail = groups(halves[1])
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0
  if (fill < 0) return undefined
  const result = [...head, ...Array<number>(fill).fill(0), ...tail]
  return result.length === 8 && result.every((group) => Number.isInteger(group) && group >= 0 && group <= 0xffff)
    ? result
    : undefined
}

/** Any IPv6 address that is not globally reachable unicast; embedded IPv4 is judged as IPv4. */
export function isPrivateIPv6(address: string): boolean {
  const groups = ip6(address)
  if (!groups) return true
  const [a, b, c] = groups
  const embedded = () =>
    isPrivateIPv4(`${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`)
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) return embedded() // IPv4-mapped
  // NAT64: a DNS64 resolver answers public names with these.
  if (a === 0x64 && b === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) return embedded()
  if (a === 0x2002) return isPrivateIPv4(`${b >> 8}.${b & 0xff}.${c >> 8}.${c & 0xff}`) // 6to4
  if ((a & 0xe000) !== 0x2000) return true // outside global unicast 2000::/3
  // IETF protocol assignments 2001::/23 (Teredo, ORCHID, benchmarking; its few
  // anycast exceptions serve no pages) and documentation 2001:db8::/32.
  if (a === 0x2001 && (b < 0x0200 || b === 0x0db8)) return true
  return a === 0x3fff && (b & 0xf000) === 0 // documentation 3fff::/20
}

function isPrivateAddress(address: string, family: number) {
  return family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address)
}

/**
 * Classifies a URL's host. Literal private addresses, single-label and
 * local-suffix names, and names with any private DNS answer are `private`.
 * Names that resolve only to public addresses are `public`; names the resolver
 * cannot answer are `unresolved`, as are names it has not answered within
 * `timeout` ms: a stalled resolver is the same host as one without public DNS.
 * An unparseable URL is `private`, leaving it to the direct fetch to report as before.
 */
export async function classify(url: string, lookupImpl: Lookup = lookup, timeout?: number): Promise<Destination> {
  if (!URL.canParse(url)) return "private"
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "")
  const family = isIP(hostname)
  if (family) return isPrivateAddress(hostname, family) ? "private" : "public"
  if (!hostname.includes(".")) return "private"
  if (LOCAL_HOSTNAMES.has(hostname) || LOCAL_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return "private"
  // getaddrinfo cannot be cancelled; past the limit its answer is just ignored.
  const answer = lookupImpl(hostname, { all: true }).catch(() => undefined)
  let timer: ReturnType<typeof setTimeout> | undefined
  const resolved =
    timeout === undefined
      ? await answer
      : await Promise.race([
          answer,
          new Promise<undefined>((resolve) => {
            timer = setTimeout(() => resolve(undefined), timeout)
          }),
        ]).finally(() => clearTimeout(timer))
  if (!resolved || resolved.length === 0) return "unresolved"
  return resolved.some((item) => isPrivateAddress(item.address, item.family)) ? "private" : "public"
}
