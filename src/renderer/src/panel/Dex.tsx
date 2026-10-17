import { useEffect, useState } from 'react'
import { dayKey, fmtDay, fmtTime, fmtWon } from '@shared/day'
import { FISH, FISH_BY_ID, fmtSize, hotFishOf, priceOf, RARITIES, RARITY } from '@shared/fish'
import type { PersistedState } from '@shared/types'
import { makeCatchCard, makeDexCard } from '@/common/share'
import { SpriteBox } from '@/common/SpriteBox'
import { useShare } from './useShare'

export function Dex({ st }: { st: PersistedState }): React.JSX.Element {
  const [sel, setSel] = useState<string | null>(null)
  const { share, busy } = useShare()
  const known = FISH.filter((f) => st.dex[f.id]).length
  const hot = hotFishOf(dayKey())

  return (
    <div className="dex">
      <div className="row between">
        <div>
          도감 <b className="big">{known}</b>
          <span className="faint"> / {FISH.length}종</span> · 총 {st.total.count}마리
        </div>
        <button className="pix-btn" disabled={busy} onClick={() => void share(() => makeDexCard(st), '월급루팡-도감')}>
          도감 자랑하기
        </button>
      </div>
      <div className="hot-line">
        오늘의 시세 <b>{hot.name}</b> 판매가 ×2 <span className="faint">(매일 자정에 바뀌어요)</span>
      </div>

      {RARITIES.map((r) => (
        <section key={r} className={`dex-group r-${r}`}>
          <div className="dex-h">
            <span className="rar">■ {RARITY[r].label}</span>
            <span className="faint">
              {FISH.filter((f) => f.rarity === r && st.dex[f.id]).length}/{FISH.filter((f) => f.rarity === r).length}
            </span>
          </div>
          <div className="dex-grid">
            {FISH.filter((f) => f.rarity === r).map((f) => {
              const en = st.dex[f.id]
              return (
                <button key={f.id} className={`dex-cell ${en ? 'got' : ''} ${sel === f.id ? 'sel' : ''}`} onClick={() => setSel(f.id)}>
                  {hot.id === f.id && <span className="hot">×2</span>}
                  <SpriteBox id={f.id} w={84} h={36} max={3} silhouette={en ? undefined : '#262626'} />
                  <div className="dc-name">{en ? f.name : '???'}</div>
                  <div className="dc-sub">{en ? `${en.count}마리 · ${fmtSize(en.bestSize)}` : '-'}</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {sel && <DexDetail st={st} id={sel} onPick={setSel} onClose={() => setSel(null)} />}
    </div>
  )
}

/** 누른 물고기 설명: 도감 위에 떠서, 어디를 눌러도 바로 보인다. ← → 로 넘기기 */
function DexDetail(p: { st: PersistedState; id: string; onPick: (id: string) => void; onClose: () => void }): React.JSX.Element | null {
  const { share, busy } = useShare()
  const def = FISH_BY_ID[p.id]
  const e = p.st.dex[p.id]
  const i = FISH.findIndex((f) => f.id === p.id)
  const { onPick, onClose } = p
  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.code === 'Escape') onClose()
      else if (ev.code === 'ArrowLeft') onPick(FISH[(i - 1 + FISH.length) % FISH.length].id)
      else if (ev.code === 'ArrowRight') onPick(FISH[(i + 1) % FISH.length].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, onPick, onClose])
  if (!def) return null
  // 이 물고기를 가장 비싸게 판 기록 (최근 기록 안에서)
  const best = p.st.recent.filter((r) => r.fish === def.id).reduce<(typeof p.st.recent)[number] | null>((a, r) => (!a || r.price > a.price ? r : a), null)
  const hot = hotFishOf(dayKey()).id === def.id
  return (
    <div className="modal-bg" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className={`modal dex-detail r-${def.rarity}`}>
        <div className="row between">
          <span className="rar">
            ■ {RARITY[def.rarity].label} · {i + 1}/{FISH.length}
          </span>
          <button className="modal-x" title="닫기 (ESC)" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dd-pic">
          <button className="dd-nav" title="이전 (←)" onClick={() => onPick(FISH[(i - 1 + FISH.length) % FISH.length].id)}>
            ‹
          </button>
          <SpriteBox id={def.id} w={260} h={110} max={8} silhouette={e ? undefined : '#2a2a2a'} />
          <button className="dd-nav" title="다음 (→)" onClick={() => onPick(FISH[(i + 1) % FISH.length].id)}>
            ›
          </button>
        </div>
        <div className="dd-name">
          {e ? def.name : '???'}
          {hot && <span className="dd-hot">오늘의 시세 ×2</span>}
        </div>
        <div className="faint">{e ? `“${def.desc}”` : '아직 못 잡았어요. 어떤 물고기일까요?'}</div>
        <div className="dd-stats">
          <div>
            <span className="faint">크기</span>
            <b>{def.junk ? fmtSize(def.min) : `${fmtSize(def.min)} ~ ${fmtSize(def.max)}`}</b>
          </div>
          <div>
            <span className="faint">기본가</span>
            <b className="gold">{fmtWon(priceOf(def, (def.min + def.max) / 2))}</b>
          </div>
          <div>
            <span className="faint">잡은 수</span>
            <b>{e ? `${e.count}마리` : '-'}</b>
          </div>
          <div>
            <span className="faint">최대 크기</span>
            <b>{e ? fmtSize(e.bestSize) : '-'}</b>
          </div>
          <div>
            <span className="faint">최고가</span>
            <b className="gold">{e ? fmtWon(e.bestPrice) : '-'}</b>
          </div>
          <div>
            <span className="faint">처음 잡은 날</span>
            <b>{e ? `${fmtDay(dayKey(e.firstAt))} ${fmtTime(e.firstAt)}` : '-'}</b>
          </div>
        </div>
        {e && <div className="faint small center">{e.firstTag}에 처음 낚았어요</div>}
        {best && (
          <button className="pix-btn" disabled={busy} onClick={() => void share(() => makeCatchCard(best, { total: p.st.total.earn }), `${def.name}-자랑`)}>
            가장 비싸게 판 {def.name} 자랑하기
          </button>
        )}
      </div>
    </div>
  )
}
