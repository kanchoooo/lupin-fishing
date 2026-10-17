// 낚시터 그리기 (176×96 도트). 검은 밤 · 회사 빌딩 · 연못 · 사무용 의자에 앉은 월급루팡
// 투명 모양은 하늘·빌딩·물 바탕을 빼고 낚시꾼·찌·물결·물고기만 그린다. 테두리 없이, 밝은 바탕이면 검게(ink dark) 어두운 바탕이면 밝게(ink light)
import type { Look } from '@shared/types'
import { SCENE_H, SCENE_W } from '@shared/types'
import { drawSprite, paintRows, spriteSize } from '@/art/draw'
import { Game, HAND, WATER_Y } from './game'

const W = SCENE_W
const H = SCENE_H

// 앉아서 낚시하는 사람 (오른쪽을 본다). 'h' 머리 'w' 얼굴·손 '#' 셔츠 'r' 넥타이 '+' 바지 's' 의자
const ANGLER = [
  '.....hhhh.......',
  '....hhhhhh......',
  '....hhwwww......',
  '....hwwwkw......',
  '.....wwww.......',
  '.ss..####.......',
  '.ss.######......',
  '.ss.##r#####ww..',
  '.ss.##r##.......',
  '.ss.##r##.......',
  '.ss.#####.......',
  '.ssss+++++++....',
  '.ssss++++++++...',
  '...s......++....',
  '...s......++....',
  '...s......++....',
  '..sss....+++....',
  '.s.s.s..........'
]
const ANGLER_X = 6
const ANGLER_Y = 33

// 커피 한 잔
const CUP = ['.w.', 'w..', '###', '##+', '##.']

/** 투명 모양에서 선·글자 색: dark = 검은 선 (밝은 화면 위) · light = 밝은 선 (어두운 화면 위) */
export type Ink = 'dark' | 'light'

/** 지금 그리는 모양 (null = 풍경) */
let clearInk: Ink | null = null

const anglerCv = new Map<string, HTMLCanvasElement>()
let cupCv: HTMLCanvasElement | null = null

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const rnd = seeded(20260517)
const STARS = Array.from({ length: 26 }, () => ({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 34), p: rnd() * 6, s: rnd() < 0.15 }))

interface Building {
  x: number
  w: number
  h: number
  wins: { x: number; y: number; seed: number }[]
}

const BUILDINGS: Building[] = (() => {
  const out: Building[] = []
  let x = 36
  while (x < W) {
    const w = 8 + Math.floor(rnd() * 12)
    const h = 8 + Math.floor(rnd() * 20)
    const wins: Building['wins'] = []
    for (let wy = WATER_Y - h + 3; wy < WATER_Y - 3; wy += 3) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        if (rnd() < 0.55) wins.push({ x: wx, y: wy, seed: rnd() })
      }
    }
    out.push({ x, w, h, wins })
    x += w + (rnd() < 0.3 ? 2 : 0)
  }
  return out
})()

function px(c: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), 1, 1)
}

/** 2차 곡선을 1픽셀 점으로 */
function curve(c: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, color: string, clipY?: number): void {
  const n = Math.max(8, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.4))
  c.fillStyle = color
  let lx = NaN
  let ly = NaN
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const x = Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1)
    const y = Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1)
    if (x === lx && y === ly) continue
    if (clipY !== undefined && y > clipY) continue
    c.fillRect(x, y, 1, 1)
    lx = x
    ly = y
  }
}

function drawSky(c: CanvasRenderingContext2D, g: Game): void {
  for (const s of STARS) {
    const tw = Math.sin(g.time * 1.3 + s.p)
    if (tw < -0.6) continue
    px(c, s.x, s.y, s.s && tw > 0.7 ? '#ffffff' : '#5a5a5a')
  }
  // 초승달
  const mx = 150
  const my = 9
  c.fillStyle = '#e8e8e8'
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      if (x * x + y * y <= 25 && (x - 2) * (x - 2) + (y + 1) * (y + 1) > 16) c.fillRect(mx + x, my + y, 1, 1)
    }
  }
}

