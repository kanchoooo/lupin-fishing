// 자랑 이미지: 먼저 카드를 크게 보여 주고 → 공유하기(맥 공유 메뉴 / 윈도우 클립보드) · 이미지 저장
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { INSTAGRAM_HANDLE } from '@shared/types'

type Share = (make: () => Promise<string>, name: string) => Promise<void>

const Ctx = createContext<{ share: Share; busy: boolean }>({ share: async () => undefined, busy: false })

const isMac = window.api.platform === 'darwin'

export function useShare(): { share: Share; busy: boolean } {
  return useContext(Ctx)
}

export function ShareProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [job, setJob] = useState<{ url: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const busyRef = useRef(false)
  const share = useCallback<Share>(async (make, name) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setErr('')
    try {
      setJob({ url: await make(), name })
    } catch (e) {
      setErr(`이미지를 만들지 못했어요: ${(e as Error)?.message ?? e}`)
      setTimeout(() => setErr(''), 4000)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])
  return (
    <Ctx.Provider value={{ share, busy }}>
      {children}
      {job && <ShareModal url={job.url} name={job.name} onClose={() => setJob(null)} />}
      {busy && <div className="share-busy">자랑 카드 만드는 중…</div>}
      {err && <div className="share-busy warn">{err}</div>}
    </Ctx.Provider>
  )
}

function ShareModal(p: { url: string; name: string; onClose: () => void }): React.JSX.Element {
  const [msg, setMsg] = useState('')
  const shareBtn = useRef<HTMLButtonElement>(null)
  const { onClose } = p
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const doShare = async (): Promise<void> => {
    const r = shareBtn.current?.getBoundingClientRect()
    const res = await window.api.shareImage(p.url, p.name, r ? { x: r.left, y: r.bottom + 4 } : undefined)
    setMsg(
      res === 'menu'
        ? '보낼 곳을 고르세요 · 클립보드에도 복사해 뒀어요 (카톡·인스타 DM 에 붙여넣기)'
        : res === 'copied'
          ? `이미지를 복사했어요! 카톡·인스타 DM 창에 ${isMac ? '⌘V' : 'Ctrl+V'} 로 붙여넣기`
          : '공유하지 못했어요. 이미지 저장으로 내려받아 주세요'
    )
  }
  const doSave = async (): Promise<void> => {
    const res = await window.api.saveImage(p.url, p.name)
    if (res === 'saved') setMsg('이미지를 저장했어요!')
  }

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal share-modal">
        <div className="row between">
          <b>자랑 카드</b>
          <button className="modal-x" title="닫기 (ESC)" onClick={onClose}>
            ×
          </button>
        </div>
        <img className="share-img" src={p.url} alt="자랑 카드" draggable={false} />
        <div className="row share-btns">
          <button ref={shareBtn} className="pix-btn primary" onClick={() => void doShare()}>
            공유하기
          </button>
          <button className="pix-btn" onClick={() => void doSave()}>
            이미지 저장
          </button>
        </div>
        {msg && <div className="note center">{msg}</div>}
        <div className="faint small center">인스타에 올릴 땐 {INSTAGRAM_HANDLE} 태그해 주세요!</div>
      </div>
    </div>
  )
}
