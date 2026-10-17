import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

let started = false

/** 패키징된 앱에서만 자동 업데이트를 확인한다 (electron-builder publish 설정 사용) */
export function setupUpdater(): void {
  if (!app.isPackaged || process.env.LUPIN_NO_UPDATE === '1') return
  started = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('error', (err) => console.warn('[updater]', err?.message ?? err))
  const check = (): void => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => console.warn('[updater] check failed', err?.message ?? err))
  }
  setTimeout(check, 10_000)
  setInterval(check, 6 * 60 * 60 * 1000)
}

/** 설정 화면의 '업데이트 확인' — 결과를 한 줄로 */
export async function checkNow(): Promise<string> {
  if (!app.isPackaged || !started) return '개발 버전이라 업데이트를 확인하지 않아요'
  try {
    const r = await autoUpdater.checkForUpdates()
    const latest = r?.updateInfo?.version
    if (!latest || latest === app.getVersion()) return `최신 버전이에요 (v${app.getVersion()})`
    return `v${latest} 받는 중… 앱을 끄면 설치돼요`
  } catch (err) {
    return `확인하지 못했어요: ${(err as Error)?.message ?? err}`
  }
}
