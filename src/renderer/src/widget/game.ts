// 낚시 상태 머신. 단계: 대기 → (꾹 눌러) 힘 모으기 → 던지기 → 입질 기다리기 → ① 입질(챔질) → ② 힘겨루기 → ③ 피니시 → 결과
// 그리기는 scene.ts 가 이 상태를 읽어서 한다.
import { FISH_BY_ID, RARITY, rollFish, rollSize, type FishDef } from '@shared/fish'
import type { CatchResult, Mode } from '@shared/types'
import { sfx } from '@/common/sound'

export type Phase = 'idle' | 'charge' | 'cast' | 'wait' | 'bite' | 'fight' | 'finish' | 'landing' | 'result' | 'fail'

export const WATER_Y = 58
/** 낚싯대를 쥔 손 (장면 좌표) */
export const HAND = { x: 20, y: 40 }
export const ROD_LEN = 36
const NEAR_X = 64
const FAR_X = 168

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface Ripple {
  x: number
  y: number
  r: number
  life: number
}

export interface Hooks {
  onCast(): void
  onEscape(): void
  onCatch(fish: FishDef, size: number, auto: boolean, perfect: boolean): Promise<CatchResult | null>
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a)

/** 힘겨루기 손맛 숫자 (p = 물고기 힘). 시뮬레이션으로 맞춘 값 */
export const TUNE = {
  reel: 0.26,
  rise: 0.55,
  riseP: 0.15,
  rushRise: 0.7,
  fall: 0.9,
  fallRush: 0.4,
  loss: 0.02,
  lossRush: 0.05,
  rushBase: 0.3,
  rushP: 0.22,
  rushStamina: 0.3,
  rushLen: 0.7,
  /** 확 당기기 전 예고 (초) */
  warn: 0.3,
  /** 장력이 끝까지 차도 이만큼은 버틴다 (초) */
  grace: 0.28,
  drainBase: 0.03,
  drainHold: 0.06
}

export class Game {
  phase: Phase = 'idle'
  /** 지금 단계에서 지난 시간 (초) */
  pt = 0
  time = 0
  mode: Mode = 'manual'
  /** 키·마우스를 누르고 있는지 */
  held = false
  /** 위장 중 (손 입력 무시, 자동은 계속) */
  frozen = false
  /** 이번 물고기를 자동으로 처리 중인지 */
  auto = false

  power = 0
  bob = { x: 120, y: WATER_Y }
  castFrom = { x: 0, y: 0 }
  castTo = 120
  fish: FishDef | null = null
  size = 0
  waitLeft = 0
  nibbles: number[] = []
  /** 찌가 물속으로 들어간 정도 (픽셀) */
  dip = 0
  biteWindow = 1
  biteReact = 0
  perfectHook = false

  progress = 0
  tension = 0
  stamina = 1
  rush = 0
  rushWarn = 0
  overT = 0
  slackT = 0
  reelAcc = 0
  strainAcc = 0
  fishX = 0
  fishY = 0
  autoWin = false
  autoEnd = 0
  autoHold = false

  hitsNeeded = 1
  hits = 0
  cursor = 0
  cdir = 1
  zone = 0.5
  zoneW = 0.2
  speed = 1
  misses = 0
  allPerfect = true
  lastHit: { t: number; ok: boolean; perfect: boolean } | null = null

  result: CatchResult | null = null
  saving = false
  failText = ''
  failSub = ''
  /** 위에 잠깐 뜨는 글자 */
  pop: { text: string; t: number; color: string } | null = null

  shake = 0
  flash = 0
  hitstop = 0
  particles: Particle[] = []
  ripples: Ripple[] = []
  /** 오늘 연속으로 놓친 횟수 같은 소소한 통계 (안내 문구용) */
  streakMiss = 0

  constructor(private hooks: Hooks) {}

  get rarityColor(): string {
    return this.fish ? RARITY[this.fish.rarity].color : '#fff'
  }

  private go(p: Phase): void {
    this.phase = p
    this.pt = 0
  }

  setMode(m: Mode): void {
    if (this.mode === m) return
    this.mode = m
    // 자동으로 바꾸면 기다리던 손 입력을 정리
    if (m === 'auto' && this.phase === 'charge') this.go('idle')
  }

  // ───────── 입력 ─────────