function drawCity(c: CanvasRenderingContext2D, g: Game): void {
  // 야근 불빛: 1분마다 몇 개씩 켜지고 꺼진다
  const minute = Math.floor(Date.now() / 60000)
  for (const b of BUILDINGS) {
    c.fillStyle = '#121212'
    c.fillRect(b.x, WATER_Y - b.h, b.w, b.h)
    c.fillStyle = '#262626'
    c.fillRect(b.x, WATER_Y - b.h, b.w, 1)
    c.fillRect(b.x, WATER_Y - b.h, 1, b.h)
    for (const w of b.wins) {
      const on = (Math.sin(w.seed * 999 + minute * 0.7) + 1) / 2 > 0.45
      if (!on) continue
      px(c, w.x, w.y, w.seed > 0.85 ? '#8a7a3a' : '#4a4a4a')
    }
  }
  // 깜빡이는 옥상 불빛 하나
  if (Math.sin(g.time * 3) > 0.3) {
    const t = BUILDINGS.reduce((a, b) => (b.h > a.h ? b : a), BUILDINGS[0])
    px(c, t.x + Math.floor(t.w / 2), WATER_Y - t.h - 1, '#ff4d4d')
  }
}

function drawWater(c: CanvasRenderingContext2D, g: Game): void {
  c.fillStyle = '#050505'
  c.fillRect(0, WATER_Y, W, H - WATER_Y)
  c.fillStyle = '#5a5a5a'
  c.fillRect(30, WATER_Y, W - 30, 1)
  // 물결: 줄마다 다른 속도로 흐르는 점선
  for (let row = 0, y = WATER_Y + 3; y < H; row++, y += 4) {
    const speed = 3 + row * 1.5
    const off = (g.time * speed + row * 7) % 12
    c.fillStyle = row % 2 ? '#1e1e1e' : '#2b2b2b'
    for (let x = -12 + off; x < W; x += 12) {
      c.fillRect(Math.round(x), y, 4 + (row % 3), 1)
    }
  }
  // 달 그림자
  for (let i = 0; i < 6; i++) {
    const y = WATER_Y + 3 + i * 4
    const w = 6 - i + Math.round(Math.sin(g.time * 2 + i) * 1.5)
    c.fillStyle = i < 2 ? '#9a9a9a' : '#5a5a5a'
    c.fillRect(150 - Math.floor(w / 2) + Math.round(Math.sin(g.time * 1.5 + i * 2)), y, Math.max(1, w), 1)
  }
}

function drawPier(c: CanvasRenderingContext2D, clear = false): void {
  // 나무 데크
  c.fillStyle = '#7a7a7a'
  c.fillRect(0, 51, 34, 1)
  c.fillStyle = '#3a3a3a'
  c.fillRect(0, 52, 34, 2)
  c.fillStyle = '#7a7a7a'
  for (let x = 2; x < 34; x += 6) c.fillRect(x, 52, 1, 2)
  // 기둥 (투명 모양은 물에 살짝 잠기는 데까지만)
  c.fillStyle = '#4a4a4a'
  for (const x of [4, 18, 31]) c.fillRect(x, 54, 2, clear ? WATER_Y + 3 - 54 : H - 54)
}

function anglerCanvas(): HTMLCanvasElement {
  const key = clearInk ?? 'scene'
  let cv = anglerCv.get(key)
  if (cv) return cv
  cv = paintRows(ANGLER, '#e6e6e6', '#55606e')
  const cc = cv.getContext('2d')!
  // 머리·얼굴·의자 색. 투명 모양은 얼굴을 살색으로 (흰 바탕에서 얼굴이 안 사라지게), 눈은 색 바꾸기 뒤에 까맣게 남는 색
  const face = clearInk ? '#e0b088' : null
  const eye = clearInk === 'dark' ? '#b8b8b8' : '#000000'
  for (let y = 0; y < ANGLER.length; y++) {
    for (let x = 0; x < ANGLER[y].length; x++) {
      const ch = ANGLER[y][x]
      const col = ch === 'h' ? '#9a9a9a' : ch === 's' ? '#6b7480' : ch === 'k' ? eye : ch === 'w' ? face : null
      if (col) {
        cc.fillStyle = col
        cc.fillRect(x, y, 1, 1)
      }
    }
  }
  anglerCv.set(key, cv)
  return cv
}

