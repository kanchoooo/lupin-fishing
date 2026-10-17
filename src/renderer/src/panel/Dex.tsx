import { useState } from 'react'
import { dayKey, fmtDay, fmtTime, fmtWon } from '@shared/day'
import { FISH, FISH_BY_ID, fmtSize, hotFishOf, priceOf, RARITIES, RARITY } from '@shared/fish'
import type { PersistedState } from '@shared/types'
import { makeDexCard } from '@/common/share'
import { SpriteBox } from '@/common/SpriteBox'
import { useShare } from './useShare'

export function Dex({ st }: { st: PersistedState }): React.JSX.Element {
  const [sel, setSel] = useState<string | null>(null)
  const { share, msg } = useShare()
  const known = FISH.filter((f) => st.dex[f.id]).length
  const hot = hotFishOf(dayKey())
  const def = sel ? FISH_BY_ID[sel] : null
  const e = sel ? st.dex[sel] : null

  return (
    <div className="dex">
      <div className="row between">
        <div>
          도감 <b className="big">{known}</b>
          <span className="faint"> / {FISH.length}종</span> · 총 {st.total.count}마리
        </div>
        <button className="pix-btn" onClick={() => share(() => makeDexCard(st), '월급루팡-도감')}>
          도감 자랑하기
        </button>
      </div>
      {msg && <div className="note">{msg}</div>}
      <div className="hot-line">
        오늘의 시세 <b>{hot.name}</b> 판매가 ×2 <span className="faint">(매일 자정에 바뀌어요)</span>
      </div>

      {def && (
        <div className={`dex-detail r-${def.rarity}`}>
          <SpriteBox id={def.id} w={150} h={70} max={6} silhouette={e ? undefined : '#2a2a2a'} />
          <div className="dd-info">
            <div className="dd-name">
              {e ? def.name : '???'} <span className="rar">{RARITY[def.rarity].label}</span>
            </div>
            <div className="faint">{e ? def.desc : '아직 못 잡았어요'}</div>
            <div>
              {def.junk ? `크기 ${fmtSize(def.min)}` : `크기 ${fmtSize(def.min)} ~ ${fmtSize(def.max)}`} · 기본가 {fmtWon(priceOf(def, (def.min + def.max) / 2))}
            </div>
            {e && (
              <div>
                {e.count}마리 · 최대 {fmtSize(e.bestSize)} · 최고가 <span className="gold">{fmtWon(e.bestPrice)}</span>
              </div>
            )}
            {e && (
              <div className="faint">
                처음 잡은 날 {fmtDay(dayKey(e.firstAt))} {fmtTime(e.firstAt)} · {e.firstTag}
              </div>
            )}
          </div>
          <button className="dd-x" onClick={() => setSel(null)}>
            ×
          </button>
        </div>
      )}

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
    </div>
  )
}
