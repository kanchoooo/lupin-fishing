import { useEffect, useState } from 'react'
import { dayKey, fmtWon, rankTitle } from '@shared/day'
import { FISH_BY_ID } from '@shared/fish'
import type { PanelTab, PersistedState, ShareRequest } from '@shared/types'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, MORE_APPS_URL } from '@shared/types'
import { makeCatchCard } from '@/common/share'
import { usePersisted, useMinute } from '@/common/store'
import { About } from './About'
import { Dex } from './Dex'
import { Memos } from './Memos'
import { Money } from './Money'
import { SettingsTab } from './Settings'
import { ShareProvider, useShare } from './useShare'

const TABS: [PanelTab, string][] = [
  ['dex', '도감'],
  ['money', '수익'],
  ['memo', '메모'],
  ['settings', '설정'],
  ['about', '정보']
]

const isMac = window.api.platform === 'darwin'

export function Panel(): React.JSX.Element {
  const st = usePersisted()
  useMinute()
  const [tab, setTab] = useState<PanelTab>(() => {
    const h = location.hash.slice(1) as PanelTab
    return TABS.some(([t]) => t === h) ? h : 'dex'
  })
  useEffect(() => window.api.onPanelTab(setTab), [])
  // 키 테스트는 설정 탭을 볼 때만
  useEffect(() => {
    void window.api.setKeyTest(tab === 'settings')
    return () => void window.api.setKeyTest(false)
  }, [tab])

  const today = st?.days[dayKey()]?.earn ?? 0
  return (
    <ShareProvider>
      <div className="panel">
        <header className={`head ${isMac ? 'mac' : ''}`}>
          <div className="logo">
            <span className="logo-bob" />
            월급루팡 낚시터
          </div>
          <div className="head-right">
            <span className="faint">{st ? rankTitle(st.total.earn) : ''}</span>
            <span className="gold">오늘 {fmtWon(today)}</span>
          </div>
        </header>
        <nav className="tabs">
          {TABS.map(([t, label]) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </nav>
        <main className="body">
          {!st ? null : tab === 'dex' ? (
            <Dex st={st} />
          ) : tab === 'money' ? (
            <Money st={st} />
          ) : tab === 'memo' ? (
            <Memos st={st} />
          ) : tab === 'settings' ? (
            <SettingsTab st={st} />
          ) : (
            <About st={st} />
          )}
        </main>
        <footer className="foot">
          <div className="foot-msg">
            인스타 <b>{INSTAGRAM_HANDLE}</b> 팔로우하면 새로 나온 재밌는 앱을 바로바로 해볼 수 있어요!
          </div>
          <div className="foot-btns">
            <button className="pix-btn primary" onClick={() => void window.api.openExternal(INSTAGRAM_URL)}>
              인스타그램 보기
            </button>
            <button className="pix-btn" onClick={() => void window.api.openExternal(MORE_APPS_URL)}>
              개발자의 다른 앱 보기
            </button>
          </div>
        </footer>
        {st && <ShareRequests st={st} />}
      </div>
    </ShareProvider>
  )
}

/** 낚시터 결과 카드의 '자랑하기' → 여기서 카드를 만들어 보여 준다 */
function ShareRequests({ st }: { st: PersistedState }): null {
  const { share } = useShare()
  const [req, setReq] = useState<ShareRequest | null>(null)
  useEffect(() => {
    void window.api.takeShareRequest().then((r) => r && setReq(r))
    return window.api.onShareRequest(setReq)
  }, [])
  useEffect(() => {
    if (!req) return
    const rec = st.recent.find((r) => r.id === req.id)
    setReq(null)
    if (!rec || !FISH_BY_ID[rec.fish]) return
    void share(
      () =>
        makeCatchCard(rec, {
          isNew: req.isNew,
          isRecord: req.isRecord,
          total: st.total.earn
        }),
      `${FISH_BY_ID[rec.fish].name}-자랑`
    )
  }, [req, st, share])
  return null
}
