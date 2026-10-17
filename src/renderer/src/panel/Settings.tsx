import { useEffect, useState } from 'react'
import { MIN_WAGE_2026 } from '@shared/day'
import { globalCapable, harmless, keyLabel, macNeedsAccess } from '@shared/keys'
import type { PersistedState, Settings } from '@shared/types'

const platform = window.api.platform
const isMac = platform === 'darwin'

const QUICK = isMac ? ['ControlLeft', 'AltRight', 'AltLeft', 'MetaRight'] : ['ControlLeft', 'ControlRight', 'Pause', 'ShiftRight']

function KeyRow(p: {
  title: string
  desc: string
  value: string | null
  other: string | null
  allowNone?: boolean
  globalKeys: boolean
  keyOk: boolean
  access: 'granted' | 'denied' | 'unknown'
  onChange: (code: string | null) => void
}): React.JSX.Element {
  const [capturing, setCapturing] = useState(false)
  const [err, setErr] = useState('')
  const { onChange, other } = p
  useEffect(() => {
    if (!capturing) return
    const pick = (code: string): void => {
      if (code === other) {
        setErr('다른 키와 겹쳐요. 다른 키를 골라 주세요')
        return
      }
      setErr('')
      onChange(code)
      setCapturing(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        setCapturing(false)
        return
      }
      if (e.code) pick(e.code)
    }
    // 마우스 휠 클릭 · 옆 버튼 (왼쪽·오른쪽 클릭은 화면 조작용이라 안 받음)
    const onMouse = (e: MouseEvent): void => {
      const code = e.button === 1 ? 'Mouse3' : e.button === 3 ? 'Mouse4' : e.button === 4 ? 'Mouse5' : null
      if (!code) return
      e.preventDefault()
      e.stopPropagation()
      pick(code)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('mousedown', onMouse, true)
    window.addEventListener('auxclick', (e) => e.preventDefault(), { capture: true, once: true })
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('mousedown', onMouse, true)
    }
  }, [capturing, other, onChange])
  const v = p.value
  const global = !!v && p.globalKeys && p.keyOk && globalCapable(v, platform)
  const needAccess = isMac && global && macNeedsAccess(v) && p.access !== 'granted'
  return (
    <div className="set-row col">
      <div className="row between">
        <div>
          <div>{p.title}</div>
          <div className="faint">{p.desc}</div>
        </div>
        <div className="row">
          <button className={`key ${capturing ? 'cap' : ''}`} onClick={() => setCapturing(!capturing)}>
            {capturing ? '아무 키나 누르세요…' : keyLabel(v, platform)}
          </button>
          {p.allowNone && v && !capturing && (
            <button className="mini" onClick={() => onChange(null)}>
              없음
            </button>
          )}
        </div>
      </div>
      {capturing && <div className="faint">키보드의 아무 키 · 마우스 휠 클릭 · 마우스 옆 버튼 모두 돼요 (ESC = 취소)</div>}
      {err && <div className="warn">{err}</div>}
      <div className="quick">
        <span className="faint">추천</span>
        {QUICK.filter((k) => k !== other).map((k) => (
          <button key={k} className={`chip ${v === k ? 'on' : ''}`} onClick={() => onChange(k)}>
            {keyLabel(k, platform)}
            {harmless(k, platform) ? ' ★' : ''}
          </button>
        ))}
      </div>
      {v && (
        <div className={global && !needAccess ? 'ok' : 'warn'}>
          {global
            ? needAccess
              ? '맥에서 이 키를 다른 앱 쓰는 중에도 받으려면 "입력 모니터링" 권한이 필요할 수 있어요 (키 테스트에서 안 잡히면 허용해 주세요)'
              : '다른 창을 쓰는 중에도 돼요 (키 입력을 가로채지 않아요)'
            : !p.globalKeys
              ? '낚시터 창을 클릭해 둔 상태에서만 돼요 (아래 "다른 앱 쓰는 중에도" 켜기)'
              : !p.keyOk
                ? '이 컴퓨터에서는 전역 키를 읽을 수 없어 낚시터 창을 클릭해 둔 상태에서만 돼요'
                : '이 키는 낚시터 창을 클릭해 둔 상태에서만 돼요'}
          {needAccess && (
            <div>
              <button className="mini" onClick={() => void window.api.requestKeyAccess()}>
                입력 모니터링 허용하기
              </button>
            </div>
          )}
          {global && !harmless(v, platform) && <div className="warn">⚠ 일하는 중에 이 키를 누르면 다른 앱에도 같이 눌려요. ★ 표시 키를 추천해요</div>}
        </div>
      )}
    </div>
  )
}

