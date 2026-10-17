// 날짜(하루 수익 기준) · 잡은 시간대 꼬리표 · 루팡 직급

/** 내 컴퓨터 시간 기준 'YYYY-MM-DD' (자정에 오늘 수익이 0 부터 다시 시작) */
export function dayKey(t: number | Date = Date.now()): string {
  const d = typeof t === 'number' ? new Date(t) : t
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fmtDay(key: string, withYear = false): string {
  const [y, m, d] = key.split('-').map(Number)
  const w = '일월화수목금토'[new Date(y, m - 1, d).getDay()]
  return `${withYear ? `${y}.` : ''}${m}.${d} (${w})`
}

export function fmtTime(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 잡은 시간대 꼬리표 — 자랑 카드에 '14:32 · 식곤증 타임에 포획' 처럼 붙는다 */
export function timeTag(t: number = Date.now()): string {
  const d = new Date(t)
  const day = d.getDay()
  const m = d.getHours() * 60 + d.getMinutes()
  if (day === 0 || day === 6) return '주말 출근 중'
  if (m < 6 * 60) return '새벽 야근 중'
  if (m < 9 * 60) return '출근 전'
  if (m < 9 * 60 + 30) return '출근 직후'
  if (m < 11 * 60 + 50) return '오전 업무 중'
  if (m < 13 * 60 + 10) return '점심시간'
  if (m < 15 * 60) return '식곤증 타임'
  if (m < 17 * 60 + 40) return '오후 업무 중'
  if (m < 18 * 60) return '퇴근 직전'
  if (m < 19 * 60) return '칼퇴 실패'
  return '야근 중'
}

export interface Rank {
  name: string
  min: number
}

/** 누적 수익으로 오르는 직급 */
export const RANKS: Rank[] = [
  { name: '인턴', min: 0 },
  { name: '사원', min: 5_000 },
  { name: '주임', min: 30_000 },
  { name: '대리', min: 100_000 },
  { name: '과장', min: 300_000 },
  { name: '차장', min: 700_000 },
  { name: '부장', min: 1_500_000 },
  { name: '이사', min: 3_000_000 },
  { name: '사장', min: 6_000_000 },
  { name: '회장', min: 12_000_000 },
  { name: '전설의 월급루팡', min: 30_000_000 }
]

export function rankOf(total: number): { rank: Rank; next: Rank | null; progress: number; index: number } {
  let i = 0
  while (i + 1 < RANKS.length && total >= RANKS[i + 1].min) i++
  const rank = RANKS[i]
  const next = RANKS[i + 1] ?? null
  const progress = next ? (total - rank.min) / (next.min - rank.min) : 1
  return { rank, next, progress, index: i }
}

export function rankTitle(total: number): string {
  const r = rankOf(total).rank.name
  return r === '전설의 월급루팡' ? r : `${r} 루팡`
}

/** 2026년 최저시급 (원) */
export const MIN_WAGE_2026 = 10_320

export function fmtWon(n: number): string {
  return '₩' + Math.round(n).toLocaleString('ko-KR')
}

/** 시급으로 환산 — '3시간 12분어치' */
export function wageTime(earn: number, hourly: number): string {
  if (hourly <= 0) return ''
  const min = Math.floor((earn / hourly) * 60)
  if (min < 1) return '1분도 안 되는 만큼'
  const h = Math.floor(min / 60)
  const mm = min % 60
  return h ? `${h}시간${mm ? ` ${mm}분` : ''}어치` : `${mm}분어치`
}
