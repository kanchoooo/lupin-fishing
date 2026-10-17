import { nativeImage, NativeImage } from 'electron'

// 트레이 아이콘: 찌(위 '#' 빨강, 아래 '+' 흰색) 도트. 런타임에 비트맵으로 만든다.
const BOBBER_16 = [
  '................',
  '.......##.......',
  '.......##.......',
  '......####......',
  '.....######.....',
  '....########....',
  '....########....',
  '...##########...',
  '...++++++++++...',
  '....++++++++....',
  '....++++++++....',
  '.....++++++.....',
  '......++++......',
  '.......++.......',
  '.......++.......',
  '................'
]

type RGB = [number, number, number]

function rasterize(rows: string[], scale: number, top: RGB, bottom: RGB, template: boolean): Buffer {
  const h = rows.length
  const w = rows[0].length
  const W = w * scale
  const buf = Buffer.alloc(W * h * scale * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x]
      if (c === '.') continue
      const [r, g, b] = c === '#' ? top : bottom
      // 맥 템플릿 이미지는 색 없이 투명도로만 보이므로 아래쪽을 옅게
      const a = template && c === '+' ? 130 : 255
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const i = ((y * scale + sy) * W + (x * scale + sx)) * 4
          // createFromBitmap 은 BGRA
          buf[i] = b
          buf[i + 1] = g
          buf[i + 2] = r
          buf[i + 3] = a
        }
      }
    }
  }
  return buf
}

export function trayIcon(): NativeImage {
  const isMac = process.platform === 'darwin'
  const top: RGB = isMac ? [0, 0, 0] : [255, 77, 77]
  const bottom: RGB = isMac ? [0, 0, 0] : [240, 240, 240]
  const img = nativeImage.createEmpty()
  img.addRepresentation({ scaleFactor: 1, width: 16, height: 16, buffer: rasterize(BOBBER_16, 1, top, bottom, isMac) })
  img.addRepresentation({ scaleFactor: 2, width: 32, height: 32, buffer: rasterize(BOBBER_16, 2, top, bottom, isMac) })
  if (isMac) img.setTemplateImage(true)
  return img
}
