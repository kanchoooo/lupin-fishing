// 다른 앱을 쓰는 중에도 낚싯대 키를 받는다: 60Hz 로 키 상태를 직접 읽는다 (키 입력을 가로채지 않음 — 다른 앱에도 그대로 간다)
//  - 윈도우: user32 GetAsyncKeyState — 키보드·마우스 버튼 모두 (권한 필요 없음)
//  - 맥: 보조 키는 CGEventSourceFlagsState, 마우스 버튼은 NSEvent.pressedMouseButtons (둘 다 권한 필요 없음)
//        그 밖의 키는 CGEventSourceKeyState — '입력 모니터링' 권한이 있어야 읽히는 경우가 있다
import { shell } from 'electron'
import koffi from 'koffi'
import { MAC_FLAG, MAC_MOUSE_BIT, macVk, winVk } from '@shared/keys'

export type KeyReader = (codes: string[]) => Set<string>

/** 지금 눌린 키(codes 중에서). 읽을 수 없는 환경이면 null */
export function createKeyReader(): KeyReader | null {
  try {
    if (process.platform === 'win32') return winReader()
    if (process.platform === 'darwin') return macReader()
  } catch (err) {
    console.warn('[keys] 전역 키를 읽을 수 없어요:', (err as Error)?.message ?? err)
  }
  return null
}

function winReader(): KeyReader {
  const user32 = koffi.load('user32.dll')
  const GetAsyncKeyState = user32.func('int16_t __stdcall GetAsyncKeyState(int vKey)')
  return (codes) => {
    const down = new Set<string>()
    for (const c of codes) {
      const vk = winVk(c)
      if (vk === null) continue
      // 가장 높은 비트 = 지금 눌려 있음
      if (((GetAsyncKeyState(vk) as number) & 0x8000) !== 0) down.add(c)
    }
    return down
  }
}

function macReader(): KeyReader {
  const CG = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
  const CGEventSourceFlagsState = CG.func('uint64_t CGEventSourceFlagsState(int stateID)')
  const CGEventSourceKeyState = CG.func('bool CGEventSourceKeyState(int stateID, uint16_t key)')
  const objc = koffi.load('/usr/lib/libobjc.A.dylib')
  const objc_getClass = objc.func('void *objc_getClass(const char *name)')
  const sel_registerName = objc.func('void *sel_registerName(const char *name)')
  const msgSend = objc.func('uint64_t objc_msgSend(void *self, void *op)')
  const NSEvent = objc_getClass('NSEvent')
  const pressedMouseButtons = sel_registerName('pressedMouseButtons')
  const HID = 1 // kCGEventSourceStateHIDSystemState
  return (codes) => {
    const down = new Set<string>()
    let flags: number | null = null
    let mouse: number | null = null
    for (const c of codes) {
      const bit = MAC_FLAG[c]
      if (bit) {
        flags ??= Number(CGEventSourceFlagsState(HID))
        if ((flags & bit) !== 0) down.add(c)
        continue
      }
      const mb = MAC_MOUSE_BIT[c]
      if (mb) {
        mouse ??= NSEvent && pressedMouseButtons ? Number(msgSend(NSEvent, pressedMouseButtons)) : 0
        if ((mouse & mb) !== 0) down.add(c)
        continue
      }
      const vk = macVk(c)
      if (vk !== null && CGEventSourceKeyState(HID, vk)) down.add(c)
    }
    return down
  }
}

// ───────── 맥 '입력 모니터링' 권한 ─────────

const kIOHIDRequestTypeListenEvent = 1
let iokit: { check: (t: number) => number; request: (t: number) => boolean } | null | undefined

function hid(): typeof iokit {
  if (iokit !== undefined) return iokit
  try {
    const IOK = koffi.load('/System/Library/Frameworks/IOKit.framework/IOKit')
    iokit = {
      check: IOK.func('int IOHIDCheckAccess(int requestType)') as unknown as (t: number) => number,
      request: IOK.func('bool IOHIDRequestAccess(int requestType)') as unknown as (t: number) => boolean
    }
  } catch {
    iokit = null
  }
  return iokit
}

/** 'granted' | 'denied' | 'unknown' (맥이 아니면 granted) */
export function macAccess(): 'granted' | 'denied' | 'unknown' {
  if (process.platform !== 'darwin') return 'granted'
  const h = hid()
  if (!h) return 'unknown'
  const r = h.check(kIOHIDRequestTypeListenEvent)
  return r === 0 ? 'granted' : r === 1 ? 'denied' : 'unknown'
}

/** 권한 요청 창을 띄우고, 이미 거절했으면 시스템 설정을 연다 */
export function requestMacAccess(): void {
  if (process.platform !== 'darwin') return
  const before = macAccess()
  if (before === 'unknown') hid()?.request(kIOHIDRequestTypeListenEvent)
  else void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent')
}
