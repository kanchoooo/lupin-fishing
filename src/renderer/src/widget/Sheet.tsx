// 위장 화면: 평범한 스프레드시트처럼 보이지만 숫자는 내 낚시 기록이다
import { dayKey } from '@shared/day'
import type { PersistedState } from '@shared/types'

const COLS = ['A', 'B', 'C', 'D']

export function Sheet(p: { today: number; state: PersistedState | null; onRestore: () => void }): React.JSX.Element {
  const st = p.state
  const d = st?.days[dayKey()]
  const n = (v: number): string => Math.round(v).toLocaleString('ko-KR')
  const rows: string[][] = [
    ['구분', '목표', '실적', '달성률'],
    ['1분기', '1,200,000', n((st?.total.earn ?? 0) * 0.21 + 980_000), '98%'],
    ['2분기', '1,350,000', n((st?.total.earn ?? 0) * 0.33 + 1_210_000), '101%'],
    ['3분기', '1,500,000', n((st?.total.earn ?? 0) * 0.46 + 1_402_000), '96%'],
    ['금일', '-', n(p.today), `${d?.count ?? 0}건`],
    ['누계', '-', n(st?.total.earn ?? 0), `${st?.total.count ?? 0}건`]
  ]
  return (
    <div className="sheet" onDoubleClick={p.onRestore} title="두 번 클릭하거나 ESC 로 돌아가기">
      <div className="sh-title">
        <span className="sh-dot" />
        업무보고_최종_진짜최종.xlsx
      </div>
      <div className="sh-fx">
        <span className="sh-cell">C5</span>
        <span className="sh-f">fx</span>
        <span>=SUM(C2:C4)</span>
      </div>
      <table className="sh-grid">
        <thead>
          <tr>
            <th />
            {COLS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th>{i + 1}</th>
              {r.map((v, j) => (
                <td key={j} className={(i === 0 ? 'hd ' : '') + (j > 0 && i > 0 ? 'num ' : '') + (i === 4 && j === 2 ? 'sel' : '')}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sh-tabs">
        <span className="on">실적</span>
        <span>요약</span>
        <span>+</span>
      </div>
    </div>
  )
}