function drawAngler(c: CanvasRenderingContext2D, g: Game): void {
  if (!cupCv) cupCv = paintRows(CUP, '#d8d8d8', '#9a9a9a')
  // 힘겨루기 중엔 몸이 들썩인다
  const bounce = g.phase === 'fight' && g.held ? Math.round(Math.sin(g.time * 30) * 0.6) : 0
  c.drawImage(anglerCanvas(), ANGLER_X, ANGLER_Y + bounce)
  c.drawImage(cupCv, 27, 46)
  // 김
  if (Math.sin(g.time * 2) > 0) px(c, 28 + Math.round(Math.sin(g.time * 3)), 43, '#5a5a5a')
}

function drawRod(c: CanvasRenderingContext2D, g: Game): { x: number; y: number } {
  const tip = g.rodTip()
  const fighting = g.phase === 'fight' || g.phase === 'finish'
  const bend = fighting ? g.tension * 10 + (g.rush > 0 ? Math.sin(g.time * 40) * 1.5 : 0) : 0
  const tx = tip.x + (fighting ? bend * 0.6 : 0)
  const ty = tip.y + (fighting ? bend : 0)
  // 휜 정도: 가운데 조절점을 위로
  const cx = (HAND.x + tx) / 2 - bend * 0.3
  const cy = (HAND.y + ty) / 2 - 2 - bend * 0.4
  curve(c, HAND.x, HAND.y, cx, cy, tx, ty, '#cfcfcf')
  // 손잡이
  c.fillStyle = '#6a6a6a'
  c.fillRect(HAND.x - 2, HAND.y + 1, 2, 2)
  return { x: Math.round(tx), y: Math.round(ty) }
}

function drawBobber(c: CanvasRenderingContext2D, x: number, y: number, dip: number): void {
  // 위 빨강 3칸 · 아래 흰색. 물속으로 들어간 부분은 안 보임
  const top = Math.round(y - 5 + dip)
  const rows = [
    [1, '#ff4d4d', 1],
    [0, '#ff4d4d', 3],
    [0, '#ff4d4d', 3],
    [0, '#f0f0f0', 3],
    [1, '#f0f0f0', 1]
  ] as const
  rows.forEach(([ox, col, w], i) => {
    const yy = top + i
    if (yy > WATER_Y) return
    c.fillStyle = yy === WATER_Y ? '#7a7a7a' : col
    c.fillRect(Math.round(x) - 1 + ox, yy, w, 1)
  })
}

