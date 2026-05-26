// ─────────────────────────────────────────────────────────────
// PinBus — 컴포넌트 트리 밖에서도 호출 가능한 싱글톤 PIN step-up API.
//
//   사용 (어디서든):
//     import { ensureStepUp } from '../components/PinModal'
//     await ensureStepUp()    // 모달 띄움 → 사용자가 PIN 입력 → 서버 step-up 통과
//     addTransaction({ ... }) // 이제 sync 가 MFA_REQUIRED 안 남
//
// 실제 UI 는 PinModalHost 가 그림. 이 모듈은 Pub/Sub 만 담당.
//
// 세션 캐시: 한 번 통과한 후 5분(서버 jp_app_stepup TTL) 동안은 모달 안 띄움.
//   서버 쿠키 TTL 과 클라이언트 캐시 TTL 을 같게 유지.
// ─────────────────────────────────────────────────────────────

let _subscriber = null
let _idSeq = 0

// 서버 jp_app_stepup TTL (5분) 과 동일.
const STEP_UP_TTL_MS = 5 * 60 * 1000
let _lastVerifiedAt = 0

function publish(req) {
  if (!_subscriber) {
    console.warn('[PinModal] host not mounted — rejecting ensureStepUp')
    req.reject?.(new Error('PinModal host not mounted'))
    return
  }
  _subscriber(req)
}

// 내부 — PinModalHost 가 호출
export function _setSubscriber(fn) { _subscriber = fn }

/**
 * step-up 통과 캐시 무효화 (로그아웃 등에서 호출).
 */
export function invalidateStepUp() {
  _lastVerifiedAt = 0
}

/**
 * step-up MFA 통과 보장.
 *
 *   1) 최근 5분 내 통과 기록이 있으면 즉시 resolve (모달 없음)
 *   2) 그 외엔 PIN 모달 띄움 → 6자리 입력 → 서버 step-up 호출
 *   3) 성공 시 resolve, 사용자가 취소 누르면 reject
 *
 *   @returns {Promise<void>} 성공/실패만 알려줌. step-up 쿠키는 서버가 자동 설정.
 */
export function ensureStepUp(opts = {}) {
  // 최근 통과 기록이 있으면 스킵 (force 옵션 없을 때만)
  if (!opts.force && _lastVerifiedAt && Date.now() - _lastVerifiedAt < STEP_UP_TTL_MS) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    publish({
      id: ++_idSeq,
      title:   opts.title   || '본인 확인',
      message: opts.message || '자금 집행을 위해 PIN 6자리를 입력해 주세요.',
      resolve: () => {
        _lastVerifiedAt = Date.now()
        resolve()
      },
      reject,
    })
  })
}
