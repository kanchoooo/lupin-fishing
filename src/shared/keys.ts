// 키 이름은 KeyboardEvent.code 를 그대로 쓴다 ('ControlLeft', 'Space', 'KeyF' …)
// 마우스 버튼도 키처럼 쓸 수 있다: 'Mouse3' 휠 클릭 · 'Mouse4' 뒤로 · 'Mouse5' 앞으로
// 다른 앱을 쓰는 중에도 읽는 키(전역 키)는 메인 프로세스가 60Hz 로 키 상태를 직접 읽는다 (main/keys.ts).
//  - 맥: 보조 키(Control·Shift·Option·Command)·마우스 버튼은 권한 없이, 그 밖의 키는 '입력 모니터링' 권한이 필요할 수 있다
//  - 윈도우: 아래 VK 표에 있는 키 모두 (권한 필요 없음)

export type Platform = 'darwin' | 'win32' | string

export const MODIFIER_KEYS = ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'] as const

/** 맥 CGEventSourceFlagsState 의 '왼쪽/오른쪽' 구분 비트 (IOLLEvent.h NX_DEVICE*KEYMASK) */
export const MAC_FLAG: Record<string, number> = {
  ControlLeft: 0x1,
  ShiftLeft: 0x2,
  ShiftRight: 0x4,
  MetaLeft: 0x8,
  MetaRight: 0x10,
  AltLeft: 0x20,
  AltRight: 0x40,
  ControlRight: 0x2000
}

export const MOUSE_KEYS = ['Mouse3', 'Mouse4', 'Mouse5'] as const

export function isMouse(code: string): boolean {
  return (MOUSE_KEYS as readonly string[]).includes(code)
}

/** 맥 가상 키 코드 (Events.h kVK_*) — 보조 키가 아닌 키 */
const MAC_VK: Record<string, number> = {
  KeyA: 0x00, KeyS: 0x01, KeyD: 0x02, KeyF: 0x03, KeyH: 0x04, KeyG: 0x05, KeyZ: 0x06, KeyX: 0x07, KeyC: 0x08, KeyV: 0x09,
  KeyB: 0x0b, KeyQ: 0x0c, KeyW: 0x0d, KeyE: 0x0e, KeyR: 0x0f, KeyY: 0x10, KeyT: 0x11, Digit1: 0x12, Digit2: 0x13, Digit3: 0x14,
  Digit4: 0x15, Digit6: 0x16, Digit5: 0x17, Equal: 0x18, Digit9: 0x19, Digit7: 0x1a, Minus: 0x1b, Digit8: 0x1c, Digit0: 0x1d,
  BracketRight: 0x1e, KeyO: 0x1f, KeyU: 0x20, BracketLeft: 0x21, KeyI: 0x22, KeyP: 0x23, Enter: 0x24, KeyL: 0x25, KeyJ: 0x26,
  Quote: 0x27, KeyK: 0x28, Semicolon: 0x29, Backslash: 0x2a, Comma: 0x2b, Slash: 0x2c, KeyN: 0x2d, KeyM: 0x2e, Period: 0x2f,
  Tab: 0x30, Space: 0x31, Backquote: 0x32, Backspace: 0x33, Escape: 0x35, CapsLock: 0x39, F17: 0x40, NumpadDecimal: 0x41,
  NumpadMultiply: 0x43, NumpadAdd: 0x45, NumLock: 0x47, NumpadDivide: 0x4b, NumpadEnter: 0x4c, NumpadSubtract: 0x4e, F18: 0x4f,
  F19: 0x50, NumpadEqual: 0x51, Numpad0: 0x52, Numpad1: 0x53, Numpad2: 0x54, Numpad3: 0x55, Numpad4: 0x56, Numpad5: 0x57,
  Numpad6: 0x58, Numpad7: 0x59, F20: 0x5a, Numpad8: 0x5b, Numpad9: 0x5c, IntlYen: 0x5d, IntlRo: 0x5e, F5: 0x60, F6: 0x61,
  F7: 0x62, F3: 0x63, F8: 0x64, F9: 0x65, Lang2: 0x66, F11: 0x67, Lang1: 0x68, F13: 0x69, F16: 0x6a, F14: 0x6b, F10: 0x6d,
  F12: 0x6f, F15: 0x71, Help: 0x72, Insert: 0x72, Home: 0x73, PageUp: 0x74, Delete: 0x75, F4: 0x76, End: 0x77, F2: 0x78,
  PageDown: 0x79, F1: 0x7a, ArrowLeft: 0x7b, ArrowRight: 0x7c, ArrowDown: 0x7d, ArrowUp: 0x7e, IntlBackslash: 0x0a
}