function drawLine(c: CanvasRenderingContext2D, g: Game, tip: { x: number; y: number }): void {
  const p = g.phase
  // 투명 모양은 줄을 조금 더 진하게 (색 바꾸기 뒤 검은 선)
  const LINE = clearInk ? '#a8a8a8' : '#6a6a6a'
  const TAUT = clearInk ? '#b8b8b8' : '#9a9a9a'
  if (p === 'idle' || p === 'charge' || p === 'result' || p === 'fail') {
    // 줄을 감아 둔 상태: 끝에 찌가 대롱대롱
    const sway = Math.sin(g.time * 2) * 1.5
    const bx = tip.x + sway
    const by = tip.y + 10
    curve(c, tip.x, tip.y, tip.x + sway / 2, tip.y + 5, bx, by, LINE)
    drawBobber(c, bx, by + 5, 0)
    return
  }
  if (p === 'cast') {
    curve(c, tip.x, tip.y, (tip.x + g.bob.x) / 2, Math.min(tip.y, g.bob.y) - 4, g.bob.x, g.bob.y - 4, LINE)
    drawBobber(c, g.bob.x, g.bob.y, 0)
    return
  }
  if (p === 'wait' || p === 'bite') {
    const bobY = WATER_Y + Math.sin(g.time * 2.2) * 0.6
    const sag = 10
    curve(c, tip.x, tip.y, (tip.x + g.bob.x) / 2, Math.max(tip.y, WATER_Y - 6) + sag * 0.3, g.bob.x, bobY - 4 + g.dip, LINE)
    drawBobber(c, g.bob.x, bobY, g.dip)
    if (p === 'bite') {
      // 느낌표 (깜빡)
      if (Math.floor(g.pt * 10) % 2 === 0) {
        const x = Math.round(g.bob.x) - 1
        const y = WATER_Y - 18
        c.fillStyle = '#ffd23f'
        c.fillRect(x, y, 3, 7)
        c.fillRect(x, y + 9, 3, 3)
      }
    }
    return
  }
  if (p === 'fight') {
    // 팽팽한 줄: 끝이 물속 물고기 입으로
    const shakeY = g.tension > 0.85 ? Math.round(Math.sin(g.time * 60)) : 0
    const sag = Math.max(0, (0.5 - g.tension) * 10)
    curve(c, tip.x, tip.y, (tip.x + g.fishX) / 2, (tip.y + WATER_Y) / 2 + sag + shakeY, g.fishX - 2, WATER_Y, g.tension > 0.85 ? '#ff8f8f' : TAUT)
    return
  }
  if (p === 'finish') {
    const f = g.fish!
    const { h } = spriteSize(f.id)
    const jump = WATER_Y - h - 6 - Math.abs(Math.sin(g.pt * 3.2)) * 10
    curve(c, tip.x, tip.y, (tip.x + g.fishX) / 2, Math.min(tip.y, jump) + 6, g.fishX, jump + h / 2, TAUT)
    return
  }
  if (p === 'landing') {
    const k = Math.min(1, g.pt / 0.7)
    const fx = g.fishX + (HAND.x + 10 - g.fishX) * k
    const fy = WATER_Y - 10 - Math.sin(k * Math.PI) * 26
    curve(c, tip.x, tip.y, (tip.x + fx) / 2, Math.min(tip.y, fy) - 2, fx, fy, TAUT)
  }
}

function drawFish(c: CanvasRenderingContext2D, g: Game, clear: boolean): void {
  const f = g.fish
  if (!f) return
  const { w, h } = spriteSize(f.id)
  if (g.phase === 'fight') {
    // 물속 그림자 (머리가 낚시꾼 쪽). 투명 모양은 바탕이 밝을 수도 있어 밝은 회색
    const sil = clear ? (g.rush > 0 ? '#c8c8c8' : '#8a8a8a') : g.rush > 0 ? '#4a4a4a' : '#2e2e2e'
    drawSprite(c, f.id, g.fishX - 2, g.fishY - h / 2 + 3, 1, { silhouette: sil })
  } else if (clear) {
    // 투명 모양: 색 바꾸기를 안 거치게 renderClear 가 맨 위에 따로 그린다
    return
  } else if (g.phase === 'finish') {
    const jump = WATER_Y - h - 6 - Math.abs(Math.sin(g.pt * 3.2)) * 10
    drawSprite(c, f.id, g.fishX - 2, jump, 1)
  } else if (g.phase === 'landing') {
    const k = Math.min(1, g.pt / 0.7)
    const fx = g.fishX + (HAND.x + 10 - g.fishX) * k
    const fy = WATER_Y - 10 - Math.sin(k * Math.PI) * 26
    drawSprite(c, f.id, fx - w / 2, fy - h / 2, 1)
  }
}

