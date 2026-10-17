// 물고기(와 잡동사니) 목록 · 희귀도 · 값 매기기. 그림은 renderer/src/art/sprites.ts

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend'

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legend']

export interface RarityInfo {
  label: string
  color: string
  /** 등장 가중치 (합 100) */
  weight: number
  /** 자동 낚시: 물었을 때 끝까지 끌어올릴 확률 */
  autoRate: number
  /** 입질 때 눌러야 하는 시간 (ms) */
  biteWindow: number
  /** 피니시에서 연속으로 맞혀야 하는 횟수 */
  finishHits: number
}

export const RARITY: Record<Rarity, RarityInfo> = {
  common: { label: '흔함', color: '#c8c8c8', weight: 58, autoRate: 0.32, biteWindow: 1000, finishHits: 1 },
  uncommon: { label: '보통', color: '#6fe08c', weight: 28, autoRate: 0.22, biteWindow: 860, finishHits: 1 },
  rare: { label: '희귀', color: '#5cb6ff', weight: 11, autoRate: 0.1, biteWindow: 720, finishHits: 2 },
  epic: { label: '영웅', color: '#c690ff', weight: 2.6, autoRate: 0.03, biteWindow: 620, finishHits: 2 },
  legend: { label: '전설', color: '#ffd23f', weight: 0.4, autoRate: 0, biteWindow: 540, finishHits: 3 }
}

export interface FishDef {
  id: string
  name: string
  rarity: Rarity
  /** 크기 범위 (cm). 잡동사니는 min === max */
  min: number
  max: number
  /** 평균 크기일 때 값 (원) */
  base: number
  /** 잡동사니 (크기와 상관없이 값이 같다) */
  junk?: boolean
  /** 힘: 1 = 보통. 힘겨루기에서 당기는 세기 */
  power: number
  desc: string
}

export const FISH: FishDef[] = [
  // ── 흔함 ──
  { id: 'pirami', name: '피라미', rarity: 'common', min: 6, max: 15, base: 80, power: 0.55, desc: '출근길 지하철처럼 늘 바글바글하다.' },
  { id: 'bungeo', name: '붕어', rarity: 'common', min: 10, max: 35, base: 130, power: 0.7, desc: '월요일 아침 같은 표정을 하고 있다.' },
  { id: 'songsari', name: '송사리', rarity: 'common', min: 2.5, max: 5, base: 40, power: 0.4, desc: '작고 소중한 내 월급 같다.' },
  { id: 'loach', name: '미꾸라지', rarity: 'common', min: 8, max: 20, base: 110, power: 0.75, desc: '결재 라인을 요리조리 잘도 빠져나간다.' },
  { id: 'can', name: '빈 커피캔', rarity: 'common', min: 12, max: 12, base: 10, junk: true, power: 0.3, desc: '탕비실에서 흘러온 것 같다. 분리수거하자.' },
  { id: 'idcard', name: '누군가의 사원증', rarity: 'common', min: 8.6, max: 8.6, base: 30, junk: true, power: 0.3, desc: '사진이 어딘가 낯익다. 출입은 안 된다.' },
  // ── 보통 ──
  { id: 'carp', name: '잉어', rarity: 'uncommon', min: 30, max: 80, base: 380, power: 0.95, desc: '회사 연못의 터줏대감. 사장님보다 오래 다녔다.' },
  { id: 'catfish', name: '회식 메기', rarity: 'uncommon', min: 30, max: 100, base: 500, power: 1.05, desc: '회식만 되면 수염을 쓰다듬으며 건배사를 한다.' },
  { id: 'eel', name: '야근 장어', rarity: 'uncommon', min: 40, max: 110, base: 650, power: 1.1, desc: '밤 9시가 넘어야 기운이 난다.' },
  { id: 'mandarin', name: '쏘가리', rarity: 'uncommon', min: 20, max: 50, base: 550, power: 1.0, desc: '얼룩무늬 정장을 차려입은 엘리트.' },
  { id: 'tie', name: '부장님 넥타이', rarity: 'uncommon', min: 140, max: 140, base: 180, junk: true, power: 0.4, desc: '조용히 돌려놓자. 아무도 못 봤다.' },
  { id: 'tumbler', name: '김대리 텀블러', rarity: 'uncommon', min: 20, max: 20, base: 150, junk: true, power: 0.45, desc: "'건드리지 마시오' 스티커가 붙어 있다." },
  // ── 희귀 ──
  { id: 'salmon', name: '칼퇴 연어', rarity: 'rare', min: 50, max: 100, base: 1800, power: 1.3, desc: '6시 정각이 되면 미친 듯이 거슬러 올라간다.' },
  { id: 'trout', name: '무지개송어', rarity: 'rare', min: 30, max: 70, base: 1500, power: 1.2, desc: '월급날처럼 반짝이고, 월급처럼 금방 사라진다.' },
  { id: 'puffer', name: '보고서 복어', rarity: 'rare', min: 10, max: 40, base: 2000, power: 1.15, desc: '보고서가 반려될 때마다 빵빵하게 부푼다.' },
  { id: 'masu', name: '산천어', rarity: 'rare', min: 25, max: 45, base: 1600, power: 1.2, desc: '맑은 물에만 산다. 우리 팀 분위기와는 안 맞는다.' },
  { id: 'keyboard', name: '청축 키보드', rarity: 'rare', min: 44, max: 44, base: 1200, junk: true, power: 0.7, desc: '옆자리에서 몰래 버린 이유를 알 것 같다.' },
  // ── 영웅 ──
  { id: 'tuna', name: '보너스 참치', rarity: 'epic', min: 100, max: 300, base: 7500, power: 1.7, desc: '1년에 한 번 나타난다는 소문만 무성하다.' },
  { id: 'sturgeon', name: '철갑상어', rarity: 'epic', min: 100, max: 250, base: 8500, power: 1.6, desc: '갑옷 같은 비늘. 정년까지 버틸 기세다.' },
  { id: 'goldfish', name: '사장님 금붕어', rarity: 'epic', min: 8, max: 20, base: 6000, power: 1.3, desc: '사장실 어항에서 탈출했다. 잡은 걸 들키면 안 된다.' },
  { id: 'squid', name: '법카 오징어', rarity: 'epic', min: 50, max: 200, base: 7000, power: 1.55, desc: '다리 열 개로 법인카드를 긁고 다닌다.' },
  { id: 'cutlass', name: '주4일 갈치', rarity: 'epic', min: 80, max: 150, base: 8000, power: 1.5, desc: '꿈같은 제도처럼 길고 눈부시다.' },
  // ── 전설 ──
  { id: 'envelope', name: '황금 월급봉투', rarity: 'legend', min: 25, max: 25, base: 60000, junk: true, power: 1.6, desc: '25일의 기적. 열어 보니 이미 카드값으로 사라졌다.' },
  { id: 'quitcarp', name: '퇴사 잉어', rarity: 'legend', min: 80, max: 150, base: 40000, power: 2.0, desc: '보기만 해도 사직서를 쓰고 싶어진다. 참자.' },
  { id: 'whale', name: '연봉협상 고래', rarity: 'legend', min: 3, max: 9, base: 80000, power: 1.9, desc: '기대했던 것보다… 훨씬 작다.' },
  { id: 'dragon', name: '용왕님', rarity: 'legend', min: 300, max: 900, base: 120000, power: 2.2, desc: '연차를 하사하신다. 결재는 안 해 주신다.' }
]