export function macVk(code: string): number | null {
  return code in MAC_VK ? MAC_VK[code] : null
}

/** 맥 NSEvent.pressedMouseButtons 비트 */
export const MAC_MOUSE_BIT: Record<string, number> = { Mouse3: 1 << 2, Mouse4: 1 << 3, Mouse5: 1 << 4 }

/** 윈도우 가상 키 코드 */
export function winVk(code: string): number | null {
  const fixed: Record<string, number> = {
    Mouse3: 0x04,
    Mouse4: 0x05,
    Mouse5: 0x06,
    Backspace: 0x08,
    CapsLock: 0x14,
    Escape: 0x1b,
    NumLock: 0x90,
    PrintScreen: 0x2c,
    ContextMenu: 0x5d,
    Lang1: 0x15,
    Lang2: 0x19,
    Minus: 0xbd,
    Equal: 0xbb,
    BracketLeft: 0xdb,
    BracketRight: 0xdd,
    Backslash: 0xdc,
    Semicolon: 0xba,
    Quote: 0xde,
    Comma: 0xbc,
    Period: 0xbe,
    Slash: 0xbf,
    IntlBackslash: 0xe2,
    ShiftLeft: 0xa0,
    ShiftRight: 0xa1,
    ControlLeft: 0xa2,
    ControlRight: 0xa3,
    AltLeft: 0xa4,
    AltRight: 0xa5,
    MetaLeft: 0x5b,
    MetaRight: 0x5c,
    Space: 0x20,
    Enter: 0x0d,
    Tab: 0x09,
    Backquote: 0xc0,
    ArrowLeft: 0x25,
    ArrowUp: 0x26,
    ArrowRight: 0x27,
    ArrowDown: 0x28,
    Insert: 0x2d,
    Delete: 0x2e,
    Home: 0x24,
    End: 0x23,
    PageUp: 0x21,
    PageDown: 0x22,
    ScrollLock: 0x91,
    Pause: 0x13,
    NumpadAdd: 0x6b,
    NumpadSubtract: 0x6d,
    NumpadMultiply: 0x6a,
    NumpadDivide: 0x6f,
    NumpadDecimal: 0x6e,
    NumpadEnter: 0x0d
  }
  if (code in fixed) return fixed[code]
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1].charCodeAt(0)
  m = /^Digit([0-9])$/.exec(code)
  if (m) return 0x30 + Number(m[1])
  m = /^Numpad([0-9])$/.exec(code)
  if (m) return 0x60 + Number(m[1])
  m = /^F([0-9]{1,2})$/.exec(code)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 24) return 0x6f + Number(m[1])
  return null
}

export function isModifier(code: string): boolean {
  return (MODIFIER_KEYS as readonly string[]).includes(code)
}

/** 다른 앱을 쓰는 중에도 읽을 수 있는 키인지 */
export function globalCapable(code: string, platform: Platform): boolean {
  if (platform === 'darwin') return code in MAC_FLAG || code in MAC_MOUSE_BIT || macVk(code) !== null
  if (platform === 'win32') return winVk(code) !== null
  return false
}

/** 맥에서 '입력 모니터링' 권한이 있어야 다른 앱 쓰는 중에 읽히는 키 */
export function macNeedsAccess(code: string | null): boolean {
  return !!code && !(code in MAC_FLAG) && !(code in MAC_MOUSE_BIT) && macVk(code) !== null
}

