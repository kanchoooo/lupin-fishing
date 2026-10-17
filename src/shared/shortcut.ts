// 단축키 (조합 키): 설정 화면에서 누른 키 → Electron accelerator 문자열 ('Control+Alt+N') · 화면 표시용 이름
type Platform = string

export interface KeyLike {
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const MOD_CODES = new Set(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'])

const KEY_NAMES: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec'
}

function keyOf(code: string): string | null {
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1]
  m = /^Digit([0-9])$/.exec(code)
  if (m) return m[1]
  m = /^Numpad([0-9])$/.exec(code)
  if (m) return 'num' + m[1]
  m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code)
  if (m) return code
  return KEY_NAMES[code] ?? null
}

export type AccelPick = { accel: string } | { wait: true } | { error: string }

/** 누른 키 → accelerator. 보조 키만 눌렀으면 wait, 글자 키 혼자는 error (글 쓸 때 눌리니까) */
export function accelFromEvent(e: KeyLike, platform: Platform): AccelPick {
  if (MOD_CODES.has(e.code)) return { wait: true }
  const key = keyOf(e.code)
  if (!key) return { error: '이 키는 단축키로 쓸 수 없어요' }
  const mods: string[] = []
  if (e.metaKey) mods.push(platform === 'darwin' ? 'Command' : 'Super')
  if (e.ctrlKey) mods.push('Control')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  const fkey = /^F\d+$/.test(key)
  if (!fkey && (mods.length === 0 || (mods.length === 1 && mods[0] === 'Shift'))) {
    return { error: 'Ctrl · Alt 같은 보조 키와 같이 눌러 주세요 (F 키는 혼자도 돼요)' }
  }
  return { accel: [...mods, key].join('+') }
}

const MAC_SYM: Record<string, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘' }
const ARROW: Record<string, string> = { Up: '↑', Down: '↓', Left: '←', Right: '→' }

/** 화면 표시: 맥 '⌃⌥N' (long = 'Control+Option+N') · 윈도우 'Ctrl+Alt+N' */
export function accelLabel(accel: string | null, platform: Platform, long = false): string {
  if (!accel) return '없음'
  const parts = accel.split('+')
  // '+' 키 자체는 쓰지 않으므로 마지막 조각이 키
  const key = parts.pop() ?? ''
  const k = ARROW[key] ?? (key.startsWith('num') && key.length > 3 ? '숫자패드 ' + key.slice(3) : key)
  if (platform === 'darwin') {
    const order = ['Control', 'Alt', 'Shift', 'Command']
    const on = order.filter((m) => parts.includes(m))
    if (long) return [...on.map((m) => (m === 'Alt' ? 'Option' : m)), k].join('+')
    return on.map((m) => MAC_SYM[m]).join('') + k
  }
  const names: Record<string, string> = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Super: 'Win' }
  const order = ['Control', 'Alt', 'Shift', 'Super']
  return [...order.filter((m) => parts.includes(m)).map((m) => names[m]), k].join('+')
}

/** 기본 단축키: 일하는 프로그램들이 잘 안 쓰는 Ctrl+Alt(맥 ⌃⌥) 조합 */
export function defaultShortcuts(): { lookShortcut: string; memoShortcut: string } {
  return { lookShortcut: 'Control+Alt+L', memoShortcut: 'Control+Alt+N' }
}

export function validAccel(a: unknown): a is string {
  return typeof a === 'string' && a.length > 0 && a.length < 48 && /^[A-Za-z0-9+\-=[\]\\;',./`]+$/.test(a)
}
