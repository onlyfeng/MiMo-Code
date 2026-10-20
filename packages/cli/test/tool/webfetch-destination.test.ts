import { describe, expect, test } from "bun:test"
import * as Destination from "../../src/tool/webfetch-hosted/destination"

const answer = (...items: Array<[string, number]>): Destination.Lookup =>
  async () => items.map(([address, family]) => ({ address, family }))
const failing: Destination.Lookup = async () => {
  throw new Error("ENOTFOUND")
}

describe("webfetch.destination", () => {
  test.each([
    "http://127.0.0.1:8080/",
    "http://127.9.9.9/",
    "http://[::1]/",
    "http://10.0.0.1/",
    "http://172.16.13.77/internal",
    "http://192.168.1.1/wiki",
    "http://169.254.169.254/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:192.168.1.1]/",
    // Not globally reachable: benchmarking, documentation, IETF, multicast, reserved, broadcast.
    "http://198.18.0.1/",
    "http://198.19.255.254/",
    "http://192.0.0.8/",
    "http://192.0.2.10/",
    "http://198.51.100.7/",
    "http://203.0.113.5/",
    "http://224.0.0.1/",
    "http://240.0.0.1/",
    "http://255.255.255.255/",
    "http://[ff02::1]/",
    "http://[2001:db8::1]/",
  ])("literal private address %s stays private", async (url) => {
    expect(await Destination.classify(url, failing)).toBe("private")
  })

  test.each(["http://8.8.8.8/", "http://[2606:4700::1111]/", "http://198.20.0.1/", "http://192.0.3.1/", "http://223.1.1.1/"])("literal public address %s", async (url) => {
    expect(await Destination.classify(url, failing)).toBe("public")
  })

  test.each([
    "http://localhost:3000/",
    "http://wiki/",
    "http://api.localhost/",
    "http://printer.local/",
    "http://svc.default.svc/",
    "http://metadata.google.internal/",
  ])("local name %s stays private without a lookup", async (url) => {
    let looked = false
    const lookup: Destination.Lookup = async () => {
      looked = true
      return []
    }
    expect(await Destination.classify(url, lookup)).toBe("private")
    expect(looked).toBe(false)
  })

  test("a name with any private answer is private", async () => {
    expect(await Destination.classify("https://wiki.example.com/", answer(["10.1.2.3", 4]))).toBe("private")
    expect(
      await Destination.classify("https://mixed.example.com/", answer(["93.184.215.14", 4], ["192.168.0.9", 4])),
    ).toBe("private")
  })

  test("a name with only public answers is public", async () => {
    expect(await Destination.classify("https://example.com/", answer(["93.184.215.14", 4]))).toBe("public")
  })

  test("a name the resolver cannot answer is unresolved, never thrown", async () => {
    expect(await Destination.classify("https://example.com/", failing)).toBe("unresolved")
    expect(await Destination.classify("https://example.com/", answer())).toBe("unresolved")
  })

  test("a lookup slower than the time limit is unresolved", async () => {
    const slow: Destination.Lookup = async () => {
      await Bun.sleep(300)
      return [{ address: "10.1.2.3", family: 4 }]
    }
    expect(await Destination.classify("https://wiki.example.com/", slow, 20)).toBe("unresolved")
    expect(await Destination.classify("https://wiki.example.com/", slow, 2000)).toBe("private")
  })

  test("an unparseable URL stays on the direct fetch, never thrown", async () => {
    expect(await Destination.classify("https://exa mple.com/", failing)).toBe("private")
  })
})
