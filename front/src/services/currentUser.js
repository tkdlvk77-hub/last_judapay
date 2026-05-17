// ─────────────────────────────────────────────────────────────
// 현재 사용자 ID 도우미
//
//   서버에 로그인된 경우 → 토큰의 진짜 userId (u_xxxx / biz_xxxx 등)
//   데모 모드 → 데모 ID (u1 / biz_juda / m1)
//
// 사용:
//   import { currentUserId } from '../services/currentUser'
//   const uid = currentUserId('personal')   // demoFallback 타입
// ─────────────────────────────────────────────────────────────
import { tokens } from './api'

const DEMO = {
  personal:    'u1',
  business:    'biz_juda',
  institution: 'i1',
}

export function currentUserId(demoFallbackType = 'personal') {
  const fromToken = tokens.user?.userId
  if (fromToken) return fromToken
  return DEMO[demoFallbackType] || DEMO.personal
}

export function currentUserType() {
  return tokens.user?.userType
      || (typeof window !== 'undefined' ? sessionStorage.getItem('bizType') : null)
      || 'personal'
}