  press(): void {
    if (this.held) return
    this.held = true
    if (this.frozen || this.hitstop > 0) return
    const manual = this.mode === 'manual'
    switch (this.phase) {
      case 'idle':
        if (manual) {
          this.power = 0
          this.go('charge')
        }
        break
      case 'wait':
        // 수동: 입질 전에 당기면 헛챔질 → 다시 던지기
        if (manual) this.reelIn()
        break
      case 'bite':
        this.hook()
        break
      case 'finish':
        if (!this.auto) this.finishPress()
        break
      case 'result':
        if (!this.saving && this.pt > 0.5) this.go('idle')
        break
      case 'fail':
        if (this.pt > 0.4) this.go('idle')
        break
    }
  }

  /** 누르던 게 '창 끌기'였을 때: 힘 모으기를 없던 일로 */
  cancelHold(): void {
    this.held = false
    if (this.phase === 'charge') this.go('idle')
  }

  release(): void {
    if (!this.held) return
    this.held = false
    if (this.phase === 'charge') this.cast(Math.max(0.08, this.power))
  }

  // ───────── 단계 진행 ─────────

  private cast(power: number): void {
    this.power = power
    this.castTo = NEAR_X + (FAR_X - NEAR_X) * power + rand(-3, 3)
    this.castFrom = this.rodTip()
    this.bob = { ...this.castFrom }
    this.fish = null
    this.go('cast')
    sfx.cast()
    this.hooks.onCast()
  }

  private reelIn(): void {
    this.pop = { text: '헛챔질!', t: 1, color: '#9a9a9a' }
    sfx.miss()
    this.go('idle')
  }

  private startWait(): void {
    // 멀리 던질수록 조금 더 오래 기다린다 (대신 희귀한 물고기가 조금 더)
    this.waitLeft = rand(2.5, 8) * (1 + this.power * 0.35) * (this.mode === 'auto' ? 1.3 : 1)
    const n = Math.floor(rand(0, 3.6))
    this.nibbles = Array.from({ length: n }, () => rand(0.6, Math.max(0.8, this.waitLeft - 0.5))).sort((a, b) => b - a)
    this.go('wait')
  }

  private bite(): void {
    const fish = rollFish({ far: this.power })
    this.fish = fish
    this.size = rollSize(fish)
    this.biteWindow = RARITY[fish.rarity].biteWindow / 1000
    this.auto = this.mode === 'auto'
    this.biteReact = rand(0.22, 0.5)
    this.go('bite')
    this.dip = 4
    this.shake = 1.2
    sfx.bite()
    this.ripple(this.bob.x, WATER_Y, 3)
    this.splash(this.bob.x, WATER_Y, 6, '#ffffff')
  }

  private hook(): void {
    if (!this.fish) return
    // 자동 모드라도 입질 때 누르면 이번 물고기는 직접 잡는다
    if (this.auto && this.held) this.auto = false
    const react = this.pt
    this.perfectHook = !this.auto && react < 0.25
    this.misses = 0
    this.go('fight')
    const q = Math.max(0, 1 - react / this.biteWindow)
    this.progress = 0.28 + q * 0.12 + (this.perfectHook ? 0.05 : 0)
    this.tension = 0.45
    this.stamina = 1
    this.rush = 0
    this.rushWarn = 0
    this.overT = 0
    this.slackT = 0
    this.fishX = this.bob.x
    this.fishY = WATER_Y + 6
    this.hitstop = 0.09
    this.flash = 1
    this.shake = 2
    this.pop = this.perfectHook ? { text: 'PERFECT!', t: 1, color: '#ffd23f' } : { text: this.auto ? '자동 챔질' : '챔질 성공!', t: 1, color: '#ffffff' }
    sfx.hook(this.perfectHook)
    this.splash(this.bob.x, WATER_Y, 10, '#ffffff')
    if (this.auto) {
      this.autoWin = Math.random() < RARITY[this.fish.rarity].autoRate
      this.autoEnd = this.autoWin ? rand(2.4, 4) : rand(1.2, 3.2)
    }
  }

  private startFinish(): void {
    if (!this.fish) return
    const r = RARITY[this.fish.rarity]
    this.go('finish')
    this.hitsNeeded = r.finishHits
    this.hits = 0
    this.cursor = 0
    this.cdir = 1
    this.zoneW = { common: 0.3, uncommon: 0.27, rare: 0.24, epic: 0.21, legend: 0.18 }[this.fish.rarity]
    this.zone = rand(0.3, 0.7)
    this.speed = { common: 0.95, uncommon: 1.05, rare: 1.15, epic: 1.25, legend: 1.35 }[this.fish.rarity]
    this.allPerfect = true
    this.lastHit = null
    this.shake = 2
    sfx.leap()
    this.splash(this.fishX, WATER_Y, 16, '#ffffff')
    this.ripple(this.fishX, WATER_Y, 4)
  }

