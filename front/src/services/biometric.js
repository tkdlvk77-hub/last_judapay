// ─────────────────────────────────────────────────────────
// biometric.js — Face ID / Touch ID 헬퍼
//
// 네이티브 셸(WKWebView)에서만 동작. 일반 웹 브라우저에서는
// isAvailable()이 false → UI에서 Face ID 버튼 자동 숨김.
//
// 데이터 흐름 (PIN 저장 + step-up 인증):
//   1) 가입 직후     enrollPin(pin)     — Face ID 등록 + Keychain 에 PIN 저장
//   2) 자동 로그인   loginPinWithBio()  — Face ID 통과 → Keychain PIN 꺼냄 → 서버 /login-pin
//   3) 자금 집행     stepUpWithBio()    — Face ID 통과 → Keychain PIN 꺼냄 → 서버 /step-up
//                                          → 5분짜리 mfaVerified 쿠키 발급
// ─────────────────────────────────────────────────────────
import { api } from './api'

const KEY_PIN = 'judapay.pin'

/** 네이티브 셸 + biometric 사용 가능 여부 */
export function bridgeAvailable() {
  return typeof window !== 'undefined' && !!window.JudaPay?.secureStorageSet
}

/** 디바이스에 Face ID/Touch ID 가 등록되어 있고 사용 가능한가? */
export async function biometryAvailable() {
  if (!bridgeAvailable()) return { available: false, type: 'none' }
  try {
    return await window.JudaPay.biometryAvailable()
  } catch {
    return { available: false, type: 'none' }
  }
}

/** Keychain 에 PIN 이 저장되어 있는가? (Face ID 트리거 X) */
export async function hasStoredPin() {
  if (!bridgeAvailable()) return false
  try { return await window.JudaPay.secureStorageHas(KEY_PIN) }
  catch { return false }
}

/** 가입 직후 Face ID 등록 — Face ID 통과 후 Keychain 에 PIN 저장 */
export async function enrollPin(pin) {
  if (!bridgeAvailable()) return false
  try {
    await window.JudaPay.secureStorageSet(KEY_PIN, pin, 'Face ID 등록')
    return true
  } catch (e) {
    console.warn('[biometric] enroll failed', e)
    return false
  }
}

/** Face ID 로그인: Keychain PIN 해제 → 서버 /login-pin 호출 */
export async function loginPinWithBio({ ci }) {
  if (!bridgeAvailable()) throw new Error('네이티브 셸이 아닙니다.')
  const pin = await window.JudaPay.secureStorageGet(KEY_PIN, 'PIN 로그인')
  const res = await api.post('/api/v1/app/auth/login-pin', { ci, pin })
  return res
}

/** Face ID step-up: Keychain PIN 해제 → 서버 /step-up 호출 → mfaVerified 쿠키 발급 */
export async function stepUpWithBio({ reason = '자금 집행 인증' } = {}) {
  if (!bridgeAvailable()) throw new Error('네이티브 셸이 아닙니다.')
  const pin = await window.JudaPay.secureStorageGet(KEY_PIN, reason)
  return await api.post('/api/v1/app/auth/step-up', { pin })
}

/** PIN 직접 입력으로 step-up (Face ID 미사용 사용자용) */
export async function stepUpWithPin(pin) {
  return await api.post('/api/v1/app/auth/step-up', { pin })
}

/** Keychain 의 PIN 삭제 — 로그아웃 시 호출 권장 */
export async function clearStoredPin() {
  if (!bridgeAvailable()) return
  try { await window.JudaPay.secureStorageDelete(KEY_PIN) }
  catch {}
}
