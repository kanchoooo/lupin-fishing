import { useState } from 'react'

/** 자랑 이미지 만들기 → 클립보드 복사 + 저장. 결과를 한 줄로 잠깐 보여 준다 */
export function useShare(): { share: (make: () => Promise<string>, name: string) => Promise<void>; msg: string; busy: boolean } {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const share = async (make: () => Promise<string>, name: string): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      const url = await make()
      const r = await window.api.saveImage(url, name)
      setMsg(r === 'saved' ? '이미지를 저장하고 클립보드에도 복사했어요. 인스타·카톡에 바로 붙여넣기!' : r === 'copied' ? '클립보드에 복사했어요. 바로 붙여넣기!' : '')
    } catch (err) {
      setMsg(`이미지를 만들지 못했어요: ${(err as Error)?.message ?? err}`)
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }
  return { share, msg, busy }
}
