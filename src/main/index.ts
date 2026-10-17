import { app, BrowserWindow, clipboard, ClipboardItem, dialog, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { dayKey, fmtWon } from '@shared/day'
import { globalCapable, MODIFIER_KEYS, MOUSE_KEYS } from '@shared/keys'
import type { CatchInput, PanelTab, PersistedState, Settings } from '@shared/types'
import { BAR_H, INSTAGRAM_URL, MORE_APPS_URL, SCENE_H, SCENE_W } from '@shared/types'
import { env, isHeadless, loadRenderer, preloadPath } from './env'
import { trayIcon } from './icons'
import { createKeyReader, macAccess, requestMacAccess, type KeyReader } from './keys'
import { Store } from './store'
import { checkNow, setupUpdater } from './updater'

if (process.platform === 'win32') app.setAppUserModelId('com.lupinfishing.app')
const headless = isHeadless()
const isMac = process.platform === 'darwin'
// 테스트는 실제 기록과 섞이지 않게 따로 저장
if (env.LUPIN_USERDATA) app.setPath('userData', env.LUPIN_USERDATA)
else if (headless) app.setPath('userData', join(app.getPath('temp'), 'lupin-fishing-test'))
const labMode = env.LUPIN_LAB

// 한 번만 실행 (테스트 모드는 예외)
if (!headless && !labMode && !app.requestSingleInstanceLock()) app.quit()

let widget: BrowserWindow | null = null
let panel: BrowserWindow | null = null
let tray: Tray | null = null
let store: Store
let quitting = false
let disguised = false
let status = ''
let toldAboutTray = false
const startHidden = process.argv.includes('--hidden') || (isMac && app.getLoginItemSettings().wasOpenedAtLogin)

const sizeOf = (s: Settings): { width: number; height: number } => ({ width: SCENE_W * s.scale, height: (SCENE_H + BAR_H) * s.scale })

// ───────── 낚시터 창 (항상 위에 떠 있는 작은 창) ─────────

/** 화면 밖으로 나가지 않게 (모니터를 빼거나 해상도가 바뀌어도) */
function clampToScreen(x: number, y: number, w: number, h: number): { x: number; y: number } {
  const d = screen.getDisplayMatching({ x, y, width: w, height: h }).workArea
  return {
    x: Math.round(Math.max(d.x, Math.min(d.x + d.width - w, x))),
    y: Math.round(Math.max(d.y, Math.min(d.y + d.height - h, y)))
  }
}

function initialPos(w: number, h: number): { x: number; y: number } {
  const p = store.state.widgetPos
  if (p) return clampToScreen(p.x, p.y, w, h)
  // 처음: 주 모니터 오른쪽 아래
  const a = screen.getPrimaryDisplay().workArea
  return { x: a.x + a.width - w - 24, y: a.y + a.height - h - 24 }
}

function applyOnTop(win: BrowserWindow): void {
  const on = store.state.settings.alwaysOnTop
  win.setAlwaysOnTop(on, 'floating')
  if (isMac) win.setVisibleOnAllWorkspaces(on, { visibleOnFullScreen: on, skipTransformProcessType: true })
}

function createWidget(): void {
  const { width, height } = sizeOf(store.state.settings)
  const pos = headless ? { x: 0, y: 0 } : initialPos(width, height)
  const win = new BrowserWindow({
    width,
    height,
    ...pos,
    useContentSize: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    // 작업 표시줄에는 안 보이고 트레이에서 다시 연다
    skipTaskbar: true,
    hasShadow: true,
    // 맥: 다른 앱을 쓰다가 눌러도 첫 클릭부터 낚시가 되게
    acceptFirstMouse: true,
    show: false,
    title: '월급루팡 낚시터',
    backgroundColor: '#000000',
    webPreferences: {
      preload: preloadPath(),
      sandbox: true,
      contextIsolation: true,
      // 다른 창을 쓰는 동안에도 찌·물고기가 멈추지 않게
      backgroundThrottling: false,
      offscreen: headless
    }
  })
  applyOnTop(win)
  win.once('ready-to-show', () => {
    // 로그인 시 자동 실행이어도 낚시터는 띄운다 (출근 = 낚시 시작). 패널만 안 연다
    if (!headless) win.showInactive()
  })
  win.on('moved', () => {
    const [x, y] = win.getPosition()
    store.setWidgetPos(x, y)
  })
  win.on('show', updatePolling)
  win.on('hide', updatePolling)
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    hideWidget()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('console-message', (e) => {
    if (env.LUPIN_LOG === '1') console.log(`[widget:${e.level}] ${e.message}`)
  })
  loadRenderer(win, 'widget')
  widget = win
}

function showWidget(): void {
  if (!widget || widget.isDestroyed()) createWidget()
  widget?.showInactive()
  buildTrayMenu()
}

function hideWidget(): void {
  widget?.hide()
  buildTrayMenu()
  if (!toldAboutTray && Notification.isSupported() && !headless) {
    toldAboutTray = true
    new Notification({
      title: '낚시터를 잠깐 치웠어요',
      body: isMac ? '메뉴 막대의 찌 아이콘에서 다시 꺼낼 수 있어요.' : '작업 표시줄 트레이의 찌 아이콘에서 다시 꺼낼 수 있어요.',
      silent: true
    }).show()
  }
}

// ───────── 패널 (도감 · 수익 · 설정 · 정보) ─────────

function showPanel(tab?: PanelTab): void {
  if (!panel || panel.isDestroyed()) createPanel(tab)
  else if (tab) panel.webContents.send('panel:tab', tab)
  if (!panel) return
  if (isMac) void app.dock?.show()
  if (panel.isMinimized()) panel.restore()
  panel.show()
  panel.focus()
}

function createPanel(tab?: PanelTab): void {
  const win = new BrowserWindow({
    width: 460,
    height: 680,
    minWidth: 420,
    minHeight: 560,
    useContentSize: true,
    acceptFirstMouse: true,
    show: false,
    title: '월급루팡 낚시터',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    maximizable: false,
    fullscreenable: false,
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 12, y: 12 } } : {}),
    webPreferences: {
      preload: preloadPath(),
      sandbox: true,
      contextIsolation: true,
      offscreen: headless
    }
  })
  win.once('ready-to-show', () => {
    if (!headless) win.show()
  })
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win.hide()
    stopKeyTest()
    if (isMac) app.dock?.hide()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('console-message', (e) => {
    if (env.LUPIN_LOG === '1') console.log(`[panel:${e.level}] ${e.message}`)
  })
  loadRenderer(win, 'panel', tab)
  panel = win
}

