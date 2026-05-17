import { useLayoutEffect, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// 앱 생명주기 동안 라우트별 스크롤 위치 저장 (location.key = 뒤로가기 시 동일 키 재사용)
const positions = new Map()

/**
 * 스크롤 위치를 자동 저장/복원하는 훅
 * 반환된 ref를 스크롤 컨테이너 div에 붙이면 됨
 *
 * 사용법:
 *   const scrollRef = useScrollRestore()
 *   <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
 */
export function useScrollRestore() {
  const ref = useRef(null)
  const { key } = useLocation()

  // 마운트 즉시(페인트 전) 저장된 위치로 복원
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = positions.get(key) ?? 0
  }, [key])

  // 스크롤할 때마다 위치 저장
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const save = () => positions.set(key, el.scrollTop)
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [key])

  return ref
}
