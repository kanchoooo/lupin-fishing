// 메모 탭: 화면에 붙인 스티커 메모 목록 · 휴지통 (되살리기 · 영구 삭제)
import { useEffect, useState } from 'react'
import { dayKey, fmtDay, fmtTime } from '@shared/day'
import { MEMO_COLORS } from '@shared/memo'
import { accelLabel } from '@shared/shortcut'
import type { Memo, MemoState, PersistedState } from '@shared/types'

const platform = window.api.platform

function when(t: number): string {
  return `${dayKey(t) === dayKey() ? '오늘' : fmtDay(dayKey(t))} ${fmtTime(t)}`
}

function preview(m: Memo): { title: string; rest: string } {
  const lines = m.text.split('\n').map((l) => l.trim()).filter(Boolean)
  return { title: lines[0] ?? '(빈 메모)', rest: lines.slice(1).join(' · ') }
}

export function useMemos(): MemoState | null {
  const [s, set] = useState<MemoState | null>(null)
  useEffect(() => {
    void window.api.memoState().then(set)
    return window.api.onMemos(set)
  }, [])
  return s
}

export function Memos({ st }: { st: PersistedState }): React.JSX.Element {
  const ms = useMemos()
  const [emptyStep, setEmptyStep] = useState(false)
  const [purging, setPurging] = useState<string | null>(null)
  const shortcut = st.settings.memoShortcut
  if (!ms) return <div className="faint">불러오는 중…</div>
  const active = ms.memos.filter((m) => !m.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
  const trash = ms.memos.filter((m) => m.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))

  return (
    <div className="memos">
      <section className="box">
        <div className="row between">
          <span>
            스티커 메모 <b className="big">{active.length}</b>
            <span className="faint">장</span>
          </span>
          <button className="pix-btn primary" onClick={() => void window.api.memoNew()}>
            + 새 메모
          </button>
        </div>
        <div className="faint">
          {shortcut ? (
            <>
              어디서든 <b className="text">{accelLabel(shortcut, platform, true)}</b> 를 누르면 새 메모가 바로 떠요.{' '}
            </>
          ) : (
            '설정에서 새 메모 단축키를 정할 수 있어요. '
          )}
          메모는 화면 아무 데나 붙여 두고, 끌어서 옮기고, 모서리를 끌어 크기를 바꿔요.
        </div>
        {active.length === 0 && <div className="faint center">아직 메모가 없어요</div>}
        <div className="memo-list">
          {active.map((m) => {
            const pv = preview(m)
            return (
              <div key={m.id} className={`memo-row ${m.hidden ? 'off' : ''}`}>
                <span className="memo-sq" style={{ background: MEMO_COLORS[m.color].bg }} />
                <button className="memo-pv" title="이 메모 보기" onClick={() => void window.api.memoFocus(m.id)}>
                  <span className="ell">{pv.title}</span>
                  <span className="ell faint small">
                    {m.hidden ? '치워 둠 · ' : ''}
                    {m.pinned ? '맨 위 고정 · ' : ''}
                    {when(m.updatedAt)}
                    {pv.rest ? ` · ${pv.rest}` : ''}
                  </span>
                </button>
                <button className="mini" onClick={() => void window.api.memoFocus(m.id)}>
                  {m.hidden ? '꺼내기' : '보기'}
                </button>
                <button className="mini" title="휴지통으로" onClick={() => void window.api.memoTrash(m.id)}>
                  지우기
                </button>
              </div>
            )
          })}
        </div>
        {active.length > 0 && (
          <button className="mini" onClick={() => void window.api.memoShowAll()}>
            메모 모두 화면에 보이기
          </button>
        )}
      </section>

      <section className="box">
        <div className="row between">
          <span>
            휴지통 <b>{trash.length}</b>
          </span>
          {trash.length > 0 && (
            <button
              className={`mini ${emptyStep ? 'danger' : ''}`}
              onClick={() => {
                if (!emptyStep) {
                  setEmptyStep(true)
                  setTimeout(() => setEmptyStep(false), 4000)
                } else {
                  setEmptyStep(false)
                  void window.api.memoEmptyTrash()
                }
              }}
            >
              {emptyStep ? `${trash.length}장 영영 지울까요? 한 번 더` : '휴지통 비우기'}
            </button>
          )}
        </div>
        <div className="faint">지운 메모는 여기로 와요. 내용을 확인하고 되살릴 수 있어요.</div>
        {trash.length === 0 && <div className="faint center">휴지통이 비어 있어요</div>}
        <div className="memo-list">
          {trash.map((m) => (
            <div key={m.id} className="memo-row trash">
              <span className="memo-sq" style={{ background: MEMO_COLORS[m.color].bg }} />
              <div className="memo-pv">
                <span className="memo-full">{m.text}</span>
                <span className="faint small">{when(m.deletedAt ?? m.updatedAt)}에 지움</span>
              </div>
              <button className="mini" onClick={() => void window.api.memoRestore(m.id)}>
                되살리기
              </button>
              <button
                className={`mini ${purging === m.id ? 'danger' : ''}`}
                onClick={() => {
                  if (purging !== m.id) {
                    setPurging(m.id)
                    setTimeout(() => setPurging((p) => (p === m.id ? null : p)), 3000)
                  } else {
                    setPurging(null)
                    void window.api.memoPurge(m.id)
                  }
                }}
              >
                {purging === m.id ? '정말?' : '영구 삭제'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="box">
        <div className="sec-h">위장 메모</div>
        <div className="faint">
          위장 키 · ESC · 낚시터의 ▤ 를 누르면 낚시터가 이 노란 메모로 바뀌어요. 진짜 메모라서 쓴 글은 그대로 남아요.
        </div>
        <div className="boss-pv" style={{ background: MEMO_COLORS.yellow.bg, color: MEMO_COLORS.yellow.ink }}>
          {ms.boss || '(비어 있음)'}
        </div>
      </section>
    </div>
  )
}
