// 메인이 가진 저장 상태를 렌더러에서 구독
import { useEffect, useState } from 'react'
import type { PersistedState } from '@shared/types'

let current: PersistedState | null = null
const subs = new Set<(s: PersistedState) => void>()
let started = false

function start(): void {
  if (started) return
  started = true
  void window.api.getState().then((s) => {
    current = s
    for (const f of subs) f(s)
  })
  window.api.onStateChanged((s) => {
    current = s
    for (const f of subs) f(s)
  })
}

export function getPersisted(): PersistedState | null {
  return current
}

export function usePersisted(): PersistedState | null {
  start()
  const [s, set] = useState<PersistedState | null>(current)
  useEffect(() => {
    subs.add(set)
    if (current) set(current)
    return () => {
      subs.delete(set)
    }
  }, [])
  return s
}

/** 1분마다 다시 그려서 자정이 지나면 '오늘'이 바뀌게 */
export function useMinute(): number {
  const [m, set] = useState(() => Math.floor(Date.now() / 60000))
  useEffect(() => {
    const t = setInterval(() => set(Math.floor(Date.now() / 60000)), 15_000)
    return () => clearInterval(t)
  }, [])
  return m
}