export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(FISH.map((f) => [f.id, f]))

/** 크기를 정한다: 작은 쪽이 훨씬 흔하다 */
export function rollSize(def: FishDef, rnd: () => number = Math.random): number {
  if (def.min === def.max) return def.min
  const r = Math.pow(rnd(), 1.8)
  return Math.round((def.min + (def.max - def.min) * r) * 10) / 10
}

export interface PriceOpts {
  /** 오늘의 시세 대상 (×2) */
  hot?: boolean
  /** 피니시 정중앙 (×1.2) */
  perfect?: boolean
}

/** 크기·희귀도에 따른 판매 값 (10원 단위) */
export function priceOf(def: FishDef, size: number, o: PriceOpts = {}): number {
  const mid = (def.min + def.max) / 2
  const sizeMult = def.junk ? 1 : Math.pow(Math.max(0.2, size / mid), 1.5)
  let p = def.base * sizeMult
  if (o.hot) p *= 2
  if (o.perfect) p *= 1.2
  return Math.max(10, Math.round(p / 10) * 10)
}

/** 크기 표시 (100cm 이상은 m) */
export function fmtSize(cm: number): string {
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${cm.toFixed(1)}cm`
}

/** 희귀도를 먼저 뽑고, 그 안에서 고른다. far = 멀리 던질수록 희귀한 쪽이 조금 더 */
export function rollFish(o: { far?: number; rnd?: () => number } = {}): FishDef {
  const rnd = o.rnd ?? Math.random
  const far = Math.max(0, Math.min(1, o.far ?? 0))
  const w = RARITIES.map((r) => RARITY[r].weight * (r === 'common' ? 1 - far * 0.25 : r === 'uncommon' ? 1 : 1 + far * 0.5))
  let t = rnd() * w.reduce((a, b) => a + b, 0)
  let rarity: Rarity = 'common'
  for (let i = 0; i < RARITIES.length; i++) {
    t -= w[i]
    if (t <= 0) {
      rarity = RARITIES[i]
      break
    }
  }
  const pool = FISH.filter((f) => f.rarity === rarity)
  return pool[Math.floor(rnd() * pool.length)] ?? FISH[0]
}

// ───────── 오늘의 시세 (날짜마다 한 종 ×2) ─────────

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function hotFishOf(day: string): FishDef {
  const pool = FISH.filter((f) => f.rarity !== 'legend' && !f.junk)
  return pool[hash('lupin:' + day) % pool.length]
}
