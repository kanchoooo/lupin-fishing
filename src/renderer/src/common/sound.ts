// 8비트 효과음 (WebAudio 합성 — 소리 파일 없음)
import type { Rarity } from '@shared/fish'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true
let volume = 0.6
let muted = false

function ac(): AudioContext | null {
  if (!enabled || muted || volume <= 0) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  master!.gain.value = volume * 0.5
  return ctx
}

export function setSound(on: boolean, vol: number): void {
  enabled = on
  volume = vol
}

/** 위장 중에는 조용히 */
export function setMuted(m: boolean): void {
  muted = m
}

interface ToneOpts {
  type?: OscillatorType
  vol?: number
  to?: number
  at?: number
}

function tone(freq: number, dur: number, o: ToneOpts = {}): void {
  const a = ac()
  if (!a || !master) return
  const t = a.currentTime + (o.at ?? 0)
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = o.type ?? 'square'
  osc.frequency.setValueAtTime(freq, t)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur)
  const v = o.vol ?? 0.25
  g.gain.setValueAtTime(v, t)
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

let noiseBuf: AudioBuffer | null = null

function noise(dur: number, o: { vol?: number; freq?: number; q?: number; at?: number; type?: BiquadFilterType } = {}): void {
  const a = ac()
  if (!a || !master) return
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = a.currentTime + (o.at ?? 0)
  const src = a.createBufferSource()
  src.buffer = noiseBuf
  const f = a.createBiquadFilter()
  f.type = o.type ?? 'bandpass'
  f.frequency.value = o.freq ?? 1200
  f.Q.value = o.q ?? 1
  const g = a.createGain()
  g.gain.setValueAtTime(o.vol ?? 0.3, t)
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.02)
}

export const sfx = {
  click: () => tone(1400, 0.03, { vol: 0.08 }),
  charge: (p: number) => tone(300 + p * 500, 0.04, { vol: 0.05, type: 'triangle' }),
  cast: () => {
    noise(0.25, { freq: 2400, q: 0.7, vol: 0.18, type: 'highpass' })
    tone(900, 0.2, { to: 300, vol: 0.06, type: 'triangle' })
  },
  plop: () => {
    tone(520, 0.12, { to: 160, type: 'sine', vol: 0.35 })
    noise(0.15, { freq: 700, vol: 0.15 })
  },
  nibble: () => tone(260, 0.06, { to: 200, type: 'sine', vol: 0.3 }),
  bite: () => {
    tone(880, 0.07, { vol: 0.2 })
    tone(1320, 0.12, { vol: 0.2, at: 0.07 })
    noise(0.2, { freq: 600, vol: 0.25, at: 0.02 })
  },
  hook: (perfect: boolean) => {
    tone(perfect ? 1568 : 1046, 0.08, { vol: 0.22 })
    tone(perfect ? 2093 : 1318, 0.14, { vol: 0.18, at: 0.06 })
    noise(0.12, { freq: 3000, vol: 0.12, type: 'highpass' })
  },
  reel: () => noise(0.025, { freq: 4200, q: 6, vol: 0.12 }),
  strain: (level: number) => tone(90 + level * 70, 0.12, { type: 'sawtooth', vol: 0.03 + level * 0.05 }),
  rush: () => {
    noise(0.3, { freq: 500, vol: 0.3 })
    tone(140, 0.25, { to: 80, type: 'sawtooth', vol: 0.08 })
  },
  splash: () => noise(0.35, { freq: 900, q: 0.6, vol: 0.3 }),
  snap: () => {
    tone(2400, 0.04, { vol: 0.25 })
    noise(0.12, { freq: 5000, vol: 0.25, type: 'highpass' })
    tone(300, 0.35, { to: 60, type: 'triangle', vol: 0.2, at: 0.05 })
  },
  fail: () => {
    tone(392, 0.14, { vol: 0.15, type: 'triangle' })
    tone(330, 0.14, { vol: 0.15, type: 'triangle', at: 0.14 })
    tone(262, 0.3, { vol: 0.15, type: 'triangle', at: 0.28 })
  },
  leap: () => {
    noise(0.4, { freq: 1100, q: 0.5, vol: 0.32 })
    tone(300, 0.3, { to: 900, type: 'triangle', vol: 0.1 })
  },
  tick: () => tone(1800, 0.02, { vol: 0.05 }),
  hit: (perfect: boolean) => {
    tone(perfect ? 1760 : 1320, 0.06, { vol: 0.22 })
    tone(perfect ? 2637 : 1760, 0.1, { vol: 0.18, at: 0.05 })
  },
  miss: () => tone(200, 0.2, { to: 120, type: 'sawtooth', vol: 0.12 }),
  caught: (r: Rarity) => {
    const base = [523, 659, 784, 1046]
    const n = r === 'legend' ? 8 : r === 'epic' ? 6 : r === 'rare' ? 5 : 4
    for (let i = 0; i < n; i++) {
      const f = base[i % 4] * (i >= 4 ? 2 : 1)
      tone(f, 0.12, { vol: 0.16, at: i * 0.075 })
    }
    if (r === 'legend' || r === 'epic') tone(2093, 0.6, { vol: 0.12, at: n * 0.075, type: 'triangle' })
  },
  coin: () => {
    tone(1976, 0.06, { vol: 0.14 })
    tone(2637, 0.22, { vol: 0.14, at: 0.06 })
  },
  rankUp: () => {
    ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, { vol: 0.16, at: i * 0.11, type: 'triangle' }))
  }
}
