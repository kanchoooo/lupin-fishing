// 스티커 메모: 화면에 붙여 두는 작은 메모 창들 + 앱 안 휴지통. 저장은 userData/memos.json
import { app, BrowserWindow, ipcMain, Notification, screen, shell } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { MEMO_COLORS } from '@shared/memo'
import type { Memo, MemoColor, MemoState } from '@shared/types'
import { env, isHeadless, loadRenderer, preloadPath } from './env'

const DEFAULT_BOSS = '오늘 할 일\n· 주간 보고서 정리\n· 3시 팀 회의 자료\n· 견적서 회신하기\n· 법인카드 영수증 제출'
const W = 240
const H = 220
const MAX_TEXT = 20_000

const isColor = (c: unknown): c is MemoColor => typeof c === 'string' && c in MEMO_COLORS
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)

export class Memos {
  private file: string
  private timer: NodeJS.Timeout | null = null
  private notifyTimer: NodeJS.Timeout | null = null
  private wins = new Map<string, BrowserWindow>()
  private quitting = false
  private toldTrash = false
  state: MemoState

  constructor(private onChange: (s: MemoState) => void) {
    this.file = join(app.getPath('userData'), 'memos.json')
    this.state = this.load()
  }

  private load(): MemoState {
    try {
      if (!existsSync(this.file)) return { memos: [], boss: DEFAULT_BOSS }
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<MemoState>
      const memos = (Array.isArray(raw.memos) ? raw.memos : [])
        .filter((m): m is Memo => !!m && typeof m.id === 'string' && typeof m.text === 'string')
        .map((m) => ({
          ...m,
          color: isColor(m.color) ? m.color : 'yellow',
          x: num(m.x, 100),
          y: num(m.y, 100),
          w: Math.max(180, num(m.w, W)),
          h: Math.max(130, num(m.h, H)),
          pinned: !!m.pinned,
          createdAt: num(m.createdAt, Date.now()),
          updatedAt: num(m.updatedAt, Date.now())
        }))
      return { memos, boss: typeof raw.boss === 'string' ? raw.boss : DEFAULT_BOSS }
    } catch (err) {
      console.error('[memos] load failed', err)
      return { memos: [], boss: DEFAULT_BOSS }
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
      console.error('[memos] save failed', err)
    }
  }

  private saveSoon(): void {
    if (!this.timer) this.timer = setTimeout(() => this.saveNow(), 500)
  }

  flush(): void {
    this.quitting = true
    if (this.timer) this.saveNow()
  }

  /** 글자를 칠 때마다 패널에 알리지 않고 모아서 */
  private changed(now = false): void {
    if (now) {
      if (this.notifyTimer) clearTimeout(this.notifyTimer)
      this.notifyTimer = null
      this.onChange(this.state)
      return
    }
    if (!this.notifyTimer)
      this.notifyTimer = setTimeout(() => {
        this.notifyTimer = null
        this.onChange(this.state)
      }, 400)
  }

  private update(id: string, f: (m: Memo) => Memo | null, save: 'now' | 'soon' = 'now'): Memo | null {
    let out: Memo | null = null
    const memos: Memo[] = []
    for (const m of this.state.memos) {
      if (m.id !== id) {
        memos.push(m)
        continue
      }
      out = f(m)
      if (out) memos.push(out)
    }
    this.state = { ...this.state, memos }
    if (save === 'now') {
      this.saveNow()
      this.changed(true)
    } else {
      this.saveSoon()
      this.changed()
    }
    return out
  }

  get(id: string): Memo | null {
    return this.state.memos.find((m) => m.id === id) ?? null
  }

  // ───────── 창 ─────────

