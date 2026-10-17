import { shortKey } from '@shared/keys'
import { accelLabel } from '@shared/shortcut'
import type { PersistedState } from '@shared/types'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, MORE_APPS_URL } from '@shared/types'
import { SpriteBox } from '@/common/SpriteBox'

const platform = window.api.platform

export function About({ st }: { st: PersistedState }): React.JSX.Element {
  const k = st.settings.reelKey ? shortKey(st.settings.reelKey, platform) : '클릭'
  const boss = st.settings.bossKey ? shortKey(st.settings.bossKey, platform) : null
  const memoKey = st.settings.memoShortcut ? accelLabel(st.settings.memoShortcut, platform, true) : null
  const lookKey = st.settings.lookShortcut ? accelLabel(st.settings.lookShortcut, platform, true) : null
  return (
    <div className="about">
      <section className="box intro">
        <div className="intro-fish">
          <SpriteBox id="quitcarp" w={120} h={44} max={4} />
          <SpriteBox id="envelope" w={80} h={44} max={3} />
          <SpriteBox id="salmon" w={100} h={44} max={3} />
        </div>
        <div className="intro-t">일하는 척하면서, 화면 구석에서 낚시하기</div>
        <div className="faint">
          낚시터는 늘 맨 위에 떠 있어요. 엑셀을 켜 놓은 채로 <b className="text">{k}</b> 키만 눌러도 낚시가 돼요.
        </div>
      </section>

      <section className="box howto">
        <div className="sec-h">하는 법 (수동)</div>
        <ol>
          <li>
            <b>낚시 자리</b> — 물 위의 <span className="gold">▼</span> 를 끌어서 옮겨요. 멀리 잡을수록 희귀한 물고기가 조금 더 (대신 오래 기다려요). 기다리는 중엔 찌를 끌어 옮길 수도 있어요
          </li>
          <li>
            <b>{k} 꾹</b> → 떼면 던지기. 힘을 꽉 채울수록 ▼ 자리에 정확히 떨어져요
          </li>
          <li>
            <b>① 입질</b> — 찌가 쑥 들어가고 <span className="gold">!</span> 가 뜨면 바로 <b>{k}</b>. 빠를수록 PERFECT
          </li>
          <li>
            <b>② 힘겨루기</b> — <b>{k} 꾹</b> = 감기, <b>떼기</b> = 풀기. 오른쪽 장력 막대가 빨개지거나 <span className="red">풀어!!</span> 가 뜨면 놓고,
            너무 오래 놓으면 도망가요
          </li>
          <li>
            <b>③ 피니시</b> — 물고기가 튀어 오르면 커서가 <span className="green">초록 칸</span>에 올 때 <b>{k}</b>. 희귀할수록 여러 번
          </li>
        </ol>
        <div className="faint">잡으면 크기·희귀도에 따라 바로 팔려서 오늘 수익에 들어가요. 오늘 수익은 자정에 0부터 다시 시작해요.</div>
      </section>

      <section className="box howto">
        <div className="sec-h">알아 두면 좋은 것</div>
        <ul>
          <li>
            <b>자동 낚시</b>: 알아서 던지고 낚지만 성공률이 낮아요. 입질 때 {k} 를 누르면 그 물고기는 직접 잡아요
          </li>
          <li>
            <b>위장</b>: {boss ? <b>{boss}</b> : null}
            {boss ? ' · ' : ''}
            <b>ESC</b> · 위쪽 ▤ 버튼 → 낚시터가 평범한 노란 스티커 메모로 변신. 진짜로 글도 써져요. 메모의 × 나 ESC 로 돌아와요
          </li>
          <li>
            <b>투명 모양</b>: 뒤 화면이 비치고 낚시꾼·찌·물고기만 보여요. 설정 · 위쪽 ◐ 버튼{lookKey ? <> · <b>{lookKey}</b></> : null} 로 원래 풍경 모양과 바꿔요
          </li>
          <li>
            <b>스티커 메모</b>: {memoKey ? <><b>{memoKey}</b> 를 누르면 어디서든 새 메모. </> : null}화면에 여러 장 붙여 두고 색·맨 위 고정. 지운 메모는 메모 탭의 휴지통에서 되살려요
          </li>
          <li>
            <b>낚시터 창 옮기기</b>: 물·낚시꾼·위쪽 막대를 잡고 끌기 · <b>치우기</b>: × (트레이·메뉴 막대의 찌 아이콘에서 다시)
          </li>
          <li>
            <b>오늘의 시세</b>: 매일 한 종이 판매가 ×2
          </li>
          <li>
            <b>직급</b>: 누적 수익으로 인턴 → 사원 → … → 전설의 월급루팡
          </li>
          <li>
            <b>자랑하기</b>: 잡은 물고기 카드 · 오늘의 리포트 · 도감을 이미지로 먼저 보여 주고 → 공유하기 · 이미지 저장
          </li>
        </ul>
      </section>

      <section className="box promo">
        <div className="promo-t">이런 재밌는 앱, 또 만들어요</div>
        <div>
          인스타그램 <b className="gold">{INSTAGRAM_HANDLE}</b> 를 팔로우하면
          <br />
          새로 나온 앱을 가장 먼저, 바로바로 해볼 수 있어요!
        </div>
        <div className="row center">
          <button className="pix-btn primary" onClick={() => void window.api.openExternal(INSTAGRAM_URL)}>
            인스타그램 보기
          </button>
          <button className="pix-btn" onClick={() => void window.api.openExternal(MORE_APPS_URL)}>
            개발자의 다른 앱 보기
          </button>
        </div>
      </section>
      <div className="faint small center">갈무리 글꼴 (SIL OFL 1.1) · 그림과 효과음은 모두 코드로 만든 오리지널</div>
    </div>
  )
}
