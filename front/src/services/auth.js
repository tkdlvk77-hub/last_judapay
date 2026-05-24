// ─────────────────────────────────────────────────────────
// auth.js — 인증 도메인 (서버: /api/v1/app/auth, 쿠키 인증)
//
// 서버 응답 (ApiResponse<Map> → 자동 언랩됨):
//   { userId, userType, role, name, email }
// 토큰은 HttpOnly Cookie 로 자동 발급됨 (클라이언트 접근 불가).
// ─────────────────────────────────────────────────────────
import { api, session } from './api'

/**
 * 회원가입
 *  @param {{email,password,name,phone?,role?}} req
 *    role: 'INDIVIDUAL' | 'BUSINESS_OWNER' | ...
 */
export async function signup(req) {
  const res = await api.post('/api/v1/app/auth/signup', req)
  session.setUser(res)
  return res
}

/**
 * 로그인 — 이메일/비밀번호 (사용 안 함 호환용)
 */
export async function login(req) {
  const res = await api.post('/api/v1/app/auth/login', req)
  session.setUser(res)
  return res
}

/**
 * 본인인증 — 휴대폰 번호로 CI/DI 발급 + 가입 여부 확인
 *  @param {{phone, name?}} req
 *  @returns {{ verified, isRegistered, ci, di, name, phone, userType? }}
 */
export async function verifyIdentity(req) {
  return await api.post('/api/v1/app/auth/verify-identity', req)
}

/**
 * PIN 로그인 — 본인인증으로 받은 ci + PIN 6자리
 *
 * 응답 분기:
 *   - 정상    : { userId, userType, role, name, email }  → session 저장
 *   - 추가인증: { requiresStepUp: true, reason: 'NEW_DEVICE' | 'RISKY_LOGIN' }
 *               → session 저장하지 않음. 호출자가 PIN 재입력 또는 step-up 화면으로 안내.
 *  @param {{ci, pin}} req
 */
export async function loginPin(req) {
  const res = await api.post('/api/v1/app/auth/login-pin', req)
  if (res?.requiresStepUp) {
    // 토큰 미발급 상태 — session 저장 금지
    return res
  }
  session.setUser(res)
  return res
}

/**
 * 로그아웃
 *   1) 서버에 logout 호출 → jp_app_token / jp_app_stepup 만료 쿠키 발급
 *   2) 로컬 session 정리
 *   3) (네이티브 셸) Keychain 의 PIN 도 함께 삭제 — 분실/도난 시 잔여 인증 정보 제거
 */
export async function logout() {
  try { await api.post('/api/v1/app/auth/logout', {}) } catch {}
  session.clear()
  try {
    const { clearStoredPin } = await import('./biometric')
    await clearStoredPin()
  } catch {}
}

// 호환용: 기존 화면이 직접 sessionStorage 의 bizType 을 읽고 있음
export function getUserType() {
  try { return sessionStorage.getItem('bizType') || null }
  catch { return null }
}
