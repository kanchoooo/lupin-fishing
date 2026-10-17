import { useEffect, useRef } from 'react'
import { fitScale, spriteImage } from '@/art/draw'

/** 상자 안에 정수 배율로 꽉 차게 그린 도트 그림 */
export function SpriteBox(p: { id: string; w: number; h: number; max?: number; silhouette?: string; className?: string }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    const sc = fitScale(p.id, p.w, p.h, p.max ?? 6)
    const img = spriteImage(p.id, sc * dpr, p.silhouette)
    img.style.width = `${img.width / dpr}px`
    img.style.height = `${img.height / dpr}px`
    el.replaceChildren(img)
  }, [p.id, p.w, p.h, p.max, p.silhouette])
  return <div ref={ref} className={p.className} style={{ width: p.w, height: p.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
}