export function SettingsTab({ st }: { st: PersistedState }): React.JSX.Element {
  const s = st.settings
  const set = (patch: Partial<Settings>): void => void window.api.setSettings(patch)
  const [keyOk, setKeyOk] = useState(true)
  const [access, setAccess] = useState<'granted' | 'denied' | 'unknown'>('granted')
  const [pressed, setPressed] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [upd, setUpd] = useState('')
  const [resetStep, setResetStep] = useState(0)
  const [wage, setWage] = useState(String(s.hourlyWage))

  useEffect(() => {
    void window.api.keyReaderOk().then(setKeyOk)
    void window.api.getVersion().then(setVersion)
    // 시스템 설정에서 권한을 바꾸고 돌아오면 다시 확인
    const recheck = (): void => void window.api.keyAccess().then(setAccess)
    recheck()
    window.addEventListener('focus', recheck)
    const off = window.api.onKeyTest(setPressed)
    return () => {
      off()
      window.removeEventListener('focus', recheck)
    }
  }, [])
  useEffect(() => setWage(String(s.hourlyWage)), [s.hourlyWage])

  return (
    <div className="settings">
      <section className="box">
        <div className="sec-h">낚시 방식</div>
        <label className="radio">
          <input type="radio" checked={s.mode === 'manual'} onChange={() => set({ mode: 'manual' })} />
          <span>
            <b>수동</b> — 손맛 3단계 (① 입질 ② 힘겨루기 ③ 피니시)
          </span>
        </label>
        <label className="radio">
          <input type="radio" checked={s.mode === 'auto'} onChange={() => set({ mode: 'auto' })} />
          <span>
            <b>자동</b> — 알아서 던지고 낚아요. 대신 성공률이 낮고 전설은 못 잡아요
          </span>
        </label>
      </section>

      <section className="box">
        <div className="sec-h">키</div>
        <KeyRow
          title="낚싯대 키"
          desc="꾹 → 떼면 던지기 · 입질 때 누르기 · 꾹 = 감기"
          value={s.reelKey}
          other={s.bossKey}
          globalKeys={s.globalKeys}
          keyOk={keyOk}
          access={access}
          onChange={(k) => set({ reelKey: k })}
        />
        <KeyRow
          title="위장 키"
          desc="누르면 낚시터가 업무용 표로 바뀌어요 (ESC 도 돼요)"
          value={s.bossKey}
          other={s.reelKey}
          allowNone
          globalKeys={s.globalKeys}
          keyOk={keyOk}
          access={access}
          onChange={(k) => set({ bossKey: k })}
        />
        <label className="check">
          <input type="checkbox" checked={s.globalKeys} onChange={(e) => set({ globalKeys: e.target.checked })} />
          <span>다른 앱 쓰는 중에도 키 받기 (엑셀 켜 놓고 낚시)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.mouseClick} onChange={(e) => set({ mouseClick: e.target.checked })} />
          <span>낚시터를 클릭해서도 낚시 (꾹 누르기 = 키 꾹)</span>
        </label>
        <div className="keytest">
          키 테스트:{' '}
          {!keyOk ? (
            <span className="warn">이 컴퓨터에서는 전역 키를 읽을 수 없어요</span>
          ) : pressed.length ? (
            <span className="ok">{pressed.map((k) => keyLabel(k, platform)).join(' + ')} 눌림</span>
          ) : (
            <span className="faint">고른 키를 눌러 보세요 (다른 창을 쓰는 중에도 잡히는지)</span>
          )}
        </div>
      </section>

      <section className="box">
        <div className="sec-h">낚시터 창</div>
        <div className="set-row">
          <span>크기</span>
          <div className="seg">
            {[
              [1, '작게'],
              [2, '보통'],
              [3, '크게']
            ].map(([v, l]) => (
              <button key={v} className={s.scale === v ? 'on' : ''} onClick={() => set({ scale: v as number })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.alwaysOnTop} onChange={(e) => set({ alwaysOnTop: e.target.checked })} />
          <span>항상 맨 위에 (다른 창에 가려지지 않게)</span>
        </label>
        <div className="faint">낚시터는 아무 데나 잡고 끌어서 옮길 수 있어요.</div>
        <button className="pix-btn" onClick={() => void window.api.showWidget()}>
          낚시터 꺼내기
        </button>
      </section>

      <section className="box">
        <div className="sec-h">소리 · 기타</div>
        <label className="check">
          <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
          <span>효과음</span>
          <input
            className="range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            disabled={!s.sound}
            onChange={(e) => set({ volume: Number(e.target.value) })}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={s.openAtLogin} onChange={(e) => set({ openAtLogin: e.target.checked })} />
          <span>컴퓨터를 켜면 같이 켜기 (출근 = 낚시 시작)</span>
        </label>
        <div className="set-row">
          <span>
            내 시급 <span className="faint">(수익 환산용)</span>
          </span>
          <span className="row">
            <input
              className="input"
              inputMode="numeric"
              value={wage}
              onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              onBlur={() => set({ hourlyWage: Number(wage) || 0 })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            원
            <button className="mini" onClick={() => set({ hourlyWage: MIN_WAGE_2026 })}>
              최저시급
            </button>
          </span>
        </div>
      </section>

      <section className="box">
        <div className="sec-h">앱</div>
        <div className="set-row">
          <span>버전 {version}</span>
          <button
            className="mini"
            onClick={async () => {
              setUpd('확인 중…')
              setUpd(await window.api.checkUpdate())
            }}
          >
            업데이트 확인
          </button>
        </div>
        {upd && <div className="faint">{upd}</div>}
        <div className="set-row">
          <button
            className={`mini ${resetStep ? 'danger' : ''}`}
            onClick={() => {
              if (resetStep === 0) {
                setResetStep(1)
                setTimeout(() => setResetStep(0), 4000)
              } else {
                setResetStep(0)
                void window.api.resetAll()
              }
            }}
          >
            {resetStep ? '정말 지울까요? 한 번 더 누르기' : '도감·수익 기록 지우기'}
          </button>
          <button className="mini" onClick={() => void window.api.quit()}>
            완전히 끄기
          </button>
        </div>
      </section>
    </div>
  )
}
