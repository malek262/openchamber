import { describe, expect, test } from "bun:test"

import type { SessionMessageTarget } from "./session-message-loader"
import { createTabSessionHistoryHolds } from "./tabSessionHistoryHolds"

const makeRetainer = () => {
  const held = new Map<string, number>()
  const retain = (target: SessionMessageTarget) => {
    const key = `${target.directory}::${target.sessionID}`
    held.set(key, (held.get(key) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      held.set(key, (held.get(key) ?? 1) - 1)
    }
  }
  const heldCount = (directory: string, sessionID: string) => held.get(`${directory}::${sessionID}`) ?? 0
  return { retain, heldCount }
}

describe("createTabSessionHistoryHolds", () => {
  test("holds every resolvable tab session", () => {
    const { retain, heldCount } = makeRetainer()
    const holds = createTabSessionHistoryHolds(retain)
    const directoryFor = (id: string) => `/repo/${id}`

    holds.sync(["a", "b"], directoryFor)

    expect(holds.size).toBe(2)
    expect(heldCount("/repo/a", "a")).toBe(1)
    expect(heldCount("/repo/b", "b")).toBe(1)
    holds.dispose()
  })

  test("skips a tab whose session is unknown and picks it up once resolvable", () => {
    const { retain, heldCount } = makeRetainer()
    const holds = createTabSessionHistoryHolds(retain)
    let resolved = false

    holds.sync(["a"], () => (resolved ? "/repo" : null))
    expect(holds.size).toBe(0)

    resolved = true
    holds.sync(["a"], () => (resolved ? "/repo" : null))
    expect(holds.size).toBe(1)
    expect(heldCount("/repo", "a")).toBe(1)
    holds.dispose()
  })

  test("re-syncing the same tabs never doubles a hold", () => {
    const { retain, heldCount } = makeRetainer()
    const holds = createTabSessionHistoryHolds(retain)
    const directoryFor = () => "/repo"

    holds.sync(["a", "b"], directoryFor)
    holds.sync(["a", "b"], directoryFor)

    expect(holds.size).toBe(2)
    expect(heldCount("/repo", "a")).toBe(1)
    holds.dispose()
  })

  test("closing a tab releases its hold", () => {
    const { retain, heldCount } = makeRetainer()
    const holds = createTabSessionHistoryHolds(retain)
    const directoryFor = () => "/repo"

    holds.sync(["a", "b"], directoryFor)
    holds.sync(["b"], directoryFor)

    expect(holds.size).toBe(1)
    expect(heldCount("/repo", "a")).toBe(0)
    expect(heldCount("/repo", "b")).toBe(1)
    holds.dispose()
  })

  test("dispose releases everything", () => {
    const { retain, heldCount } = makeRetainer()
    const holds = createTabSessionHistoryHolds(retain)

    holds.sync(["a", "b"], () => "/repo")
    holds.dispose()

    expect(holds.size).toBe(0)
    expect(heldCount("/repo", "a")).toBe(0)
    expect(heldCount("/repo", "b")).toBe(0)
  })
})
