import { useState } from 'react'
import { dayKey, fmtDay, fmtTime, fmtWon, rankOf, rankTitle, wageTime } from '@shared/day'
import { FISH_BY_ID, fmtSize, RARITY } from '@shared/fish'
import type { CatchRecord, PersistedState } from '@shared/types'
import { makeCatchCard, makeDayReport } from '@/common/share'
import { SpriteBox } from '@/common/SpriteBox'
import { useShare } from './useShare'

/** 도트 왕관 (가장 비싼 것 표시) */
function Crown(): React.JSX.Element {
  const px = ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yryyyry', 'yyyyyyy']
  return (
    <svg className="crown" width={14} height={10} viewBox="0 0 7 5" shapeRendering="crispEdges">
      {px.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ch === 'r' ? '#ff4d4d' : '#ffd23f'} />))
      )}
    </svg>
  )
}

function lastDays(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i)
    out.push(dayKey(x))
  }
  return out
}

export function Money({ st }: { st: PersistedState }): React.JSX.Element {
  const { share, busy } = useShare()
  const [showAll, setShowAll] = useState(false)
  const [sort, setSort] = useState<'new' | 'price'>('new')
  const today = dayKey()
  const d = st.days[today] ?? { earn: 0, count: 0, casts: 0 }
  const rk = rankOf(st.total.earn)
  const wage = st.settings.hourlyWage
  const days14 = lastDays(14)
  const max = Math.max(1, ...days14.map((k) => st.days[k]?.earn ?? 0))
  const allDays = Object.keys(st.days)
    .filter((k) => (st.days[k]?.earn ?? 0) > 0 || (st.days[k]?.casts ?? 0) > 0)
    .sort()
    .reverse()
  const best = allDays.reduce((a, k) => Math.max(a, st.days[k].earn), 0)

  return (
    <div className="money">
      <section className="box today-box">
        <div className="faint">오늘 낚시로 번 돈 · 자정에 0부터 다시</div>
        <div className="today-big">{fmtWon(d.earn)}</div>
        <div>
          {d.count}마리 · 던진 횟수 {d.casts}번{d.casts ? ` · 성공률 ${Math.round((d.count / d.casts) * 100)}%` : ''}
        </div>
        {wage > 0 && (
          <div className="faint">
            시급 {wage.toLocaleString('ko-KR')}원 기준 <span className="text">{wageTime(d.earn, wage)}</span>
          </div>
        )}
        {d.best && FISH_BY_ID[d.best.fish] && (
          <div className={`today-best r-${FISH_BY_ID[d.best.fish].rarity}`}>
            <Crown />
            <span className="faint">오늘 최고</span>
            <span className="rar">{FISH_BY_ID[d.best.fish].name}</span>
            <span className="faint">{fmtSize(d.best.size)}</span>
            <b className="gold">{fmtWon(d.best.price)}</b>
          </div>
        )}
        <button className="pix-btn gold" disabled={busy} onClick={() => void share(() => makeDayReport(st), `월급루팡-리포트-${today}`)}>
          오늘의 루팡 리포트 자랑하기
        </button>
      </section>

      <section className="box">
        <div className="row between">
          <span>
            누적 <b className="gold">{fmtWon(st.total.earn)}</b>
          </span>
          <span className="faint">
            {st.total.count}마리 · {st.total.casts}번 던짐
          </span>
        </div>
        <div className="rank">
          <span className="rank-name">{rankTitle(st.total.earn)}</span>
          {rk.next ? (
            <span className="faint">
              다음 직급 {rk.next.name}까지 {fmtWon(rk.next.min - st.total.earn)}
            </span>
          ) : (
            <span className="gold">최고 직급!</span>
          )}
        </div>
        <div className="meter">
          <div style={{ width: `${Math.round(rk.progress * 100)}%` }} />
        </div>
      </section>

      <section className="box">
        <div className="row between">
          <span>최근 14일</span>
          <span className="faint">최고 기록 {fmtWon(best)}</span>
        </div>
        <div className="chart">
          {days14.map((k) => {
            const v = st.days[k]?.earn ?? 0
            const h = Math.round((v / max) * 72)
            const [, m, dd] = k.split('-').map(Number)
            return (
              <div key={k} className={`col ${k === today ? 'now' : ''}`} title={`${fmtDay(k)} ${fmtWon(v)}`}>
                <div className="bar-v" style={{ height: Math.max(v > 0 ? 2 : 0, h) }} />
                <div className="col-l">{dd === 1 || k === days14[0] ? `${m}/${dd}` : dd}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="box">
        <div className="row between">
          <span>일별 수익</span>
          <span className="faint">{allDays.length}일</span>
        </div>
        {allDays.length === 0 && <div className="faint">아직 기록이 없어요. 오늘 첫 월급루팡을 시작해 보세요!</div>}
        <table className="days">
          <tbody>
            {(showAll ? allDays : allDays.slice(0, 10)).map((k) => {
              const r = st.days[k]
              const bf = r.best ? FISH_BY_ID[r.best.fish] : null
              return (
                <tr key={k} className={k === today ? 'now' : ''}>
                  <td>{fmtDay(k, k.slice(0, 4) !== today.slice(0, 4))}</td>
                  <td className="gold num">{fmtWon(r.earn)}</td>
                  <td className="num faint">{r.count}마리</td>
                  <td className="ell" style={bf ? { color: RARITY[bf.rarity].color } : undefined}>
                    {bf?.name ?? '-'}
                  </td>
                  <td>
                    <button className="mini" disabled={busy} onClick={() => void share(() => makeDayReport(st, k), `월급루팡-리포트-${k}`)}>
                      자랑
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {allDays.length > 10 && (
          <button className="link" onClick={() => setShowAll(!showAll)}>
            {showAll ? '접기' : `전체 ${allDays.length}일 보기`}
          </button>
        )}
      </section>

      <Recent st={st} sort={sort} setSort={setSort} />
    </div>
  )
}

/** 최근에 잡은 것: 가장 비싼 한 마리는 위에 크게 + 목록에서 왕관 */
function Recent(p: { st: PersistedState; sort: 'new' | 'price'; setSort: (s: 'new' | 'price') => void }): React.JSX.Element {
  const { share, busy } = useShare()
  const { st, sort } = p
  const today = dayKey()
  const list = st.recent.slice(0, 30).filter((r) => FISH_BY_ID[r.fish])
  const top = list.reduce<CatchRecord | null>((a, r) => (!a || r.price > a.price ? r : a), null)
  const rows = sort === 'price' ? [...list].sort((a, b) => b.price - a.price) : list
  const card = (r: CatchRecord): void => void share(() => makeCatchCard(r, { total: st.total.earn }), `${FISH_BY_ID[r.fish].name}-자랑`)
  const when = (r: CatchRecord): string => `${dayKey(r.at) === today ? '' : fmtDay(dayKey(r.at)) + ' '}${fmtTime(r.at)}`
  const tf = top ? FISH_BY_ID[top.fish] : null
  return (
    <section className="box">
      <div className="row between">
        <span>최근에 잡은 것</span>
        <div className="seg small-seg">
          <button className={sort === 'new' ? 'on' : ''} onClick={() => p.setSort('new')}>
            최신순
          </button>
          <button className={sort === 'price' ? 'on' : ''} onClick={() => p.setSort('price')}>
            비싼순
          </button>
        </div>
      </div>
      {list.length === 0 && <div className="faint">아직 없어요</div>}
      {top && tf && (
        <button className={`rec-top r-${tf.rarity}`} disabled={busy} onClick={() => card(top)} title="누르면 자랑 카드">
          <div className="rt-label">
            <Crown /> 최근 {list.length}마리 중 최고가
          </div>
          <div className="rt-body">
            <SpriteBox id={tf.id} w={110} h={48} max={4} />
            <div className="rt-info">
              <div className="rt-name">
                {tf.name} <span className="rar">{RARITY[tf.rarity].label}</span>
              </div>
              <div className="faint">
                {fmtSize(top.size)} · {when(top)} {top.tag}
              </div>
              <div className="rt-price">{fmtWon(top.price)}</div>
            </div>
          </div>
        </button>
      )}
      <div className="recent">
        {rows.map((r) => {
          const f = FISH_BY_ID[r.fish]
          const isTop = r.id === top?.id
          return (
            <button key={r.id} className={`rec-row ${isTop ? 'top' : ''} r-${f.rarity}`} disabled={busy} onClick={() => card(r)}>
              <span className="faint">{when(r)}</span>
              <span className="ell rar">
                {isTop && <Crown />} {f.name}
              </span>
              <span className="faint">{fmtSize(r.size)}</span>
              <span className={`num ${isTop ? 'gold b' : 'gold'}`}>{fmtWon(r.price)}</span>
            </button>
          )
        })}
      </div>
      {list.length > 0 && <div className="faint small">누르면 자랑 카드 · 최근 30마리</div>}
    </section>
  )
}
