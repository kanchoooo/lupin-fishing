import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { KeyEvent, MainApi, MemoState, PanelTab, PersistedState, ShareRequest } from '@shared/types'

function on<T>(channel: string, cb: (v: T) => void): () => void {
  const h = (_e: IpcRendererEvent, v: T): void => cb(v)
  ipcRenderer.on(channel, h)
  return () => ipcRenderer.removeListener(channel, h)
}

const api: MainApi = {
  platform: process.platform,
  getState: () => ipcRenderer.invoke('state:get'),
  onStateChanged: (cb) => on<PersistedState>('state:changed', cb),
  setSettings: (patch) => ipcRenderer.invoke('state:setSettings', patch),
  setOnboarded: () => ipcRenderer.invoke('state:setOnboarded'),
  recordCatch: (c) => ipcRenderer.invoke('fish:catch', c),
  recordCast: () => ipcRenderer.invoke('fish:cast'),
  recordEscape: () => ipcRenderer.invoke('fish:escape'),
  resetAll: () => ipcRenderer.invoke('state:resetAll'),
  onKey: (cb) => on<KeyEvent>('key', cb),
  keyReaderOk: () => ipcRenderer.invoke('keys:ok'),
  keyAccess: () => ipcRenderer.invoke('keys:access'),
  requestKeyAccess: () => ipcRenderer.invoke('keys:requestAccess'),
  onKeyTest: (cb) => on<string[]>('keytest', cb),
  setKeyTest: (on) => ipcRenderer.invoke('keys:test', on),
  openPanel: (tab) => ipcRenderer.invoke('panel:open', tab),
  onPanelTab: (cb) => on<PanelTab>('panel:tab', cb),
  hideWidget: () => ipcRenderer.invoke('widget:hide'),
  showWidget: () => ipcRenderer.invoke('widget:show'),
  dragStart: () => ipcRenderer.invoke('widget:dragStart'),
  dragEnd: () => ipcRenderer.invoke('widget:dragEnd'),
  onBoss: (cb) => on<void>('boss', cb),
  setDisguised: (on) => ipcRenderer.invoke('widget:disguised', on),
  setStatus: (text) => ipcRenderer.invoke('widget:status', text),
  saveImage: (dataUrl, name) => ipcRenderer.invoke('app:saveImage', dataUrl, name),
  shareImage: (dataUrl, name, at) => ipcRenderer.invoke('app:shareImage', dataUrl, name, at),
  requestShare: (req) => ipcRenderer.invoke('share:request', req),
  onShareRequest: (cb) => on<ShareRequest>('share:request', cb),
  takeShareRequest: () => ipcRenderer.invoke('share:take'),
  setMouseThrough: (v) => ipcRenderer.invoke('widget:mouseThrough', v),
  onHover: (cb) => on<{ x: number; y: number } | null>('widget:hover', cb),
  shortcutStatus: () => ipcRenderer.invoke('shortcuts:status'),
  suspendShortcuts: (v) => ipcRenderer.invoke('shortcuts:suspend', v),
  memoState: () => ipcRenderer.invoke('memo:state'),
  onMemos: (cb) => on<MemoState>('memo:changed', cb),
  memoGet: (id) => ipcRenderer.invoke('memo:get', id),
  memoNew: () => ipcRenderer.invoke('memo:new'),
  memoText: (id, text) => ipcRenderer.send('memo:text', id, text),
  memoPatch: (id, patch) => ipcRenderer.invoke('memo:patch', id, patch),
  memoHide: (id) => ipcRenderer.invoke('memo:hide', id),
  memoTrash: (id) => ipcRenderer.invoke('memo:trash', id),
  memoRestore: (id) => ipcRenderer.invoke('memo:restore', id),
  memoPurge: (id) => ipcRenderer.invoke('memo:purge', id),
  memoEmptyTrash: () => ipcRenderer.invoke('memo:emptyTrash'),
  memoFocus: (id) => ipcRenderer.invoke('memo:focus', id),
  memoShowAll: () => ipcRenderer.invoke('memo:showAll'),
  setBossNote: (text) => ipcRenderer.send('memo:boss', text),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  quit: () => ipcRenderer.invoke('app:quit')
}

contextBridge.exposeInMainWorld('api', api)