// ───────── 트레이 ─────────

function buildTrayMenu(): void {
  if (!tray || !store) return
  const s = store.state.settings
  const today = store.state.days[dayKey()]?.earn ?? 0
  const visible = !!widget && !widget.isDestroyed() && widget.isVisible()
  const menu = Menu.buildFromTemplate([
    { label: visible ? '낚시터 치우기' : '낚시터 꺼내기', click: () => (visible ? hideWidget() : showWidget()) },
    { label: `오늘 수익 ${fmtWon(today)}${status ? ` · ${status}` : ''}`, enabled: false },
    { type: 'separator' },
    { label: '수동 낚시 (손맛)', type: 'radio', checked: s.mode === 'manual', click: () => store.setSettings({ mode: 'manual' }) },
    { label: '자동 낚시 (성공률 낮음)', type: 'radio', checked: s.mode === 'auto', click: () => store.setSettings({ mode: 'auto' }) },
    { label: disguised ? '위장 풀기' : '일하는 척 위장하기', click: () => widget?.webContents.send('boss') },
    { type: 'separator' },
    { label: '물고기 도감', click: () => showPanel('dex') },
    { label: '수익 기록', click: () => showPanel('money') },
    { label: '설정', click: () => showPanel('settings') },
    { type: 'separator' },
    { label: '개발자의 다른 앱 보기', click: () => void shell.openExternal(MORE_APPS_URL) },
    { label: '인스타그램 보기', click: () => void shell.openExternal(INSTAGRAM_URL) },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        quitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(`월급루팡 낚시터 — 오늘 ${fmtWon(today)}`)
}

function createTray(): void {
  tray = new Tray(trayIcon())
  tray.on('click', () => {
    // 윈도우: 왼쪽 클릭으로 꺼내기 / 맥: 메뉴가 뜬다
    if (!isMac) showWidget()
  })
  buildTrayMenu()
}

// ───────── 전역 키 (다른 앱 쓰는 중에도) ─────────

let reader: KeyReader | null | undefined
let pollTimer: NodeJS.Timeout | null = null
let held = new Set<string>()
let keyTest = false

function getReader(): KeyReader | null {
  if (reader === undefined) reader = createKeyReader()
  return reader
}

function watchedCodes(): string[] {
  const s = store.state.settings
  const codes: string[] = []
  if (s.globalKeys) {
    for (const c of [s.reelKey, s.bossKey]) if (c && globalCapable(c, process.platform) && !codes.includes(c)) codes.push(c)
  }
  if (keyTest) {
    // 설정의 '키 테스트': 보조 키 · 마우스 버튼 · 지금 고른 키
    const extra = [...MODIFIER_KEYS, ...MOUSE_KEYS, s.reelKey, s.bossKey]
    for (const c of extra) if (c && globalCapable(c, process.platform) && !codes.includes(c)) codes.push(c)
  }
  return codes
}

function pollOnce(): void {
  const r = getReader()
  if (!r) return
  const codes = watchedCodes()
  let now: Set<string>
  try {
    now = r(codes)
  } catch (err) {
    console.warn('[keys] read failed', (err as Error)?.message ?? err)
    reader = null
    updatePolling()
    return
  }
  const s = store.state.settings
  const send = (action: 'reel' | 'boss', code: string | null): void => {
    if (!code || !s.globalKeys || !globalCapable(code, process.platform)) return
    const was = held.has(code)
    const is = now.has(code)
    if (was === is) return
    if (action === 'boss') {
      if (is) widget?.webContents.send('boss')
    } else {
      widget?.webContents.send('key', { action, down: is })
    }
  }
  if (widget && !widget.isDestroyed() && widget.isVisible()) {
    send('reel', s.reelKey)
    if (s.bossKey !== s.reelKey) send('boss', s.bossKey)
  }
  if (keyTest && panel && !panel.isDestroyed()) {
    const a = [...now].sort().join(',')
    const b = [...held].sort().join(',')
    if (a !== b) panel.webContents.send('keytest', [...now])
  }
  held = now
}

function updatePolling(): void {
  const want = !!getReader() && watchedCodes().length > 0 && ((!!widget && !widget.isDestroyed() && widget.isVisible()) || keyTest)
  if (want && !pollTimer) pollTimer = setInterval(pollOnce, 16)
  if (!want && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
    held = new Set()
  }
}

function stopKeyTest(): void {
  if (!keyTest) return
  keyTest = false
  updatePolling()
}

// ───────── 창 끌어 옮기기 (낚시터 아무 데나 잡고) ─────────

let dragTimer: NodeJS.Timeout | null = null

function dragStart(): void {
  if (!widget || dragTimer) return
  const c = screen.getCursorScreenPoint()
  const [wx, wy] = widget.getPosition()
  const off = { x: c.x - wx, y: c.y - wy }
  dragTimer = setInterval(() => {
    if (!widget || widget.isDestroyed()) return dragEnd()
    const p = screen.getCursorScreenPoint()
    widget.setPosition(Math.round(p.x - off.x), Math.round(p.y - off.y))
  }, 12)
}

function dragEnd(): void {
  if (dragTimer) clearInterval(dragTimer)
  dragTimer = null
  if (!widget || widget.isDestroyed()) return
  const [x, y] = widget.getPosition()
  const [w, h] = widget.getSize()
  const p = clampToScreen(x, y, w, h)
  if (p.x !== x || p.y !== y) widget.setPosition(p.x, p.y)
  store.setWidgetPos(p.x, p.y)
}

// ───────── IPC ─────────

function safeName(name: unknown, fallback: string): string {
  const s = typeof name === 'string' ? name.replace(/[\\/:*?"<>|\n\r]/g, '').trim().slice(0, 60) : ''
  return s || fallback
}

function registerIpc(): void {
  ipcMain.handle('state:get', () => store.state)
  ipcMain.handle('state:setSettings', (_e, patch: Partial<Settings>) => store.setSettings(patch ?? {}))
  ipcMain.handle('state:setOnboarded', () => store.setOnboarded())
  ipcMain.handle('fish:catch', (_e, c: CatchInput) => {
    if (!c || typeof c.fish !== 'string') return null
    const r = store.recordCatch(c)
    buildTrayMenu()
    return r
  })
  ipcMain.handle('fish:cast', () => store.recordCast())
  ipcMain.handle('fish:escape', () => store.recordEscape())
  ipcMain.handle('state:resetAll', () => store.resetAll())

  ipcMain.handle('keys:ok', () => !!getReader())
  ipcMain.handle('keys:access', () => macAccess())
  ipcMain.handle('keys:requestAccess', () => requestMacAccess())
  ipcMain.handle('keys:test', (_e, on: boolean) => {
    keyTest = !!on
    held = new Set()
    updatePolling()
  })

  ipcMain.handle('panel:open', (_e, tab?: PanelTab) => showPanel(tab))
  ipcMain.handle('widget:hide', () => hideWidget())
  ipcMain.handle('widget:show', () => showWidget())
  ipcMain.handle('widget:dragStart', () => dragStart())
  ipcMain.handle('widget:dragEnd', () => dragEnd())
  ipcMain.handle('widget:disguised', (_e, on: boolean) => {
    disguised = !!on
    buildTrayMenu()
  })
  ipcMain.handle('widget:status', (_e, text: string) => {
    const t = String(text ?? '').slice(0, 40)
    if (t === status) return
    status = t
    buildTrayMenu()
  })

  ipcMain.handle('app:saveImage', async (_e, dataUrl: string, name?: string) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return 'cancel'
    const png = nativeImage.createFromDataURL(dataUrl).toPNG()
    await clipboard
      .write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })])
      .catch((err) => console.warn('[clipboard]', err))
    const fname = `${safeName(name, '월급루팡-낚시터')}.png`
    if (env.LUPIN_SAVE_DIR) {
      mkdirSync(env.LUPIN_SAVE_DIR, { recursive: true })
      writeFileSync(join(env.LUPIN_SAVE_DIR, fname), png)
      return 'saved'
    }
    const parent = panel && !panel.isDestroyed() && panel.isVisible() ? panel : undefined
    const opts = { defaultPath: join(app.getPath('desktop'), fname), filters: [{ name: 'PNG 이미지', extensions: ['png'] }] }
    const r = parent ? await dialog.showSaveDialog(parent, opts) : await dialog.showSaveDialog(opts)
    if (r.canceled || !r.filePath) return 'copied'
    writeFileSync(r.filePath, png)
    return 'saved'
  })
  ipcMain.handle('app:openExternal', (_e, url: string) => {
    if (typeof url === 'string' && /^https:\/\//.test(url)) void shell.openExternal(url)
  })
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:checkUpdate', () => checkNow())
  ipcMain.handle('app:quit', () => {
    quitting = true
    app.quit()
  })
}

