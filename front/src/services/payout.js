// ─────────────────────────────────────────────────────────
// payout.js — 자금집행(지급집행) 도메인
//   서버: POST /api/v1/app/payouts (step-up 쿠키 필요)
// ─────────────────────────────────────────────────────────
import { api } from './api'
import { stepUpWithPin, stepUpWithBio, bridgeAvailable } from './biometric'

/**
 * 자금집행 실행.
 *
 *   서버 호출 1번에 다음이 모두 일어난다:
 *     - 잔액 차감 (WalletService.debit)
 *     - pay_payouts INSERT
 *     - 마일스톤 INSERT (거래형)
 *     - 스레드 upsert (사용자 한 쌍당 1개)
 *     - 시스템 메시지 자동 생성 (simple / contract / payment / progress)
 *
 *   step-up MFA(jp_app_stepup 쿠키) 가 필요하므로 opts.pin 또는 opts.faceId 필수.
 *
 *   @param {Object}  req                 자금집행 페이로드 (서버 PayoutReq 와 동일)
 *   @param {string}  req.type            'gift' | 'lend' | 'freelance' | 'salary' | 'rent' | ...
 *   @param {string=} req.typeLabel       '용돈/선물', '외주비' 등 표시명
 *   @param {string=} req.typeIcon        '🎁' 등 이모지
 *   @param {string=} req.category        'notification' | 'contract'
 *   @param {string=} req.mainCat         '운영비' | '인건비' | '사업비' | '금융' | '세금'
 *   @param {string=} req.subCat
 *   @param {number}  req.amount
 *   @param {number=} req.whtAmount       원천세. null 이면 0
 *   @param {number=} req.netAmount       null 이면 amount - whtAmount
 *   @param {Object}  req.recipient
 *   @param {string=} req.recipient.userId   가입자
 *   @param {string=} req.recipient.phone    비가입자
 *   @param {string}  req.recipient.name
 *   @param {boolean=} req.recipient.verified
 *   @param {boolean=} req.recipient.isBusiness
 *   @param {string=} req.payDateMode     'immediate' | 'scheduled'
 *   @param {string=} req.scheduledDate   YYYY-MM-DD
 *   @param {string=} req.status          null 이면 자동 결정
 *   @param {string=} req.statusLabel
 *   @param {string=} req.reason
 *   @param {string=} req.walletId
 *   @param {string=} req.walletLabel
 *   @param {string=} req.dealTitle
 *   @param {Array=}  req.milestones      [{ label, amount, targetDate, status }]
 *
 *   @param {Object}  opts
 *   @param {string=} opts.pin            6자리 PIN — stepUpWithPin 호출에 사용
 *   @param {boolean=} opts.faceId        true 면 stepUpWithBio (네이티브 셸 전용)
 *   @param {string=} opts.idempotencyKey 중복 방어
 *
 *   @returns {Promise<{id, payoutNo, threadId, threadKey, ...}>}
 */
export async function executePayout(req, opts = {}) {
  // 1. step-up MFA 통과 — jp_app_stepup 쿠키 발급
  if (opts.faceId) {
    if (!bridgeAvailable()) throw new Error('Face ID 사용 불가 — PIN 으로 진행해주세요')
    await stepUpWithBio({ reason: '자금집행 인증' })
  } else if (opts.pin) {
    await stepUpWithPin(opts.pin)
  } else {
    throw new Error('step-up 인증이 필요합니다 (PIN 또는 Face ID)')
  }

  // 2. POST /api/v1/app/payouts
  const headers = opts.idempotencyKey
    ? { 'X-Idempotency-Key': opts.idempotencyKey }
    : undefined
  return await api.post('/api/v1/app/payouts', req, { headers })
}

/** 자금집행 1건 상세. */
export async function getPayout(id) {
  return await api.get(`/api/v1/app/payouts/${id}`)
}
