import { app } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { dayKey, rankOf, timeTag } from '@shared/day'
import { FISH_BY_ID, hotFishOf, priceOf } from '@shared/fish'
import { defaultKeys } from '@shared/keys'
import type { CatchInput, CatchResult, DayRecord, PersistedState, Settings } from '@shared/types'
import { MIN_WAGE_2026 } from '@shared/day'

type Listener = (s: PersistedState) => void

export function defaultSettings(): Settings {
  return {
    mode: 'manual',
    ...defaultKeys(process.platform),
    globalKeys: true,
    mouseClick: true,
    scale: 2,
    spot: 0.6,
    alwaysOnTop: true,
    sound: true,
    volume: 0.6,
    openAtLogin: false,
    hourlyWage: MIN_WAGE_2026
  }
}

function fresh(): PersistedState {
  return {
    settings: defaultSettings(),
    dex: {},
    total: { earn: 0, count: 0, casts: 0, escapes: 0 },
    days: {},
    recent: [],
    widgetPos: null,
    onboarded: false
  }
}

const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** userData/state.json 에 저장되는 작은 JSON 저장소 */
export class Store {
  private file: string
  private listeners = new Set<Listener>()
  private timer: NodeJS.Timeout | null = null
  state: PersistedState

  constructor() {
    this.file = join(app.getPath('userData'), 'state.json')
    this.state = this.load()
  }

  private load(): PersistedState {
    const f = fresh()
    try {
      if (!existsSync(this.file)) return f
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<PersistedState>
      return {
        settings: clampSettings({ ...f.settings, ...(raw.settings ?? {}) }),
        dex: raw.dex && typeof raw.dex === 'object' ? raw.dex : {},
        total: { ...f.total, ...(raw.total ?? {}) },
        days: raw.days && typeof raw.days === 'object' ? raw.days : {},
        recent: Array.isArray(raw.recent) ? raw.recent.slice(0, 60) : [],
        widgetPos: raw.widgetPos && Number.isFinite(raw.widgetPos.x) && Number.isFinite(raw.widgetPos.y) ? raw.widgetPos : null,
        onboarded: !!raw.onboarded
      }
    } catch (err) {
      console.error('[store] load failed, starting fresh', err)
      return f
    }
  }

  private saveNow(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      const tmp = this.file + '.tmp'
      writeFileSync(tmp, JSON.stringify(this.state))
      renameSync(tmp, this.file)
    } catch (err) {
      console.error('[store] save failed', err)
    }
  }

  /** 창 위치처럼 자주 바뀌는 값은 모아서 저장 */
  private saveSoon(): void {
    if (this.timer) return
    this.timer = setTimeout(() => this.saveNow(), 800)
  }

  flush(): void {
    if (this.timer) this.saveNow()
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private commit(next: PersistedState, quiet = false): PersistedState {
    this.state = next
    if (quiet) {
      this.saveSoon()
      return next
    }
    this.saveNow()
    for (const l of this.listeners) l(next)
    return next
  }

  setSettings(patch: Partial<Settings>): PersistedState {
    return this.commit({ ...this.state, settings: clampSettings({ ...this.state.settings, ...patch }) })
  }

  setOnboarded(): void {
    if (!this.state.onboarded) this.commit({ ...this.state, onboarded: true })
  }

  setWidgetPos(x: number, y: number): void {
    this.commit({ ...this.state, widgetPos: { x: Math.round(x), y: Math.round(y) } }, true)
  }

  private today(): [string, DayRecord] {
    const k = dayKey()
    return [k, this.state.days[k] ?? { earn: 0, count: 0, casts: 0 }]
  }

  recordCast(): void {
    const [k, d] = this.today()
    this.commit({
      ...this.state,
      total: { ...this.state.total, casts: this.state.total.casts + 1 },
      days: { ...this.state.days, [k]: { ...d, casts: d.casts + 1 } }
    })
  }

  recordEscape(): void {
    this.commit({ ...this.state, total: { ...this.state.total, escapes: this.state.total.escapes + 1 } }, true)
  }

  recordCatch(c: CatchInput): CatchResult | null {
    const def = FISH_BY_ID[c.fish]
    if (!def) return null
    const size = Math.max(def.min, Math.min(def.max, num(c.size, def.min)))
    const now = Date.now()
    const [k, d] = this.today()
    const hot = hotFishOf(k).id === def.id
    const price = priceOf(def, size, { hot, perfect: !!c.perfect })
    const tag = timeTag(now)
    const record = {
      id: randomBytes(6).toString('hex'),
      fish: def.id,
      size,
      price,
      at: now,
      auto: !!c.auto,
      tag,
      ...(hot ? { hot: true } : {}),
      ...(c.perfect ? { perfect: true } : {})
    }
    const prev = this.state.dex[def.id]
    const isNew = !prev
    const isRecord = !!prev && !def.junk && size > prev.bestSize
    const dex = {
      ...this.state.dex,
      [def.id]: prev
        ? { ...prev, count: prev.count + 1, bestSize: Math.max(prev.bestSize, size), bestPrice: Math.max(prev.bestPrice, price), lastAt: now }
        : { count: 1, bestSize: size, bestPrice: price, firstAt: now, lastAt: now, firstTag: tag }
    }
    const day: DayRecord = {
      ...d,
      earn: d.earn + price,
      count: d.count + 1,
      best: !d.best || price > d.best.price ? { fish: def.id, size, price } : d.best
    }
    const before = rankOf(this.state.total.earn).index
    const total = { ...this.state.total, earn: this.state.total.earn + price, count: this.state.total.count + 1 }
    const after = rankOf(total.earn)
    this.commit({ ...this.state, dex, total, days: { ...this.state.days, [k]: day }, recent: [record, ...this.state.recent].slice(0, 60) })
    return { record, isNew, isRecord, dayEarn: day.earn, rankUp: after.index > before ? after.rank.name : null }
  }

  resetAll(): void {
    const f = fresh()
    this.commit({ ...f, settings: this.state.settings, widgetPos: this.state.widgetPos, onboarded: true })
  }
}

function clampSettings(s: Settings): Settings {
  return {
    ...s,
    mode: s.mode === 'auto' ? 'auto' : 'manual',
    reelKey: typeof s.reelKey === 'string' && s.reelKey.length < 40 ? s.reelKey : null,
    bossKey: typeof s.bossKey === 'string' && s.bossKey.length < 40 ? s.bossKey : null,
    scale: [1, 2, 3].includes(s.scale) ? s.scale : 2,
    spot: Math.max(0, Math.min(1, num(s.spot, 0.6))),
    volume: Math.max(0, Math.min(1, num(s.volume, 0.6))),
    hourlyWage: Math.max(0, Math.min(10_000_000, Math.round(num(s.hourlyWage, MIN_WAGE_2026))))
  }
}