/** 낚시 자리 표시: 물 위 ▼ + 물결 점. 끌어서 옮긴다 */
function drawSpot(c: CanvasRenderingContext2D, g: Game): void {
  const x = Math.round(g.spotX)
  const on = g.dragging === 'spot'
  const bob = Math.round(Math.sin(g.time * 3) * 1)
  const col = on ? '#ffd23f' : '#8a7a3a'
  c.fillStyle = col
  const y = WATER_Y - 8 + (on ? 0 : bob)
  c.fillRect(x - 2, y, 5, 1)
  c.fillRect(x - 1, y + 1, 3, 1)
  c.fillRect(x, y + 2, 1, 1)
  // 물 위 점선 고리
  c.fillStyle = on ? '#ffd23f' : '#5a5a5a'
  for (const dx of [-6, -4, 4, 6]) c.fillRect(x + dx, WATER_Y + 1, 1, 1)
  c.fillRect(x - 2, WATER_Y + 2, 5, 1)
}

function drawFightHud(c: CanvasRenderingContext2D, g: Game): void {
  // 장력 (오른쪽 세로 막대): 초록 = 좋음, 노랑, 빨강 = 끊어지기 직전
  const x = 168
  const y0 = 8
  const hh = 40
  if (clearInk) {
    // 투명 모양: 테두리 없이 게이지만
    c.fillStyle = '#2a2a2a'
    c.fillRect(x, y0, 3, hh)
  } else {
    c.fillStyle = '#3a3a3a'
    c.fillRect(x - 1, y0 - 1, 5, hh + 2)
    c.fillStyle = '#000'
    c.fillRect(x, y0, 3, hh)
  }
  const t = Math.min(1, g.tension)
  const fill = Math.round(hh * t)
  const col = t > 0.88 ? (Math.floor(g.time * 12) % 2 ? '#ff4d4d' : '#ff9a9a') : t > 0.7 ? '#ffd23f' : t < 0.12 ? '#5a5a5a' : '#6fe08c'
  c.fillStyle = col
  c.fillRect(x, y0 + hh - fill, 3, fill)
  // 눈금: 위험선
  c.fillStyle = '#ff4d4d'
  c.fillRect(x - 2, y0 + Math.round(hh * 0.12), 1, 1)
  // 거리 (아래 가로 막대): 물고기가 얼마나 끌려왔나
  const bx = 40
  const by = 84
  const bw = 120
  c.fillStyle = '#2a2a2a'
  c.fillRect(bx, by, bw, 2)
  const pw = Math.round(bw * Math.max(0, Math.min(1, g.progress)))
  c.fillStyle = g.rush > 0 ? '#ff8f8f' : '#e6e6e6'
  c.fillRect(bx + bw - pw, by, pw, 2)
  // 낚시꾼 쪽 끝 표시
  c.fillStyle = '#6fe08c'
  c.fillRect(bx, by - 1, 1, 4)
}

function drawFinishHud(c: CanvasRenderingContext2D, g: Game): void {
  const x0 = 38
  const y = 12
  const w = 100
  if (clearInk) {
    c.fillStyle = '#2a2a2a'
    c.fillRect(x0, y + 1, w, 3)
  } else {
    c.fillStyle = '#3a3a3a'
    c.fillRect(x0 - 1, y - 1, w + 2, 7)
    c.fillStyle = '#000'
    c.fillRect(x0, y, w, 5)
  }
  const zx = Math.round(x0 + (g.zone - g.zoneW / 2) * w)
  const zw = Math.max(2, Math.round(g.zoneW * w))
  c.fillStyle = '#2f7a46'
  c.fillRect(zx, y, zw, 5)
  c.fillStyle = '#6fe08c'
  c.fillRect(zx, y + 1, zw, 3)
  c.fillStyle = '#ffd23f'
  c.fillRect(Math.round(x0 + g.zone * w) - 1, y, 2, 5)
  const cx = Math.round(x0 + g.cursor * w)
  c.fillStyle = '#ffffff'
  c.fillRect(cx, y - 3, 1, 11)
  c.fillRect(cx - 1, y - 3, 3, 1)
  c.fillRect(cx - 1, y + 7, 3, 1)
  // 맞혀야 하는 횟수
  for (let i = 0; i < g.hitsNeeded; i++) {
    c.fillStyle = i < g.hits ? '#ffd23f' : '#3a3a3a'
    c.fillRect(x0 + w / 2 - g.hitsNeeded * 3 + i * 6 + 1, y + 9, 4, 2)
  }
}

