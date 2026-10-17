// 자랑 이미지 (1080×1350, 인스타 세로) — 패널에서 먼저 보여 주고 공유하기 · 이미지 저장
import { dayKey, fmtDay, fmtTime, fmtWon, rankTitle, wageTime } from '@shared/day'
import { FISH, FISH_BY_ID, fmtSize, RARITY } from '@shared/fish'
import type { CatchRecord, PersistedState } from '@shared/types'
import { INSTAGRAM_HANDLE } from '@shared/types'
import { drawSprite, spriteSize } from '@/art/draw'

const W = 1080
const H = 1350
const PIX = "'Galmuri11', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"

/** 받침이 있으면 a, 없으면 b (을/를, 이/가) */
export function josa(word: string, a: string, b: string): string {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return a
  return (ch - 0xac00) % 28 ? a : b
}

async function canvas(): Promise<CanvasRenderingContext2D> {
  await Promise.all([document.fonts.load(`700 48px 'Galmuri11'`), document.fonts.load(`400 48px 'Galmuri11'`)]).catch(() => undefined)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  c.fillStyle = '#000'
  c.fillRect(0, 0, W, H)
  // 도트 바탕
  c.fillStyle = '#151515'
  for (let y = 6; y < H; y += 18) for (let x = 6; x < W; x += 18) c.fillRect(x, y, 3, 3)
  // 도트 테두리
  c.fillStyle = '#ececec'
  c.fillRect(30, 30, W - 60, 6)
  c.fillRect(30, H - 36, W - 60, 6)
  c.fillRect(30, 30, 6, H - 60)
  c.fillRect(W - 36, 30, 6, H - 60)
  c.fillStyle = '#000'
  for (const [x, y] of [
    [30, 30],
    [W - 36, 30],
    [30, H - 36],
    [W - 36, H - 36]
  ])
    c.fillRect(x, y, 6, 6)
  return c
}

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: string; align?: CanvasTextAlign; max?: number } = {}): void {
  c.font = `${o.bold ? 700 : 400} ${o.size ?? 36}px ${PIX}`
  c.fillStyle = o.color ?? '#ececec'
  c.textAlign = o.align ?? 'center'
  c.textBaseline = 'alphabetic'
  c.fillText(s, x, y, o.max)
}

function chip(c: CanvasRenderingContext2D, s: string, x: number, y: number, bg: string): number {
  c.font = `700 30px ${PIX}`
  const w = c.measureText(s).width + 28
  c.fillStyle = bg
  c.fillRect(x, y, w, 48)
  c.fillStyle = '#000'
  c.textAlign = 'left'
  c.fillText(s, x + 14, y + 36)
  return w
}

function footer(c: CanvasRenderingContext2D, total: number): void {
  c.fillStyle = '#2a2a2a'
  c.fillRect(70, H - 150, W - 140, 2)
  text(c, `현재 직급 · ${rankTitle(total)}`, W / 2, H - 98, { size: 30, color: '#9a9a9a' })
  text(c, `월급루팡 낚시터  ·  인스타 ${INSTAGRAM_HANDLE}`, W / 2, H - 58, { size: 26, color: '#5f5f5f' })
}

/** 상자 안에 정수 배율로 가운데 그리기 */
function spriteIn(c: CanvasRenderingContext2D, id: string, cx: number, cy: number, boxW: number, boxH: number, silhouette?: string): void {
  const { w, h } = spriteSize(id)
  const sc = Math.max(1, Math.floor(Math.min(boxW / w, boxH / h)))
  drawSprite(c, id, Math.round(cx - (w * sc) / 2), Math.round(cy - (h * sc) / 2), sc, { silhouette })
}

export async function makeCatchCard(rec: CatchRecord, o: { isNew?: boolean; isRecord?: boolean; total: number }): Promise<string> {
  const c = await canvas()
  const def = FISH_BY_ID[rec.fish]
  const r = RARITY[def.rarity]
  text(c, '월급루팡 낚시터 · 근무 중 포획 기록', W / 2, 120, { size: 30, color: '#9a9a9a' })
  text(c, `${fmtTime(rec.at)} ${rec.tag}에`, W / 2, 210, { size: 48, bold: true })
  text(c, `${def.name}${josa(def.name, '을', '를')} 낚았다!`, W / 2, 290, { size: 60, bold: true, color: r.color, max: W - 140 })

  // 그림 상자
  c.fillStyle = r.color
  c.fillRect(110, 350, W - 220, 6)
  c.fillRect(110, 794, W - 220, 6)
  spriteIn(c, def.id, W / 2, 575, W - 300, 380)

  // 꼬리표
  const tags: [string, string][] = []
  if (o.isNew) tags.push(['NEW!', '#ffd23f'])
  if (o.isRecord) tags.push(['신기록!', '#ff4d4d'])
  if (rec.hot) tags.push(['오늘의 시세 ×2', '#6fe08c'])
  if (rec.perfect) tags.push(['PERFECT', '#5cb6ff'])
  tags.push([r.label, r.color])
  c.font = `700 30px ${PIX}`
  const total = tags.reduce((a, [s]) => a + c.measureText(s).width + 28 + 14, -14)
  let x = W / 2 - total / 2
  for (const [s, bg] of tags) x += chip(c, s, x, 828, bg) + 14

  // 숫자
  const cols = [
    ['크기', fmtSize(rec.size)],
    ['판매가', fmtWon(rec.price)],
    ['잡은 방법', rec.auto ? '자동' : '손맛']
  ]
  cols.forEach(([k, v], i) => {
    const cx = 200 + i * 340
    text(c, k, cx, 950, { size: 30, color: '#9a9a9a' })
    text(c, v, cx, 1010, { size: 48, bold: true, color: k === '판매가' ? '#ffd23f' : '#ececec' })
  })
  text(c, `“${def.desc}”`, W / 2, 1100, { size: 30, color: '#9a9a9a', max: W - 160 })
  footer(c, o.total)
  return c.canvas.toDataURL('image/png')
}

