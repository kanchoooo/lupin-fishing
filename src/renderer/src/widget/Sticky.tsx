// 위장 화면: 낚시터가 평범한 스티커 메모로 변신한다. 진짜로 글을 쓸 수 있고 저장된다
import { useEffect, useRef, useState } from 'react'
import { MEMO_COLORS } from '@shared/memo'

const tone = MEMO_COLORS.yellow

export function Sticky(p: { onRestore: () => void }): React.JSX.Element {
  const [text, setText] = useState<string | null>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    void window.api.memoState().then((s) => setText(s.boss))
  }, [])
  useEffect(() => {
    if (text !== null) ta.current?.focus({ preventScroll: true })
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text !== null])
  return (
    <div className="sticky" style={{ ['--bg' as string]: tone.bg, ['--head' as string]: tone.head, ['--ink' as string]: tone.ink }}>
      <div className="st-head">
        <button className="st-b" title="새 스티커 메모" onClick={() => void window.api.memoNew()}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M7 2.5v9M2.5 7h9" />
          </svg>
        </button>
        <span className="grow" />
        <button className="st-b" title="닫기 (ESC)" onClick={p.onRestore}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
          </svg>
        </button>
      </div>
      {text !== null && (
        <textarea
          ref={ta}
          className="st-text"
          defaultValue={text}
          placeholder="메모를 입력하세요…"
          spellCheck={false}
          onChange={(e) => window.api.setBossNote(e.target.value)}
        />
      )}
    </div>
  )
}