  private finishPress(): void {
    const d = Math.abs(this.cursor - this.zone)
    if (d <= this.zoneW / 2) {
      const perfect = d <= Math.max(0.025, this.zoneW * 0.12)
      if (!perfect) this.allPerfect = false
      this.hits++
      this.lastHit = { t: this.time, ok: true, perfect }
      this.hitstop = 0.07
      this.flash = 0.7
      this.shake = 1.5
      sfx.hit(perfect)
      this.pop = { text: perfect ? 'PERFECT!' : this.hits >= this.hitsNeeded ? '건졌다!' : `${this.hits}/${this.hitsNeeded}`, t: 0.9, color: perfect ? '#ffd23f' : '#6fe08c' }
      if (this.hits >= this.hitsNeeded) {
        this.land()
      } else {
        // 다음 타이밍: 자리 옮기고 좁아지고 빨라진다
        this.zone = this.cursor < 0.5 ? rand(0.55, 0.85) : rand(0.15, 0.45)
        this.zoneW *= 0.88
        this.speed *= 1.08
        this.splash(this.fishX, WATER_Y, 8, '#ffffff')
      }
    } else {
      this.finishMiss()
    }
  }

  private finishMiss(): void {
    this.misses++
    this.lastHit = { t: this.time, ok: false, perfect: false }
    sfx.miss()
    sfx.splash()
    this.shake = 2.5
    if (this.misses >= 2) {
      this.fail('마지막에 놓쳤다!!', '물 밖까지 나왔었는데…')
      return
    }
    // 물고기가 다시 몸부림친다 → 힘겨루기로 되돌아감
    this.pop = { text: '몸부림친다!', t: 1, color: '#ff4d4d' }
    this.go('fight')
    this.progress = 0.62
    this.tension = 0.55
    this.rush = 0.8
  }

  private land(): void {
    this.go('landing')
    sfx.splash()
  }

  private async finishCatch(): Promise<void> {
    if (!this.fish) return
    this.saving = true
    this.go('result')
    this.result = null
    this.streakMiss = 0
    sfx.caught(this.fish.rarity)
    const perfect = !this.auto && this.allPerfect && this.hitsNeeded > 0
    try {
      this.result = await this.hooks.onCatch(this.fish, this.size, this.auto, perfect)
      if (this.result) setTimeout(() => sfx.coin(), 380)
      if (this.result?.rankUp) setTimeout(() => sfx.rankUp(), 900)
    } finally {
      this.saving = false
      this.pt = 0
    }
  }

  private fail(text: string, sub = ''): void {
    this.failText = text
    this.failSub = sub
    this.go('fail')
    this.streakMiss++
    this.hooks.onEscape()
  }

  // ───────── 매 프레임 ─────────

  /** 실제 지난 시간만큼 진행 (1/60초씩 잘라서 — 프레임이 드물어도 시간이 늦게 가지 않게) */
  update(elapsed: number): void {
    let left = Math.min(Math.max(0, elapsed), 0.25)
    while (left > 1e-6) {
      const dt = Math.min(left, 1 / 60)
      left -= dt
      this.step(dt)
    }
  }

