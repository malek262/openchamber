import type { SessionMessageTarget } from "./session-message-loader"

/**
 * History holds for the session-tab working set.
 *
 * The tab strip is the user's explicit "keep these sessions at hand" list, so
 * switching between open tabs is expected to be instant. Without a hold, a
 * settled tab session idle-evicts its transcript after the retention grace
 * and the next click pays a full refetch and remount. The strip caps itself
 * at ten tabs, so the held set is bounded; protection ends when the tab
 * closes and the normal idle grace applies from that moment.
 *
 * Resolution is best-effort: a tab whose session has not reached the global
 * store yet is skipped and picked up by the next sync.
 */
export type TabSessionHistoryHolds = {
  /** Reconcile holds with the current tab list. */
  sync: (tabIds: readonly string[], directoryFor: (sessionID: string) => string | null) => void
  /** Release every remaining hold. */
  dispose: () => void
  /** Held-tab count, for tests and diagnostics. */
  readonly size: number
}

export const createTabSessionHistoryHolds = (
  retain: (target: SessionMessageTarget) => () => void,
): TabSessionHistoryHolds => {
  // A session belongs to one directory for its whole lifetime, so a hold
  // keyed by session id never needs directory re-resolution.
  const holds = new Map<string, () => void>()

  const sync: TabSessionHistoryHolds["sync"] = (tabIds, directoryFor) => {
    const wanted = new Set<string>()
    for (const sessionID of tabIds) {
      if (holds.has(sessionID)) {
        wanted.add(sessionID)
        continue
      }
      const directory = directoryFor(sessionID)
      if (!directory) continue
      wanted.add(sessionID)
      holds.set(sessionID, retain({ directory, sessionID }))
    }
    for (const [sessionID, release] of holds) {
      if (wanted.has(sessionID)) continue
      release()
      holds.delete(sessionID)
    }
  }

  const dispose = () => {
    for (const release of holds.values()) release()
    holds.clear()
  }

  return {
    sync,
    dispose,
    get size() {
      return holds.size
    },
  }
}
