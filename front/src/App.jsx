import { useLocation, useNavigationType } from 'react-router-dom'
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

// 진입 애니메이션 없이 즉시 표시할 화면들 (스택 리셋 + phase 'idle')
//   - '/' (Start) : 첫 시작 화면이므로 슬라이드 인 없이 즉시 노출
//   - TAB_PATHS   : 하단 탭은 push가 아니라 root 전환 개념
const RESET_PATHS = new Set(['/', ...TAB_PATHS])

// iOS native 셸은 swipe-back 시 WebView 전체를 슬라이드시키는 native
// 애니메이션을 담당하므로 JS 측 exit 애니메이션을 추가로 걸면 충돌 → freeze.
const IS_IOS_SHELL =
  typeof window !== 'undefined' &&
  window.JudaPay?.platform === 'ios'

// 전환 속도/이징 — index.css 의 키프레임과 별개로 인라인 transition 으로 적용
const ANIM_MS    = 280
const ANIM_EASE  = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

// phase: 'idle' | 'entering' | 'entered' | 'exiting'
//   - 새로 push: 'entering' (1프레임 후 'entered')
//   - 백:        'exiting'  (transitionEnd 후 unmount)
//   - 가만히 있음: 'idle'

export default function App() {
  const location  = useLocation()
  const navType   = useNavigationType() // 'PUSH' | 'POP' | 'REPLACE'

  const [stack, setStack] = useState(() => [
    { key: location.key, loc: location, phase: 'idle' },
  ])

  const prevKeyRef      = useRef(location.key)
  const prevPathnameRef = useRef(location.pathname)

  // ── location 변화 → stack 업데이트 ───────────────────────────────
  useEffect(() => {
    if (location.key === prevKeyRef.current) return

    const prevPath = prevPathnameRef.current
    const currPath = location.pathname
    prevKeyRef.current      = location.key
    prevPathnameRef.current = currPath

    if (currPath === prevPath) return // wall / sentinel 팝 무시

    // POP 또는 useGoBack 이 보낸 __back 마커가 있으면 뒤로가기로 처리
    const isBack = navType === 'POP' || !!location.state?.__back

    if (isBack) {
      // ── 뒤로가기 ─────────────────────────────────────────────
      // 현재 top 화면을 'exiting' 으로 마크 → 슬라이드 아웃 후 unmount
      setStack(prev => {
        if (prev.length <= 1) return prev
        const lastIdx = prev.length - 1
        return prev.map((s, i) => {
          if (i === lastIdx) return { ...s, phase: 'exiting' }
          // 드러나는 화면들은 idle 로 (혹시 entering 중이었으면 즉시 정착)
          return s.phase === 'entered' || s.phase === 'idle'
            ? s
            : { ...s, phase: 'idle' }
        })
      })
    } else {
      // ── PUSH / REPLACE ───────────────────────────────────────
      setStack(prev => {
        // 같은 경로가 스택에 이미 있고, 그 위에 다른 화면이 쌓여 있다면
        // "뒤로 돌아가는 의도" 로 해석 — 위 화면들을 exiting 처리.
        // (자금집행 깊은 화면의 헤더 백 버튼이 navigate('/home') 처럼 절대경로로
        //  PUSH 하는 패턴, /execute/personal 의 백 버튼이 navigate('/execute') 하는
        //  패턴 등을 한 곳에서 자연스럽게 처리.)
        const existingIdx = prev.findIndex(s => s.loc.pathname === currPath)
        if (existingIdx >= 0 && existingIdx < prev.length - 1) {
          return prev.map((s, i) => (
            i > existingIdx ? { ...s, phase: 'exiting' } : { ...s, phase: 'idle' }
          ))
        }

        const isReset = RESET_PATHS.has(currPath)
        if (isReset) {
          // 외부 진입 / 첫 마운트 — 스택 비우고 idle 로 (애니메이션 없음)
          return [{ key: location.key, loc: location, phase: 'idle' }]
        }
        return [
          // 기존 스택 화면은 모두 idle 로 (재마운트되어도 enter 안 뜨게)
          ...prev.slice(-19).map(s => ({ ...s, phase: 'idle' })),
          { key: location.key, loc: location, phase: 'entering' },
        ]
      })
    }
  }, [location, navType])

  // 'entering' → 다음 프레임에 'entered' 로 → CSS transition 이 0%로 슬라이드
  useEffect(() => {
    const enteringEntry = stack.find(s => s.phase === 'entering')
    if (!enteringEntry) return
    // requestAnimationFrame 2번 호출해서 브라우저가 'entering' 의 초기 transform 을
    // 그린 다음 'entered' 로 바꿔야 transition 이 발동한다.
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setStack(prev => prev.map(s => (
          s.key === enteringEntry.key && s.phase === 'entering'
            ? { ...s, phase: 'entered' }
            : s
        )))
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [stack])

  // iOS 셸: exit 애니메이션 안 걸리니 즉시 unmount
  useEffect(() => {
    if (!IS_IOS_SHELL) return
    const hasExiting = stack.some(s => s.phase === 'exiting')
    if (!hasExiting) return
    const id = setTimeout(
      () => setStack(prev => prev.filter(s => s.phase !== 'exiting')),
      0,
    )
    return () => clearTimeout(id)
  }, [stack])

  // exit transitionEnd 시 unmount (웹/Android)
  const handleTransitionEnd = (key, propertyName) => {
    if (propertyName !== 'transform') return
    setStack(prev => prev.filter(s => !(s.key === key && s.phase === 'exiting')))
  }

  // 상위 2개만 렌더 (이전 화면 + 현재 화면)
  const visible = stack.slice(-2)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div className="phone-stage">
        {visible.map((screen, idx) => {
          // phase 별 transform 값
          //  - entering: 100% (초기 위치 — 화면 오른쪽 밖)
          //  - entered/idle: 0%
          //  - exiting: 100% (오른쪽으로 빠짐)
          const tx =
            screen.phase === 'entering' ? '100%' :
            screen.phase === 'exiting'  ? '100%' :
            '0%'

          // entering 의 초기 프레임은 transition 없이 시작 (jump 없이 100% 에 위치)
          // entered 로 바뀌면 transition 이 발동 → 0% 로 부드럽게 이동
          // exiting 도 동일 transition 으로 0% → 100% 슬라이드
          const useTransition = screen.phase !== 'entering'

          return (
            <div
              key={screen.key}
              onTransitionEnd={(e) =>
                e.target === e.currentTarget && handleTransitionEnd(screen.key, e.propertyName)
              }
              style={{
                position: 'absolute', inset: 0,
                // exiting 화면을 위로 올려 슬라이드 아웃이 보이게.
                // iOS 셸에선 native 가 처리하므로 즉시 사라지게 zIndex 0 으로.
                zIndex:
                  screen.phase === 'exiting'
                    ? (IS_IOS_SHELL ? 0 : 10 + idx)
                    : idx + 1,
                pointerEvents: screen.phase === 'exiting' ? 'none' : 'auto',
                transform: `translate3d(${tx}, 0, 0)`,
                transition: useTransition
                  ? `transform ${ANIM_MS}ms ${ANIM_EASE}`
                  : 'none',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
              }}
            >
              <ScreenContent location={screen.loc} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
