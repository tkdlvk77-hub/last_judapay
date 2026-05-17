import { useEffect } from 'react'

// Bottom-tab screen paths — swipe-back must be blocked on these
const TAB_PATHS = new Set([
  '/home', '/home-business', '/messages', '/alerts', '/more', '/business-menu',
])

/**
 * Prevents iOS swipe-back on tab (root) screens.
 *
 * Pushes a guard entry with the same URL so that iOS swipe pops the guard
 * and lands back on the same URL — React Router sees no URL change and stays.
 * The onPop handler immediately re-pushes a fresh guard to keep the wall intact.
 */
export function useNoSwipeBack() {
  useEffect(() => {
    window.history.pushState({ _wall: true }, '')

    const onPop = () => {
      if (TAB_PATHS.has(window.location.pathname)) {
        // iOS WKWebView: popstate 핸들러 내부에서 pushState()를 동기 호출하면
        // WKWebView 자체가 1~3초 freeze 됨. setTimeout(0)으로 다음 태스크로 미룸.
        setTimeout(() => {
          window.history.pushState({ _wall: true }, '')
        }, 0)
      }
    }

    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