function drawChargeHud(c: CanvasRenderingContext2D, g: Game): void {
  const x = HAND.x - 10
  const y = 24
  if (clearInk) {
    c.fillStyle = '#2a2a2a'
    c.fillRect(x, y, 2, 16)
  } else {
    c.fillStyle = '#3a3a3a'
    c.fillRect(x - 1, y - 1, 4, 18)
    c.fillStyle = '#000'
    c.fillRect(x, y, 2, 16)
  }
  const f = Math.round(16 * g.power)
  c.fillStyle = g.power > 0.8 ? '#ffd23f' : '#e6e6e6'
  c.fillRect(x, y + 16 - f, 2, f)
}

/** 투명 모양의 물: 풍경과 같은 물가 선 + 줄마다 다른 속도로 흐르는 물결 선 (바탕은 비움) */
function drawWaterClear(c: CanvasRenderingContext2D, g: Game): void {
  c.fillStyle = '#7a7a7a'
  c.fillRect(30, WATER_Y, W - 30, 1)
  for (let row = 0, y = WATER_Y + 4; y < H; row++, y += 5) {
    const speed = 3 + row * 1.5
    const off = (g.time * speed + row * 7) % 14
    c.fillStyle = row % 2 ? '#3a3a3a' : '#4a4a4a'
    for (let x = 30 - 14 + off; x < W; x += 14) {
      const xx = Math.round(x)
      if (xx + 5 > 30) c.fillRect(Math.max(30, xx), y, 4 + (row % 3), 1)
    }
  }
}

/** 낚시꾼부터 위쪽 표시까지 (두 모양이 같이 쓴다) */
function drawForeground(c: CanvasRenderingContext2D, g: Game, clear: boolean): void {
  for (const r of g.ripples) {
    const col = r.life > 0.6 ? '#7a7a7a' : '#3a3a3a'
    c.fillStyle = col
    const rx = Math.round(r.r)
    c.fillRect(Math.round(r.x - rx), WATER_Y + 1, Math.max(1, Math.round(rx / 2)), 1)
    c.fillRect(Math.round(r.x + rx / 2), WATER_Y + 1, Math.max(1, Math.round(rx / 2)), 1)
  }
  drawPier(c, clear)
  if (g.phase === 'idle' || g.phase === 'charge' || g.dragging === 'spot') drawSpot(c, g)
  drawAngler(c, g)
  drawFish(c, g, clear)
  const tip = drawRod(c, g)
  drawLine(c, g, tip)
  for (const p of g.particles) px(c, p.x, p.y, p.color)
  if (g.phase === 'charge') drawChargeHud(c, g)
  if (g.phase === 'fight') drawFightHud(c, g)
  if (g.phase === 'finish') drawFinishHud(c, g)
}

let layer: CanvasRenderingContext2D | null = null

function offscreen(): CanvasRenderingContext2D {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d', { willReadFrequently: true })!
  c.imageSmoothingEnabled = false
  return c
}

/**
 * 풍경용 색을 투명 모양 색으로: 회색은 dark 면 밝기를 뒤집어 진하게 (흰 바탕 위 검은 선), light 면 조금 더 밝게.
 * 색 있는 점(찌·게이지·▼)은 그대로, dark 면 흰 바탕에서 보이게 살짝 어둡게
 */
