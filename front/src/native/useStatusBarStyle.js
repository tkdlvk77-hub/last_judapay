import { useEffect } from 'react'

/**
 * iOS/Android 네이티브 셸의 상태바(시계·아이콘) 글자 색을 화면별로 제어한다.
 *
 *   useStatusBarStyle('dark')   → 흰/연한 배경 페이지에서 검정 글자
 *   useStatusBarStyle('light')  → 다크/그라데이션 배경 페이지에서 흰 글자
 *
 * 네이티브 브릿지(window.JudaPay)가 없는 환경(웹/데스크탑)에서는 no-op.
 * 마운트 시 적용 → 언마운트 시 자동으로 'light'(기본값) 로 복원.
 */
export function useStatusBarStyle(style = 'light') {
  useEffect(() => {
    const bridge = typeof window !== 'undefined' ? window.JudaPay : null
    if (!bridge || typeof bridge.setStatusBarStyle !== 'function') return

    bridge.setStatusBarStyle(style).catch(() => {})

    return () => {
      // 화면을 떠날 때 기본값(밝은 배경 위 흰 글자) 으로 복원
      bridge.setStatusBarStyle('light').catch(() => {})
    }
  }, [style])
}