function onStateChanged(prev: Settings, s: PersistedState): void {
  for (const w of [widget, panel]) if (w && !w.isDestroyed()) w.webContents.send('state:changed', s)
  const n = s.settings
  if (widget && !widget.isDestroyed()) {
    if (n.scale !== prev.scale) {
      const { width, height } = sizeOf(n)
      const [x, y] = widget.getPosition()
      const [ow, oh] = widget.getContentSize()
      // 오른쪽 아래 모서리를 기준으로 커지고 작아진다 (보통 화면 구석에 두니까)
      const p = clampToScreen(x + ow - width, y + oh - height, width, height)
      widget.setContentSize(width, height)
      widget.setPosition(p.x, p.y)
      store.setWidgetPos(p.x, p.y)
    }
    if (n.alwaysOnTop !== prev.alwaysOnTop) applyOnTop(widget)
  }
  if (n.globalKeys !== prev.globalKeys || n.reelKey !== prev.reelKey || n.bossKey !== prev.bossKey) {
    held = new Set()
    updatePolling()
  }
  if (app.isPackaged && n.openAtLogin !== prev.openAtLogin) app.setLoginItemSettings({ openAtLogin: n.openAtLogin, args: ['--hidden'] })
  buildTrayMenu()
}

// ───────── 테스트 자동화 (환경변수로만 동작) ─────────