function inkPixels(l: CanvasRenderingContext2D, ink: Ink): void {
  const img = l.getImageData(0, 0, W, H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const r = d[i]
    const gg = d[i + 1]
    const b = d[i + 2]
    const mx = Math.max(r, gg, b)
    const mn = Math.min(r, gg, b)
    if (mx - mn < 28) {
      const v = ink === 'dark' ? 255 - ((r + gg + b) / 3) * 1.3 : ((r + gg + b) / 3) * 1.15 + 25
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, Math.round(v)))
    } else if (ink === 'dark') {
      d[i] = r * 0.8
      d[i + 1] = gg * 0.8
      d[i + 2] = b * 0.8
    }
  }
  l.putImageData(img, 0, 0)
}

/** 물 위로 올라온 물고기 (제 색 그대로) */
function drawFishUp(c: CanvasRenderingContext2D, g: Game): void {
  const f = g.fish
  if (!f) return
  const { w, h } = spriteSize(f.id)
  if (g.phase === 'finish') {
    const jump = WATER_Y - h - 6 - Math.abs(Math.sin(g.pt * 3.2)) * 10
    drawSprite(c, f.id, g.fishX - 2, jump, 1)
  } else if (g.phase === 'landing') {
    const k = Math.min(1, g.pt / 0.7)
    const fx = g.fishX + (HAND.x + 10 - g.fishX) * k
    const fy = WATER_Y - 10 - Math.sin(k * Math.PI) * 26
    drawSprite(c, f.id, fx - w / 2, fy - h / 2, 1)
  }
}

let fishLayer: CanvasRenderingContext2D | null = null

/** 검은 선 모양: 물 위 물고기의 흰 비늘이 흰 바탕에 묻히지 않게 아주 밝은 회색만 살짝 어둡게 */
function dimWhites(l: CanvasRenderingContext2D): void {
  const img = l.getImageData(0, 0, W, H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const mx = Math.max(d[i], d[i + 1], d[i + 2])
    const mn = Math.min(d[i], d[i + 1], d[i + 2])
    if (mn > 200 && mx - mn < 40) {
      d[i] *= 0.8
      d[i + 1] *= 0.8
      d[i + 2] *= 0.8
    }
  }
  l.putImageData(img, 0, 0)
}

function renderClear(c: CanvasRenderingContext2D, g: Game, ink: Ink): void {
  layer ??= offscreen()
  const l = layer
  clearInk = ink
  l.clearRect(0, 0, W, H)
  l.save()
  const sx = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake * 2) : 0
  const sy = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0
  l.translate(sx, sy)
  drawWaterClear(l, g)
  drawForeground(l, g, true)
  l.restore()
  inkPixels(l, ink)
  clearInk = null
  c.save()
  c.imageSmoothingEnabled = false
  c.clearRect(0, 0, W, H)
  c.drawImage(l.canvas, 0, 0)
  if (g.fish && (g.phase === 'finish' || g.phase === 'landing')) {
    if (ink === 'dark') {
      fishLayer ??= offscreen()
      fishLayer.clearRect(0, 0, W, H)
      fishLayer.save()
      fishLayer.translate(sx, sy)
      drawFishUp(fishLayer, g)
      fishLayer.restore()
      dimWhites(fishLayer)
      c.drawImage(fishLayer.canvas, 0, 0)
    } else {
      c.translate(sx, sy)
      drawFishUp(c, g)
    }
  }
  c.restore()
}

export function renderScene(c: CanvasRenderingContext2D, g: Game, look: Look = 'scene', ink: Ink = 'dark'): void {
  if (look === 'clear') return renderClear(c, g, ink)
  c.save()
  c.imageSmoothingEnabled = false
  c.fillStyle = '#000'
  c.fillRect(0, 0, W, H)
  if (g.shake > 0) c.translate(Math.round((Math.random() - 0.5) * g.shake * 2), Math.round((Math.random() - 0.5) * g.shake))
  drawSky(c, g)
  drawCity(c, g)
  drawWater(c, g)
  drawForeground(c, g, false)
  c.restore()
  if (g.flash > 0) {
    c.fillStyle = `rgba(255,255,255,${g.flash * 0.22})`
    c.fillRect(0, 0, W, H)
  }
}
