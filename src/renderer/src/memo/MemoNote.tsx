// 스티커 메모 한 장 (창 하나). 글은 치는 대로 메인에 보내 저장한다
import { useEffect, useRef, useState } from 'react'
import { MEMO_COLORS, MEMO_COLOR_LIST } from '@shared/memo'
import type { Memo, MemoColor } from '@shared/types'
import { IcoMinus, IcoPin, IcoPlus, IcoTrash } from './icons'

const isMac = window.api.platform === 'darwin'

export function MemoNote({ id }: { id: string }): React.JSX.Element {
  const [memo, setMemo] = useState<Memo | null>(null)
  const [palette, setPalette] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void window.api.memoGet(id).then((m) => {
      setMemo(m)
      if (m) document.title = firstLine(m.text) || '메모'
    })
  }, [id])

  // 창이 앞으로 오면 바로 글을 쓸 수 있게 (새 메모 단축키)
  useEffect(() => {
    const onFocus = (): void => {
      const el = ta.current
      if (!el || document.activeElement === el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
    window.addEventListener('focus', onFocus)
    if (document.hasFocus()) setTimeout(onFocus, 0)
    return () => window.removeEventListener('focus', onFocus)
  }, [memo !== null])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (mod && e.code === 'KeyN') {
        e.preventDefault()
        void window.api.memoNew()
      } else if (mod && e.code === 'KeyW') {
        e.preventDefault()
        void window.api.memoHide(id)
      } else if (e.code === 'Escape') setPalette(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id])

  if (!memo) return <div className="note gone">메모를 찾을 수 없어요</div>
  const tone = MEMO_COLORS[memo.color]
  const setColor = (c: MemoColor): void => {
    setMemo((m) => m && { ...m, color: c })
    setPalette(false)
    void window.api.memoPatch(id, { color: c })
  }
  const togglePin = (): void => {
    setMemo((m) => m && { ...m, pinned: !memo.pinned })
    void window.api.memoPatch(id, { pinned: !memo.pinned })
  }

  return (
    <div className={`note ${memo.color === 'black' ? 'dark' : ''}`} style={{ ['--bg' as string]: tone.bg, ['--head' as string]: tone.head, ['--ink' as string]: tone.ink }}>
      <header className="nh" onDoubleClick={() => setPalette(!palette)}>
        <button className="nb" title={`새 메모 (${isMac ? '⌘N' : 'Ctrl+N'})`} onClick={() => void window.api.memoNew()}>
          <IcoPlus />
        </button>
        <span className="grow" />
        <button className="nb" title="색 바꾸기" onClick={() => setPalette(!palette)}>
          <span className="swatch" />
        </button>
        <button className={`nb ${memo.pinned ? 'on' : ''}`} title={memo.pinned ? '항상 맨 위에 (켜짐)' : '항상 맨 위에'} onClick={togglePin}>
          <IcoPin on={memo.pinned} />
        </button>
        <button className="nb" title="휴지통으로 (패널의 메모 탭에서 되살릴 수 있어요)" onClick={() => void window.api.memoTrash(id)}>
          <IcoTrash />
        </button>
        <button className="nb" title={`치우기 (${isMac ? '⌘W' : 'Ctrl+W'}) — 메모 탭·트레이에서 다시 보기`} onClick={() => void window.api.memoHide(id)}>
          <IcoMinus />
        </button>
      </header>
      {palette && (
        <div className="palette">
          {MEMO_COLOR_LIST.map((c) => (
            <button key={c} className={`pc ${c === memo.color ? 'on' : ''}`} title={MEMO_COLORS[c].label} style={{ background: MEMO_COLORS[c].bg }} onClick={() => setColor(c)} />
          ))}
        </div>
      )}
      <textarea
        ref={ta}
        className="nt"
        defaultValue={memo.text}
        placeholder="메모를 입력하세요…"
        spellCheck={false}
        onChange={(e) => {
          window.api.memoText(id, e.target.value)
          document.title = firstLine(e.target.value) || '메모'
        }}
      />
    </div>
  )
}

function firstLine(t: string): string {
  return t.split('\n').find((l) => l.trim())?.trim().slice(0, 40) ?? ''
}
