import { useCallback, useEffect, useRef, useState, createElement } from 'react'

/**
 * 터치 기반 Pull-to-Refresh 훅
 *
 * 사용법:
 *   const { containerRef, indicator } = usePullToRefresh(async () => {
 *     await fetchSomething()
 *   })
 *
 *   <div ref={containerRef} style={{ flex:1, overflowY:'auto', position:'relative' }}>
 *     {indicator}
 *     {content}
 *   </div>
 *
 * 동작:
 *   - scrollTop === 0 일 때만 활성화
 *   - 일정 거리(threshold) 이상 당기면 release 시 onRefresh 호출
 *   - onRefresh 가 Promise 면 끝날 때까지 인디케이터 유지
 *   - 마우스(데스크탑) 도 지원 (드래그)
 */
export function usePullToRefresh(onRefresh, {
  threshold = 64,
  maxPull   = 120,
  resistance = 0.5,
} = {}) {
  const containerRef = useRef(null)
  const startYRef    = useRef(null)
  const draggingRef  = useRef(false)
  const [pull,        setPull]        = useState(0)        // 현재 당겨진 픽셀
  const [refreshing,  setRefreshing]  = useState(false)

  // ── 공통 시작 ──────────────────────────────────────────────
  const onStart = useCallback((y) => {
    const el = containerRef.current
    if (!el || refreshing) return
    // 스크롤이 최상단일 때만
    if (el.scrollTop > 0) return
    startYRef.current = y
    draggingRef.current = true
  }, [refreshing])

  const onMove = useCallback((y, e) => {
    if (!draggingRef.current || startYRef.current == null) return
    const dy = y - startYRef.current
    if (dy <= 0) {
      // 위로 다시 스크롤 → 취소
      setPull(0)
      return
    }
    // resistance 로 둔감하게, max 한계
    const next = Math.min(dy * resistance, maxPull)
    setPull(next)
    // 일정 이상 당겼을 때 브라우저 기본 스크롤/새로고침을 차단
    if (next > 4 && e?.cancelable) e.preventDefault()
  }, [maxPull, resistance])

  const onEnd = useCallback(async () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    startYRef.current = null

    if (pull >= threshold && onRefresh) {
      setRefreshing(true)
      setPull(threshold) // 인디케이터를 threshold 위치에 고정
      try {
        await onRefresh()
      } catch { /* swallow */ }
      setRefreshing(false)
    }
    setPull(0)
  }, [pull, threshold, onRefresh])

  // ── 터치/마우스 이벤트 바인딩 ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleTouchStart = (e) => onStart(e.touches[0].clientY)
    const handleTouchMove  = (e) => onMove(e.touches[0].clientY, e)
    const handleTouchEnd   = () => onEnd()

    // 데스크탑 (Chrome devtools 모바일 모드는 마우스 이벤트만 발생할 수 있음)
    const handleMouseDown  = (e) => { if (e.button === 0) onStart(e.clientY) }
    const handleMouseMove  = (e) => onMove(e.clientY, e)
    const handleMouseUp    = () => onEnd()

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true })
    el.addEventListener('touchcancel',handleTouchEnd,   { passive: true })

    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup',   handleMouseUp)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove',  handleTouchMove)
      el.removeEventListener('touchend',   handleTouchEnd)
      el.removeEventListener('touchcancel',handleTouchEnd)
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup',   handleMouseUp)
    }
  }, [onStart, onMove, onEnd])

  // ── 인디케이터 (JSX 없이 createElement 로 — .js 확장자 유지 위해) ──
  const progress = Math.min(pull / threshold, 1)            // 0 ~ 1
  const visible  = pull > 0 || refreshing
  const spinner = visible
    ? createElement('div', {
        style: {
          width: 28, height: 28,
          borderRadius: '50%',
          border: '2px solid rgba(91,79,232,0.18)',
          borderTopColor: '#5B4FE8',
          opacity: refreshing ? 1 : 0.4 + progress * 0.6,
          transform: refreshing ? 'rotate(360deg)' : `rotate(${progress * 270}deg)`,
          animation: refreshing ? 'ptr-spin 0.8s linear infinite' : 'none',
        },
      })
    : null

  const indicator = createElement(
    'div',
    {
      style: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${pull}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
        transition: draggingRef.current ? 'none' : 'height 220ms ease',
        zIndex: 5,
      },
    },
    spinner,
  )

  // 컨테이너 자체를 살짝 아래로 밀어서 본문이 따라 내려오게 (선택)
  const contentStyle = {
    transform: `translateY(${pull}px)`,
    transition: draggingRef.current ? 'none' : 'transform 220ms ease',
    willChange: 'transform',
  }

  return { containerRef, indicator, contentStyle, refreshing, pull }
}
