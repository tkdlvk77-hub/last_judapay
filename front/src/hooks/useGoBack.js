import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 백 버튼 헬퍼.
 *
 *   const goBack = useGoBack('/more')
 *   <button onClick={goBack}>‹</button>
 *
 * 동작:
 *   1. history 스택에 이전 항목이 있으면 navigate(-1)  → 브라우저 POP → App.jsx 가
 *      슬라이드 아웃 애니메이션을 자동 적용.
 *   2. 없으면 fallbackPath 로 REPLACE. 이때 location.state 에 `__back: true` 마커를
 *      실어서 App.jsx 가 같은 슬라이드 아웃 애니메이션으로 처리.
 */
export function useGoBack(fallbackPath = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    const hasHistory = (window.history.state?.idx ?? 0) > 0
    if (hasHistory) {
      navigate(-1)
    } else {
      navigate(fallbackPath, { replace: true, state: { __back: Date.now() } })
    }
  }, [navigate, fallbackPath])
}
