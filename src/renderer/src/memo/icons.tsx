// 메모 머리 줄의 작은 아이콘 (선 하나짜리 SVG — 평범한 메모 앱처럼)
const P = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IcoPlus = (): React.JSX.Element => (
  <svg {...P}>
    <path d="M7 2.5v9M2.5 7h9" />
  </svg>
)
export const IcoClose = (): React.JSX.Element => (
  <svg {...P}>
    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
  </svg>
)
export const IcoMinus = (): React.JSX.Element => (
  <svg {...P}>
    <path d="M3 7h8" />
  </svg>
)
export const IcoTrash = (): React.JSX.Element => (
  <svg {...P}>
    <path d="M2.5 4h9M5.5 4V2.6h3V4M3.8 4l.6 7.6h5.2l.6-7.6M6 6.2v3.8M8 6.2v3.8" />
  </svg>
)
export const IcoPin = ({ on }: { on: boolean }): React.JSX.Element => (
  <svg {...P} fill={on ? 'currentColor' : 'none'}>
    <path d="M5 2h4l-.6 3.4L10.5 7.5h-7L5.6 5.4zM7 7.5V12" />
  </svg>
)
export const IcoDots = (): React.JSX.Element => (
  <svg {...P}>
    <circle cx="3" cy="7" r="0.6" fill="currentColor" />
    <circle cx="7" cy="7" r="0.6" fill="currentColor" />
    <circle cx="11" cy="7" r="0.6" fill="currentColor" />
  </svg>
)