  private placeNew(): { x: number; y: number } {
    // 마우스가 있는 모니터에, 마우스 근처 (여러 개 만들면 계단식으로)
    const c = screen.getCursorScreenPoint()
    const a = screen.getDisplayNearestPoint(c).workArea
    let x = c.x - 40
    let y = c.y - 24
    const taken = (px: number, py: number): boolean => this.state.memos.some((m) => !m.deletedAt && !m.hidden && Math.abs(m.x - px) < 12 && Math.abs(m.y - py) < 12)
    for (let i = 0; i < 12 && taken(x, y); i++) {
      x += 24
      y += 24
    }
    return { x: Math.round(Math.max(a.x, Math.min(a.x + a.width - W, x))), y: Math.round(Math.max(a.y, Math.min(a.y + a.height - H, y))) }
  }

  private fit(m: Memo): { x: number; y: number; width: number; height: number } {
    const d = screen.getDisplayMatching({ x: m.x, y: m.y, width: m.w, height: m.h }).workArea
    const width = Math.min(m.w, d.width)
    const height = Math.min(m.h, d.height)
    return {
      x: Math.round(Math.max(d.x, Math.min(d.x + d.width - width, m.x))),
      y: Math.round(Math.max(d.y, Math.min(d.y + d.height - height, m.y))),
      width,
      height
    }
  }

  private open(m: Memo, focus: boolean): void {
    const had = this.wins.get(m.id)
    if (had && !had.isDestroyed()) {
      if (focus) this.focusWin(had)
      else had.showInactive()
      return
    }
    const headless = isHeadless()
    const win = new BrowserWindow({
      ...this.fit(m),
      minWidth: 180,
      minHeight: 130,
      frame: false,
      resizable: true,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      acceptFirstMouse: true,
      show: false,
      title: '메모',
      backgroundColor: MEMO_COLORS[m.color].bg,
      webPreferences: { preload: preloadPath(), sandbox: true, contextIsolation: true, offscreen: headless }
    })
    if (m.pinned) win.setAlwaysOnTop(true, 'floating')
    win.once('ready-to-show', () => {
      if (headless) return
      if (focus) this.focusWin(win)
      else win.showInactive()
    })
    const saveBounds = (): void => {
      if (win.isDestroyed()) return
      const b = win.getBounds()
      this.update(m.id, (x) => ({ ...x, x: b.x, y: b.y, w: b.width, h: b.height }), 'soon')
    }
    win.on('moved', saveBounds)
    win.on('resized', saveBounds)
    win.on('closed', () => {
      this.wins.delete(m.id)
      // Cmd+W 등으로 닫으면 '치움' (휴지통은 아님)
      if (!this.quitting) {
        const cur = this.get(m.id)
        if (cur && !cur.deletedAt && !cur.hidden) this.update(m.id, (x) => ({ ...x, hidden: true }))
      }
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })
    win.webContents.on('console-message', (e) => {
      if (env.LUPIN_LOG === '1') console.log(`[memo:${e.level}] ${e.message}`)
    })
    loadRenderer(win, 'memo', m.id)
    this.wins.set(m.id, win)
  }