/** 일하는 중에 눌려도 다른 앱에서 아무 일도 안 일어나는 키 (설정에서 '추천' 표시) */
export function harmless(code: string, platform: Platform): boolean {
  if (platform === 'darwin') return ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaRight'].includes(code)
  // 윈도우 한국어 자판은 오른쪽 Alt = 한/영, 오른쪽 Ctrl = 한자인 경우가 많고, Shift 를 5번 누르면 고정 키 창이 뜬다
  return ['ControlLeft', 'Pause', 'F13', 'F14', 'F15'].includes(code)
}

const SIDE: Record<string, string> = { Left: '왼쪽', Right: '오른쪽' }

/** 설정 화면용 이름 */
export function keyLabel(code: string | null, platform: Platform): string {
  if (!code) return '없음'
  const mac = platform === 'darwin'
  const m = /^(Control|Shift|Alt|Meta)(Left|Right)$/.exec(code)
  if (m) {
    const name = mac
      ? { Control: 'Control', Shift: 'Shift', Alt: '⌥ Option', Meta: '⌘ Command' }[m[1]]
      : { Control: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Meta: 'Win' }[m[1]]
    return `${SIDE[m[2]]} ${name}`
  }
  return shortKey(code, platform)
}

/** 화면 안내용 짧은 이름 */
export function shortKey(code: string | null, platform: Platform): string {
  if (!code) return '-'
  const mac = platform === 'darwin'
  const m = /^(Control|Shift|Alt|Meta)(Left|Right)$/.exec(code)
  if (m) {
    const name = mac ? { Control: 'Control', Shift: 'Shift', Alt: 'Option', Meta: 'Cmd' }[m[1]] : { Control: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Meta: 'Win' }[m[1]]
    return (m[2] === 'Right' ? '오른' : '') + name
  }
  let k = /^Key([A-Z])$/.exec(code)
  if (k) return k[1]
  k = /^Digit([0-9])$/.exec(code)
  if (k) return k[1]
  k = /^Numpad([0-9])$/.exec(code)
  if (k) return `숫자패드 ${k[1]}`
  const names: Record<string, string> = {
    Mouse3: '마우스 휠 클릭',
    Mouse4: '마우스 뒤로 버튼',
    Mouse5: '마우스 앞으로 버튼',
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
    Backspace: 'Backspace',
    CapsLock: 'CapsLock',
    NumLock: 'NumLock',
    PrintScreen: 'PrintScreen',
    ContextMenu: '메뉴 키',
    Lang1: '한/영',
    Lang2: '한자',
    IntlBackslash: '\\',
    NumpadAdd: '숫자패드 +',
    NumpadSubtract: '숫자패드 -',
    NumpadMultiply: '숫자패드 *',
    NumpadDivide: '숫자패드 /',
    NumpadDecimal: '숫자패드 .',
    NumpadEnter: '숫자패드 Enter',
    NumpadEqual: '숫자패드 =',
    Help: 'Help',
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Esc',
    Backquote: '`',
    ArrowLeft: '←',
    ArrowUp: '↑',
    ArrowRight: '→',
    ArrowDown: '↓',
    ScrollLock: 'ScrollLock',
    Pause: 'Pause',
    Insert: 'Insert',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Tab: 'Tab'
  }
  return names[code] ?? code
}

export function defaultKeys(platform: Platform): { reelKey: string; bossKey: string | null } {
  // 맥: 왼쪽 Control 은 일할 때 거의 안 쓰고 혼자 눌러도 아무 일 없다. 오른쪽 Option 도 마찬가지
  // 윈도우: 왼쪽 Ctrl 만 눌러서는 아무 일도 안 생긴다 (Shift 는 고정 키, 오른쪽 Alt·Ctrl 은 한/영·한자 키라 피함)
  if (platform === 'darwin') return { reelKey: 'ControlLeft', bossKey: 'AltRight' }
  return { reelKey: 'ControlLeft', bossKey: null }
}
