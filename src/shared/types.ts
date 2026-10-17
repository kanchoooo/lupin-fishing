export type Mode = 'auto' | 'manual'

export interface Settings {
  mode: Mode
  /** 낚싯대 키 (던지기 · 챔질 · 감기 · 피니시) — KeyboardEvent.code */
  reelKey: string | null
  /** 위장 키 (일하는 척 화면) */
  bossKey: string | null
  /** 다른 앱을 쓰는 중에도 키 받기 */
  globalKeys: boolean
  /** 낚시터를 클릭해서도 낚시 */
  mouseClick: boolean
  /** 픽셀 크기 1·2·3배 */
  scale: number
  /** 낚시 자리 (0 = 물가 · 1 = 가장 멀리) — 물 위 ▼ 를 끌어서 바꾼다 */
  spot: number
  alwaysOnTop: boolean
  sound: boolean
  volume: number
  openAtLogin: boolean
  /** 수익 환산용 시급 (원) */
  hourlyWage: number
}

export interface DexEntry {
  count: number
  bestSize: number
  bestPrice: number
  firstAt: number
  lastAt: number
  firstTag: string
}

export interface DayRecord {
  earn: number
  count: number
  casts: number
  best?: { fish: string; size: number; price: number }
}

export interface CatchRecord {
  id: string
  fish: string
  size: number
  price: number
  at: number
  auto: boolean
  tag: string
  hot?: boolean
  perfect?: boolean
}

export interface Totals {
  earn: number
  count: number
  casts: number
  escapes: number
}

export interface PersistedState {
  settings: Settings
  dex: Record<string, DexEntry>
  total: Totals
  days: Record<string, DayRecord>
  /** 최근에 잡은 것 (최신이 앞, 최대 60) */
  recent: CatchRecord[]
  widgetPos: { x: number; y: number } | null
  onboarded: boolean
}

export interface CatchInput {
  fish: string
  size: number
  auto: boolean
  perfect: boolean
}

export interface CatchResult {
  record: CatchRecord
  isNew: boolean
  isRecord: boolean
  dayEarn: number
  rankUp: string | null
}

export type PanelTab = 'dex' | 'money' | 'settings' | 'about'

/** 전역 키 이벤트 (메인이 읽어 낚시터에 보낸다) */
export interface KeyEvent {
  action: 'reel' | 'boss'
  down: boolean
}

export const MORE_APPS_URL = 'https://easyticket.co.kr/apps/'
export const INSTAGRAM_URL = 'https://www.instagram.com/easyticket.co.kr/'
export const INSTAGRAM_HANDLE = '@easyticket.co.kr'
export const REPO_URL = 'https://github.com/kanchoooo/lupin-fishing'
export const DOWNLOAD_PAGE = 'https://kanchoooo.github.io/lupin-fishing/'

/** 낚시터 화면 크기 (논리 픽셀) — 창 크기 = 이 값 × scale */
export const SCENE_W = 176
export const SCENE_H = 96
export const BAR_H = 14

export interface MainApi {
  platform: string
  getState(): Promise<PersistedState>
  onStateChanged(cb: (s: PersistedState) => void): () => void
  setSettings(patch: Partial<Settings>): Promise<PersistedState>
  setOnboarded(): Promise<void>
  recordCatch(c: CatchInput): Promise<CatchResult | null>
  recordCast(): Promise<void>
  recordEscape(): Promise<void>
  resetAll(): Promise<void>
  /** 전역 키 (다른 앱 사용 중에도) */
  onKey(cb: (e: KeyEvent) => void): () => void
  /** 지금 전역 키를 읽을 수 있는지 */
  keyReaderOk(): Promise<boolean>
  /** 맥 '입력 모니터링' 권한 (보조 키·마우스 말고 다른 키를 다른 앱 쓰는 중에 읽을 때) */
  keyAccess(): Promise<'granted' | 'denied' | 'unknown'>
  requestKeyAccess(): Promise<void>
  /** 설정 화면 '키 테스트': 지금 눌린 전역 키 */
  onKeyTest(cb: (codes: string[]) => void): () => void
  setKeyTest(on: boolean): Promise<void>
  openPanel(tab?: PanelTab): Promise<void>
  onPanelTab(cb: (tab: PanelTab) => void): () => void
  hideWidget(): Promise<void>
  showWidget(): Promise<void>
  dragStart(): Promise<void>
  dragEnd(): Promise<void>
  /** 위장 화면 켜고 끄기 알림 (메인이 트레이·전역 키에서 보낸다) */
  onBoss(cb: () => void): () => void
  setDisguised(on: boolean): Promise<void>
  /** 오늘의 낚시 상태 (트레이에 보여 줌) */
  setStatus(text: string): Promise<void>
  saveImage(dataUrl: string, name: string): Promise<'saved' | 'copied' | 'cancel'>
  openExternal(url: string): Promise<void>
  getVersion(): Promise<string>
  checkUpdate(): Promise<string>
  quit(): Promise<void>
}
