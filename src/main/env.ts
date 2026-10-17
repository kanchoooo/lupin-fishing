import { BrowserWindow } from 'electron'
import { join } from 'path'

/**
 * 개발·테스트용 환경변수
 *  LUPIN_HEADLESS=1          창을 화면에 띄우지 않고 오프스크린 렌더링 (스크린샷 자동화)
 *  LUPIN_USERDATA=폴더       저장 위치를 바꾼다 (헤드리스는 기본으로 임시 폴더)
 *  LUPIN_SCRIPT=경로.json    자동 조작 [{ "at": ms, "widget"|"panel": "자바스크립트", "shot"|"panelShot": "이름", "quit": true }]
 *  LUPIN_SHOT_DIR=폴더       스크린샷 저장 위치 (기본 shots)
 *  LUPIN_LAB=이름           그림 확인용 lab.html#이름 (LUPIN_SHOT=경로.png 면 캡처 후 종료, LUPIN_SIZE=WxH)
 *  LUPIN_LOG=1              렌더러 콘솔을 터미널로
 *  LUPIN_NO_UPDATE=1        자동 업데이트 끄기
 *  LUPIN_SAVE_DIR=폴더      이미지 저장 대화상자 대신 이 폴더에 바로 저장
 *  LUPIN_SELFTEST=1         전역 키 읽기(koffi)를 확인하고 종료 (패키징 확인용)
 */
export const env = process.env

export function isHeadless(): boolean {
  return env.LUPIN_HEADLESS === '1'
}

export function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

export function loadRenderer(win: BrowserWindow, page: 'widget' | 'panel' | 'memo' | 'lab', hash?: string): void {
  const devUrl = env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void win.loadURL(`${devUrl}/${page}.html${hash ? '#' + hash : ''}`)
  } else {
    void win.loadFile(join(__dirname, `../renderer/${page}.html`), { hash })
  }
}
