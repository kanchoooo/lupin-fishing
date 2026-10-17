import { useEffect, useState } from 'react'
import { MIN_WAGE_2026 } from '@shared/day'
import { globalCapable, harmless, keyLabel, macNeedsAccess } from '@shared/keys'
import { accelFromEvent, accelLabel, defaultShortcuts } from '@shared/shortcut'
import type { PersistedState, Settings, ShortcutName } from '@shared/types'

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

/** 단축키 (조합 키) 고르기 */
function ShortcutRow(p: { title: string; desc: string; value: string | null; other: string | null; ok: boolean; def: string; onChange: (a: string | null) => void }): React.JSX.Element {
  const [capturing, setCapturing] = useState(false)
  const [err, setErr] = useState('')
  const [mods, setMods] = useState('')
  const { onChange, other } = p
  useEffect(() => {
    if (!capturing) return
    // 고르는 동안엔 이미 걸린 단축키가 가로채지 않게 잠깐 끈다
    void window.api.suspendShortcuts(true)
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        setCapturing(false)
        return
      }
      const r = accelFromEvent(e, platform)
      if ('wait' in r) {
        setMods(accelLabel([e.metaKey && (isMac ? 'Command' : 'Super'), e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', '…'].filter(Boolean).join('+'), platform, true))
        return
      }
      if ('error' in r) {
        setErr(r.error)
        return
      }
      if (r.accel === other) {
        setErr('다른 단축키와 겹쳐요')
        return
      }
      setErr('')
      onChange(r.accel)
      setCapturing(false)
    }
    const onUp = (e: KeyboardEvent): void => {
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) setMods('')
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onUp, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onUp, true)
      setMods('')
      void window.api.suspendShortcuts(false)
    }
  }, [capturing, other, onChange])
  return (
    <div className="set-row col">
      <div className="row between">
        <div>
          <div>{p.title}</div>
          <div className="faint">{p.desc}</div>
        </div>
        <div className="row">
          <button className={`key ${capturing ? 'cap' : ''}`} onClick={() => setCapturing(!capturing)}>
            {capturing ? mods || '조합 키를 누르세요…' : accelLabel(p.value, platform, true)}
          </button>
          {p.value && !capturing && (
            <button className="mini" onClick={() => onChange(null)}>
              없음
            </button>
          )}
          {!p.value && !capturing && (
            <button className="mini" onClick={() => onChange(p.def)}>
              기본
            </button>
          )}
        </div>
      </div>
      {capturing && <div className="faint">예: {accelLabel(p.def, platform, true)} · Ctrl·Alt·Shift{isMac ? '·Command' : ''} 와 같이, F 키는 혼자도 돼요 (ESC = 취소)</div>}
      {err && <div className="warn">{err}</div>}
      {p.value && !capturing && (p.ok ? <div className="ok">다른 앱을 쓰는 중에도 돼요</div> : <div className="warn">⚠ 다른 앱이 이미 이 단축키를 쓰고 있어요. 다른 조합으로 바꿔 주세요</div>)}
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
  const [scOk, setScOk] = useState<Record<ShortcutName, boolean>>({ look: true, memo: true })
  const defs = defaultShortcuts()

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
  useEffect(() => {
    void window.api.shortcutStatus().then(setScOk)
  }, [s.lookShortcut, s.memoShortcut])

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
          desc="누르면 낚시터가 평범한 스티커 메모로 바뀌어요 (ESC 도 돼요)"
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
          <span>모양</span>
          <div className="seg">
            <button className={s.look === 'clear' ? 'on' : ''} onClick={() => set({ look: 'clear' })}>
              투명 (필요한 것만)
            </button>
            <button className={s.look === 'scene' ? 'on' : ''} onClick={() => set({ look: 'scene' })}>
              풍경 (밤 연못)
            </button>
          </div>
        </div>
        {s.look === 'clear' ? (
          <>
            <label className="check">
              <span>진하기</span>
              <input
                className="range"
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={s.clearOpacity}
                onChange={(e) => set({ clearOpacity: Number(e.target.value) })}
              />
              <span className="faint num">{Math.round(s.clearOpacity * 100)}%</span>
            </label>
            <div className="set-row">
              <span>선·글자 색</span>
              <div className="seg">
                {(
                  [
                    ['auto', '자동'],
                    ['dark', '검정'],
                    ['light', '흰색']
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} className={s.clearInk === v ? 'on' : ''} onClick={() => set({ clearInk: v })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="faint">
              뒤 화면이 비치고 낚시꾼·찌·물결·오늘 금액만 보여요. 마우스를 올리거나 낚는 중엔 또렷해지고, 빈 하늘을 누르면 뒤 창이 눌려요. 버튼은 마우스를 올리면 나와요. 색은 자동이면 컴퓨터가 다크 모드일 때 흰색, 아니면 검정이에요.
            </div>
          </>
        ) : (
          <div className="faint">밤하늘·빌딩·연못이 다 보이는 원래 모양이에요.</div>
        )}
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
        <div className="faint">낚시터는 물·낚시꾼·위쪽 막대를 잡고 끌어서 옮길 수 있어요.</div>
        <button className="pix-btn" onClick={() => void window.api.showWidget()}>
          낚시터 꺼내기
        </button>
      </section>

      <section className="box">
        <div className="sec-h">단축키</div>
        <ShortcutRow
          title="투명 ↔ 풍경 바꾸기"
          desc="낚시터 모양을 바로 바꿔요"
          value={s.lookShortcut}
          other={s.memoShortcut}
          ok={scOk.look}
          def={defs.lookShortcut}
          onChange={(a) => set({ lookShortcut: a })}
        />
        <ShortcutRow
          title="새 스티커 메모"
          desc="어디서든 누르면 새 메모가 떠서 바로 쓸 수 있어요"
          value={s.memoShortcut}
          other={s.lookShortcut}
          ok={scOk.memo}
          def={defs.memoShortcut}
          onChange={(a) => set({ memoShortcut: a })}
        />
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