interface Step {
  at: number
  widget?: string
  panel?: string
  openPanel?: PanelTab
  shot?: string
  panelShot?: string
  quit?: boolean
}

/** 헤드리스(오프스크린)에서는 다음 그림 한 장을 받아 쓰는 게 capturePage 보다 안정적이다 */
function grab(win: BrowserWindow): Promise<Electron.NativeImage> {
  if (!headless) return win.webContents.capturePage()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      win.webContents.off('paint', onPaint)
      win.webContents.capturePage().then(resolve, reject)
    }, 1500)
    const onPaint = (_e: unknown, _dirty: Electron.Rectangle, image: Electron.NativeImage): void => {
      clearTimeout(timer)
      win.webContents.off('paint', onPaint)
      resolve(image)
    }
    win.webContents.on('paint', onPaint)
    win.webContents.invalidate()
  })
}

function runScript(): void {
  if (!env.LUPIN_SCRIPT) return
  const steps = JSON.parse(readFileSync(env.LUPIN_SCRIPT, 'utf8')) as Step[]
  const dir = env.LUPIN_SHOT_DIR ?? 'shots'
  mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  for (const st of steps) {
    setTimeout(async () => {
      try {
        if (st.openPanel) showPanel(st.openPanel)
        if (st.widget) console.log('[widget-js]', await widget?.webContents.executeJavaScript(st.widget))
        if (st.panel) console.log('[panel-js]', await panel?.webContents.executeJavaScript(st.panel))
        if (st.shot && widget) {
          const img = await grab(widget)
          writeFileSync(join(dir, st.shot + '.png'), img.toPNG())
          console.log('[shot]', st.shot, Date.now() - t0)
        }
        if (st.panelShot && panel) {
          const img = await grab(panel)
          writeFileSync(join(dir, st.panelShot + '.png'), img.toPNG())
          console.log('[shot]', st.panelShot)
        }
        if (st.quit) {
          quitting = true
          app.quit()
        }
      } catch (err) {
        console.error('[script]', st, err)
      }
    }, st.at)
  }
}

