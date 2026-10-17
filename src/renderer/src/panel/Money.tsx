import { useState } from 'react'
import { dayKey, fmtDay, fmtTime, fmtWon, rankOf, rankTitle, wageTime } from '@shared/day'
import { FISH_BY_ID, fmtSize, RARITY } from '@shared/fish'
import type { PersistedState } from '@shared/types'
import { makeCatchCard, makeDayReport } from '@/common/share'
import { useShare } from './useShare'

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
  const { share, msg, busy } = useShare()
  const [showAll, setShowAll] = useState(false)
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
        <button className="pix-btn gold" disabled={busy} onClick={() => share(() => makeDayReport(st), `월급루팡-리포트-${today}`)}>
          오늘의 루팡 리포트 자랑하기
        </button>
        {msg && <div className="note">{msg}</div>}
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
                    <button className="mini" disabled={busy} onClick={() => share(() => makeDayReport(st, k), `월급루팡-리포트-${k}`)}>
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

      <section className="box">
        <div className="row between">
          <span>최근에 잡은 것</span>
          <span className="faint">누르면 자랑 카드</span>
        </div>
        {st.recent.length === 0 && <div className="faint">아직 없어요</div>}
        <div className="recent">
          {st.recent.slice(0, 20).map((r) => {
            const f = FISH_BY_ID[r.fish]
            if (!f) return null
            return (
              <button key={r.id} className="rec-row" disabled={busy} onClick={() => share(() => makeCatchCard(r, { total: st.total.earn }), `${f.name}-자랑`)}>
                <span className="faint">
                  {dayKey(r.at) === today ? '' : fmtDay(dayKey(r.at)) + ' '}
                  {fmtTime(r.at)}
                </span>
                <span className="ell" style={{ color: RARITY[f.rarity].color }}>
                  {f.name}
                </span>
                <span className="faint">{fmtSize(r.size)}</span>
                <span className="gold num">{fmtWon(r.price)}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