  private step(dt: number): void {
    this.time += dt
    this.updateFx(dt)
    if (this.hitstop > 0) {
      this.hitstop -= dt
      return
    }
    this.pt += dt
    const auto = this.mode === 'auto'
    switch (this.phase) {
      case 'idle':
        this.dip = 0
        if (auto && this.pt > 1.6) this.cast(rand(0.3, 0.95))
        break
      case 'charge':
        // 0 → 1 → 0 왔다 갔다 (1.6초 주기)
        {
          const ph = (this.pt / 0.8) % 2
          const before = this.power
          this.power = ph < 1 ? ph : 2 - ph
          if (Math.floor(before * 8) !== Math.floor(this.power * 8)) sfx.charge(this.power)
        }
        break
      case 'cast': {
        const T = 0.55
        const k = Math.min(1, this.pt / T)
        this.bob.x = this.castFrom.x + (this.castTo - this.castFrom.x) * k
        this.bob.y = this.castFrom.y + (WATER_Y - this.castFrom.y) * k - Math.sin(k * Math.PI) * (14 + this.power * 16)
        if (k >= 1) {
          this.bob = { x: this.castTo, y: WATER_Y }
          sfx.plop()
          this.ripple(this.bob.x, WATER_Y, 2)
          this.splash(this.bob.x, WATER_Y, 5, '#cfcfcf')
          this.startWait()
        }
        break
      }
      case 'wait': {
        this.waitLeft -= dt
        this.dip = Math.max(0, this.dip - dt * 10)
        if (this.nibbles.length && this.waitLeft <= this.nibbles[0]) {
          this.nibbles.shift()
          this.dip = 1.6
          sfx.nibble()
          this.ripple(this.bob.x, WATER_Y, 1)
        }
        if (this.waitLeft <= 0) this.bite()
        break
      }
      case 'bite':
        this.dip = 3 + Math.sin(this.pt * 40) * 1
        if (this.auto && !this.frozen && this.pt >= this.biteReact) {
          this.hook()
          break
        }
        if (this.pt > this.biteWindow) {
          this.fail('놓쳤다…', '미끼만 쏙 빼먹고 갔다')
          sfx.fail()
        }
        break
      case 'fight':
        this.updateFight(dt)
        break
      case 'finish':
        this.cursor += this.cdir * this.speed * dt
        if (this.cursor > 1) {
          this.cursor = 2 - this.cursor
          this.cdir = -1
        } else if (this.cursor < 0) {
          this.cursor = -this.cursor
          this.cdir = 1
        }
        if (this.auto) {
          // 자동: 잠깐 뒤 알아서 건진다
          if (this.pt > 0.7 + this.hits * 0.5 && Math.abs(this.cursor - this.zone) < this.zoneW / 3) {
            this.allPerfect = false
            this.hits++
            sfx.hit(false)
            this.flash = 0.5
            if (this.hits >= this.hitsNeeded) this.land()
            else this.zone = rand(0.2, 0.8)
          }
        } else if (this.pt > 5) {
          this.finishMiss()
        }
        break
      case 'landing':
        if (this.pt > 0.7) void this.finishCatch()
        break
      case 'result':
        if (!this.saving && this.pt > (auto ? 3.5 : 6)) this.go('idle')
        break
      case 'fail':
        if (this.pt > 2) this.go('idle')
        break
    }
  }

  private updateFight(dt: number): void {
    const f = this.fish
    if (!f) return
    const p = f.power
    let hold = this.held && !this.frozen
    if (this.auto) {
      // 자동: 장력 0.6 근처를 지키는 흉내
      if (this.tension > 0.72 || this.rush > 0) this.autoHold = false
      else if (this.tension < 0.45) this.autoHold = true
      hold = this.autoHold
    }
    // 물고기: 가끔 확 당긴다 (힘이 빠질수록 덜)
    const T = TUNE
    if (this.rushWarn > 0) {
      // 당기기 직전: 물보라로 먼저 알려 준다 (이때 놓으면 안전)
      this.rushWarn -= dt
      if (this.rushWarn <= 0) {
        this.rush = rand(0.4, T.rushLen + 0.2 * p)
        this.shake = Math.max(this.shake, 1.5 + p * 0.5)
        sfx.rush()
      }
    } else if (this.rush > 0) {
      this.rush -= dt
    } else if (Math.random() < dt * (T.rushBase + T.rushP * p) * (T.rushStamina + (1 - T.rushStamina) * this.stamina)) {
      this.rushWarn = Math.max(0.15, T.warn - 0.05 * p)
      this.splash(this.fishX, WATER_Y, 6, '#ffffff')
      sfx.splash()
    }
    const rushing = this.rush > 0
    this.stamina = Math.max(0, this.stamina - dt * (T.drainBase + (hold ? T.drainHold : 0)) / (0.6 + 0.4 * p))
    if (hold) {
      this.progress += dt * (T.reel / (0.6 + 0.4 * p)) * (rushing ? 0.1 : 1)
      this.tension += dt * (T.rise + T.riseP * p + (rushing ? T.rushRise * p : 0))
      this.reelAcc += dt * (rushing ? 8 : 16)
      if (this.reelAcc >= 1) {
        this.reelAcc = 0
        sfx.reel()
      }
    } else {
      this.tension -= dt * (rushing ? T.fallRush : T.fall)
      this.progress -= dt * p * (rushing ? T.lossRush : T.loss)
    }
    this.tension = Math.max(0, Math.min(1.08, this.tension))
    if (this.tension > 0.8) {
      this.strainAcc += dt
      if (this.strainAcc > 0.14) {
        this.strainAcc = 0
        sfx.strain((this.tension - 0.8) * 4)
      }
    }
    // 물고기 그림자: 멀리(찌 자리) → 가까이(물가)
    const tx = this.castTo + (NEAR_X - 6 - this.castTo) * Math.max(0, Math.min(1, this.progress))
    this.fishX += (tx + (rushing ? Math.sin(this.time * 23) * 4 : Math.sin(this.time * 3) * 2) - this.fishX) * Math.min(1, dt * 6)
    this.fishY = WATER_Y + 5 + Math.sin(this.time * (rushing ? 17 : 4)) * (rushing ? 2 : 1)
    this.bob.x = this.fishX
    if (rushing && Math.random() < dt * 8) this.splash(this.fishX + rand(-4, 4), WATER_Y, 2, '#cfcfcf')

    if (this.auto) {
      this.progress = Math.max(this.progress, 0.25)
      this.tension = Math.min(this.tension, 0.95)
      if (this.pt >= this.autoEnd) {
        if (this.autoWin) {
          this.progress = 1
        } else if (f.rarity === 'legend') {
          this.fail('전설은 손맛으로만!', '자동 낚시로는 못 잡아요. 수동으로 도전!')
          sfx.snap()
          return
        } else {
          const snap = Math.random() < 0.5
          this.fail(snap ? '줄이 끊어졌다!' : '도망갔다…', '자동 낚시는 성공률이 낮아요')
          if (snap) sfx.snap()
          else sfx.fail()
          return
        }
      }
    } else {
      if (this.tension >= 1) {
        this.overT += dt
        if (this.overT > TUNE.grace) {
          this.fail('줄이 끊어졌다!', '너무 세게 당겼다. 물고기가 당길 땐 놓기!')
          sfx.snap()
          this.shake = 3
          return
        }
      } else this.overT = 0
      if (this.tension < 0.04) {
        this.slackT += dt
        if (this.slackT > 2.2) {
          this.fail('바늘이 빠졌다…', '줄이 너무 느슨했다. 살살 감아 주기!')
          sfx.fail()
          return
        }
      } else this.slackT = 0
      if (this.progress <= 0) {
        this.fail('도망갔다…', '너무 오래 풀어 줬다')
        sfx.fail()
        return
      }
    }
    if (this.progress >= 1) {
      this.progress = 1
      this.startFinish()
    }
  }