function runLab(name: string): void {
  const [w, h] = (env.LUPIN_SIZE ?? '1200x800').split('x').map(Number)
  const win = new BrowserWindow({
    width: w,
    height: h,
    useContentSize: true,
    show: !headless,
    backgroundColor: '#000000',
    webPreferences: { preload: preloadPath(), sandbox: true, contextIsolation: true, offscreen: headless }
  })
  win.webContents.on('console-message', (e) => console.log(`[lab:${e.level}] ${e.message}`))
  loadRenderer(win, 'lab', name)
  if (env.LUPIN_SHOT) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        // 캔버스를 그대로 저장 (아이콘의 투명 모서리도 살아남는다)
        const url = (await win.webContents.executeJavaScript(`document.querySelector('canvas').toDataURL('image/png')`)) as string
        writeFileSync(env.LUPIN_SHOT!, Buffer.from(url.split(',')[1], 'base64'))
        console.log('[lab] saved', env.LUPIN_SHOT)
        app.quit()
      }, Number(env.LUPIN_SHOT_DELAY ?? 1200))
    })
  }
}

// ───────── 시작 ─────────

app.on('second-instance', () => {
  showWidget()
  showPanel()
})

app.whenReady().then(() => {
  store = new Store()
  if (labMode) return runLab(labMode)
  if (env.LUPIN_SELFTEST === '1') {
    const r = getReader()
    console.log('[selftest] key reader', r ? 'ok' : 'unavailable', r ? [...r([...MODIFIER_KEYS])] : '')
    app.quit()
    return
  }
  // 맥: 독 아이콘 없이 메뉴 막대에 상주 (패널을 열 때만 독에 보인다) — 전체 화면 앱 위에도 낚시터가 뜨게
  if (isMac && !headless) app.dock?.hide()
  registerIpc()
  let prev = store.state.settings
  store.onChange((s) => {
    onStateChanged(prev, s)
    prev = s.settings
  })
  createWidget()
  if (!headless) createTray()
  updatePolling()
  // 자정이 지나면 트레이의 '오늘 수익'을 다시 계산
  setInterval(buildTrayMenu, 60_000)
  // 처음 실행: 사용법을 패널로 같이 보여 준다
  if (!store.state.onboarded && !headless && !startHidden) setTimeout(() => showPanel('about'), 900)
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.state.settings.openAtLogin, args: ['--hidden'] })
  screen.on('display-removed', () => {
    if (!widget || widget.isDestroyed()) return
    const [x, y] = widget.getPosition()
    const [w, h] = widget.getSize()
    const p = clampToScreen(x, y, w, h)
    widget.setPosition(p.x, p.y)
  })
  runScript()
  setupUpdater()
  app.on('activate', () => showPanel())
})

app.on('before-quit', () => {
  quitting = true
  store?.flush()
})

// 창을 모두 닫아도 트레이에 상주
app.on('window-all-closed', () => {
  if (headless || labMode) app.quit()
})