export async function makeDayReport(st: PersistedState, day = dayKey()): Promise<string> {
  const c = await canvas()
  const d = st.days[day] ?? { earn: 0, count: 0, casts: 0 }
  const [y] = day.split('-')
  text(c, '오늘의 월급루팡 리포트', W / 2, 130, { size: 60, bold: true })
  text(c, `${y}.${fmtDay(day)}`, W / 2, 190, { size: 30, color: '#9a9a9a' })
  text(c, '근무 중 낚시로 번 돈', W / 2, 290, { size: 36, color: '#9a9a9a' })
  text(c, fmtWon(d.earn), W / 2, 400, { size: 108, bold: true, color: '#ffd23f' })
  const wage = st.settings.hourlyWage
  if (wage > 0) text(c, `시급 ${wage.toLocaleString('ko-KR')}원 기준 ${wageTime(d.earn, wage)}`, W / 2, 470, { size: 36, color: '#ececec' })

  const cols = [
    ['잡은 물고기', `${d.count}마리`],
    ['던진 횟수', `${d.casts}번`],
    ['성공률', d.casts ? `${Math.round((d.count / d.casts) * 100)}%` : '-']
  ]
  cols.forEach(([k, v], i) => {
    const cx = 200 + i * 340
    text(c, k, cx, 570, { size: 30, color: '#9a9a9a' })
    text(c, v, cx, 630, { size: 48, bold: true })
  })

  // 오늘 최대어
  c.fillStyle = '#2a2a2a'
  c.fillRect(70, 680, W - 140, 2)
  if (d.best) {
    const def = FISH_BY_ID[d.best.fish]
    text(c, '오늘의 최고 수확', W / 2, 740, { size: 30, color: '#9a9a9a' })
    spriteIn(c, def.id, 300, 850, 360, 150)
    c.textAlign = 'left'
    text(c, def.name, 520, 830, { size: 48, bold: true, color: RARITY[def.rarity].color, align: 'left', max: 480 })
    text(c, `${fmtSize(d.best.size)} · ${fmtWon(d.best.price)}`, 520, 890, { size: 36, align: 'left', max: 480 })
  } else {
    text(c, '오늘은 아직 한 마리도… 일을 너무 열심히 했다', W / 2, 840, { size: 36, color: '#9a9a9a' })
  }

  // 오늘 잡은 것 (최근 4)
  const today = st.recent.filter((r) => dayKey(r.at) === day).slice(0, 4)
  today.forEach((r, i) => {
    const def = FISH_BY_ID[r.fish]
    const yy = 990 + i * 52
    text(c, `${fmtTime(r.at)} ${r.tag}`, 110, yy, { size: 30, color: '#9a9a9a', align: 'left' })
    text(c, def.name, 520, yy, { size: 30, color: RARITY[def.rarity].color, align: 'left', max: 280 })
    text(c, fmtWon(r.price), W - 110, yy, { size: 30, color: '#ffd23f', align: 'right' })
  })
  text(c, `누적 ${fmtWon(st.total.earn)}`, W / 2, H - 180, { size: 30, color: '#ececec' })
  footer(c, st.total.earn)
  return c.canvas.toDataURL('image/png')
}

export async function makeDexCard(st: PersistedState): Promise<string> {
  const c = await canvas()
  const known = FISH.filter((f) => st.dex[f.id]).length
  text(c, '월급루팡 물고기 도감', W / 2, 130, { size: 60, bold: true })
  text(c, `${known} / ${FISH.length} 종 · 누적 ${fmtWon(st.total.earn)}`, W / 2, 190, { size: 36, color: '#ffd23f' })
  // 물고기 수에 맞춰 칸 크기를 정한다 (위 제목 ~ 아래 꼬리말 사이에 다 들어가게)
  const n = FISH.length
  const cols = n <= 30 ? 5 : n <= 42 ? 6 : 7
  const rows = Math.ceil(n / cols)
  const cw = Math.min(190, Math.floor((W - 100) / cols))
  const ch = Math.min(150, Math.floor((H - 170 - 230) / rows))
  const nameSize = ch < 120 ? 20 : 24
  const x0 = (W - cols * cw) / 2
  const y0 = 230
  FISH.forEach((f, i) => {
    const e = st.dex[f.id]
    const x = x0 + (i % cols) * cw
    const y = y0 + Math.floor(i / cols) * ch
    c.fillStyle = e ? RARITY[f.rarity].color : '#2a2a2a'
    c.fillRect(x + 8, y + 6, cw - 16, 3)
    spriteIn(c, f.id, x + cw / 2, y + (ch - 26) / 2 + 4, cw - 30, ch - 46, e ? undefined : '#2a2a2a')
    text(c, e ? f.name : '???', x + cw / 2, y + ch - 12, { size: nameSize, color: e ? '#ececec' : '#5f5f5f', max: cw - 12 })
  })
  footer(c, st.total.earn)
  return c.canvas.toDataURL('image/png')
}