  // ───────── 효과 ─────────

  rodTip(): { x: number; y: number } {
    // 힘 모을 때는 뒤로 젖히고, 힘겨루기 땐 장력만큼 휜다(scene.ts)
    let ang = -0.95
    if (this.phase === 'charge') ang = -0.95 - 0.9 * this.power
    else if (this.phase === 'cast') ang = -0.95 + 0.5 * Math.max(0, 1 - this.pt / 0.25)
    else if (this.phase === 'fight' || this.phase === 'finish') ang = -0.55 + this.tension * 0.35
    return { x: HAND.x + Math.cos(ang) * ROD_LEN, y: HAND.y + Math.sin(ang) * ROD_LEN }
  }

  splash(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: rand(-22, 22), vy: rand(-45, -15), life: rand(0.35, 0.7), color })
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160)
  }

  ripple(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.ripples.push({ x, y, r: 1 + i * 2, life: 1 + i * 0.15 })
  }

  private updateFx(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 6)
    this.flash = Math.max(0, this.flash - dt * 4)
    if (this.pop) {
      this.pop.t -= dt * 0.8
      if (this.pop.t <= 0) this.pop = null
    }
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 120 * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y <= WATER_Y + 1)
    for (const r of this.ripples) {
      r.life -= dt * 0.9
      r.r += dt * 9
    }
    this.ripples = this.ripples.filter((r) => r.life > 0)
  }

  /** 트레이에 보여 줄 한 줄 상태 */
  statusText(): string {
    switch (this.phase) {
      case 'wait':
        return '입질 기다리는 중'
      case 'bite':
        return '입질!'
      case 'fight':
      case 'finish':
        return '힘겨루기 중!'
      default:
        return this.mode === 'auto' ? '자동 낚시 중' : '낚시 쉬는 중'
    }
  }

  /** 테스트·스크린샷용: 단계를 바로 만든다 */
  debugSet(phase: Phase, fishId = 'salmon'): void {
    this.fish = FISH_BY_ID[fishId] ?? null
    this.size = this.fish ? rollSize(this.fish) : 0
    this.castTo = 130
    this.bob = { x: 130, y: WATER_Y }
    if (phase === 'bite' || phase === 'wait') {
      this.startWait()
      if (phase === 'bite') this.bite()
      if (this.fish) this.fish = FISH_BY_ID[fishId] ?? this.fish
    } else if (phase === 'fight') {
      this.auto = false
      this.go('bite')
      this.hook()
      this.progress = 0.55
      this.tension = 0.7
      this.hitstop = 0
    } else if (phase === 'finish') {
      this.auto = false
      this.go('fight')
      this.fishX = 90
      this.startFinish()
    } else {
      this.go(phase)
    }
  }
}
