import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, memo } from 'react'
import AppRoutes from './AppRoutes'

// location.key 가 같으면 절대 re-render 하지 않음
// → 스크롤·state·DOM 완전 보존 (keep-alive)
const ScreenContent = memo(
  ({ location }) => <AppRoutes location={location} />,
  (prev, next) => prev.location.key === next.location.key,
)

const TAB_PATHS = new Set([
  '/home', '/home-business', '/messages', '/alerts', '/more', '/business-menu',
])

export default function App() {
  const location = useLocation()

  const [stack, setStack] = useState([
    { key: location.key, loc: location, animIn: false },
  ])

  const isBackRef       = useRef(false)
  const prevKeyRef      = useRef(location.key)
  const prevPathnameRef = useRef(location.pathname)

  // popstate = 뒤로가기 감지 (iOS 스와이프 백 포함)
  useEffect(() => {
    const onPop = () => { isBackRef.current = true }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (location.key === prevKeyRef.current) return

    const isBack   = isBackRef.current
    const prevPath = prevPathnameRef.current
    const currPath = location.pathname

    isBackRef.current       = false
    prevKeyRef.current      = location.key
    prevPathnameRef.current = currPath

    // wall / sentinel 팝 (pathname 동일) → 무시
    if (currPath === prevPath) return

    if (isBack) {
      // ── 뒤로가기 ────────────────────────────────────────────────
      // exit 애니메이션 없음.
      // iOS native allowsBackForwardNavigationGestures 가 활성화된 경우
      // iOS 가 이미 WebView 전체를 슬라이드시키는 네이티브 애니메이션을 담당함.
      // 우리가 추가로 CSS animation 을 걸면 두 애니메이션이 충돌 → freeze 발생.
      //
      // 이전 화면(홈)은 keep-alive 스택에 살아있으므로
      // 상세 화면이 사라지면 홈이 즉시 보임 (unmount 지연으로 부드럽게)
      setStack(prev => {
        if (prev.length <= 1) return prev
        // top 을 exiting 으로 표시 → 짧은 delay 후 제거
        return prev.map((s, i) => ({
          ...s,
          exiting: i === prev.length - 1,
        }))
      })
    } else {
      // ── 앞으로 / 탭 전환 ────────────────────────────────────────
      const isTab = TAB_PATHS.has(currPath)
      setStack(prev => {
        if (isTab) {
          return [{ key: location.key, loc: location, animIn: false }]
        }
        return [
          ...prev.slice(-19),
          { key: location.key, loc: location, animIn: true },
        ]
      })
    }
  }, [location])

  // exiting 화면: 짧은 delay 후 제거 (unmount 를 즉시 하지 않아야 freeze 없음)
  useEffect(() => {
    const exitingEntry = stack.find(s => s.exiting)
    if (!exitingEntry) return

    // 홈 화면이 보이고 난 뒤 조용히 제거
    // requestIdleCallback: 브라우저 유휴 시간에 실행 → UI 블로킹 없음
    let id
    const doRemove = () => setStack(prev => prev.filter(s => !s.exiting))

    if (typeof requestIdleCallback !== 'undefined') {
      id = requestIdleCallback(doRemove, { timeout: 800 })
    } else {
      id = setTimeout(doRemove, 300)
    }

    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [stack])

  // 상위 2개만 렌더 (이전 화면 + 현재 화면)
  const visible = stack.slice(-2)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div className="phone-stage">
        {visible.map((screen, idx) => (
          <div
            key={screen.key}
            // enter: 오른쪽에서 슬라이드 인 (index.css .screen-enter)
            // exit: 애니메이션 없음 — iOS native 가 담당 or 즉시 사라짐
            className={screen.animIn ? 'screen-enter' : ''}
            style={{
              position: 'absolute', inset: 0,
              // exiting 화면을 뒤로 보내 홈이 즉시 드러나게 함
              zIndex: screen.exiting ? 0 : idx + 1,
              // exiting 동안 터치 차단
              pointerEvents: screen.exiting ? 'none' : 'auto',
            }}
          >
            <ScreenContent location={screen.loc} />
          </div>
        ))}
      </div>
    </div>
  )
}
