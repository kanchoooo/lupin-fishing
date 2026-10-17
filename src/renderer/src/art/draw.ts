// 도트 그림 → 캔버스. 한 번 그린 것은 1배 크기 캔버스로 기억해 두고 확대해서 찍는다.
import { INK, SPRITES, type Sprite } from './sprites'

const cache = new Map<string, HTMLCanvasElement>()

export function paintRows(rows: string[], a: string, b: string, silhouette?: string): HTMLCanvasElement {
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')!
  for (let y = 0; y < h; y++) {
    const r = rows[y]
    for (let x = 0; x < r.length; x++) {
      const ch = r[x]
      if (ch === '.' || ch === ' ') continue
      c.fillStyle = silhouette ?? (ch === '#' ? a : ch === '+' ? b : (INK[ch] ?? a))
      c.fillRect(x, y, 1, 1)
    }
  }
  return cv
}

export function spriteOf(id: string): Sprite {
  return SPRITES[id] ?? SPRITES.bungeo
}

/** 1배 크기 캔버스 (silhouette 를 주면 그 색 한 가지로) */
export function spriteCanvas(id: string, silhouette?: string): HTMLCanvasElement {
  const key = id + '|' + (silhouette ?? '')
  let cv = cache.get(key)
  if (!cv) {
    const s = spriteOf(id)
    cv = paintRows(s.rows, s.a, s.b, silhouette)
    cache.set(key, cv)
  }
  return cv
}

export function spriteSize(id: string): { w: number; h: number } {
  const s = spriteOf(id)
  return { w: Math.max(...s.rows.map((r) => r.length)), h: s.rows.length }
}

/** (x, y) 를 왼쪽 위로, scale 배 정수 확대. flip = 좌우 뒤집기 */
export function drawSprite(
  c: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  scale = 1,
  o: { flip?: boolean; silhouette?: string; alpha?: number } = {}
): void {
  const cv = spriteCanvas(id, o.silhouette)
  c.save()
  c.imageSmoothingEnabled = false
  if (o.alpha !== undefined) c.globalAlpha = o.alpha
  if (o.flip) {
    c.translate(Math.round(x) + cv.width * scale, Math.round(y))
    c.scale(-1, 1)
    c.drawImage(cv, 0, 0, cv.width * scale, cv.height * scale)
  } else {
    c.drawImage(cv, Math.round(x), Math.round(y), cv.width * scale, cv.height * scale)
  }
  c.restore()
}

/** 상자 안에 들어가는 가장 큰 정수 배율 */
export function fitScale(id: string, boxW: number, boxH: number, max = 8): number {
  const { w, h } = spriteSize(id)
  return Math.max(1, Math.min(max, Math.floor(Math.min(boxW / w, boxH / h))))
}

/** 도감·카드용: 상자 가운데에 그린 캔버스 */
export function spriteImage(id: string, scale: number, silhouette?: string): HTMLCanvasElement {
  const src = spriteCanvas(id, silhouette)
  const cv = document.createElement('canvas')
  cv.width = src.width * scale
  cv.height = src.height * scale
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  c.drawImage(src, 0, 0, cv.width, cv.height)
  return cv
}
