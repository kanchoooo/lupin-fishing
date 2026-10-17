// 그림 확인용 페이지 (앱에는 안 들어감): lab.html#icon · #sheet · #scenes · #clear (투명 모양, 흰 문서 위 검은 선) · #clear-dark (어두운 화면 위 밝은 선)
import '@/common/base.css'
import { FISH, RARITY } from '@shared/fish'
import { SCENE_H, SCENE_W } from '@shared/types'
import { drawSprite, spriteSize } from '@/art/draw'
import { Game, type Phase } from '@/widget/game'
import { renderScene } from '@/widget/scene'

const ICON = [
  '................................',
  '................................',
  '.........................www....',
  '........................ww......',
  '.......................ww.......',
  '.......................ww.......',
  '........................ww......',
  '.........................www....',
  '...............yy...............',
  '...............yy...............',
  '...............yy...............',
  '...............yy...............',
  '...............yy...............',
  '................................',
  '...............yy...............',
  '...............yy...............',
  '................................',
  '...............rr...............',
  '..............rrrr..............',
  '.............rrrrrr.............',
  '.............rrrrrr.............',
  'ggggggggggggg######ggggggggggggg',
  '..............####..............',
  '.....ddd.......##.......ddd.....',
  '................................',
  '.........dddd........ddddd......',
  '................................',
  '...ddddd.......sss.........ddd..',
  '..............sssss.ss..........',
  '.............ssssssss...........',
  '..............sssss.ss..........',
  '................................'
]

/** 앱 아이콘: 까만 둥근 사각형 + 도트 찌 + 느낌표 */
export function drawAppIcon(c: CanvasRenderingContext2D, S: number): void {
  const M = S * 0.098
  const B = S - M * 2
  const r = B * 0.2237
  c.save()
  c.translate(M, M)
  c.beginPath()
  c.roundRect(0, 0, B, B, r)
  c.clip()
  c.fillStyle = '#000'
  c.fillRect(0, 0, B, B)
  const n = 32
  const cell = Math.floor(B / n)
  const off = (B - cell * n) / 2
  const col: Record<string, string> = { w: '#e8e8e8', y: '#ffd23f', r: '#ff4d4d', '#': '#f2f2f2', g: '#6a6a6a', d: '#3a3a3a', s: '#7a7a7a' }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const ch = ICON[y]?.[x] ?? '.'
      if (ch === '.') continue
      c.fillStyle = col[ch] ?? '#fff'
      c.fillRect(off + x * cell, off + y * cell, cell, cell)
    }
  }
  c.restore()
  c.save()
  c.translate(M, M)
  c.beginPath()
  c.roundRect(0.5, 0.5, B - 1, B - 1, r)
  c.strokeStyle = '#2a2a2a'
  c.lineWidth = Math.max(1, S / 256)
  c.stroke()
  c.restore()
}

function full(w: number, h: number): CanvasRenderingContext2D {
  document.body.style.overflow = 'hidden'
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  cv.style.width = w + 'px'
  cv.style.height = h + 'px'
  document.body.appendChild(cv)
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  return c
}

async function main(): Promise<void> {
  await document.fonts.load("12px 'Galmuri11'").catch(() => undefined)
  const page = location.hash.slice(1)
  if (page === 'icon') {
    const S = window.innerWidth
    const c = full(S, S)
    c.clearRect(0, 0, S, S)
    document.body.style.background = 'transparent'
    drawAppIcon(c, S)
    return
  }
  if (page === 'sheet') {
    const c = full(window.innerWidth, window.innerHeight)
    c.fillStyle = '#000'
    c.fillRect(0, 0, c.canvas.width, c.canvas.height)
    const cols = 4
    const cw = c.canvas.width / cols
    FISH.forEach((f, i) => {
      const x = (i % cols) * cw + 10
      const y = Math.floor(i / cols) * 90 + 10
      const { w } = spriteSize(f.id)
      const sc = Math.max(1, Math.min(4, Math.floor((cw - 20) / w)))
      drawSprite(c, f.id, x, y + 18, sc)
      c.fillStyle = RARITY[f.rarity].color
      c.font = "12px 'Galmuri11'"
      c.fillText(`${f.name} (${RARITY[f.rarity].label})`, x, y + 12)
    })
    return
  }
  const clear = page === 'clear' || page === 'clear-dark'
  const ink = page === 'clear-dark' ? 'light' : 'dark'
  // scenes: 단계별 장면
  const phases: [Phase, string][] = [
    ['idle', ''],
    ['charge', ''],
    ['wait', ''],
    ['bite', 'salmon'],
    ['fight', 'tuna'],
    ['finish', 'quitcarp'],
    ['landing', 'goldfish'],
    ['fail', '']
  ]
  const S = 2
  const c = full(SCENE_W * S * 2 + 30, (SCENE_H * S + 26) * 4)
  c.fillStyle = '#222'
  c.fillRect(0, 0, c.canvas.width, c.canvas.height)
  const tmp = document.createElement('canvas')
  tmp.width = SCENE_W
  tmp.height = SCENE_H
  const tc = tmp.getContext('2d')!
  /** 투명 모양 확인용 가짜 바탕화면: 흰 문서 (clear-dark 는 어두운 편집기) */
  const desk = (x: number, y: number, w: number, h: number): void => {
    c.fillStyle = ink === 'dark' ? '#ffffff' : '#1e1f24'
    c.fillRect(x, y, w, h)
    for (let yy = y + 8; yy < y + h - 6; yy += 14) {
      c.fillStyle = ink === 'dark' ? '#dfe3e8' : '#3b4252'
      c.fillRect(x + 10, yy, ((yy * 37) % (w - 60)) + 40, 6)
    }
  }
  phases.forEach(([ph, fish], i) => {
    const g = new Game({ onCast: () => undefined, onEscape: () => undefined, onCatch: async () => null })
    g.time = 3.3
    g.debugSet(ph, fish || 'salmon')
    if (ph === 'charge') g.power = 0.7
    if (ph === 'landing') {
      g.fishX = 110
      g.pt = 0.35
    }
    if (ph === 'finish') {
      g.pt = 0.4
      g.cursor = 0.3
    }
    g.particles = []
    g.shake = 0
    g.flash = 0
    renderScene(tc, g, clear ? 'clear' : 'scene', ink)
    const x = (i % 2) * (SCENE_W * S + 10) + 10
    const y = Math.floor(i / 2) * (SCENE_H * S + 26) + 20
    if (clear) desk(x, y, SCENE_W * S, SCENE_H * S)
    c.drawImage(tmp, x, y, SCENE_W * S, SCENE_H * S)
    c.fillStyle = '#fff'
    c.font = "12px 'Galmuri11'"
    c.fillText(ph, x, y - 6)
  })
}

void main()
