import { useEffect, useMemo, useRef, useState } from 'react'
import { dayKey, fmtTime, fmtWon, rankTitle } from '@shared/day'
import { FISH_BY_ID, fmtSize, hotFishOf, RARITY } from '@shared/fish'
import { globalCapable, shortKey } from '@shared/keys'
import type { CatchResult, PersistedState } from '@shared/types'
import { SCENE_H, SCENE_W } from '@shared/types'
import { fitScale, spriteImage } from '@/art/draw'
import { makeCatchCard } from '@/common/share'
import { setMuted, setSound, sfx } from '@/common/sound'
import { usePersisted, useMinute } from '@/common/store'
import { FAR_X, Game, NEAR_X, WATER_Y, type Phase } from './game'
import { renderScene } from './scene'
import { Sheet } from './Sheet'

const platform = window.api.platform

interface Ui {
  phase: Phase
  hint: string
  stage: string
  label: { text: string; color: string } | null
  pop: { text: string; color: string; id: number } | null
  fail: { text: string; sub: string } | null
  result: { res: CatchResult | null; fish: string; size: number } | null
}

const STAGE: Partial<Record<Phase, string>> = { bite: '① 입질', fight: '② 힘겨루기', finish: '③ 피니시' }

export function Widget(): React.JSX.Element {
  const st = usePersisted()
  const minute = useMinute()
  const cvRef = useRef<HTMLCanvasElement>(null)
  const stRef = useRef<PersistedState | null>(null)
  stRef.current = st
  const [keyOk, setKeyOk] = useState(false)
  const keyOkRef = useRef(false)
  keyOkRef.current = keyOk
  const [disguised, setDisguised] = useState(false)
  const disguisedRef = useRef(false)
  const [ui, setUi] = useState<Ui>({ phase: 'idle', hint: '', stage: '', label: null, pop: null, fail: null, result: null })
  const [toast, setToast] = useState('')

  const game = useMemo(
    () =>
      new Game({
        onCast: () => {
          void window.api.recordCast()
          if (stRef.current && !stRef.current.onboarded) void window.api.setOnboarded()
        },
        onEscape: () => void window.api.recordEscape(),
        onCatch: (fish, size, auto, perfect) => window.api.recordCatch({ fish: fish.id, size, auto, perfect })
      }),
    []
  )

  // 테스트·스크린샷용
  useEffect(() => {
    ;(window as unknown as { __game: Game }).__game = game
  }, [game])

  const s = st?.settings
  const scale = s?.scale ?? 2
  const reelKey = s?.reelKey ?? null
  const globalOn = (code: string | null): boolean => !!code && !!stRef.current?.settings.globalKeys && keyOkRef.current && globalCapable(code, platform)
  const keyName = reelKey ? shortKey(reelKey, platform) : '클릭'

  useEffect(() => {
    if (!s) return
    game.setMode(s.mode)
    setSound(s.sound, s.volume)
    if (!game.dragging) game.setSpot(s.spot)
  }, [game, s])

  useEffect(() => {
    void window.api.keyReaderOk().then(setKeyOk)
  }, [])

  // ───────── 위장 (일하는 척) ─────────
  const toggleDisguise = (): void => {
    const on = !disguisedRef.current
    disguisedRef.current = on
    setDisguised(on)
    game.frozen = on
    if (on) game.held = false
    setMuted(on)
    void window.api.setDisguised(on)
  }
  const toggleRef = useRef(toggleDisguise)
  toggleRef.current = toggleDisguise

  // ───────── 입력: 전역 키 · 창 키 · 마우스 ─────────
  useEffect(() => {
    const offKey = window.api.onKey((e) => {
      if (e.action !== 'reel' || disguisedRef.current) return
      if (e.down) game.press()
      else game.release()
    })
    const offBoss = window.api.onBoss(() => toggleRef.current())
    const onKeyDown = (e: KeyboardEvent): void => {
      const set = stRef.current?.settings
      if (!set) return
      if (e.code === 'Escape' || (e.code === set.bossKey && !globalOn(set.bossKey))) {
        if (!e.repeat) toggleRef.current()
        e.preventDefault()
        return
      }
      if (disguisedRef.current) return
      const isReel = (e.code === set.reelKey && !globalOn(set.reelKey)) || e.code === 'Space'
      if (!isReel) return
      e.preventDefault()
      if (!e.repeat) game.press()
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      const set = stRef.current?.settings
      if (!set) return
      const isReel = (e.code === set.reelKey && !globalOn(set.reelKey)) || e.code === 'Space'
      if (isReel) game.release()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      offKey()
      offBoss()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const down = useRef<{ x: number; y: number; pressed: boolean; deferred: boolean; dragging: boolean; grab?: 'spot' | 'bobber' } | null>(null)

  /** 화면 좌표 → 장면 좌표 (도트 단위) */
  const scenePos = (e: React.PointerEvent): { x: number; y: number } => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const sc = stRef.current?.settings.scale ?? 2
    return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }
  }

  /** 물 위 ▼(낚시 자리)나 기다리는 중의 찌를 잡았는지 */
  const grabAt = (p: { x: number; y: number }): 'spot' | 'bobber' | null => {
    if (game.phase === 'idle' && Math.abs(p.x - game.spotX) <= 9 && p.y >= WATER_Y - 13 && p.y <= WATER_Y + 8) return 'spot'
    if (game.phase === 'wait' && Math.abs(p.x - game.bob.x) <= 8 && p.y >= WATER_Y - 11 && p.y <= WATER_Y + 6) return 'bobber'
    return null
  }

  const mouseCode = (b: number): string | null => (b === 1 ? 'Mouse3' : b === 3 ? 'Mouse4' : b === 4 ? 'Mouse5' : null)

  const onPointerDown = (e: React.PointerEvent): void => {
    if (disguisedRef.current) return
    const mc = mouseCode(e.button)
    if (mc) {
      // 마우스 휠·옆 버튼을 낚싯대 키로 골랐을 때 (전역으로 읽고 있으면 거기서 처리)
      if (mc === stRef.current?.settings.reelKey && !globalOn(mc)) {
        e.preventDefault()
        game.press()
      }
      return
    }
    if (e.button !== 0) return
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 합성 이벤트 등 */
    }
    // 낚시 자리 옮기기: ▼ 나 찌를 잡고 좌우로 끌기
    const grab = grabAt(scenePos(e))
    if (grab) {
      down.current = { x: e.screenX, y: e.screenY, pressed: false, deferred: false, dragging: false, grab }
      game.dragging = grab
      return
    }
    const mouse = stRef.current?.settings.mouseClick ?? true
    // 기다리는 중·결과 화면에서는 '끌기'일 수도 있으니 뗄 때 누른 걸로 친다
    const deferred = ['wait', 'result', 'fail', 'cast'].includes(game.phase)
    down.current = { x: e.screenX, y: e.screenY, pressed: false, deferred, dragging: false }
    if (mouse && !deferred) {
      game.press()
      down.current.pressed = true
    }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const d = down.current
    if (!d) {
      // 잡을 수 있는 곳 위에서는 좌우 화살표 커서
      ;(e.currentTarget as HTMLElement).style.cursor = grabAt(scenePos(e)) ? 'ew-resize' : ''
      return
    }
    if (d.grab) {
      const p = scenePos(e)
      if (d.grab === 'spot') game.setSpot((p.x - NEAR_X) / (FAR_X - NEAR_X))
      else game.moveBobber(p.x)
      return
    }
    if (d.dragging) return
    if (Math.hypot(e.screenX - d.x, e.screenY - d.y) < 5) return
    if (!['idle', 'charge', 'wait', 'result', 'fail', 'cast'].includes(game.phase)) return
    // 낚시터를 끌어서 옮기기
    d.dragging = true
    if (d.pressed) game.cancelHold()
    void window.api.dragStart()
  }

  const onPointerUp = (e?: React.PointerEvent): void => {
    const mc = e ? mouseCode(e.button) : null
    if (mc) {
      if (mc === stRef.current?.settings.reelKey && !globalOn(mc)) game.release()
      return
    }
    const d = down.current
    down.current = null
    if (!d) return
    if (d.grab) {
      game.dragging = null
      void window.api.setSettings({ spot: Math.round(game.spot * 1000) / 1000 })
      return
    }
    if (d.dragging) {
      void window.api.dragEnd()
      return
    }
    if (d.pressed) game.release()
    else if (d.deferred && (stRef.current?.settings.mouseClick ?? true)) {
      game.press()
      game.release()
    }
  }

  // ───────── 루프 ─────────
  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const c = cv.getContext('2d')!
    let last = performance.now()
    let raf = 0
    let to: ReturnType<typeof setTimeout> | null = null
    let alive = true
    let uiKey = ''
    let popObj: unknown = null
    let popId = 0
    let status = ''
    let hintIdx = 0
    let hintAt = 0

    const sync = (): void => {
      const set = stRef.current?.settings
      const k = set?.reelKey ? shortKey(set.reelKey, platform) : '클릭'
      const viaWindow = set?.reelKey && !globalOnLoop(set.reelKey) ? ' (창 클릭 후)' : ''
      const p = game.phase
      let hint = ''
      if (p === 'idle') {
        const day = dayKey()
        const hot = hotFishOf(day)
        const list =
          game.mode === 'auto'
            ? ['자동 낚시 중 · 성공률 낮음', `입질(!) 때 ${k} 누르면 직접 잡기`, '물 위 ▼ 를 끌어 낚시 자리 옮기기', `오늘의 시세: ${hot.name} ×2`]
            : [`${k} 꾹 → 떼면 던지기${viaWindow}`, '물 위 ▼ 를 끌어 낚시 자리 옮기기', '멀리 자리 잡을수록 희귀한 물고기', '빈 곳을 끌면 낚시터 창이 옮겨져요', `오늘의 시세: ${hot.name} ×2`, rankTitle(stRef.current?.total.earn ?? 0)]
        if (performance.now() - hintAt > 4200) {
          hintAt = performance.now()
          hintIdx++
        }
        hint = list[hintIdx % list.length]
      } else if (p === 'charge') hint = '떼면 던져요 · 꽉 채울수록 ▼ 자리에 정확히'
      else if (p === 'wait') hint = game.mode === 'auto' ? '입질 기다리는 중… (자동)' : `입질 기다리는 중… (!) 뜨면 ${k}`
      else if (p === 'bite') hint = game.auto ? `자동 챔질 중 · ${k} 누르면 직접!` : `지금! ${k}`
      else if (p === 'fight') hint = game.auto ? '자동으로 끌어올리는 중…' : `${k} 꾹 = 감기 · 떼기 = 풀기`
      else if (p === 'finish') hint = game.auto ? '건지는 중…' : `초록 칸에서 ${k}!`
      let label: Ui['label'] = null
      if (p === 'fight' && !game.auto) {
        if (game.rush > 0 || game.tension > 0.88) label = { text: '풀어!!', color: '#ff4d4d' }
        else if (game.rushWarn > 0) label = { text: '온다!', color: '#ffd23f' }
        else if (game.tension < 0.2) label = { text: '감아!', color: '#6fe08c' }
      }
      if (game.pop !== popObj) {
        popObj = game.pop
        if (game.pop) popId++
      }
      const next: Ui = {
        phase: p,
        hint,
        stage: STAGE[p] ?? '',
        label,
        pop: game.pop ? { text: game.pop.text, color: game.pop.color, id: popId } : null,
        fail: p === 'fail' ? { text: game.failText, sub: game.failSub } : null,
        result: p === 'result' && game.fish ? { res: game.result, fish: game.fish.id, size: game.size } : null
      }
      const key = JSON.stringify(next)
      if (key !== uiKey) {
        uiKey = key
        setUi(next)
      }
      const stx = game.statusText()
      if (stx !== status) {
        status = stx
        void window.api.setStatus(stx)
      }
    }

    const frame = (): void => {
      if (!alive) return
      const now = performance.now()
      game.update((now - last) / 1000)
      last = now
      renderScene(c, game)
      sync()
      const calm = (game.phase === 'idle' || game.phase === 'wait') && !game.particles.length && !game.ripples.length && game.shake <= 0 && game.dip <= 0
      if (calm) to = setTimeout(frame, 70)
      else raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      if (to) clearTimeout(to)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const globalOnLoop = (code: string): boolean => globalOn(code)

  const today = st?.days[dayKey()]?.earn ?? 0
  void minute

  const share = async (): Promise<void> => {
    const r = ui.result?.res
    if (!r || !st) return
    const url = await makeCatchCard(r.record, { isNew: r.isNew, isRecord: r.isRecord, total: st.total.earn })
    const res = await window.api.saveImage(url, `${FISH_BY_ID[r.record.fish]?.name ?? '물고기'}-자랑`)
    setToast(res === 'saved' ? '저장 + 복사했어요!' : res === 'copied' ? '이미지를 복사했어요!' : '')
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className={`widget s${scale}`} style={{ ['--s' as string]: scale }}>
      <div className="bar">
        <span className="today" title="오늘 낚시로 번 돈 (자정에 0부터)">
          <span className="faint">오늘</span> {fmtWon(today)}
        </span>
        <button
          className={`mode ${s?.mode === 'auto' ? 'auto' : ''}`}
          title={s?.mode === 'auto' ? '자동 낚시 (성공률 낮음) — 누르면 수동' : '수동 낚시 (손맛) — 누르면 자동'}
          onClick={() => {
            sfx.click()
            void window.api.setSettings({ mode: s?.mode === 'auto' ? 'manual' : 'auto' })
          }}
        >
          {s?.mode === 'auto' ? '자동' : '수동'}
        </button>
        <span className="grow" />
        <button className="ico" title="도감 · 수익 · 설정" onClick={() => void window.api.openPanel('dex')}>
          ☰
        </button>
        <button className="ico" title="일하는 척 위장 (ESC)" onClick={toggleDisguise}>
          ▤
        </button>
        <button className="ico" title="낚시터 치우기 (트레이에서 다시 꺼내기)" onClick={() => void window.api.hideWidget()}>
          ×
        </button>
      </div>
      <div className="stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => onPointerUp()} onAuxClick={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={cvRef} width={SCENE_W} height={SCENE_H} style={{ width: SCENE_W * scale, height: SCENE_H * scale }} />
        {ui.stage && <div className="stage-tag">{ui.stage}</div>}
        {ui.label && (
          <div className="label" style={{ color: ui.label.color }}>
            {ui.label.text}
          </div>
        )}
        {ui.pop && (
          <div key={ui.pop.id} className="pop" style={{ color: ui.pop.color }}>
            {ui.pop.text}
          </div>
        )}
        {ui.hint && <div className={`hint ${ui.phase === 'bite' && !game.auto ? 'hot' : ''}`}>{ui.hint}</div>}
        {ui.fail && (
          <div className="fail">
            <div className="fail-t">{ui.fail.text}</div>
            {ui.fail.sub && <div className="fail-s">{ui.fail.sub}</div>}
          </div>
        )}
        {ui.result && <ResultCard fish={ui.result.fish} size={ui.result.size} res={ui.result.res} scale={scale} onShare={share} />}
        {st && !st.onboarded && ui.phase === 'idle' && (
          <div className="onboard">
            <b>{keyName}</b> 꾹 눌렀다 떼면 던져요
            <br />
            다른 창을 쓰는 중에도 돼요
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
      {disguised && <Sheet today={today} state={st} onRestore={toggleDisguise} />}
    </div>
  )
}

function ResultCard(p: { fish: string; size: number; res: CatchResult | null; scale: number; onShare: () => void }): React.JSX.Element {
  const def = FISH_BY_ID[p.fish]
  const ref = useRef<HTMLDivElement>(null)
  const rec = p.res?.record
  useEffect(() => {
    const box = ref.current
    if (!box) return
    box.innerHTML = ''
    const sc = fitScale(p.fish, 56, 34, 4) * p.scale
    const img = spriteImage(p.fish, sc)
    box.appendChild(img)
  }, [p.fish, p.scale])
  if (!def) return <></>
  const r = RARITY[def.rarity]
  return (
    <div className={`result r-${def.rarity}`}>
      <div className="res-tags">
        {p.res?.isNew && <span className="tag new">NEW!</span>}
        {p.res?.isRecord && <span className="tag rec">신기록!</span>}
        {rec?.hot && <span className="tag hot">시세 ×2</span>}
        {rec?.perfect && <span className="tag perf">PERFECT</span>}
        {rec?.auto && <span className="tag">자동</span>}
      </div>
      <div className="res-body">
        <div className="res-pic" ref={ref} />
        <div className="res-info">
          <div className="res-name">
            {def.name} <span className="rar">{r.label}</span>
          </div>
          <div className="res-size">
            {fmtSize(p.size)}
            {rec ? ` · ${fmtTime(rec.at)} ${rec.tag}` : ''}
          </div>
          <div className="res-price">{rec ? `+${fmtWon(rec.price)}` : '…'}</div>
        </div>
      </div>
      <div className="res-foot">
        {p.res?.rankUp ? <span className="rankup">승진! {p.res.rankUp} 루팡</span> : <span className="faint">{def.desc}</span>}
        <button className="share" onPointerDown={(e) => e.stopPropagation()} onClick={p.onShare}>
          자랑하기
        </button>
      </div>
    </div>
  )
}