  private focusWin(win: BrowserWindow): void {
    // 맥: 메뉴 막대 앱이라 먼저 앱을 앞으로 데려와야 바로 글을 쓸 수 있다
    if (process.platform === 'darwin') app.focus({ steal: true })
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  private closeWin(id: string): void {
    const w = this.wins.get(id)
    this.wins.delete(id)
    if (w && !w.isDestroyed()) w.destroy()
  }

  /** 시작할 때: 치우지 않은 메모를 다시 붙인다 (포커스는 안 뺏음) */
  openAll(): void {
    for (const m of this.state.memos) if (!m.deletedAt && !m.hidden) this.open(m, false)
  }

  // ───────── 동작 ─────────

  create(): Memo {
    const now = Date.now()
    const m: Memo = { id: randomBytes(6).toString('hex'), text: '', color: 'yellow', ...this.placeNew(), w: W, h: H, pinned: false, createdAt: now, updatedAt: now }
    this.state = { ...this.state, memos: [...this.state.memos, m] }
    this.saveNow()
    this.changed(true)
    this.open(m, true)
    return m
  }

  setText(id: string, text: string): void {
    if (typeof text !== 'string') return
    this.update(id, (m) => ({ ...m, text: text.slice(0, MAX_TEXT), updatedAt: Date.now() }), 'soon')
  }

  patch(id: string, p: Partial<Pick<Memo, 'color' | 'pinned'>>): void {
    const m = this.update(id, (x) => ({ ...x, ...(isColor(p.color) ? { color: p.color } : {}), ...(typeof p.pinned === 'boolean' ? { pinned: p.pinned } : {}) }))
    const w = this.wins.get(id)
    if (!m || !w || w.isDestroyed()) return
    w.setBackgroundColor(MEMO_COLORS[m.color].bg)
    w.setAlwaysOnTop(m.pinned, 'floating')
  }

  hide(id: string): void {
    this.update(id, (m) => ({ ...m, hidden: true }))
    this.closeWin(id)
  }

  /** 지우기 → 휴지통 (빈 메모는 그냥 없앤다) */
  trash(id: string): void {
    const m = this.get(id)
    if (!m) return
    this.closeWin(id)
    if (!m.text.trim()) {
      this.update(id, () => null)
      return
    }
    this.update(id, (x) => ({ ...x, deletedAt: Date.now() }))
    if (!this.toldTrash && Notification.isSupported() && !isHeadless()) {
      this.toldTrash = true
      new Notification({ title: '메모를 휴지통에 넣었어요', body: '패널의 메모 탭 → 휴지통에서 다시 꺼낼 수 있어요.', silent: true }).show()
    }
  }

  restore(id: string): void {
    const m = this.update(id, (x) => {
      const { deletedAt: _d, hidden: _h, ...rest } = x
      void _d
      void _h
      return { ...rest, updatedAt: Date.now() }
    })
    if (m) this.open(m, true)
  }

  purge(id: string): void {
    this.closeWin(id)
    this.update(id, () => null)
  }

  emptyTrash(): void {
    this.state = { ...this.state, memos: this.state.memos.filter((m) => !m.deletedAt) }
    this.saveNow()
    this.changed(true)
  }

  focus(id: string): void {
    const m = this.update(id, (x) => (x.hidden ? { ...x, hidden: false } : x))
    if (m && !m.deletedAt) this.open(m, true)
  }

  showAll(): void {
    const list = this.state.memos.filter((m) => !m.deletedAt)
    if (!list.length) {
      this.create()
      return
    }
    this.state = { ...this.state, memos: this.state.memos.map((m) => (m.hidden && !m.deletedAt ? { ...m, hidden: false } : m)) }
    this.saveNow()
    this.changed(true)
    list.forEach((m, i) => this.open(m, i === list.length - 1))
    // 이미 열려 있던 창도 앞으로
    for (const w of this.wins.values()) if (!w.isDestroyed()) w.moveTop()
  }

  setBoss(text: string): void {
    if (typeof text !== 'string') return
    this.state = { ...this.state, boss: text.slice(0, MAX_TEXT) }
    this.saveSoon()
  }

  get activeCount(): number {
    return this.state.memos.filter((m) => !m.deletedAt).length
  }

  registerIpc(): void {
    ipcMain.handle('memo:state', () => this.state)
    ipcMain.handle('memo:get', (_e, id: string) => this.get(id))
    ipcMain.handle('memo:new', () => void this.create())
    ipcMain.on('memo:text', (_e, id: string, text: string) => this.setText(id, text))
    ipcMain.handle('memo:patch', (_e, id: string, p: Partial<Pick<Memo, 'color' | 'pinned'>>) => this.patch(id, p ?? {}))
    ipcMain.handle('memo:hide', (_e, id: string) => this.hide(id))
    ipcMain.handle('memo:trash', (_e, id: string) => this.trash(id))
    ipcMain.handle('memo:restore', (_e, id: string) => this.restore(id))
    ipcMain.handle('memo:purge', (_e, id: string) => this.purge(id))
    ipcMain.handle('memo:emptyTrash', () => this.emptyTrash())
    ipcMain.handle('memo:focus', (_e, id: string) => this.focus(id))
    ipcMain.handle('memo:showAll', () => this.showAll())
    ipcMain.on('memo:boss', (_e, text: string) => this.setBoss(text))
  }
}
