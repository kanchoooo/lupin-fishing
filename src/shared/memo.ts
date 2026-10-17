// 스티커 메모 색 (평범한 메모지처럼 — 위장할 때도 낚시 게임처럼 안 보이게)
import type { MemoColor } from './types'

export interface MemoTone {
  label: string
  bg: string
  head: string
  ink: string
}

export const MEMO_COLORS: Record<MemoColor, MemoTone> = {
  yellow: { label: '노랑', bg: '#fff6b3', head: '#f6e98a', ink: '#3b3622' },
  pink: { label: '분홍', bg: '#ffdbe6', head: '#f8c2d4', ink: '#45272f' },
  green: { label: '초록', bg: '#dbf3ca', head: '#c3e8ab', ink: '#26381c' },
  blue: { label: '파랑', bg: '#d6ebfd', head: '#bcdcf8', ink: '#1f3346' },
  purple: { label: '보라', bg: '#e8defe', head: '#d5c6f9', ink: '#33284a' },
  gray: { label: '회색', bg: '#ededed', head: '#dcdcdc', ink: '#2e2e2e' },
  black: { label: '검정', bg: '#1d1d1d', head: '#111111', ink: '#e6e6e6' }
}

export const MEMO_COLOR_LIST = Object.keys(MEMO_COLORS) as MemoColor[]
